import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadLesson, loadManifest, loadRegistry } from '../core/loader';
import type { Lesson, Manifest, Step } from '../core/schema';
import { usePlayer } from '../hooks/usePlayer';
import { useSettings } from '../hooks/useSettings';
import { speak, stopSpeaking, ttsSupported } from '../core/tts';
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
  const [error, setError] = useState<unknown>(null);
  const [progress, setProgress] = useState<LessonProgress | undefined>();
  const { settings } = useSettings();

  // загрузка урока
  useEffect(() => {
    let alive = true;
    (async () => {
      const reg = await loadRegistry();
      if (!reg.ok) { if (alive) setError(reg.error); return; }
      const entry = reg.data.modules.find((m) => m.id === moduleId && m.enabled);
      if (!entry) { if (alive) setError({ code: 'NOT_FOUND', message: 'Модуль не найден в реестре.' }); return; }
      const man = await loadManifest(entry);
      if (!man.ok) { if (alive) setError(man.error); return; }
      const les = await loadLesson(man.data, lessonFile);
      if (!alive) return;
      if (!les.ok) { setError(les.error); return; }
      setManifest(man.data);
      setLesson(les.data);
      setProgress(loadLessonProgress(man.data.id, les.data.id));
    })();
    return () => { alive = false; };
  }, [moduleId, lessonFile]);

  // восстановление шага из прогресса
  const startStep = useMemo(() => {
    if (!lesson || !progress?.lastStepId) return 0;
    const i = lesson.steps.findIndex((s) => s.id === progress.lastStepId);
    return i >= 0 ? i : 0;
  }, [lesson, progress]);

  const [ctx, player] = usePlayer(lesson?.steps.length ?? 0, startStep, !!lesson);

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
    if (settings.ttsEnabled && ttsSupported()) speak(step.parentScript, settings.speechRate, true);
    return () => stopSpeaking();
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

  const markDone = useCallback((patch = {}) => {
    if (!manifest || !lesson || !step) return;
    const secondsSpent = Math.round((Date.now() - stepStartRef.current) / 1000);
    setProgress(upsertStep(manifest.id, lesson.id, step.id, { completedAt: new Date().toISOString(), secondsSpent, ...patch }));
  }, [manifest, lesson, step]);

  const goNext = useCallback(() => {
    if (!step) return;
    if (ctx.stepIndex < (lesson?.steps.length ?? 1) - 1) markDone();
    else markDone(); // последний шаг → done тоже считаем пройденным
    player.send({ type: 'NEXT' });
  }, [ctx.stepIndex, lesson, markDone, player, step]);

  const goSkip = useCallback(() => {
    if (!manifest || !lesson || !step) return;
    upsertStep(manifest.id, lesson.id, step.id, { skipped: true });
    player.send({ type: 'SKIP' });
  }, [manifest, lesson, step, player]);

  const repeatInstruction = useCallback(() => {
    if (!step) return;
    setHighlight(true);
    window.setTimeout(() => setHighlight(false), 1200);
    speak(step.parentScript, settings.speechRate, settings.ttsEnabled && ttsSupported());
  }, [step, settings]);

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
      <nav aria-label="Навигация занятия" className="flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={() => player.send({ type: 'PREV' })} disabled={ctx.stepIndex === 0}>
          ← Назад
        </button>
        <button type="button" className="btn-secondary" onClick={() => player.send({ type: 'PAUSE' })} title="Пауза">⏸</button>
        <button type="button" className="btn-secondary" onClick={goSkip} title="Пропустить шаг">⏭</button>
        <button type="button" className="btn-primary flex-1" onClick={goNext}>
          {ctx.stepIndex === lesson.steps.length - 1 ? 'Завершить ✔' : 'Дальше →'}
        </button>
      </nav>
      <p className="text-center text-sm"><Link to={`/module/${manifest.id}`} className="opacity-60 underline">Выйти из занятия</Link></p>
    </div>
  );
}
