import { useEffect, useMemo, useReducer, useRef } from 'react';
import { initialCtx, transition, type PlayerCtx, type PlayerEvent } from '../core/player';

export interface PlayerActions {
  send: (ev: PlayerEvent) => void;
}

/** События движения родителя по шагам — после них автомат восстановления молчит. */
const MOVE_EVENTS = new Set(['NEXT', 'PREV', 'SKIP']);

/**
 * Проигрыватель занятия. startStep — шаг, восстановленный из прогресса
 * (может прийти асинхронно после загрузки урока). Переходы — только по
 * событиям (стрелки «Назад/Дальше»), автоперехода нет.
 */
export function usePlayer(stepCount: number, startStep = 0, ready = true): [PlayerCtx, PlayerActions] {
  const [ctx, dispatch] = useReducer(transition, undefined, () => initialCtx(Math.max(1, stepCount), startStep));
  /* ── Этап 5.1: ключ загрузки урока. Прогресс подгружается асинхронно,
     поэтому startStep может прийти ПОСЛЕ первого клика «Дальше». Раньше
     appliedStart был булевым флагом «один раз за mount» — запоздалый
     RESET перематывал плеер к восстановленному шагу и затирал прогресс
     пользователя (урок авто-завершался на первом же NEXT). Теперь RESET
     применяется только если пользователь ещё НЕ двигался (stepIndex === 0),
     и ровно для одного актуального значения startStep. ── */
  const appliedFor = useRef<number | null>(null);
  /* ── hotfix v1.0.1: «Дальше» завершала занятие / мотала к началу шага.
     setLastStep пишет lastStepId АСИНХРОННО (IndexedDB + зеркало localStorage),
     поэтому React мог пакетировать обновление прогресса вместе с NEXT и
     appliedStart-булев не замечал запоздалый RESET. Счётчик движений вместо
     булева флага: после движения автомат НЕ игнорирует всё подряд, а сверяет
     startStep с позицией — устаревший (меньше) снимок игнорируется, актуальный
     (после перезагрузки) применяется без рассинхрона stepIndex/startStep. */
  const moveCount = useRef(0);
  const actions = useMemo<PlayerActions>(() => ({
    send: (ev: PlayerEvent) => {
      if (MOVE_EVENTS.has(ev.type)) moveCount.current += 1;
      dispatch(ev);
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => {
    // пока урок не загружен — не трогаем автомат
    if (!ready || stepCount <= 0) return;
    if (appliedFor.current !== startStep) {
      appliedFor.current = startStep;
      // применяем восстановленный шаг один раз за загрузку урока,
      // но только если ребёнок/родитель ещё не начал движение по шагам
      if (startStep > 0 && startStep < stepCount && ctx.stepIndex === 0) {
        dispatch({ type: 'RESET', index: startStep });
        return;
      }
      // hotfix v1.1.1: после движения НЕ делаем RESET вообще. Запоздалые
      // асинхронные снимки прогресса (IndexedDB write + зеркало localStorage)
      // приходили ПОСЛЕ NEXT и перематывали плеер (Math.max мог прыгнуть на
      // последний шаг → занятие «заканчивалось» вместо перехода). Движения
      // родителя — источник истины; восстановление позиции нужно только до
      // первого действия (ветка RESET выше, stepIndex === 0).
      return;
    }
    // защита от рассинхрона при смене урока — только если пользователь ещё
    // не двигался (иначе это ложный выход из-за пакетирования редьюсеров)
    if (moveCount.current === 0 && ctx.stepIndex >= stepCount) dispatch({ type: 'QUIT' });
  }, [ready, stepCount, startStep, ctx.stepIndex]);

  return [ctx, actions];
}
