import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveLesson } from '../core/moduleSource';
import type { Lesson, Manifest } from '../core/schema';
import TaskRenderer from '../components/TaskRenderer';
import ErrorPanel from '../components/ErrorPanel';

/** Экран предпросмотра (требование 8): лента шагов в read-only.
 *  Не пишет прогресс, не запускает таймер, не принимает ответы. */
export default function PreviewPage() {
  const { moduleId = '', file = '' } = useParams();
  const lessonFile = decodeURIComponent(file);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonAssets, setLessonAssets] = useState<Record<string, string>>({}); // dataURL из zip (IndexedDB)
  const [error, setError] = useState<unknown>(null);
  const [onlyId, setOnlyId] = useState<string | null>(null); // «только этот шаг»

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await resolveLesson(moduleId, lessonFile);
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      setManifest(r.data.rec.manifest);
      setLesson(r.data.lesson);
      setLessonAssets(r.data.rec.assets);
    })();
    return () => { alive = false; };
  }, [moduleId, lessonFile]);

  if (error && typeof error === 'object' && 'code' in error) return <ErrorPanel error={error as never} />;
  if (!manifest || !lesson) return <p className="text-center text-cocoa/60 py-12">Загружаем предпросмотр…</p>;

  const steps = onlyId ? lesson.steps.filter((s) => s.id === onlyId) : lesson.steps;

  return (
    <div className="space-y-5">
      <nav aria-label="Хлебные крошки" className="text-sm opacity-70">
        <Link to="/">Занятия</Link> / <Link to={`/module/${manifest.id}`}>{manifest.title}</Link> / <span>Предпросмотр</span>
      </nav>

      <header className="card bg-sand/30">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-extrabold">{lesson.title}</h1>
            <p className="text-sm opacity-70 mt-1">
              👁 Предпросмотр: так выглядят шаги занятия. Ответы не сохраняются, прогресс не записывается.
            </p>
          </div>
          <Link to={`/lesson/${manifest.id}/${encodeURIComponent(lessonFile)}/start`} className="btn-primary shrink-0">
            ▶ Начать занятие
          </Link>
        </div>
        {onlyId && (
          <button type="button" className="btn-secondary mt-3 !min-h-[40px] !py-1 text-sm" onClick={() => setOnlyId(null)}>
            Показать все шаги
          </button>
        )}
      </header>

      {lesson.materials.length > 0 && (
        <p className="text-sm opacity-70">🧺 Материалы: {lesson.materials.map((m) => m.name).join(', ')}</p>
      )}

      <ol className="space-y-4 list-none p-0">
        {steps.map((step, i) => (
          <li key={step.id} className="card">
            <div className="flex items-center gap-2 mb-3 text-sm opacity-60">
              <span className="w-7 h-7 grid place-items-center rounded-full bg-sand font-extrabold text-cocoa">{i + 1}</span>
              <span>{step.mode === 'child' ? '🧒 Режим ребёнка' : '👩 Режим родителя'}</span>
              <span className="ml-auto">{step.type}</span>
            </div>
            <div className="parent-script mb-4">🗣 {step.parentScript}</div>
            <TaskRenderer step={step} moduleId={manifest.id} readOnly resolveAssetSrc={(rel) => lessonAssets[rel]} />
          </li>
        ))}
      </ol>
    </div>
  );
}
