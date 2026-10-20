import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveLesson } from '../core/moduleSource';
import type { Lesson, Manifest, Step } from '../core/schema';
import { usePlayer } from '../hooks/usePlayer';
import { useSettings } from '../hooks/useSettings';
import {
  loadLessonProgress, upsertStep, setLastStep,
  type LessonProgress,
} from '../core/storage';
import TaskRenderer from '../components/TaskRenderer';
import ErrorPanel from '../components/ErrorPanel';

export default function PlayerPage() {
  const { moduleId = '', file = '' } = useParams();
  const lessonFile = decodeURIComponent(file);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [assets, setAssets] = useState<Record<string, string>>({}); // zip-ассеты из IndexedDB
  const [error, setError] = useState<unknown>(null);
  const { settings } = useSettings();

  // загрузка урока
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await resolveLesson(moduleId, lessonFile);
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      setManifest(r.data.rec.manifest);
      setLesson(r.data.lesson);
      setAssets(r.data.rec.assets);
      // progress инициализируется синхронно (см. useState-инициализатор ниже) — здесь только mirror-обновление
      setProgress(loadLessonProgress(r.data.rec.id, r.data.lesson.id));
    })();
    return () => { alive = false; };
  }, [moduleId, lessonFile]);

  /* ── Этап 5.1: прогресс читаем синхронно при старте урока (localStorage-кэш,
     hydrateProgressCache выполняется на старте приложения). Раньше setProgress
     приходил отдельным рендером после загрузки урока — startStep менялся уже ПОСЛЕ
     первого клика «Дальше», и RESET затирал позицию пользователя. Синхронный старт
     устраняет гонку полностью; эффект ниже только обновляет кэш при внешних изменениях. ── */
  const [progress, setProgress] = useState<LessonProgress | undefined>(() =>
    lesson ? loadLessonProgress(manifest?.id ?? moduleId, lesson.id) : undefined);

  // восстановление шага из прогресса
  const startStep = useMemo(() => {
    if (!lesson || !progress?.lastStepId) return 0;
    const i = lesson.steps.findIndex((s) => s.id === progress.lastStepId);
    return i >= 0 ? i : 0;
  }, [lesson, progress]);

  useEffect(() => {
    if (lesson && manifest) {
      setProgress(loadLessonProgress(manifest.id, lesson.id));
    }
  }, [manifest?.id, lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* hotfix v1.0.1: «Дальше» перематывала к началу урока / завершала занятие.
     setLastStep пишет прогресс асинхронно; React мог пакетировать NEXT и
     обновление startStep в одном рендере, RESET проходил с ЗАПОЗДАЛЫМ значением
     (шаг 0) и перематывал плеер назад — до экрана завершения. Прогресс теперь
     читается синхронно из localStorage-кэша при каждом изменении шага, поэтому
     startStep всегда актуален и RESET безопасен. */
  const [ctx, player] = usePlayer(lesson?.steps.length ?? 0, startStep, !!lesson);

  /* hotfix v1.0.1: синхронизируем React-состояние progress с localStorage-кэшем
     при каждой смене шага. setLastStep пишет в кэш СИНХРОННО (в IndexedDB —
     асинхронно), поэтому после клика «Дальше» startStep становится актуальным
     в том же дереве, что и stepIndex: RESET не может перематывать плеер к
     устаревшему шагу и тем более доводить авто-QUIT до «Занятие окончено». */
  useEffect(() => {
    if (!lesson || !manifest) return;
    setProgress(loadLessonProgress(manifest.id, lesson.id));
  }, [ctx.stepIndex, manifest?.id, lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── локальный интерактив текущего шага ─────────────────────── */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [countAnswer, setCountAnswer] = useState<number | null>(null);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [notes, setNotes] = useState('');
  const [highlight, setHighlight] = useState(false);
  const stepStartRef = useRef<number>(Date.now());

  const step: Step | undefined = lesson?.steps[ctx.stepIndex];

  // сброс состояний при смене шага + сохранение времени предыдущего
  useEffect(() => {
    if (!step || !manifest || !lesson) return;
    setSelectedId(null); setCountAnswer(null); setChecks(step.type === 'offline-task' ? new Array(step.checklist?.length ?? 0).fill(false) : []);
    setNotes(progress?.steps[step.id]?.notes ?? '');
    stepStartRef.current = Date.now();
    setLastStep(manifest.id, lesson.id, step.id);
    // TTS в v1 не вызывается (согласованное решение): только текст инструкции.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.stepIndex, lesson?.id]);

  /* ── мягкий таймер (напоминание, НЕ автопереход) ────────────── */
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!step || !settings.timerEnabled || !step.durationSec) { setTimeLeft(null); return; }
    const total = step.durationSec;
    setTimeLeft(total);
    const id = window.setInterval(() => {
      setTimeLeft((t) => (t === null ? null : Math.max(0, t - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step?.id, settings.timerEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // офлайн-галочки: если шаг уже подтверждён родителем (offlineConfirmed —
  // в т.ч. после reload), синхронизируем локальный массив TaskRenderer с
  // родительским состоянием; иначе «Дальше» была бы заблокирована навсегда
  useEffect(() => {
    if (!step || step.type !== 'offline-task') return;
    const confirmed = !!progress?.steps[step.id]?.offlineConfirmed;
    setChecks((prev) => {
      const n = step.checklist?.length ?? 0;
      if (prev.length === n && prev.every(Boolean)) return prev; // уже все отмечены
      if (!confirmed) return prev;                               // не подтверждено — не трогаем
      return new Array(n).fill(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.stepIndex, lesson?.id, progress]);

  const markDone = useCallback((patch = {}) => {
    if (!manifest || !lesson || !step) return;
    const secondsSpent = Math.round((Date.now() - stepStartRef.current) / 1000);
    setProgress(upsertStep(manifest.id, lesson.id, step.id, { completedAt: new Date().toISOString(), secondsSpent, ...patch }));
  }, [manifest, lesson, step]);

  const goNext = useCallback(() => {
    if (!step) return;
    markDone();
    // hotfix v1.0.1 (усилен в 1.1.1): setLastStep пишет кэш синхронно, но React
    // мог пакетировать NEXT и обновление startStep в одном батче — RESET
    // проходил с устаревшим startStep и перематывал плеер (вплоть до «Занятие
    // окончено»). Синхронный перевод progress.lastStepId на следующий шаг до
    // dispatch гарантирует актуальный startStep в том же рендере.
    if (manifest && lesson && ctx.stepIndex < lesson.steps.length - 1) {
      const nextStepId = lesson.steps[ctx.stepIndex + 1].id;
      setLastStep(manifest.id, lesson.id, nextStepId);
      setProgress(loadLessonProgress(manifest.id, lesson.id));
    }
    player.send({ type: 'NEXT' });
  }, [ctx.stepIndex, manifest, lesson, step, markDone, player]);

  const goSkip = useCallback(() => {
    if (!manifest || !lesson || !step) return;
    upsertStep(manifest.id, lesson.id, step.id, { skipped: true });
    player.send({ type: 'SKIP' });
  }, [manifest, lesson, step, player]);

  const repeatInstruction = useCallback(() => {
    if (!step) return;
    // «Повторить инструкцию» = подсветка текста + скролл к началу блока (без звука, v1)
    setHighlight(true);
    window.setTimeout(() => setHighlight(false), 1200);
    document.querySelector('.parent-script')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  if (error && typeof error === 'object' && 'code' in error) return <ErrorPanel error={error as never} />;
  if (!manifest || !lesson || !step) return <p className="text-center text-cocoa/60 py-12">Загружаем занятие…</p>;

  /* ── завершение ──────────────────────────────────────────────── */
  if (ctx.state === 'done') {
    return (
      <div className="card text-center py-10 space-y-4 max-w-lg mx-auto">
        <p className="text-5xl" aria-hidden="true">🌟</p>
        <h1 className="text-2xl font-extrabold">Занятие окончено</h1>
        <p className="opacity-70">Спасибо! Заметки сохранены на этом устройстве.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to={`/module/${manifest.id}`} className="btn-secondary">К списку уроков</Link>
          <Link to="/progress" className="btn-primary">Посмотреть прогресс</Link>
        </div>
      </div>
    );
  }

  /* ── пауза ───────────────────────────────────────────────────── */
  if (ctx.state === 'paused') {
    return (
      <div className="card text-center py-10 space-y-4 max-w-md mx-auto">
        <p className="text-5xl" aria-hidden="true">☕</p>
        <h1 className="text-xl font-extrabold">Пауза</h1>
        <button type="button" className="btn-primary" onClick={() => player.send({ type: 'RESUME' })}>▶ Продолжить</button>
      </div>
    );
  }

  const isChildMode = step.mode === 'child';
  const offlineConfirmed = !!progress?.steps[step.id]?.offlineConfirmed;

  /* ── блокировка «Дальше» до выполнения интерактива (UX v1.0) ──
     picture-choice: пока ребёнок не выбрал вариант.
     offline-task: пока не отмечены ВСЕ пункты чек-листа (если чек-лист есть);
     при его отсутствии шагу требуется только родительское подтверждение —
     «Дальше» активна сразу (иначе был бы тупик). instruction/reflection/count —
     поведение не меняется. Подсказка нейтральная, без давления. */
  const nextBlocked =
    (step.type === 'picture-choice' && !selectedId) ||
    (step.type === 'offline-task' && !!step.checklist?.length && !checks.every(Boolean));
  const nextHint =
    step.type === 'picture-choice' && !selectedId ? 'Выберите картинку' :
    step.type === 'offline-task' && !!step.checklist?.length && !checks.every(Boolean)
      ? 'Отметьте выполненное' :
      null;

  return (
    <div className="space-y-4">
      {/* строка состояния */}
      <div className="flex items-center gap-3">
        <span className="text-sm opacity-70" data-testid="step-indicator">{ctx.stepIndex + 1} / {lesson.steps.length}</span>
        <div className="step-dots flex-1" aria-hidden="true">
          {lesson.steps.map((s, i) => (
            <span key={s.id} className={`step-dot ${i === ctx.stepIndex ? 'step-dot-current' : ''} ${progress?.steps[s.id]?.completedAt || progress?.steps[s.id]?.skipped ? 'step-dot-done' : ''}`} />
          ))}
        </div>
        {timeLeft !== null && (
          <span className={`text-sm tabular-nums ${timeLeft === 0 ? 'text-amber-700 font-bold' : 'opacity-60'}`}
                role="status" aria-label="Ориентировочное время шага">
            {timeLeft === 0 ? '⏰ Можно двигаться дальше' : `⏳ ${timeLeft}с`}
          </span>
        )}
      </div>

      {/* панель родителя — скрыта в детском режиме */}
      {!isChildMode && (
        <section className="card bg-sand/20" aria-label="Панель родителя">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="font-extrabold text-sm opacity-70">👩 Родитель читает вслух</h2>
            <button type="button" className="btn-secondary !min-h-[40px] !py-1 text-xs" onClick={repeatInstruction}>
              🔁 Повторить инструкцию
            </button>
          </div>
          <p className={`parent-script ${highlight ? 'highlight' : ''}`}>{step.parentScript}</p>
        </section>
      )}

      {/* задание */}
      <section className="card" aria-label="Задание" data-mode={step.mode}>
        {isChildMode && <p className="text-sm opacity-60 mb-3 text-center">🧒 Режим ребёнка — большие кнопки, минимум текста</p>}
        <TaskRenderer
          step={step} moduleId={manifest.id}
          resolveAssetSrc={(rel) => assets[rel]}
          selectedId={selectedId} onSelectOption={setSelectedId}
          countAnswer={countAnswer} onCountAnswer={setCountAnswer}
          confirmed={offlineConfirmed}
          onToggleCheck={(i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)))}
          notes={notes}
          onNotes={(v) => {
            setNotes(v);
            if (manifest && lesson) upsertStep(manifest.id, lesson.id, step.id, { notes: v });
          }}
        />
        {step.type === 'offline-task' && (
          <button type="button"
            className="btn-primary mt-2 w-full"
            disabled={!checks.every(Boolean) || checks.length === 0 ? false : !checks.every(Boolean)}
            onClick={() => {
              if (manifest && lesson) {
                upsertStep(manifest.id, lesson.id, step.id, { offlineConfirmed: true });
                setProgress((p) => p ? { ...p, steps: { ...p.steps, [step.id]: { ...p.steps[step.id], offlineConfirmed: true } } } : p);
              }
            }}>
            ✅ {offlineConfirmed ? 'Подтверждено родителем' : 'Выполнили — подтверждаю'}
          </button>
        )}
      </section>

      {/* навигация стрелками: переход только по решению родителя */}
      <nav aria-label="Навигация занятия" className="flex gap-3 flex-wrap">
        <button type="button" className="btn-secondary flex-1" onClick={() => player.send({ type: 'PREV' })} disabled={ctx.stepIndex === 0}>
          ← Назад
        </button>
        <button type="button" className="btn-secondary" onClick={() => player.send({ type: 'PAUSE' })} title="Пауза">⏸</button>
        <button type="button" className="btn-secondary" onClick={goSkip} title="Пропустить шаг">⏭</button>
        <button type="button" className="btn-primary flex-1" onClick={goNext} disabled={nextBlocked} data-testid="next-btn">
          {ctx.stepIndex === lesson.steps.length - 1 ? 'Завершить ✔' : 'Дальше →'}
        </button>
      </nav>
      {nextHint && (
        <p className="text-center text-sm opacity-70" role="status" data-testid="next-hint">{nextHint}</p>
      )}
      <p className="text-center text-sm"><Link to={`/module/${manifest.id}`} className="opacity-60 underline">Выйти из занятия</Link></p>
    </div>
  );
}
