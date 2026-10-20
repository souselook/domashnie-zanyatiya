// Раскладка repeat-слоёв сцены. Чистые функции, без DOM.
// Контракт (зафиксирован на Этапе 3.5):
//   base = BASE_ITEM_PCT (% от меньшей стороны контейнера), ОДИН для всех слоёв —
//          count не влияет на размер элемента (иначе «1 яблоко» ≠ «3 яблока» по размеру).
//   step = base + gap.
//   1D (row/col): pos_i = center - ((n-1)/2)*step + i*step, i = 0..n-1.
//          Блок центрируется ровно по at.x/at.y (среднее позиций == center).
//   grid:  cols = ceil(sqrt(count)), rows = ceil(count/cols);
//          формула применяется ДВАЖДЫ: по x через cols, по y через rows (а не через общий count!).
//          Заполнение — строками слева направо; при count, не кратном cols,
//          последняя строка частично заполнена (элементы слева) — ожидаемое поведение v1.

import { BASE_ITEM_PCT } from './constants';

export interface Point {
  x: number;
  y: number;
}

export interface RepeatSpec {
  count: number;
  layout: 'row' | 'col' | 'grid';
  gap: number; // проценты
}

/** Позиции вдоль одной оси: n элементов, шаг step, центр блока = center. */
export function axisPositions(center: number, n: number, step: number): number[] {
  const start = center - ((n - 1) / 2) * step;
  return Array.from({ length: n }, (_, i) => round1(start + i * step));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Разложение count в сетку: cols >= rows, cols = ceil(sqrt(count)). */
export function gridDims(count: number): { cols: number; rows: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  return { cols, rows };
}

/**
 * Координаты ЦЕНТРОВ элементов repeat-слоя (в % от контейнера).
 * scale из слоя масштабирует и базовый размер, и шаг раскладки.
 */
export function computeRepeatPositions(at: Point, repeat: RepeatSpec, scale = 1): Point[] {
  const base = BASE_ITEM_PCT * scale;
  const step = base + repeat.gap;
  const { count, layout } = repeat;

  if (layout === 'row') {
    return axisPositions(at.x, count, step).map((x) => ({ x, y: at.y }));
  }
  if (layout === 'col') {
    return axisPositions(at.y, count, step).map((y) => ({ x: at.x, y }));
  }

  // grid: отдельная формула по каждой оси — x через cols, y через rows.
  const { cols, rows } = gridDims(count);
  const xs = axisPositions(at.x, cols, step);
  const ys = axisPositions(at.y, rows, step);
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    pts.push({ x: xs[i % cols], y: ys[Math.floor(i / cols)] });
  }
  return pts;
}
