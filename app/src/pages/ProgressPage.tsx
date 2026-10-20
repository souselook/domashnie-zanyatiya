import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { allProgress, completedStepsCount, type LessonProgress } from '../core/storage';
import { listStoredModules, lessonFromRecord } from '../core/loader';
import type { StoredModule } from '../core/db';
import type { Lesson } from '../core/schema';

interface Row { rec: StoredModule; lesson: Lesson | null; p: LessonProgress }

/** Экран прогресса: наблюдения и чек-листы, без оценок и баллов. */
export default function ProgressPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // IndexedDB = источник истины: прогресс сопоставляем с установленными модулями
      const mods = await listStoredModules();
      if (!alive) return;
      const byId = new Map(mods.map((m) => [m.id, m]));
      const out: Row[] = [];
      for (const p of allProgress()) {
        const rec = byId.get(p.moduleId);
        if (!rec) continue; // модуль удалён — запись без родителя не показываем
        // урок ищем по id среди загруженных JSON
        let lesson: Lesson | null = null;
        for (const file of Object.keys(rec.lessons)) {
          if (rec.lessons[file].id === p.lessonId) { lesson = rec.lessons[file]; break; }
        }
        if (!lesson) {
          const guess = `lessons/${p.lessonId}.json`;
          const r = lessonFromRecord(rec, guess);
          if (r.ok) lesson = r.data;
        }
        out.push({ rec, lesson, p });
      }
      out.sort((a, b) => (b.p.startedAt ?? '').localeCompare(a.p.startedAt ?? ''));
      setRows(out);
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
        {rows.map(({ rec, lesson, p }) => (
          <li key={`${p.moduleId}/${p.lessonId}`} className="card">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-extrabold">{lesson?.title ?? p.lessonId}</h2>
              <span className="text-xs bg-sand rounded-full px-2 py-1">{rec.manifest.title}</span>
              <span className="ml-auto text-sm opacity-70">
                шагов пройдено: {completedStepsCount(p)}{lesson ? ` / ${lesson.steps.length}` : ''}
              </span>
            </div>
            <p className="text-xs opacity-60 mt-1">
              {p.startedAt ? `Начато ${new Date(p.startedAt).toLocaleDateString('ru-RU')}` : ''}
            </p>
            {Object.entries(p.steps).filter(([, r]) => r.notes).length > 0 && (
              <ul className="mt-3 space-y-2 list-none p-0">
                {Object.entries(p.steps).filter(([, r]) => r.notes).map(([sid, r]) => (
                  <li key={sid} className="bg-sand/30 rounded-xl p-3 text-sm">
                    <span className="opacity-60">{lesson?.steps.find((st) => st.id === sid)?.parentScript ?? sid}: </span>{r.notes}
                  </li>
                ))}
              </ul>
            )}
            {Object.entries(p.steps).filter(([, r]) => r.offlineConfirmed).length > 0 && (
              <p className="mt-2 text-sm">✅ Отмечены выполненные офлайн-задания: {Object.entries(p.steps).filter(([, r]) => r.offlineConfirmed).length}</p>
            )}
            <div className="mt-3 text-sm">
              <Link className="underline opacity-70"
                   to={`/lesson/${rec.id}/${encodeURIComponent(lesson ? Object.keys(rec.lessons).find((f) => rec.lessons[f].id === p.lessonId) ?? '' : p.lessonId + '.json')}`}>
                Продолжить
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
