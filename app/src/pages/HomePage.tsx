import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadManifest, loadRegistry } from '../core/loader';
import type { CoreError } from '../core/errors';
import type { Manifest, RegistryEntry } from '../core/schema';
import ErrorPanel from '../components/ErrorPanel';

interface ModuleCardData { entry: RegistryEntry; manifest?: Manifest; error?: CoreError }

const DISCIPLINE_LABEL: Record<string, string> = {
  demo: 'Служебный', reading: 'Речь и чтение', math: 'Математика', logic: 'Логика',
  world: 'О мире', speech: 'Развитие речи', art: 'Творчество', other: 'Другое',
};

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [registryError, setRegistryError] = useState<CoreError | null>(null);
  const [cards, setCards] = useState<ModuleCardData[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setRegistryError(null);
      const reg = await loadRegistry();
      if (!alive) return;
      if (!reg.ok) { setRegistryError(reg.error); setCards([]); setLoading(false); return; }
      const enabled = reg.data.modules.filter((m) => m.enabled);
      const results = await Promise.all(enabled.map(async (entry) => {
        const r = await loadManifest(entry);
        return r.ok ? { entry, manifest: r.data } : { entry, error: r.error };
      }));
      if (alive) setCards(results);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  if (loading) return <p className="text-center text-cocoa/60 py-12">Загружаем список модулей…</p>;

  if (registryError) {
    return (
      <div className="space-y-4">
        <ErrorPanel error={registryError} />
        <section className="card bg-sand/30">
          <h2 className="font-extrabold text-lg mb-2">Как добавить модуль</h2>
          <ol className="list-decimal ml-5 space-y-1 text-sm">
            <li>Создайте папку <code>public/modules/&lt;module-id&gt;/</code> с файлом <code>module.json</code> и уроками в <code>lessons/*.json</code>.</li>
            <li>Добавьте строку в <code>public/modules/registry.json</code>: <code>{'{"id":"…","path":"<module-id>/","enabled":true}'}</code>.</li>
            <li>Обновите страницу. Подробно — в README.</li>
          </ol>
        </section>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="card text-center py-10">
        <p className="text-4xl mb-3" aria-hidden="true">📦</p>
        <h1 className="text-xl font-extrabold mb-2">Пока нет ни одного модуля</h1>
        <p className="text-cocoa/70 mb-4 max-w-md mx-auto">
          Приложение читает список из файла <code>modules/registry.json</code>.
          Положите пакет модуля в папку <code>modules/</code> и добавьте его в реестр —
          инструкция в README, раздел «Как добавить новый модуль».
        </p>
        <Link to="/settings" className="btn-secondary">Открыть настройки</Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Выберите занятие</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map(({ entry, manifest, error }) =>
          error ? (
            <ErrorPanel key={entry.id} error={error} />
          ) : manifest && (
            <Link key={entry.id} to={`/module/${manifest.id}`}
                  className="card hover:border-amber1 no-underline text-cocoa block">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-extrabold">{manifest.title}</h2>
                {manifest.discipline === 'demo' && (
                  <span className="text-xs bg-sand rounded-full px-2 py-1 shrink-0">служебный</span>
                )}
              </div>
              <p className="text-sm opacity-80 mt-1">{manifest.shortDescription}</p>
              <p className="text-xs mt-3 opacity-60">
                {DISCIPLINE_LABEL[manifest.discipline]} · {manifest.ageRange.from}–{manifest.ageRange.to} лет ·{' '}
                уроков: {manifest.lessons.length}
              </p>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
