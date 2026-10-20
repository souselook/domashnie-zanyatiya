import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { resetAllProgress } from '../core/storage';

export default function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const [confirmReset, setConfirmReset] = useState(false);
  const [cleared, setCleared] = useState(false);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold">Настройки</h1>

      <section className="card space-y-4">
        {/* TTS в v1 не реализуется (согласованное решение): переключатель disabled */}
        <fieldset className="space-y-1">
          <label className="flex items-center justify-between gap-4">
            <span className="font-bold">🔇 Озвучивание инструкций</span>
            <input type="checkbox" className="w-6 h-6 accent-amber1 opacity-50" checked={false} disabled
                   aria-label="Озвучивание появится в следующей версии" />
          </label>
          <p className="text-sm text-cocoa/60">Озвучивание появится в следующей версии.</p>
        </fieldset>
        <fieldset>
          <legend className="font-bold mb-2">Размер шрифта</legend>
          <div className="flex gap-2">
            {([['normal', 'Обычный'], ['large', 'Крупный'], ['xlarge', 'Очень крупный']] as const).map(([v, label]) => (
              <button key={v} type="button"
                      className={`btn-secondary !min-h-[44px] !py-2 text-sm ${settings.fontScale === v ? '!bg-amber1 !text-white' : ''}`}
                      aria-pressed={settings.fontScale === v}
                      onClick={() => update({ fontScale: v })}>{label}</button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center justify-between gap-4">
          <span className="font-bold">⏳ Напоминание о времени шага</span>
          <input type="checkbox" className="w-6 h-6 accent-amber1" checked={settings.timerEnabled}
                 onChange={(e) => update({ timerEnabled: e.target.checked })} />
        </label>
        <button type="button" className="btn-secondary w-full" onClick={reset}>Вернуть настройки по умолчанию</button>
      </section>

      <section className="card border-red-200 space-y-3">
        <h2 className="font-extrabold text-lg">Данные</h2>
        <p className="text-sm opacity-70">
          Весь прогресс хранится только на этом устройстве (IndexedDB). Персональные данные ребёнка не собираются.
        </p>
        {!confirmReset ? (
          <button type="button" className="btn-danger w-full" onClick={() => setConfirmReset(true)}>
            🗑 Сбросить весь прогресс
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn-danger flex-1"
                    onClick={async () => { await resetAllProgress(); setCleared(true); setConfirmReset(false); }}>
              Да, удалить всё
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={() => setConfirmReset(false)}>Отмена</button>
          </div>
        )}
        {cleared && <p role="status" className="text-green-800 font-bold">Прогресс очищен ✅</p>}
      </section>
    </div>
  );
}
