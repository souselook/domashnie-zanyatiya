import { beforeEach, describe, expect, it } from 'vitest';
import {
  upsertStep, loadLessonProgress, completedStepsCount, isLessonCompleted,
  resetAllProgress, DEFAULT_SETTINGS, loadSettings, saveSettings,
} from '../core/storage';
import type { Lesson } from '../core/schema';

const lesson: Lesson = {
  lessonVersion: 1, id: 'l1', moduleId: 'm1', title: 'T', tips: [], materials: [],
  steps: [
    { id: 's1', type: 'instruction', mode: 'parent', parentScript: 'а' },
    { id: 's2', type: 'instruction', mode: 'parent', parentScript: 'б' },
  ],
};

beforeEach(() => { localStorage.clear(); });

describe('прогресс в localStorage', () => {
  it('пишет и читает шаг, восстанавливается после «перезагрузки»', () => {
    upsertStep('m1', 'l1', 's1', { completedAt: '2026-10-20T00:00:00.000Z', secondsSpent: 30 });
    const p = loadLessonProgress('m1', 'l1');
    expect(p?.steps['s1'].completedAt).toBe('2026-10-20T00:00:00.000Z');
    expect(p?.lastStepId).toBe('s1');
    expect(completedStepsCount(p)).toBe(1);
    expect(isLessonCompleted(lesson, p)).toBe(false);
  });

  it('отметка skipped тоже считается пройденным шагом', () => {
    upsertStep('m1', 'l1', 's1', { completedAt: 'x' });
    upsertStep('m1', 'l1', 's2', { skipped: true });
    expect(isLessonCompleted(lesson, loadLessonProgress('m1', 'l1'))).toBe(true);
  });

  it('заметки рефлексии сохраняются', () => {
    upsertStep('m1', 'l1', 's1', { notes: 'считал до трёх 👍' });
    expect(loadLessonProgress('m1', 'l1')?.steps['s1'].notes).toBe('считал до трёх 👍');
  });

  it('resetAllProgress очищает всё', () => {
    upsertStep('m1', 'l1', 's1', {});
    resetAllProgress();
    expect(loadLessonProgress('m1', 'l1')).toBeUndefined();
  });
});

describe('настройки', () => {
  it('без записи возвращает дефолты', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('сохраняет и мержит с дефолтами', () => {
    saveSettings({ ...DEFAULT_SETTINGS, fontScale: 'large' });
    expect(loadSettings().fontScale).toBe('large');
    // TTS в v1 отключён (решение 5): дефолт false даже после сохранения настроек.
    expect(loadSettings().ttsEnabled).toBe(false);
  });
});
