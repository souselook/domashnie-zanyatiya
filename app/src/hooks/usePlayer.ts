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
  /* ── Этап 5.1: ключ загрузки урока. Прогресс подгружается асинхронно,
     поэтому startStep может прийти ПОСЛЕ первого клика «Дальше». Раньше
     appliedStart был булевым флагом «один раз за mount» — запоздалый
     RESET перематывал плеер к восстановленному шагу и затирал прогресс
     пользователя (урок авто-завершался на первом же NEXT). Теперь RESET
     применяется только если пользователь ещё НЕ двигался (stepIndex === 0),
     и ровно для одного актуального значения startStep. ── */
  const appliedFor = useRef<number | null>(null);

  useEffect(() => {
    // пока урок не загружен — не трогаем автомат
    if (!ready || stepCount <= 0) return;
    if (appliedFor.current !== startStep) {
      appliedFor.current = startStep;
      // применяем восстановленный шаг один раз за загрузку урока,
      // но только если ребёнок/родитель ещё не начал движение по шагам
      if (startStep > 0 && startStep < stepCount && ctx.stepIndex === 0) {
        dispatch({ type: 'RESET', index: startStep });
      }
      return;
    }
    // защита от рассинхрона при смене урока
    if (ctx.stepIndex >= stepCount) dispatch({ type: 'QUIT' });
  }, [ready, stepCount, startStep, ctx.stepIndex]);

  return [ctx, actions];
}
