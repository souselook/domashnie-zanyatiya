import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from '../core/storage';

export function useSettings(): {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
} {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());

  useEffect(() => {
    document.documentElement.dataset.font = settings.fontScale;
  }, [settings.fontScale]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset };
}
