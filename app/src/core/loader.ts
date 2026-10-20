import { CORE_SUPPORTED_API, CORE_VERSION, MODULES_BASE } from './config';
import { coreError, type LoadResult } from './errors';
import {
  registrySchema, manifestSchema, lessonSchema,
  type Registry, type Manifest, type Lesson, type RegistryEntry,
} from './schema';

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
