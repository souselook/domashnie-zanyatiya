// Хранилище прогресса и настроек (localStorage, см. STAGE1_SPEC.md §7).
// Интерфейс намеренно асинхронный-подобный (простые функции), но изолирован —
// при переходе на IndexedDB меняется только эта реализация.

import type { Lesson } from './schema';

export interface Settings {
  ttsEnabled: boolean;
  speechRate: number;      // 0.5–1.5
  fontScale: 'normal' | 'large' | 'xlarge';
  timerEnabled: boolean;   // мягкое напоминание по durationSec
}

export const DEFAULT_SETTINGS: Settings = {
  ttsEnabled: true,
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

const SETTINGS_KEY = 'hl.settings.v1';
const PROGRESS_KEY = 'hl.progress.v1';

/* ── настройки ───────────────────────────────────────────────── */

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

export function loadLessonProgress(moduleId: string, lessonId: string): LessonProgress | undefined {
  return readAll()[progressKey(moduleId, lessonId)];
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
  all[key] = cur;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return cur;
}

export function setLastStep(moduleId: string, lessonId: string, stepId: string): void {
  const all = readAll();
  const key = progressKey(moduleId, lessonId);
  const cur: LessonProgress = all[key] ?? {
    lessonId, moduleId, startedAt: new Date().toISOString(), steps: {},
  };
  cur.lastStepId = stepId;
  all[key] = cur;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
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

export function resetAllProgress(): void {
  try { localStorage.removeItem(PROGRESS_KEY); } catch { /* ignore */ }
}
