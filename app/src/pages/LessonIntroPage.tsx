import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadLesson, loadManifest, loadRegistry } from '../core/loader';
import type { Lesson, Manifest } from '../core/schema';
import ErrorPanel from '../components/ErrorPanel';

const MATERIAL_ICON: Record<string, string> = {
  blocks: '🧱', cards: '🃏', sticks: '🥢', paper: '📄', pen: '🖊️', ball: '⚽', toy: '🧸',
};

export default function LessonIntroPage() {
  const { moduleId = '', file = '' } = useParams();
  const lessonFile = decodeURIComponent(file);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [ready, setReady] = useState<boolean[]>([]);

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
      setReady(les.data.materials.map(() => false));
    })();
    return () => { alive = false; };
  }, [moduleId, lessonFile]);

  if (error && typeof error === 'object' && 'code' in error) return <ErrorPanel error={error as never} />;
  if (!manifest || !lesson) return <p className="text-center text-cocoa/60 py-12">Загружаем урок…</p>;

  const allReady = lesson.materials.length === 0 || ready.every(Boolean);

  return (
    <div className="space-y-5">
      <nav aria-label="Хлебные крошки" className="text-sm opacity-70">
        <Link to="/">Занятия</Link> / <Link to={`/module/${manifest.id}`}>{manifest.title}</Link> / <span>{lesson.title}</span>
      </nav>

      <header className="card">
        <h1 className="text-2xl font-extrabold">{lesson.title}</h1>
        <p className="text-sm mt-2 opacity-70">
          ⏱ Ориентировочно {lesson.estimatedMinutes ?? '—'} мин · шагов: {lesson.steps.length}
        </p>
        {lesson.tips.length > 0 && (
          <ul className="mt-3 space-y-1 list-disc ml-5 text-sm opacity-80">
            {lesson.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        )}
      </header>

      <section className="card" aria-label="Чек-лист материалов">
        <h2 className="font-extrabold text-lg mb-3">Подготовьте материалы</h2>
        {lesson.materials.length === 0 ? (
          <p className="opacity-70">Материалы не нужны — можно начинать.</p>
        ) : (
          <ul className="space-y-2 list-none p-0">
            {lesson.materials.map((m, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 card !py-3 cursor-pointer bg-sand/20">
                  <input type="checkbox" className="w-6 h-6 accent-amber1" checked={ready[i]}
                    onChange={() => setReady((r) => r.map((v, j) => (j === i ? !v : v)))} />
                  <span className="text-2xl" aria-hidden="true">{MATERIAL_ICON[m.icon ?? ''] ?? '✳️'}</span>
                  <span className="font-bold">{m.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex gap-3 flex-wrap">
        <Link to={`/module/${manifest.id}/preview/${encodeURIComponent(lessonFile)}`}
              className="btn-secondary">👁 Сначала посмотреть урок</Link>
        <Link to={`/lesson/${manifest.id}/${encodeURIComponent(lessonFile)}`}
              className={`btn-primary ${allReady ? '' : 'opacity-90'}`}
              aria-disabled={!allReady}>
          {allReady ? '▶ Начать занятие' : '▶ Начать всё равно'}
        </Link>
      </div>
    </div>
  );
}
