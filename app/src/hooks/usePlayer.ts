import { useEffect, useMemo, useReducer, useRef } from 'react';
import { initialCtx, transition, type PlayerCtx, type PlayerEvent } from '../core/player';

export interface PlayerActions {
  send: (ev: PlayerEvent) => void;
}

/**
 * Проигрыватель занятия. startStep — шаг, восстановленный из прогресса
 * (может прийти асинхронно после загрузки урока). Переходы — только по
 * событиям (стрелки «Назад/Дальше»), автоперехода нет.
 */
export function usePlayer(stepCount: number, startStep = 0, ready = true): [PlayerCtx, PlayerActions] {
  const [ctx, dispatch] = useReducer(transition, undefined, () => initialCtx(Math.max(1, stepCount), startStep));
  const actions = useMemo<PlayerActions>(() => ({ send: dispatch }), []);
  const appliedStart = useRef(false);

  useEffect(() => {
    // пока урок не загружен — не трогаем автомат
    if (!ready || stepCount <= 0) return;
    if (!appliedStart.current) {
      appliedStart.current = true;
      // применяем восстановленный шаг ровно один раз за загрузку урока
      if (startStep > 0 && startStep < stepCount) {
        dispatch({ type: 'RESET', index: startStep });
      }
      return;
    }
    // защита от рассинхрона при смене урока
    if (ctx.stepIndex >= stepCount) dispatch({ type: 'QUIT' });
  }, [ready, stepCount, startStep, ctx.stepIndex]);

  return [ctx, actions];
}
