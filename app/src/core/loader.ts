import { CORE_SUPPORTED_API, CORE_VERSION, MODULES_BASE } from './config';
import { coreError, type LoadResult } from './errors';
import {
  registrySchema, manifestSchema, lessonSchema,
  type Registry, type Manifest, type Lesson, type RegistryEntry,
} from './schema';
import { getModule, getAllModules, putModule, type StoredModule } from './db';
import { log } from './log';

/* ── semver-сравнение (мажор.минор.патч) ─────────────────────── */

export function parseSemver(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** a >= b ? */
export function semverGte(a: string, b: string): boolean {
  const [ax, ay, az] = parseSemver(a);
  const [bx, by, bz] = parseSemver(b);
  if (ax !== bx) return ax > bx;
  if (ay !== by) return ay > by;
  return az >= bz;
}

/* ── низкоуровневый fetch JSON ───────────────────────────────── */

async function fetchJson(url: string): Promise<LoadResult<unknown>> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return coreError('NETWORK', 'Сеть недоступна', url);
  }
  if (res.status === 404) {
    return coreError('NOT_FOUND', 'Файл не найден', url);
  }
  if (!res.ok) {
    return coreError('NETWORK', `Сервер вернул статус ${res.status}`, url);
  }
  try {
    return { ok: true, data: await res.json() };
  } catch {
    return coreError('INVALID_JSON', 'Не удалось разобрать JSON', url);
  }
}

function zodFail(where: string, err: { issues: { path: (string | number)[]; message: string }[] }): LoadResult<never> {
  const first = err.issues[0];
  const path = first ? first.path.join('.') : '';
  const msg = first ? first.message : 'неизвестная ошибка схемы';
  return coreError('INVALID_SCHEMA', `Ошибка формата (${where})`, `${path ? path + ': ' : ''}${msg}`);
}

/* ── проверка совместимости версии ───────────────────────────── */

export function validateCompatibility(manifest: Manifest): LoadResult<Manifest> {
  if (manifest.apiVersion > CORE_SUPPORTED_API) {
    return coreError(
      'INCOMPATIBLE',
      `Модуль требует API v${manifest.apiVersion}, ядро поддерживает v${CORE_SUPPORTED_API}. Обновите приложение.`,
    );
  }
  if (!semverGte(CORE_VERSION, manifest.minCoreVersion)) {
    return coreError(
      'INCOMPATIBLE',
      `Модулю нужна ядро-версия не ниже ${manifest.minCoreVersion}, установлена ${CORE_VERSION}.`,
    );
  }
  return { ok: true, data: manifest };
}

/* ── публичный API загрузчика ────────────────────────────────── */

export async function loadRegistry(): Promise<LoadResult<Registry>> {
  const raw = await fetchJson(`${MODULES_BASE}registry.json`);
  if (!raw.ok) return raw;
  const parsed = registrySchema.safeParse(raw.data);
  if (!parsed.success) return zodFail('registry.json', parsed.error);
  const ids = parsed.data.modules.map((m) => m.id);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) {
    return coreError('DUPLICATE_ID', `В реестре дублируется id модуля: "${dup}"`);
  }
  return { ok: true, data: parsed.data };
}

export async function loadManifest(entry: RegistryEntry): Promise<LoadResult<Manifest>> {
  const base = `${MODULES_BASE}${entry.path.replace(/\/+$/, '')}/`;
  const raw = await fetchJson(`${base}module.json`);
  if (!raw.ok) return { ...raw, error: { ...raw.error, detail: `${raw.error.detail ?? ''} (модуль «${entry.id}»)` } };
  const parsed = manifestSchema.safeParse(raw.data);
  if (!parsed.success) return zodFail(`module.json «${entry.id}»`, parsed.error);
  if (parsed.data.id !== entry.id) {
    return coreError('DUPLICATE_ID',
      `Id в реестре («${entry.id}») не совпадает с id манифеста («${parsed.data.id}»).`);
  }
  return validateCompatibility(parsed.data);
}

export async function loadLesson(manifest: Manifest, file: string): Promise<LoadResult<Lesson>> {
  const base = `${MODULES_BASE}${manifest.id}/`;
  const raw = await fetchJson(`${base}${file}`);
  if (!raw.ok) return raw as LoadResult<never>;
  const parsed = lessonSchema.safeParse(raw.data);
  if (!parsed.success) return zodFail(`урок ${file} модуля «${manifest.id}»`, parsed.error);
  if (parsed.data.moduleId !== manifest.id) {
    return coreError('INVALID_SCHEMA',
      `В уроке «${parsed.data.id}» указан чужой moduleId («${parsed.data.moduleId}»).`);
  }
  return { ok: true, data: parsed.data };
}

/** URL ассета модуля. Разрешены только относительные пути пакета. */
export function assetUrl(moduleId: string, rel?: string): string | undefined {
  if (!rel) return undefined;
  return `${MODULES_BASE}${moduleId}/${rel}`;
}

/** Отсортированный по order список файлов уроков манифеста. */
export function sortedLessonFiles(m: Manifest): string[] {
  return [...m.lessons].sort((a, b) => a.order - b.order).map((l) => l.file);
}

/* ══ IndexedDB-слой: основной источник истины (утверждение 2) ══ */

/** Все модули из IndexedDB (включая seed — фильтрация на уровне UI). */
export async function listStoredModules(): Promise<StoredModule[]> {
  const all = await getAllModules();
  return all.sort((a, b) => a.addedAt.localeCompare(b.addedAt));
}

export async function getStoredModule(id: string): Promise<LoadResult<StoredModule>> {
  const rec = await getModule(id);
  if (!rec) return coreError('NOT_FOUND', `Модуль «${id}» не установлен.`);
  const compat = validateCompatibility(rec.manifest);
  if (!compat.ok) return compat;
  return { ok: true, data: rec };
}

/** Урок из хранимой записи (уже провалидирован при установке). */
export function lessonFromRecord(rec: StoredModule, file: string): LoadResult<Lesson> {
  const lesson = rec.lessons[file];
  if (!lesson) return coreError('NOT_FOUND', `Урок «${file}» отсутствует в модуле «${rec.id}».`);
  return { ok: true, data: lesson };
}

/** URL визуала шага/опции: сначала ассеты zip (dataURL), затем файлы public/modules. */
export function moduleAssetUrl(rec: StoredModule, rel?: string): string | undefined {
  if (!rel) return undefined;
  const data = rec.assets[rel];
  if (data) return data;
  if (rec.isSeed) return assetUrl(rec.id, rel); // seed-модули лежат в public/modules
  return undefined;
}

/* ══ Seed: служебные демо-модули из /modules/registry.json (один раз) ══ */

const SEED_FLAG_KEY = 'hl.seeded.v1';

export function isSeeded(): boolean {
  try { return localStorage.getItem(SEED_FLAG_KEY) === 'true'; } catch { return false; }
}

export function markSeeded(): void {
  try { localStorage.setItem(SEED_FLAG_KEY, 'true'); } catch { /* ignore */ }
}

/**
 * Однократный перенос служебных модулей из публичного реестра в IndexedDB.
 * Флаг ставится ДО копирования: удалённые пользователем seed-модули не возвращаются.
 * broken-demo НЕ сеется — он живёт только в tests/fixtures (утверждение C).
 */
export async function seedOnce(): Promise<void> {
  if (isSeeded()) return;
  markSeeded();
  const reg = await loadRegistry();
  if (!reg.ok) { log.warn('[seed] реестр недоступен, пропускаем:', reg.error.message); return; }
  for (const entry of reg.data.modules.filter((m) => m.enabled && m.id !== 'broken-demo')) {
    const man = await loadManifest(entry);
    if (!man.ok) { log.warn(`[seed] модуль «${entry.id}» пропущен:`, man.error.message); continue; }
    if (await getModule(man.data.id)) continue; // уже есть — не трогаем
    const lessons: Record<string, Lesson> = {};
    for (const f of sortedLessonFiles(man.data)) {
      const les = await loadLesson(man.data, f);
      if (!les.ok) { log.warn(`[seed] урок ${f} модуля «${entry.id}» пропущен:`, les.error.message); continue; }
      lessons[f] = les.data;
    }
    if (man.data.lessons.length !== 12) {
      log.warn(`[loader] seed module ${man.data.id} bypasses 12-lesson rule`);
    }
    await putModule({
      id: man.data.id, manifest: man.data, lessons, assets: {},
      status: 'ready', isSeed: true, addedAt: new Date().toISOString(),
    });
    log.info(`[seed] служебный модуль «${man.data.id}» установлен.`);
  }
}
