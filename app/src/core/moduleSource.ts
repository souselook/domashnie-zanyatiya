// Единая точка загрузки модуля/урока для страниц: сначала IndexedDB (источник истины),
// затем публичный реестр (для dev-маршрутов без seed).

import { getStoredModule, lessonFromRecord, loadRegistry, loadManifest, loadLesson, sortedLessonFiles } from '../core/loader';
import type { StoredModule } from '../core/db';
import type { Lesson } from '../core/schema';
import type { LoadResult } from '../core/errors';

/** Модуль по id: из IndexedDB; если там пусто — из публичного реестра (dev-режим). */
export async function resolveModule(moduleId: string): Promise<LoadResult<StoredModule>> {
  const stored = await getStoredModule(moduleId);
  if (stored.ok) return stored;
  // fallback: модуль лежит в /public/modules, но ещё не засен в БД (например, seed отключён)
  const reg = await loadRegistry();
  if (!reg.ok) return reg;
  const entry = reg.data.modules.find((m) => m.id === moduleId && m.enabled);
  if (!entry) {
    return { ok: false, error: { code: 'NOT_FOUND', message: `Модуль «${moduleId}» не установлен.` } };
  }
  const man = await loadManifest(entry);
  if (!man.ok) return man;
  const lessons: Record<string, Lesson> = {};
  for (const f of sortedLessonFiles(man.data)) {
    const les = await loadLesson(man.data, f);
    if (les.ok) lessons[f] = les.data;
  }
  return {
    ok: true,
    data: {
      id: man.data.id, manifest: man.data, lessons, assets: {},
      status: 'ready', isSeed: true, addedAt: new Date(0).toISOString(),
    },
  };
}

/** Урок модуля по пути файла. */
export async function resolveLesson(moduleId: string, file: string): Promise<LoadResult<{ rec: StoredModule; lesson: Lesson }>> {
  const rec = await resolveModule(moduleId);
  if (!rec.ok) return rec;
  const les = lessonFromRecord(rec.data, file);
  if (!les.ok) return les;
  return { ok: true, data: { rec: rec.data, lesson: les.data } };
}

export type { StoredModule };
