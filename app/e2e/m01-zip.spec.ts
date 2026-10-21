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
  await page.reload(); // bootstrap: hydrateProgressCache() перечитает чистый IDB в зеркало hl.progress.v1
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
  await expect(boxes.first()).toBeVisible({ timeout: 10_000 }); // ждём hydration: до загрузки урока чекбоксов нет
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check({ force: true });
  const startLink = page.getByRole('link', { name: /Начать занятие|Начать всё равно/ });
  await expect(startLink, 'после отметки всех материалов ссылка меняется на «Начать занятие»').toHaveText(/Начать занятие/, { timeout: 10_000 });
  await startLink.click();
  // плеер: проходим шаги. «Дальше» блокируется до интерактива (UX v1.0):
  // picture-choice — выбрать вариант, offline-task — отметить чек-лист и
  // подтвердить; затем клик по enabled next-btn.
  const finished = page.getByRole('heading', { name: /Занятие окончено/ });
  const nextBtn = page.getByTestId('next-btn');
  for (let step = 0; step < 30; step++) {
    if (await finished.isVisible().catch(() => false)) break;
    if (!(await nextBtn.isVisible().catch(() => false))) break;
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      const opt = page.getByRole('group', { name: 'Варианты ответа' }).getByRole('button').first();
      if (await opt.isVisible().catch(() => false)) { await opt.click().catch(() => {}); }
      const boxes = page.locator('section[aria-label="Задание"] input[type="checkbox"]');
      const n = await boxes.count();
      for (let k = 0; k < n; k++) await boxes.nth(k).check({ force: true }).catch(() => {});
      const confirm = page.getByRole('button', { name: /подтверждаю/i });
      if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
      continue; // перепроверить состояние next-btn на следующем витре
    }
    await nextBtn.click();
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
    // h1 появляется после async-resolve: ждём явно, затем проверяем видимость без «false» из-за гонки
    const appeared = await heading.first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
    if (appeared && await heading.first().isVisible()) opened++;
    else console.log(`lesson intro not rendered: ${f} url=${page.url()}`);
  }
  expect(opened, `открылось ${opened}/12`).toBe(12);
});
