// Smoke Этапа 4: загрузка m01-start-3-4.zip через UI, урок 1 end-to-end, открытие всех 12 уроков.
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ZIP = readFileSync(new URL('../public/modules/m01-start-3-4.zip', import.meta.url));

test.beforeEach(async ({ page }) => {
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
});

async function uploadZip(page: import('@playwright/test').Page) {
  await page.getByTestId('zip-input').setInputFiles({ name: 'm01-start-3-4.zip', mimeType: 'application/zip', buffer: ZIP });
  await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
}

test('zip загружается через UI, карточка модуля появляется', async ({ page }) => {
  await page.goto('/#/');
  await uploadZip(page);
  await expect(page.getByRole('link', { name: /Старт/ }).first()).toBeVisible();
});

test('урок 1 (w1d1) открывается и проходится end-to-end', async ({ page }) => {
  await page.goto('/#/');
  await uploadZip(page);
  await page.getByRole('link', { name: /Старт/ }).first().click();
  // первый урок модуля → чек-лист материалов
  await page.getByRole('link', { name: /^Начать$/ }).first().click();
  const boxes = page.locator('input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check({ force: true });
  const startLink = page.getByRole('link', { name: /Начать занятие|Начать всё равно/ });
  await expect(startLink).toHaveText(/Начать занятие/);
  await startLink.click();
  // плеер: проходим шаги кнопкой «Дальше» (instruction/offline — тап), picture-choice/count — клик по варианту
  const finished = page.getByRole('heading', { name: /Занятие окончено/ });
  for (let step = 0; step < 30; step++) {
    if (await finished.isVisible().catch(() => false)) break;
    const next = page.getByRole('button', { name: /Дальше|Готово|Завершить/ });
    if (await next.first().isEnabled().catch(() => false)) { await next.first().click(); continue; }
    const opt = page.locator('[data-testid*="option"], button[role="radio"]').first();
    if (await opt.isVisible().catch(() => false)) { await opt.click(); continue; }
    break;
  }
  await expect(finished, 'урок пройден end-to-end').toBeVisible({ timeout: 15_000 });
});

test('smoke: все 12 уроков открываются (страницы интро)', async ({ page }) => {
  await page.goto('/#/');
  await uploadZip(page);
  await page.getByRole('link', { name: /Старт/ }).first().click();
  const cards = page.locator('[data-testid="lesson-card"], article, li');
  void cards;
  const files = ['w1d1-sort-by-color','w1d2-count-1-3','w1d3-vowels-a-u-o','w2d1-number-4','w2d2-slog-ma','w2d3-abacus-intro','w3d1-big-small','w3d2-number-5','w3d3-slogi-sa-pa-ma','w4d1-plus','w4d2-two-features','w4d3-month-quest'];
  let opened = 0;
  for (const f of files) {
    await page.goto(`/#/lesson/m01-start-3-4/${encodeURIComponent(`lessons/${f}.json`)}/start`);
    const heading = page.locator('h1');
    if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) opened++;
  }
  expect(opened, `открылось ${opened}/12`).toBe(12);
});
