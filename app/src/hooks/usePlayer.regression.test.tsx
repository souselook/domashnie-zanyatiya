import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { transition, initialCtx, type PlayerCtx, type PlayerEvent } from '../core/player';
import { usePlayer } from './usePlayer';

describe('probe reducer stepCount', () => {
  it('direct: NEXT with stale ctx', () => {
    let c = initialCtx(1, 0);
    c = transition(c, { type: 'NEXT' });
    console.log('PROBE-DIRECT:', JSON.stringify(c)); // done?
  });
  it('instrumented hook', () => {
    const spy = (c: PlayerCtx, e: PlayerEvent) => {
      console.log('EVT', e.type, 'ctx=', JSON.stringify(c));
      return transition(c, e);
    };
    const { result, rerender } = renderHook(({ n, s }) => usePlayer(n, s), { initialProps: { n: 0, s: 0 } });
    rerender({ n: 4, s: 0 });
    console.log('after load:', JSON.stringify(result.current[0]));
    act(() => result.current[1].send({ type: 'NEXT' }));
    console.log('after NEXT:', JSON.stringify(result.current[0]));
    expect(result.current[0].state).toBe('running');
    void spy;
  });
});
