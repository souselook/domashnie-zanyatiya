import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resolveModule } from '../core/moduleSource';
import type { StoredModule } from '../core/db';
import { sortedLessonFiles } from '../core/loader';
import { loadLessonProgress, completedStepsCount } from '../core/storage';
import ErrorPanel from '../components/ErrorPanel';

// Лёгкая выжимка урока для списка (полный JSON грузим при старте/предпросмотре).
export interface LessonSummary { file: string; order: number }

export default function ModulePage() {
  const { moduleId = '' } = useParams();
  const [rec, setRec] = useState<StoredModule | null>(null);
  const [summaries, setSummaries] = useState<LessonSummary[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await resolveModule(moduleId);
      if (!alive) return;
      if (!r.ok) { setError(r.error); return; }
      setRec(r.data);
      // порядок уроков: сначала manifest.lessons по order; если файл не загружен — по имени
      const known = new Set(Object.keys(r.data.lessons));
      const files = sortedLessonFiles(r.data.manifest).filter((f) => known.has(f));
      const rest = [...known].filter((f) => !files.includes(f)).sort();
      setSummaries([...files, ...rest].map((file, i) => ({ file, order: i + 1 })));
    })();
    return () => { alive = false; };
  }, [moduleId]);

  const progressDots = useMemo(
    () => summaries.map((s) => {
      // точный id урока берём из загруженного JSON; имя файла — запасной вариант
      const lessonId = rec?.lessons[s.file]?.id ?? s.file.replace(/^lessons\//, '').replace(/\.json$/, '');
      const p = rec ? loadLessonProgress(rec.id, lessonId) : undefined;
      return { ...s, lessonId, done: !!p && p.lastStepId !== undefined, stepsDone: completedStepsCount(p) };
    }),
    [summaries, rec],
  );

  if (error && typeof error === 'object' && 'code' in error) {
    return <ErrorPanel error={error as never} />;
  }
  if (!rec) return <p className="text-center text-cocoa/60 py-12">Загружаем модуль…</p>;
  const manifest = rec.manifest;

  return (
    <div className="space-y-5">
      <nav aria-label="Хлебные крошки" className="text-sm opacity-70">
        <Link to="/">Занятия</Link> / <span>{manifest.title}</span>
      </nav>
      <header className="card">
        <h1 className="text-2xl font-extrabold">{manifest.title}</h1>
        <p className="mt-1 opacity-80">{manifest.shortDescription}</p>
        <p className="text-sm mt-2 opacity-60">
          Возраст {manifest.ageRange.from}–{manifest.ageRange.to} лет · Автор: {manifest.author} · Лицензия: {manifest.license}
        </p>
        {rec.isSeed && (
          <p className="text-xs mt-2 inline-block bg-sand rounded-full px-2 py-1">служебный демо-модуль</p>
        )}
      </header>
      <ul className="space-y-3 list-none p-0">
        {progressDots.map((s) => (
          <li key={s.file}>
            <div className="card flex items-center gap-3">
              <span className="w-9 h-9 grid place-items-center rounded-full bg-sand font-extrabold shrink-0">{s.order}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{rec.lessons[s.file]?.title ?? s.lessonId}</p>
                <p className="text-xs opacity-60">Файл: {s.file}{s.stepsDone > 0 ? ` · пройдено шагов: ${s.stepsDone}` : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to={`/module/${manifest.id}/preview/${encodeURIComponent(s.file)}`}
                      className="btn-secondary !min-h-[44px] !py-2 text-sm" title="Предпросмотр без запуска занятия">
                  👁 Предпросмотр
                </Link>
                <Link to={`/lesson/${manifest.id}/${encodeURIComponent(s.file)}/start`}
                      className="btn-primary !min-h-[44px] !py-2 text-sm">
                  Начать
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
