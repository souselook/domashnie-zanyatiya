// Список модулей — главный экран родителя (требование B этапа 2).
// - IndexedDB = источник истины; seed-модули (isSeed) скрыты по умолчанию;
// - пустое состояние: заголовок «Пока нет модулей», крупная кнопка добавления zip,
//   инструкция и ссылка «Показать демо-модули»;
// - ошибки загрузки zip показываются в ErrorPanel с человеческим текстом.

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listStoredModules, seedOnce } from '../core/loader';
import type { StoredModule } from '../core/db';
import { prepareModuleZip, commitModuleZip } from '../core/zipLoader';
import type { CoreError } from '../core/errors';
import ErrorPanel from './ErrorPanel';

const DISCIPLINE_LABEL: Record<string, string> = {
  demo: 'Служебный', reading: 'Речь и чтение', math: 'Математика', logic: 'Логика',
  world: 'О мире', speech: 'Развитие речи', art: 'Творчество', other: 'Другое',
};

export default function ModuleList() {
  const [modules, setModules] = useState<StoredModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSeeds, setShowSeeds] = useState(false);
  const [error, setError] = useState<CoreError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    await seedOnce();                 // ровно один раз (флаг hl.seeded.v1)
    const all = await listStoredModules();
    setModules(all);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const userModules = modules.filter((m) => !m.isSeed);
  const seedModules = modules.filter((m) => m.isSeed);
  const visible = showSeeds ? [...userModules, ...seedModules] : userModules;

  async function onPickZip(file: File) {
    setBusy(true); setError(null); setNotice(null);
    try {
      const buf = await file.arrayBuffer();
      const prepared = await prepareModuleZip(buf);
      if (!prepared.ok) { setError(prepared.error); setBusy(false); return; }
      // id уже установлен → автоматическая замена (подтверждение — этап 4 UI-диалог)
      const committed = await commitModuleZip(prepared.data, { replace: prepared.data.exists });
      if (!committed.ok) { setError(committed.error); setBusy(false); return; }
      setNotice(`Модуль «${committed.data.manifest.title}» установлен (${committed.data.manifest.lessons.length} уроков).`);
      await refresh();
    } catch (e) {
      setError({ code: 'ZIP_INVALID', message: 'Не удалось прочитать файл архива.', detail: String(e) });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) return <p className="text-center text-cocoa/60 py-12" data-testid="modules-loading">Загружаем список модулей…</p>;

  const zipInput = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        data-testid="zip-input"
        aria-label="Файл модуля (.zip)"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickZip(f); }}
      />
      <button
        type="button"
        className="btn-primary w-full !py-4 text-lg"
        data-testid="add-zip-button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? 'Устанавливаем…' : '➕ Добавить модуль (.zip)'}
      </button>
    </>
  );

  /* ── пустое состояние (требование B) ───────────────────────── */
  if (userModules.length === 0 && !showSeeds) {
    return (
      <div className="space-y-4">
        <section className="card text-center py-10 space-y-4" data-testid="empty-state">
          <h1 className="text-2xl font-extrabold">Пока нет модулей</h1>
          <div className="max-w-md mx-auto">{zipInput}</div>
          <p className="text-cocoa/70 max-w-md mx-auto">
            Скачайте модуль у автора, затем нажмите кнопку выше
          </p>
          {seedModules.length > 0 && (
            <button type="button" className="text-sm underline opacity-70" data-testid="show-seeds-link"
                    onClick={() => setShowSeeds(true)}>
              Показать демо-модули
            </button>
          )}
        </section>
        {error && <ErrorPanel error={error} />}
        {notice && <p role="status" className="text-green-800 font-bold text-center">{notice}</p>}
      </div>
    );
  }

  /* ── основной список ───────────────────────────────────────── */
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Выберите занятие</h1>
      {error && <ErrorPanel error={error} />}
      {notice && <p role="status" className="text-green-800 font-bold">{notice}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        {visible.map((m) => (
          <Link key={m.id} to={`/module/${m.id}`}
                className="card hover:border-amber1 no-underline text-cocoa block">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-extrabold">{m.manifest.title}</h2>
              {m.isSeed && (
                <span className="text-xs bg-sand rounded-full px-2 py-1 shrink-0" data-testid="seed-badge">демо</span>
              )}
            </div>
            <p className="text-sm opacity-80 mt-1">{m.manifest.shortDescription}</p>
            <p className="text-xs mt-3 opacity-60">
              {DISCIPLINE_LABEL[m.manifest.discipline]} · {m.manifest.ageRange.from}–{m.manifest.ageRange.to} лет ·{' '}
              уроков: {m.manifest.lessons.length}
            </p>
          </Link>
        ))}
      </div>

      <div className="card bg-sand/30 space-y-3" data-testid="add-module-panel">
        {zipInput}
        <p className="text-sm text-cocoa/70">Скачайте модуль у автора, затем выберите файл выше.</p>
      </div>

      {/* переключатель «Показать демо-модули» внизу списка (по умолчанию выключен) */}
      {seedModules.length > 0 && (
        <label className="flex items-center justify-center gap-2 text-sm opacity-80 py-2 cursor-pointer"
               data-testid="toggle-seeds">
          <input type="checkbox" className="w-5 h-5 accent-amber1" checked={showSeeds}
                 onChange={(e) => setShowSeeds(e.target.checked)} />
          Показать демо-модули ({seedModules.length})
        </label>
      )}
    </div>
  );
}
