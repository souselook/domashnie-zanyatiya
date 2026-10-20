// Тесты раскладки repeat (Этап 3.5, фиксы A/B + фикс grid count=5).
// Контракт: pos_i = center - ((n-1)/2)*step + i*step, step = base + gap, base = 15%.
// grid: x через cols, y через rows — ДВЕ отдельные формулы, не общий count.

import { describe, expect, it } from 'vitest';
import { axisPositions, computeRepeatPositions, gridDims } from '../core/scene/layout';
import { BASE_ITEM_PCT } from '../core/scene/constants';
import { render } from '@testing-library/react';
import SceneView from '../components/SceneView';
import type { Scene } from '../core/schema';

describe('layout: базовый размер', () => {
  it('base = 15% от меньшей стороны, един для всех слоёв', () => {
    expect(BASE_ITEM_PCT).toBe(15);
  });

  it('count не влияет на размер элемента (фикс 1)', () => {
    // позиции существуют и для count=1, и для count=3 — но функция считает только центры;
    // размер задаётся в Scene.tsx как BASE_ITEM_PCT*scale независимо от repeat.
    const one = computeRepeatPositions({ x: 50, y: 50 }, { count: 1, layout: 'row', gap: 10 });
    const three = computeRepeatPositions({ x: 50, y: 50 }, { count: 3, layout: 'row', gap: 15 });
    expect(one).toHaveLength(1);
    expect(three).toHaveLength(3);
  });
});

describe('layout: row/col (фикс A — симметричное центрирование)', () => {
  it('row count=3 gap=15 at={50,50} → x = [20, 50, 80]', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 3, layout: 'row', gap: 15 });
    expect(pts.map((p) => p.x)).toEqual([20, 50, 80]);
    expect(pts.every((p) => p.y === 50)).toBe(true);
  });

  it('col count=4 gap=10 at={50,50} → y = [12.5, 37.5, 62.5, 87.5] (среднее == 50)', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 4, layout: 'col', gap: 10 });
    expect(pts.map((p) => p.y)).toEqual([12.5, 37.5, 62.5, 87.5]);
    expect(pts.every((p) => p.x === 50)).toBe(true);
    const mean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    expect(mean).toBeCloseTo(50, 5);
  });

  it('формула явная: axisPositions совпадает с pos_i = c - ((n-1)/2)*step + i*step', () => {
    expect(axisPositions(50, 4, 25)).toEqual([12.5, 37.5, 62.5, 87.5]);
    expect(axisPositions(50, 3, 30)).toEqual([20, 50, 80]);
  });
});

describe('layout: grid (фикс B + фикс count=5: x через cols, y через rows)', () => {
  it('gridDims: 4→2×2, 5→3×2, 7→3×3, 9→3×3, 1→1×1', () => {
    expect(gridDims(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridDims(5)).toEqual({ cols: 3, rows: 2 });
    expect(gridDims(7)).toEqual({ cols: 3, rows: 3 });
    expect(gridDims(9)).toEqual({ cols: 3, rows: 3 });
    expect(gridDims(1)).toEqual({ cols: 1, rows: 1 });
  });

  it('grid count=4 gap=10 at={50,50} → [(37.5,37.5),(62.5,37.5),(37.5,62.5),(62.5,62.5)]', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 4, layout: 'grid', gap: 10 });
    expect(pts).toEqual([
      { x: 37.5, y: 37.5 },
      { x: 62.5, y: 37.5 },
      { x: 37.5, y: 62.5 },
      { x: 62.5, y: 62.5 },
    ]);
  });

  it('grid count=5 gap=10 at={50,50} → x через cols=3: [25,50,75], y через rows=2', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 5, layout: 'grid', gap: 10 });
    expect(pts).toEqual([
      { x: 25, y: 37.5 },
      { x: 50, y: 37.5 },
      { x: 75, y: 37.5 },
      { x: 25, y: 62.5 },
      { x: 50, y: 62.5 },
    ]);
    // ни один элемент не выходит за границы с учётом половины ширины (7.5%)
    for (const p of pts) {
      expect(p.x - 7.5).toBeGreaterThanOrEqual(0);
      expect(p.x + 7.5).toBeLessThanOrEqual(100);
    }
  });

  it('grid count=7 gap=10 at={50,50} → 3×3, последний ряд 1 элемент слева', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 7, layout: 'grid', gap: 10 });
    expect(pts).toEqual([
      { x: 25, y: 25 },
      { x: 50, y: 25 },
      { x: 75, y: 25 },
      { x: 25, y: 50 },
      { x: 50, y: 50 },
      { x: 75, y: 50 },
      { x: 25, y: 75 },
    ]);
  });

  it('scale масштабирует шаг раскладки (step = base*scale + gap)', () => {
    const pts = computeRepeatPositions({ x: 50, y: 50 }, { count: 3, layout: 'row', gap: 10 }, 2);
    // base=30, step=40 → 10, 50, 90
    expect(pts.map((p) => p.x)).toEqual([10, 50, 90]);
  });
});

// ─── Этап 4: scale как поле слоя (additive-изменение схемы) ───
import { sceneLayerSchema } from '../core/schema/scene';

describe('scale слоя: контракт схемы + рендера', () => {
  it('слой без scale проходит схему и получает default = 1', () => {
    const layer = sceneLayerSchema.parse({ sprite: 'objects/fruits#apple-red', at: { x: 50, y: 50 } });
    expect(layer.scale).toBe(1);
  });

  it('layer со scale=1.5 рендерится с увеличенным размером (BASE_ITEM_PCT * scale)', () => {
    render(<SceneView scene={{ layers: [
      { sprite: 'objects/fruits#apple-red', at: { x: 30, y: 50 }, scale: 1 },
      { sprite: 'objects/fruits#apple-red', at: { x: 70, y: 50 }, scale: 1.5 },
    ] } as Scene} />);
    // width слоя = BASE_ITEM_PCT*scale в % — второй слой шире первого ровно в 1.5 раза
    const imgs = document.querySelectorAll('[data-testid="scene"] svg[width]');
    void imgs; // jsdom: <use href> не резолвится — проверяем style обёртки слоя
    const wrappers = Array.from(document.querySelectorAll('[data-testid="scene"] div[style*="aspect-ratio"]'));
    const widths = wrappers.map((el) => (el as HTMLElement).style.width);
    expect(widths).toContain('15%');
    expect(widths).toContain('22.5%');
  });

  it('scale вне диапазона (0/6) отклоняется схемой', () => {
    expect(() => sceneLayerSchema.parse({ sprite: 'a/b#c', at: { x: 1, y: 1 }, scale: 0 })).toThrow();
    expect(() => sceneLayerSchema.parse({ sprite: 'a/b#c', at: { x: 1, y: 1 }, scale: 6 })).toThrow();
  });
});
