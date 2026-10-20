import { describe, expect, it } from 'vitest';
import {
  initialCtx, transition, canGoNext, canGoPrev, type PlayerCtx,
} from '../core/player';

const mk = (over: Partial<PlayerCtx> = {}): PlayerCtx => ({ state: 'running', stepIndex: 0, stepCount: 3, ...over });

describe('конечный автомат проигрывателя', () => {
  it('NEXT идёт по шагам стрелками, на последнем → done (без автоперехода)', () => {
    let c = initialCtx(3);
    c = transition(c, { type: 'NEXT' });
    expect(c.stepIndex).toBe(1);
    c = transition(c, { type: 'NEXT' });
    expect(c.stepIndex).toBe(2);
    c = transition(c, { type: 'NEXT' });
    expect(c.state).toBe('done');
  });

  it('PREV возвращается назад и не уходит за ноль', () => {
    let c = mk({ stepIndex: 2 });
    c = transition(c, { type: 'PREV' });
    expect(c.stepIndex).toBe(1);
    c = transition(mk({ stepIndex: 0 }), { type: 'PREV' });
    expect(c.stepIndex).toBe(0);
  });

  it('на паузе переходы NEXT/PREV/SKIP заблокированы, RESUME снимает паузу', () => {
    const paused = transition(mk(), { type: 'PAUSE' });
    expect(paused.state).toBe('paused');
    expect(transition(paused, { type: 'NEXT' })).toBe(paused);
    expect(transition(paused, { type: 'PREV' })).toBe(paused);
    expect(transition(paused, { type: 'SKIP' })).toBe(paused);
    expect(transition(paused, { type: 'RESUME' }).state).toBe('running');
  });

  it('SKIP помечается как переход вперёд без отметки completed', () => {
    const c = transition(mk({ stepIndex: 1 }), { type: 'SKIP' });
    expect(c.stepIndex).toBe(2);
  });

  it('QUIT возвращает в intro', () => {
    expect(transition(mk(), { type: 'QUIT' }).state).toBe('intro');
  });

  it('canGoNext/canGoPrev учитывают состояние и границы', () => {
    expect(canGoPrev(mk({ stepIndex: 0 }))).toBe(false);
    expect(canGoPrev(mk({ stepIndex: 1 }))).toBe(true);
    expect(canGoNext(mk({ state: 'paused' }))).toBe(false);
    expect(canGoNext(mk())).toBe(true);
  });

  it('startStep восстанавливается из прогресса и ограничивается сверху', () => {
    expect(initialCtx(3, 2).stepIndex).toBe(2);
    expect(initialCtx(3, 99).stepIndex).toBe(2); // clamp к последнему
  });
});

describe('восстановление шага (RESET)', () => {
  it('RESET перематывает на указанный шаг и возвращает running', () => {
    const c = transition(mk({ state: 'intro' }), { type: 'RESET', index: 2 });
    expect(c.stepIndex).toBe(2);
    expect(c.state).toBe('running');
  });
  it('RESET обрезает индекс границами шагов', () => {
    expect(transition(mk(), { type: 'RESET', index: 99 }).stepIndex).toBe(2);
    expect(transition(mk(), { type: 'RESET', index: -5 }).stepIndex).toBe(0);
  });
});
