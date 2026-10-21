import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
export function usePlayer(rawStepCount: number, startStep = 0, ready = true): [PlayerCtx, PlayerActions] {
  /* ── hotfix v1.1.1 (корневая причина «Занятие окончено» в e2e-drag,
     воспроизведена unit-зондом usePlayer.probe.test.tsx):
     Пока урок не загружен, rawStepCount = 0 → Math.max(1, 0) давал ctx со
     stepCount === 1, и первый же NEXT на «последнем» шаге редьюсера
     переводил автомат в done — экран «Занятие окончено» появлялся сразу
     после монтирования плеера. Кроме того, useReducer НЕ перечитывает
     lazy-init при re-render: «застрявший» ctx со stepCount=1 переживал
     загрузку урока.

     Фикс: автомат ПЕРЕСОЗДАЁТСЯ по ключу урока (ready + число шагов +
     восстановленный шаг). Ключ меняется через setMachineKey в effect;
     guard builtFor в рендере делает dispatch RESET с актуальными
     index/stepCount (см. case 'RESET' в core/player.ts) ровно один раз
     на каждый новый ключ. До готовности урока ключ = 'loading'.
     Движения родителя — источник истины: после первого NEXT/PREV/SKIP
     ключ замораживается (запоздалые снимки прогресса не перематывают
     плеер и не завершают занятие). ── */
  const stepCount = Math.max(1, rawStepCount);
  const moveCount = useRef(0);
  const liveIndexRef = useRef(startStep);

  const [machineKey, setMachineKey] = useState<string>(() =>
    ready ? `${stepCount}:${startStep}` : 'loading');

  useEffect(() => {
    if (moveCount.current > 0) return; // движение было — ключ заморожен
    if (!ready) {
      if (machineKey !== 'loading') setMachineKey('loading');
      return;
    }
    const next =
      machineKey === 'loading' || Number(machineKey.split(':')[0]) !== stepCount
        ? `${stepCount}:${startStep}`
        : machineKey;
    if (next !== machineKey) setMachineKey(next);
  }, [ready, stepCount, startStep, machineKey]);

  const [ctx, dispatch] = useReducer(transition, undefined, () =>
    initialCtx(stepCount, ready ? startStep : 0));

  const builtFor = useRef<string | null>(null);
  if (builtFor.current !== machineKey) {
    // пересоздание автомата под новый ключ урока: RESET с актуальными
    // stepCount и позицией; позиция сохраняется, если пользователь уже
    // двигался (движения — источник истины)
    builtFor.current = machineKey;
    const idx = moveCount.current > 0 ? liveIndexRef.current : (ready ? startStep : 0);
    dispatch({ type: 'RESET', index: idx, stepCount });
  }

  useEffect(() => { liveIndexRef.current = ctx.stepIndex; });

  const actions = useMemo<PlayerActions>(() => ({
    send: (ev: PlayerEvent) => {
      if (MOVE_EVENTS.has(ev.type)) moveCount.current += 1;
      dispatch(ev);
    },
  }), []);

  /* ── hotfix v1.0.1: «Дальше» завершала занятие / мотала к началу шага.
     setLastStep пишет lastStepId АСИНХРОННО (IndexedDB + зеркало
     localStorage), поэтому React мог пакетировать обновление прогресса
     вместе с NEXT и appliedStart-булев флаг не замечал запоздалый RESET.
     Счётчик движений вместо булева флага: после движения автомат НЕ
     делает RESET вообще (ветка ниже требует moveCount === 0); восстановление
     позиции из прогресса нужно только до первого действия. ── */
  useEffect(() => {
    // пока урок не загружен — не трогаем автомат
    if (!ready || rawStepCount <= 0) return;
    // восстановление из прогресса — только до первого движения
    if (
      moveCount.current === 0 &&
      startStep > 0 &&
      startStep < stepCount &&
      ctx.stepIndex === 0 &&
      ctx.state === 'running'
    ) {
      dispatch({ type: 'RESET', index: startStep, stepCount });
      return;
    }
    // защита от рассинхрона при смене урока — только если пользователь ещё
    // не двигался (иначе это ложный выход из-за пакетирования редьюсеров)
    if (moveCount.current === 0 && ctx.stepIndex >= stepCount) dispatch({ type: 'QUIT' });
  }, [ready, rawStepCount, stepCount, startStep, ctx.stepIndex, ctx.state]);

  return [ctx, actions];
}
