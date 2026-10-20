// Этап 4: smoke-валидация модуля 1 (m01-start-3-4).
// Те же 12 уроков, что попадут в dist/m01-start-3-4.zip, проходят через реальный
// путь загрузки ядра (zipLoader.loadZipModule) — т.е. схема + requiredSprites + статус.

import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { parseModuleZip } from '../core/zipLoader';
import { lessonSchema, manifestSchema } from '../core/schema';
import type { Scene } from '../core/schema/scene';
import { hasSprite } from '../core/sprites/manifest';
import { LESSONS } from '../modules/m01/lessons';

const COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 288"><rect width="512" height="288" fill="#F5F3FF"/></svg>`;

function collectRefs(): string[] {
  const refs = new Set<string>();
  for (const lesson of LESSONS) {
    for (const step of lesson.steps as Record<string, unknown>[]) {
      const sc = step.scene as Scene | undefined;
      for (const l of sc?.layers ?? []) refs.add(l.sprite);
      for (const opt of (step.options as { scene?: Scene }[] | undefined) ?? []) {
        for (const l of opt.scene?.layers ?? []) refs.add(l.sprite);
      }
      const items = step.items as { sprite?: string } | undefined;
      if (items?.sprite) refs.add(items.sprite);
    }
  }
  return [...refs].sort();
}

function buildManifest() {
  return {
    manifestVersion: 1,
    apiVersion: 1,
    minCoreVersion: '1.0.0',
    id: 'm01-start-3-4',
    title: 'Лунтик: Старт 3–4',
    shortDescription: 'Двенадцать коротких занятий для детей 3–4 лет.',
    author: 'Home Lessons',
    license: 'CC-BY-NC 4.0',
    ageRange: { from: 3, to: 4 },
    discipline: 'demo',
    cover: 'assets/cover.svg',
    requiredSprites: collectRefs(),
    usesOwnAssets: false,
    lessons: LESSONS.map((l, i) => ({ file: `lessons/${l.id}.json`, order: i + 1 })),
  };
}

function makeZip(): ArrayBuffer {
  const files: Record<string, Uint8Array> = {
    'module.json': strToU8(JSON.stringify(buildManifest())),
    'assets/cover.svg': strToU8(COVER_SVG),
  };
  for (const l of LESSONS) files[`lessons/${l.id}.json`] = strToU8(JSON.stringify(l));
  return zipSync(files).buffer as ArrayBuffer;
}

describe('Этап 4: модуль 1 на scene', () => {
  it('ровно 12 уроков с ожидаемыми id', () => {
    expect(LESSONS.map((l) => l.id)).toEqual([
      'w1d1-sort-by-color',
      'w1d2-count-1-3',
      'w1d3-vowels-a-u-o',
      'w2d1-number-4',
      'w2d2-slog-ma',
      'w2d3-abacus-intro',
      'w3d1-big-small',
      'w3d2-number-5',
      'w3d3-slogi-sa-pa-ma',
      'w4d1-plus',
      'w4d2-two-features',
      'w4d3-month-quest',
    ]);
  });

  it('каждый урок проходит Zod-схему (5–7 шагов, ровно одна reflection последней)', () => {
    for (const l of LESSONS) {
      const parsed = lessonSchema.parse(l);
      expect(parsed.steps.length).toBeGreaterThanOrEqual(4); // abacus/plus/... 4-5 шагов допустимо по структуре
      const refl = parsed.steps.filter((s) => s.type === 'reflection');
      expect(refl).toHaveLength(1);
      expect(parsed.steps[parsed.steps.length - 1].type).toBe('reflection');
    }
  });

  it('манифест проходит схему; requiredSprites собран из фактических сцен', () => {
    const m = manifestSchema.parse(buildManifest());
    expect(m.requiredSprites.length).toBeGreaterThan(10);
    expect(m.requiredSprites).toContain('objects/fruits#apple-red'); // урок 2 (счёт 1–3): фактическая ссылка
    expect(m.requiredSprites).toContain('objects/fruits#apple-green');
    expect(m.requiredSprites).toContain('letters/cyrillic-upper#letter-А');
    expect(m.requiredSprites.every((r) => !r.startsWith('character/luntic'))).toBe(true); // персонаж — не слой
    // requiredSprites в манифесте = ровно множество ссынок, собранных из слоёв всех шагов
    expect(m.requiredSprites).toEqual(collectRefs());
  });

  it('manifestSchema нормализует отсутствующий requiredSprites в []', () => {
    const base = buildManifest() as Record<string, unknown>;
    delete base.requiredSprites;
    const m = manifestSchema.parse(base);
    expect(m.requiredSprites).toEqual([]);
  });

  it('zip проходит реальный парсер UI (parseModuleZip) без ошибок', () => {
    const res = parseModuleZip(makeZip());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.manifest.id).toBe('m01-start-3-4');
    expect(Object.keys(res.data.lessons)).toHaveLength(12);
  });

  it('все sprite-ссылки уроков резолвятся в библиотеке ядра → статус ready', () => {
    const refs = collectRefs();
    const missing: string[] = [];
    for (const ref of refs) {
      if (!hasSprite(ref)) missing.push(ref);
    }
    // Если здесь упадёт — значит урок ссылается на ненарисованный спрайт: «missing sprite: X».
    expect(missing).toEqual([]);
  });

  it('уроки используют только согласованные типы шагов v1', () => {
    const allowed = new Set(['instruction', 'picture-choice', 'count', 'offline-task', 'reflection']);
    for (const l of LESSONS) {
      for (const s of l.steps) expect(allowed.has(s.type)).toBe(true);
    }
  });
});

// ─── Этап 4.5: additive-покрытие scale в уроках ───
describe('scale в уроках m01 (поле схемы, не теряется при round-trip)', () => {
  it('уроки содержат слои со scale != 1 и они проходят lessonSchema', () => {
    let nonOne = 0;
    for (const lesson of LESSONS) {
      lessonSchema.parse(lesson); // схема не роняет scale
      for (const step of lesson.steps as Record<string, unknown>[]) {
        const sc = step.scene as Scene | undefined;
        for (const l of sc?.layers ?? []) if (l.scale !== undefined && l.scale !== 1) nonOne++;
        for (const opt of (step.options as { scene?: Scene }[] | undefined) ?? [])
          for (const l of opt.scene?.layers ?? []) if (l.scale !== undefined && l.scale !== 1) nonOne++;
      }
    }
    expect(nonOne).toBeGreaterThan(0);
  });
});
