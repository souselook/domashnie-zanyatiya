import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allProgress, completedStepsCount, type LessonProgress } from '../core/storage';
import { loadManifest, loadRegistry, sortedLessonFiles } from '../core/loader';
import type { Manifest } from '../core/schema';

interface Row { manifest: Manifest; p: LessonProgress }

/** Экран прогресса: наблюдения и чек-листы, без оценок и баллов. */
export default function ProgressPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const reg = await loadRegistry();
      if (!reg.ok) { setLoading(false); return; }
      const results = await Promise.all(
        reg.data.modules.filter((m) => m.enabled).map(async (entry) => {
          const man = await loadManifest(entry);
          return man.ok ? man.data : null;
        }),
      );
      if (!alive) return;
      const manifests = results.filter(Boolean) as Manifest[];
      const byId = new Map(manifests.map((m) => [m.id, m]));
      const out: Row[] = [];
      for (const p of allProgress()) {
        const manifest = byId.get(p.moduleId);
        if (manifest) out.push({ manifest, p });
      }
      setRows(out.sort((a, b) => (b.p.lastStepId ? 1 : 0) - (a.p.lastStepId ? 1 : 0)));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <p className="text-center text-cocoa/60 py-12">Собираем записи…</p>;

  if (rows.length === 0) {
    return (
      <section className="card text-center py-10">
        <p className="text-4xl mb-3" aria-hidden="true">🗒️</p>
        <h1 className="text-xl font-extrabold mb-2">Записей пока нет</h1>
        <p className="opacity-70 mb-4">Здесь появятся заметки и отметки после первых занятий.</p>
        <Link to="/" className="btn-primary">Выбрать занятие</Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Прогресс</h1>
      <p className="text-sm opacity-70">Это наблюдения, а не оценки. Сравнивайте ребёнка только с ним самим вчерашним — или не сравнивайте вовсе.</p>
      <ul className="space-y-3 list-none p-0">
        {rows.map(({ manifest, p }) => (
          <li key={`${p.moduleId}/${p.lessonId}`} className="card">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-extrabold">{p.lessonId}</h2>
              <span className="text-xs bg-sand rounded-full px-2 py-1">{manifest.title}</span>
              <span className="ml-auto text-sm opacity-70">
                шагов пройдено: {completedStepsCount(p)} / {manifest.lessons.find((l) => l.file.includes(p.lessonId)) ? '—' : '—'}
              </span>
            </div>
            <p className="text-xs opacity-60 mt-1">
              {p.startedAt ? `Начато ${new Date(p.startedAt).toLocaleDateString('ru-RU')}` : ''}
            </p>
            {Object.entries(p.steps).filter(([, r]) => r.notes).length > 0 && (
              <ul className="mt-3 space-y-2 list-none p-0">
                {Object.entries(p.steps).filter(([, r]) => r.notes).map(([sid, r]) => (
                  <li key={sid} className="bg-sand/30 rounded-xl p-3 text-sm">
                    <span className="opacity-60">{sid}: </span>{r.notes}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-sm">
              <Link className="underline opacity-70"
                   to={`/lesson/${manifest.id}/${encodeURIComponent(sortedLessonFiles(manifest).find((f) => f.includes(p.lessonId)) ?? '')}`}>
                Продолжить
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
