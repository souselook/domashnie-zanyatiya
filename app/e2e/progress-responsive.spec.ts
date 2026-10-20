// Этап 5.2 — экран прогресса + базовая адаптивность (additive-проверки).
// 1) /progress: после загрузки m01-zip показывает секцию модуля и 12 строк уроков со статусами.
// 2) Адаптив: на 375 / 768 / 1280 нет горизонтального скролла на главной, превью модуля, плеере, прогрессе.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ZIP = readFileSync(new URL('../public/modules/m01-start-3-4.zip', import.meta.url));
const LESSONS = [
  'w1d1-sort-by-color', 'w1d2-count-1-3', 'w1d3-vowels-a-u-o',
  'w2d1-number-4', 'w2d2-slog-ma', 'w2d3-abacus-intro',
  'w3d1-big-small', 'w3d2-number-5', 'w3d3-slogi-sa-pa-ma',
  'w4d1-plus', 'w4d2-two-features', 'w4d3-month-quest',
];

async function freshWithZip(page: import('@playwright/test').Page) {
  await page.goto('/#/');
  await page.evaluate(async () => {
    localStorage.clear();
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const req = indexedDB.deleteDatabase('home-lessons');
    await new Promise((res) => { req.onsuccess = res; req.onerror = res; req.onblocked = res; });
  });
  await page.reload();
  await page.getByTestId('zip-input').setInputFiles({ name: 'm01-start-3-4.zip', mimeType: 'application/zip', buffer: ZIP });
  await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
}

test.describe.configure({ mode: 'serial' });

test('progress screen: 12 уроков со статусами', async ({ page }) => {
  await freshWithZip(page);
  await page.goto('/#/progress');
  const section = page.getByTestId('progress-module-m01-start-3-4');
  await expect(section).toBeVisible({ timeout: 10_000 });
  for (const id of LESSONS) {
    await expect(page.getByTestId(`progress-lesson-${id}`)).toBeVisible();
    await expect(page.getByTestId(`progress-status-${id}`)).toHaveText(/Не начат|В процессе|Пройден/);
  }
});

for (const width of [375, 768, 1280]) {
  test(`no horizontal scroll @${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await freshWithZip(page);
    const urls = ['/#/', '/#/module/m01-start-3-4', '/#/progress',
      '/#/lesson/m01-start-3-4/' + encodeURIComponent('lessons/w1d1-sort-by-color.json') + '/start'];
    for (const u of urls) {
      await page.goto(u);
      await page.waitForTimeout(800); // дать прогнать загрузку/рендер сцены
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `горизонтальный скролл на ${u} @${width}px`).toBeLessThanOrEqual(0);
    }
  });
}
