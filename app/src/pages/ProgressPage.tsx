import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { allProgress, completedStepsCount, isLessonCompleted, hydrateProgressCache, type LessonProgress } from '../core/storage';
import { listStoredModules } from '../core/loader';
import type { StoredModule } from '../core/db';
import type { Lesson } from '../core/schema';

type Status = 'not-started' | 'in-progress' | 'passed';

function statusOf(lesson: Lesson, p?: LessonProgress): Status {
  if (!p || completedStepsCount(p) === 0) return 'not-started';
  // «Пройден» = достигнут reflection (последний шаг) либо явно завершён (все шаги закрыты).
  // Переиспользуем существующие флаги (lastStepId / completedAt|skipped), новых не вводим.
  const refl = lesson.steps[lesson.steps.length - 1];
  if (isLessonCompleted(lesson, p)) return 'passed';
  if (refl && (p.lastStepId === refl.id || p.steps[refl.id]?.completedAt || p.steps[refl.id]?.skipped)) return 'passed';
  return 'in-progress';
}

const STATUS_LABEL: Record<Status, string> = {
  'not-started': 'Не начат',
  'in-progress': 'В процессе',
  'passed': 'Пройден',
};

/** Экран прогресса: статусы 12 уроков по модулям + заметки рефлексии. Без оценок и баллов. */
export default function ProgressPage() {
  const [mods, setMods] = useState<StoredModule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // IndexedDB = источник истины: перед чтением синхронного кэша — актуализация из IDB
      await hydrateProgressCache();
      const stored = await listStoredModules();
      if (!alive) return;
      setMods(stored.filter((m) => !m.isSeed));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const progressByLesson = useMemo(() => {
    const map = new Map<string, LessonProgress>();
    for (const p of allProgress()) map.set(`${p.moduleId}/${p.lessonId}`, p);
    return map;
  }, [mods, loading]);

  if (loading) return <p className="text-center text-cocoa/60 py-12">Собираем записи…</p>;

  if (mods.length === 0) {
    return (
      <section className="card text-center py-10" data-testid="progress-empty">
        <p className="text-4xl mb-3" aria-hidden="true">🗒️</p>
        <h1 className="text-xl font-extrabold mb-2">Записей пока нет</h1>
        <p className="opacity-70 mb-4">Добавьте модуль на главной — здесь появятся статусы занятий и заметки.</p>
        <Link to="/" className="btn-primary">На главную</Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Прогресс</h1>
        <p className="text-sm opacity-70 mt-1">Это наблюдения, а не оценки. Сравнивайте ребёнка только с ним самим вчерашним — или не сравнивайте вовсе.</p>
      </div>

      {mods.map((rec) => {
        // порядок уроков — как в манифесте (file-ключи lessons/*.json)
        const files = Object.keys(rec.lessons)
          .filter((f) => f.startsWith('lessons/'))
          .sort((a, b) => {
            const ia = rec.manifest.lessons?.findIndex((l) => l.file === a) ?? -1;
            const ib = rec.manifest.lessons?.findIndex((l) => l.file === b) ?? -1;
            return (ia === -1 ? 1e9 : ia) - (ib === -1 ? 1e9 : ib);
          });
        const lessons = files.map((f) => ({ file: f, lesson: rec.lessons[f] }));
        return (
          <section key={rec.id} className="card" data-testid={`progress-module-${rec.id}`}>
            <header className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-lg font-extrabold">{rec.manifest.title}</h2>
              <span className="text-xs bg-sand rounded-full px-2 py-1">
                {rec.manifest.ageRange.from}–{rec.manifest.ageRange.to} лет
              </span>
            </header>
            <ul className="mt-3 space-y-3 list-none p-0">
              {lessons.map(({ file, lesson }) => {
                const p = progressByLesson.get(`${rec.id}/${lesson.id}`);
                const st = statusOf(lesson, p);
                const notes = p ? Object.entries(p.steps).filter(([, r]) => r.notes) : [];
                return (
                  <li key={lesson.id} className="bg-sand/20 rounded-xl p-3" data-testid={`progress-lesson-${lesson.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm min-w-0 break-words">{lesson.title}</span>
                      <span
                        className={
                          'ml-auto text-xs rounded-full px-2 py-1 whitespace-nowrap ' +
                          (st === 'passed' ? 'bg-green-200 text-green-900'
                            : st === 'in-progress' ? 'bg-amber-200 text-amber-900'
                            : 'bg-stone-200 text-stone-700')
                        }
                        data-testid={`progress-status-${lesson.id}`}
                      >
                        {STATUS_LABEL[st]}
                      </span>
                    </div>
                    {st === 'in-progress' && p && (
                      <p className="text-xs opacity-60 mt-1">
                        шагов пройдено: {completedStepsCount(p)} / {lesson.steps.length}
                      </p>
                    )}
                    {notes.length > 0 && (
                      <ul className="mt-2 space-y-1 list-none p-0">
                        {notes.map(([sid, r]) => (
                          <li key={sid} className="text-sm opacity-80">
                            <span className="opacity-60">{lesson.steps.find((s) => s.id === sid)?.parentScript ?? sid}: </span>{r.notes}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 text-sm">
                      <Link className="underline opacity-70" to={`/lesson/${rec.id}/${encodeURIComponent(file)}`}>
                        {st === 'not-started' ? 'Начать' : st === 'passed' ? 'Повторить' : 'Продолжить'}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
