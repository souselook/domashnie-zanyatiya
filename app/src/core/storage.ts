// Хранилище прогресса и настроек.
// Источник истины — IndexedDB (src/core/db.ts); localStorage используется только для
// кэша последнего чтения (синхронные геттеры в рендере) и флага seed (hl.seeded.v1).

import type { Lesson } from './schema';
import {
  putProgress, getAllProgress, clearProgress as dbClearProgress,
  getSettings, putSettings,
} from './db';

export interface Settings {
  ttsEnabled: boolean;     // v1: переключатель disabled, «будет в следующей версии»
  speechRate: number;      // 0.5–1.5
  fontScale: 'normal' | 'large' | 'xlarge';
  timerEnabled: boolean;   // мягкое напоминание по durationSec
}

export const DEFAULT_SETTINGS: Settings = {
  ttsEnabled: false,
  speechRate: 0.9,
  fontScale: 'normal',
  timerEnabled: true,
};

export interface StepRecord {
  completedAt?: string;   // ISO
  secondsSpent?: number;
  skipped?: boolean;
  offlineConfirmed?: boolean;
  notes?: string;         // заметки рефлексии
}

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  startedAt?: string;
  lastStepId?: string;
  steps: Record<string, StepRecord>;
}

const SETTINGS_KEY = 'hl.settings.v1';   // зеркало последней записи (для dev-отладки)
const PROGRESS_KEY = 'hl.progress.v1';  // зеркало последней записи

/* ── настройки ───────────────────────────────────────────────── */

/** Синхронное чтение зеркала (localStorage). Актуальные данные пишет async-версия. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* quota/приватный режим */ }
  void putSettings(s); // основной источник — IndexedDB
}

/** Асинхронная загрузка настроек из IndexedDB с откатом на localStorage-зеркало. */
export async function loadSettingsAsync(): Promise<Settings> {
  const fromDb = await getSettings();
  if (fromDb) {
    const merged = { ...DEFAULT_SETTINGS, ...fromDb };
    saveSettingsMirrorOnly(merged);
    return merged;
  }
  const mirror = loadSettings();
  void putSettings(mirror); // миграция при первом запуске поверх старой версии
  return mirror;
}

function saveSettingsMirrorOnly(s: Settings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/* ── прогресс ────────────────────────────────────────────────── */

type ProgressMap = Record<string, LessonProgress>; // ключ: `${moduleId}/${lessonId}`

export function progressKey(moduleId: string, lessonId: string): string {
  return `${moduleId}/${lessonId}`;
}

function readAll(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function writeAll(all: ProgressMap): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

/** Загрузить весь прогресс из IndexedDB в синхронный кэш (вызывается при старте app). */
export async function hydrateProgressCache(): Promise<void> {
  const all = await getAllProgress();
  writeAll(all);
}

export function loadLessonProgress(moduleId: string, lessonId: string): LessonProgress | undefined {
  return readAll()[progressKey(moduleId, lessonId)];
}

async function persist(key: string, value: LessonProgress): Promise<void> {
  const all = readAll();
  all[key] = value;
  writeAll(all);
  await putProgress(key, value);
}

export function upsertStep(
  moduleId: string, lessonId: string, stepId: string, patch: StepRecord,
): LessonProgress {
  const all = readAll();
  const key = progressKey(moduleId, lessonId);
  const cur: LessonProgress = all[key] ?? {
    lessonId, moduleId, startedAt: new Date().toISOString(), steps: {},
  };
  cur.steps[stepId] = { ...cur.steps[stepId], ...patch };
  // lastStepId обновляем только если у шага ещё нет записи — иначе заметки/подтверждения
  // текущего шага будут «перемотки» назад при каждом сохранении.
  if (!all[key]) cur.lastStepId = stepId;
  void persist(key, cur);
  return cur;
}

export function setLastStep(moduleId: string, lessonId: string, stepId: string): void {
  const all = readAll();
  const key = progressKey(moduleId, lessonId);
  const cur: LessonProgress = all[key] ?? {
    lessonId, moduleId, startedAt: new Date().toISOString(), steps: {},
  };
  cur.lastStepId = stepId;
  void persist(key, cur);
}

export function isLessonCompleted(lesson: Lesson, p?: LessonProgress): boolean {
  if (!p) return false;
  return lesson.steps.every((s) => p.steps[s.id]?.completedAt || p.steps[s.id]?.skipped);
}

export function completedStepsCount(p?: LessonProgress): number {
  if (!p) return 0;
  return Object.values(p.steps).filter((r) => r.completedAt || r.skipped).length;
}

export function allProgress(): LessonProgress[] {
  return Object.values(readAll());
}

export async function resetAllProgress(): Promise<void> {
  writeAll({});
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
  await dbClearProgress();
}
