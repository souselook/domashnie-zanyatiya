// IndexedDB-хранилище ядра (idb): модули, прогресс, настройки, overrides спрайтов.
// Схема БД v1. Прогресс и настройки переезжают из localStorage сюда;
// флаг seed остаётся в localStorage (hl.seeded.v1) — он должен переживать удаление БД.

import { openDB, type IDBPDatabase } from 'idb';
import type { Lesson, Manifest } from './schema';
import type { Settings, LessonProgress } from './storage';

export const DB_NAME = 'home-lessons';
export const DB_VERSION = 1;

export const STORE_MODULES = 'modules';
export const STORE_PROGRESS = 'progress';
export const STORE_SETTINGS = 'settings';
export const STORE_OVERRIDES = 'spriteOverrides';

/** Запись модуля в IndexedDB. */
export interface StoredModule {
  id: string;                 // = manifest.id (keyPath)
  manifest: Manifest;
  lessons: Record<string, Lesson>; // ключ — file из манифеста ("lessons/x.json")
  assets: Record<string, string>;  // путь → dataURL (svg/png), для ассетов из zip
  status: 'ready' | 'incomplete';  // incomplete — не хватает спрайтов (этап 3/4)
  isSeed: boolean;                 // служебные демо-модули (скрыты в основном списке)
  addedAt: string;                 // ISO
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_MODULES)) {
          db.createObjectStore(STORE_MODULES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS); // ключ: `${moduleId}/${lessonId}`
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS); // ключ: 'v1'
        }
        if (!db.objectStoreNames.contains(STORE_OVERRIDES)) {
          db.createObjectStore(STORE_OVERRIDES); // ключ: moduleId
        }
      },
    });
  }
  return dbPromise;
}

/* ── модули ──────────────────────────────────────────────────── */

export async function putModule(rec: StoredModule): Promise<void> {
  await (await getDB()).put(STORE_MODULES, rec);
}

export async function getModule(id: string): Promise<StoredModule | undefined> {
  return (await getDB()).get(STORE_MODULES, id);
}

export async function getAllModules(): Promise<StoredModule[]> {
  return (await getDB()).getAll(STORE_MODULES) as Promise<StoredModule[]>;
}

export async function deleteModule(id: string): Promise<void> {
  await (await getDB()).delete(STORE_MODULES, id);
}

/* ── прогресс ────────────────────────────────────────────────── */

export async function getAllProgress(): Promise<Record<string, LessonProgress>> {
  const db = await getDB();
  const keys = (await db.getAllKeys(STORE_PROGRESS)) as string[];
  const vals = (await db.getAll(STORE_PROGRESS)) as LessonProgress[];
  const out: Record<string, LessonProgress> = {};
  keys.forEach((k, i) => { out[k] = vals[i]; });
  return out;
}

export async function getProgress(key: string): Promise<LessonProgress | undefined> {
  return (await getDB()).get(STORE_PROGRESS, key);
}

export async function putProgress(key: string, value: LessonProgress): Promise<void> {
  await (await getDB()).put(STORE_PROGRESS, value, key);
}

export async function clearProgress(): Promise<void> {
  await (await getDB()).clear(STORE_PROGRESS);
}

/* ── настройки (одна запись 'v1') ────────────────────────────── */

const SETTINGS_ID = 'v1';

export async function getSettings(): Promise<Settings | undefined> {
  return (await getDB()).get(STORE_SETTINGS, SETTINGS_ID);
}

export async function putSettings(s: Settings): Promise<void> {
  await (await getDB()).put(STORE_SETTINGS, s, SETTINGS_ID);
}

/* ── overrides спрайтов по модулю ────────────────────────────── */

export type SpriteOverrideMap = Record<string, string>; // originalRef → replacementRef

export async function getSpriteOverrides(moduleId: string): Promise<SpriteOverrideMap> {
  const map = (await (await getDB()).get(STORE_OVERRIDES, moduleId)) as SpriteOverrideMap | undefined;
  return map ?? {};
}

export async function putSpriteOverrides(moduleId: string, map: SpriteOverrideMap): Promise<void> {
  await (await getDB()).put(STORE_OVERRIDES, map, moduleId);
}
