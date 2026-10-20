import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// В jsdom нет localStorage-проблем и speechSynthesis — заглушим последнее.
if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: () => {}, cancel: () => {}, getVoices: () => [] },
    configurable: true,
  });
}
