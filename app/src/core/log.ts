// Единый логгер ядра (требование A этапа 2).
// production (import.meta.env.PROD) — только warn и error; dev — всё.

const PROD = typeof import.meta !== 'undefined' && !!import.meta.env?.PROD;

export const log = {
  info(...args: unknown[]): void {
    if (!PROD) console.info('[core]', ...args);
  },
  warn(...args: unknown[]): void {
    console.warn('[core]', ...args);
  },
  error(...args: unknown[]): void {
    console.error('[core]', ...args);
  },
};
