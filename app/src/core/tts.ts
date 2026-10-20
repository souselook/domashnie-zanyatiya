// Озвучивание через SpeechSynthesis API. Если недоступен — тихий no-op (текст остаётся).

let voicesLoaded = false;

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickRussianVoice(): SpeechSynthesisVoice | undefined {
  if (!ttsSupported()) return undefined;
  if (!voicesLoaded) {
    // в некоторых браузерах список голосов подгружается асинхронно
    window.speechSynthesis.getVoices();
    voicesLoaded = true;
  }
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith('ru'));
}

export function speak(text: string, rate = 0.9, enabled = true): void {
  if (!enabled || !ttsSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ru-RU';
    u.rate = rate;
    const v = pickRussianVoice();
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch {
    /* тихо деградируем до текстового режима */
  }
}

export function stopSpeaking(): void {
  if (ttsSupported()) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}
