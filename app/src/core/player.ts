// Конечный автомат проигрывателя занятия (см. STAGE1_SPEC.md §8).
// Переходы — только по событиям; таймер даёт мягкое напоминание, НЕ автопереход.

export type PlayerState = 'intro' | 'running' | 'paused' | 'done';

export type PlayerEvent =
  | { type: 'START' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SKIP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH' }            // последний шаг → done
  | { type: 'RESET'; index: number; stepCount?: number } // восстановить шаг/число шагов (при загрузке урока)
  | { type: 'QUIT'; index?: number };             // выйти в экран урока

export interface PlayerCtx {
  state: PlayerState;
  stepIndex: number;   // 0-based индекс текущего шага
  stepCount: number;
}

export function initialCtx(stepCount: number, startStep = 0): PlayerCtx {
  return { state: 'running', stepIndex: Math.min(startStep, stepCount - 1), stepCount };
}

/** Чистый переход: возвращает новый контекст или тот же, если событие неприменимо. */
export function transition(ctx: PlayerCtx, ev: PlayerEvent): PlayerCtx {
  const last = ctx.stepCount - 1;
  switch (ev.type) {
    case 'START':
      return { ...ctx, state: 'running' };
    case 'RESUME':
      return { ...ctx, state: 'running' };
    case 'PAUSE':
      return ctx.state === 'running' ? { ...ctx, state: 'paused' } : ctx;
    case 'NEXT':
      if (ctx.state !== 'running') return ctx;
      if (ctx.stepIndex >= last) return { ...ctx, state: 'done' };
      return { ...ctx, stepIndex: ctx.stepIndex + 1 };
    case 'PREV':
      if (ctx.state !== 'running') return ctx;
      return { ...ctx, stepIndex: Math.max(0, ctx.stepIndex - 1) };
    case 'SKIP':
      // Пропуск = завершение текущего шага с отметкой skipped и переход дальше.
      if (ctx.state !== 'running') return ctx;
      if (ctx.stepIndex >= last) return { ...ctx, state: 'done' };
      return { ...ctx, stepIndex: ctx.stepIndex + 1 };
    case 'FINISH':
      return { ...ctx, state: 'done' };
    case 'RESET': {
      // hotfix v1.1.1: шаг И число шагов перестраиваются атомарно —
      // автомат перезапускается при смене ключа урока (см. usePlayer).
      const count = ev.stepCount !== undefined ? Math.max(1, ev.stepCount) : ctx.stepCount;
      const idx = Math.min(Math.max(0, ev.index), count - 1);
      return { state: 'running', stepIndex: idx, stepCount: count };
    }
    case 'QUIT':
      return { ...ctx, state: 'intro', stepIndex: typeof ev.index === 'number' ? Math.min(Math.max(0, ev.index), last) : ctx.stepIndex };
  }
}

export function canGoNext(ctx: PlayerCtx): boolean {
  return ctx.state === 'running' && ctx.stepIndex <= ctx.stepCount - 1;
}
export function canGoPrev(ctx: PlayerCtx): boolean {
  return ctx.state === 'running' && ctx.stepIndex > 0;
}
