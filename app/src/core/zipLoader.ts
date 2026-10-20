// Загрузчик zip-модулей (fflate): распаковка в память → структурные проверки →
// Zod-валидация манифеста и 12 уроков → сохранение в IndexedDB.
// Каждое нарушение — отдельный код ошибки с человеческим текстом (требование C).

import { unzipSync, strFromU8 } from 'fflate';
import { REQUIRED_LESSON_COUNT } from './config';
import { manifestSchema, lessonSchema, type Manifest, type Lesson } from './schema';
import { coreError, type LoadResult } from './errors';
import { validateCompatibility } from './loader';
import { putModule, getModule, type StoredModule } from './db';
import { log } from './log';

/** Результат предпросмотра: модуль распарсен и провалидирован, но ещё не сохранён. */
export interface ParsedZipModule {
  manifest: Manifest;
  lessons: Record<string, Lesson>; // ключ — путь внутри архива ("lessons/l01.json")
  /** список файлов манифеста → фактические пути уроков в архиве */
  lessonFiles: Array<{ file: string; order: number }>;
  assets: Record<string, string>;  // "assets/x.svg" → dataURL
  exists: boolean;                 // id уже есть в IndexedDB → нужен диалог «Заменить»
}

const ASSET_EXT = /\.(svg|png|jpg|jpeg|webp|gif)$/i;

function bytesToDataURL(bytes: Uint8Array, mime: string): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function mimeFor(path: string): string {
  if (/\.svg$/i.test(path)) return 'image/svg+xml';
  if (/\.png$/i.test(path)) return 'image/png';
  if (/\.gif$/i.test(path)) return 'image/gif';
  if (/\.webp$/i.test(path)) return 'image/webp';
  return 'image/jpeg';
}

function zodIssues(err: { issues: { path: (string | number)[]; message: string }[] }): string {
  return err.issues.slice(0, 3).map((i) => `${i.path.join('.') || '—'}: ${i.message}`).join('; ');
}

/**
 * Разбирает ArrayBuffer архива в структуру без записи в БД.
 * Чистая функция над байтами — тестируется без DOM.
 */
export function parseModuleZip(buf: ArrayBuffer): LoadResult<ParsedZipModule> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf));
  } catch {
    return coreError('ZIP_INVALID', 'Архив повреждён или это не ZIP-файл. Скачайте модуль заново.');
  }
  const names = Object.keys(files);
  if (names.length === 0) return coreError('ZIP_EMPTY', 'Архив пуст.');

  // ── module.json: ровно один, в корне или в единственной корневой папке ──
  const manifestNames = names.filter((n) => /(^|\/)module\.json$/.test(n) && !n.includes('__MACOSX'));
  if (manifestNames.length === 0) {
    return coreError('ZIP_NO_MANIFEST', 'В архиве нет module.json');
  }
  if (manifestNames.length > 1) {
    return coreError('ZIP_MULTI_MANIFEST', 'В архиве больше одного module.json', manifestNames.join(', '));
  }
  const manifestName = manifestNames[0];
  // корень архива: "" или "<папка>/" — все файлы обязаны лежать под ним
  const root = manifestName === 'module.json' ? '' : manifestName.replace(/module\.json$/, '');
  const outside = names.filter((n) => root && !n.startsWith(root) && !n.includes('__MACOSX') && !n.endsWith('/'));
  if (outside.length > 0) {
    return coreError('ZIP_INVALID',
      'Файлы модуля лежат в разных корневых папках. В архиве должна быть одна папка модуля.',
      outside.slice(0, 3).join(', '));
  }
  const rel = (n: string) => (root ? n.slice(root.length) : n);

  // ── манифест через Zod ──
  let manifestRaw: unknown;
  try {
    manifestRaw = JSON.parse(strFromU8(files[manifestName]));
  } catch {
    return coreError('INVALID_JSON', 'module.json не является корректным JSON.');
  }
  const mp = manifestSchema.safeParse(manifestRaw);
  if (!mp.success) {
    return coreError('INVALID_SCHEMA', 'module.json не соответствует формату модуля.', zodIssues(mp.error));
  }
  const manifest = mp.data;

  // ── проверка совместимости версии (до разбора уроков) ──
  const compat = validateCompatibility(manifest);
  if (!compat.ok) return compat;

  // ── уроки: ровно 12 json-файлов в lessons/ ──
  const lessonNames = names.filter((n) => /(^|\/)lessons\/[^/]+\.json$/.test(n) && !n.includes('__MACOSX'));
  if (lessonNames.length !== REQUIRED_LESSON_COUNT) {
    return coreError('ZIP_LESSON_COUNT',
      `Уроков должно быть ровно ${REQUIRED_LESSON_COUNT}, найдено ${lessonNames.length}.`);
  }

  const lessons: Record<string, Lesson> = {};
  for (const ln of lessonNames) {
    const r = rel(ln);
    let parsed: unknown;
    try {
      parsed = JSON.parse(strFromU8(files[ln]));
    } catch {
      return coreError('INVALID_JSON', `Файл урока «${r}» повреждён: это не корректный JSON.`);
    }
    const lp = lessonSchema.safeParse(parsed);
    if (!lp.success) {
      return coreError('INVALID_SCHEMA', `Урок «${r}» не соответствует формату.`, zodIssues(lp.error));
    }
    const lesson = lp.data;
    // проверка: reflection есть ровно одна и последняя — инвариант схемы;
    // отдельный человекочитаемый код для ясного текста в ErrorPanel:
    const reflIdx = lesson.steps.map((s) => s.type).lastIndexOf('reflection');
    const reflCount = lesson.steps.filter((s) => s.type === 'reflection').length;
    if (reflCount !== 1 || reflIdx !== lesson.steps.length - 1) {
      return coreError('ZIP_REFLECTION', `В уроке «${lesson.id}» нет reflection или она не последняя.`);
    }
    if (lesson.moduleId !== manifest.id) {
      return coreError('ZIP_MODULE_MISMATCH',
        `lesson.moduleId («${lesson.moduleId}») не совпадает с manifest.id («${manifest.id}»).`);
    }
    lessons[r] = lesson;
  }

  // ── каждый урок из манифеста обязан присутствовать в архиве ──
  const lessonFiles: Array<{ file: string; order: number }> = [];
  for (const l of manifest.lessons) {
    const key = l.file.replace(/^\.\//, '');
    if (!lessons[key]) {
      return coreError('NOT_FOUND',
        `Манифест ссылается на урок «${key}», но его нет в архиве.`);
    }
    lessonFiles.push({ file: key, order: l.order });
  }

  // ── ассеты (только картинки, whitelist путей) ──
  const assets: Record<string, string> = {};
  for (const n of names) {
    const r = rel(n);
    if (!ASSET_EXT.test(r) || n.endsWith('/') || n.includes('__MACOSX')) continue;
    if (r.includes('..') || r.startsWith('/')) continue; // whitelist-регулярка путей
    assets[r] = bytesToDataURL(files[n], mimeFor(r));
  }

  return {
    ok: true,
    data: { manifest, lessons, lessonFiles, assets, exists: false },
  };
}

/** Полная загрузка zip: парсинг + проверка существования id + запись в IndexedDB. */
export async function importModuleZip(
  buf: ArrayBuffer, opts: { replace?: boolean } = {},
): Promise<LoadResult<StoredModule>> {
  const p = await prepareModuleZip(buf);
  if (!p.ok) return p;
  return commitModuleZip(p.data, { replace: opts.replace });
}

/** Парсинг + пометка exists (диалог «Заменить / Отмена» решает UI). */
export async function prepareModuleZip(buf: ArrayBuffer): Promise<LoadResult<ParsedZipModule>> {
  const res = parseModuleZip(buf);
  if (!res.ok) return res;
  const existing = await getModule(res.data.manifest.id);
  return { ok: true, data: { ...res.data, exists: !!existing } };
}

/** Запись провалидированного модуля в IndexedDB. */
export async function commitModuleZip(
  parsed: ParsedZipModule, opts: { replace?: boolean } = {},
): Promise<LoadResult<StoredModule>> {
  const existing = await getModule(parsed.manifest.id);
  if (existing && !opts.replace) {
    return coreError('DUPLICATE_ID',
      `Модуль «${parsed.manifest.id}» уже установлен. Подтвердите замену или отмените.`);
  }
  const rec: StoredModule = {
    id: parsed.manifest.id,
    manifest: parsed.manifest,
    lessons: parsed.lessons,
    assets: parsed.assets,
    status: 'ready', // проверка спрайтов — этап 3/4
    isSeed: false,
    addedAt: new Date().toISOString(),
  };
  await putModule(rec);
  log.info(`zip-модуль «${rec.id}» установлен (${Object.keys(rec.lessons).length} уроков).`);
  return { ok: true, data: rec };
}
