# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m01-zip.spec.ts >> урок 1 (w1d1) открывается и проходится end-to-end
- Location: e2e/m01-zip.spec.ts:31:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('link', { name: /Начать занятие|Начать всё равно/ })
Expected pattern: /Начать занятие/
Received string:  "▶ Начать всё равно"
Timeout: 5000ms

Call log:
  - Expect "toHaveText" getByRole('link', { name: /Начать занятие|Начать всё равно/ }) with timeout 5000ms
  - waiting for getByRole('link', { name: /Начать занятие|Начать всё равно/ })
    14 × locator resolved to <a aria-disabled="true" class="btn-primary opacity-90" href="#/lesson/m01-start-3-4/lessons%2Fw1d1-sort-by-color.json">▶ Начать всё равно</a>
       - unexpected value "▶ Начать всё равно"

```

```yaml
- link "▶ Начать всё равно" [disabled]:
  - /url: "#/lesson/m01-start-3-4/lessons%2Fw1d1-sort-by-color.json"
```

# Test source

```ts
  1  | // Smoke Этапа 4: загрузка m01-start-3-4.zip через UI, урок 1 end-to-end, открытие всех 12 уроков.
  2  | import { expect, test } from '@playwright/test';
  3  | import { readFileSync } from 'node:fs';
  4  | 
  5  | const ZIP = readFileSync(new URL('../public/modules/m01-start-3-4.zip', import.meta.url));
  6  | 
  7  | test.beforeEach(async ({ page }) => {
  8  |   await page.goto('/#/');
  9  |   await page.evaluate(async () => {
  10 |     localStorage.clear();
  11 |     const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
  12 |     await Promise.all(regs.map((r) => r.unregister()));
  13 |     const keys = await caches.keys();
  14 |     await Promise.all(keys.map((k) => caches.delete(k)));
  15 |     const req = indexedDB.deleteDatabase('home-lessons');
  16 |     await new Promise((res) => { req.onsuccess = res; req.onerror = res; req.onblocked = res; });
  17 |   });
  18 | });
  19 | 
  20 | async function uploadZip(page: import('@playwright/test').Page) {
  21 |   await page.getByTestId('zip-input').setInputFiles({ name: 'm01-start-3-4.zip', mimeType: 'application/zip', buffer: ZIP });
  22 |   await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  23 | }
  24 | 
  25 | test('zip загружается через UI, карточка модуля появляется', async ({ page }) => {
  26 |   await page.goto('/#/');
  27 |   await uploadZip(page);
  28 |   await expect(page.getByRole('link', { name: /Старт/ }).first()).toBeVisible();
  29 | });
  30 | 
  31 | test('урок 1 (w1d1) открывается и проходится end-to-end', async ({ page }) => {
  32 |   await page.goto('/#/');
  33 |   await uploadZip(page);
  34 |   await page.getByRole('link', { name: /Старт/ }).first().click();
  35 |   // первый урок модуля → чек-лист материалов
  36 |   await page.getByRole('link', { name: /^Начать$/ }).first().click();
  37 |   const boxes = page.locator('input[type="checkbox"]');
  38 |   for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check({ force: true });
  39 |   const startLink = page.getByRole('link', { name: /Начать занятие|Начать всё равно/ });
> 40 |   await expect(startLink).toHaveText(/Начать занятие/);
     |                           ^ Error: expect(locator).toHaveText(expected) failed
  41 |   await startLink.click();
  42 |   // плеер: проходим шаги кнопкой «Дальше» (instruction/offline — тап), picture-choice/count — клик по варианту
  43 |   const finished = page.getByRole('heading', { name: /Занятие окончено/ });
  44 |   for (let step = 0; step < 30; step++) {
  45 |     if (await finished.isVisible().catch(() => false)) break;
  46 |     const next = page.getByRole('button', { name: /Дальше|Готово|Завершить/ });
  47 |     if (await next.first().isEnabled().catch(() => false)) { await next.first().click(); continue; }
  48 |     const opt = page.locator('[data-testid*="option"], button[role="radio"]').first();
  49 |     if (await opt.isVisible().catch(() => false)) { await opt.click(); continue; }
  50 |     break;
  51 |   }
  52 |   await expect(finished, 'урок пройден end-to-end').toBeVisible({ timeout: 15_000 });
  53 | });
  54 | 
  55 | test('smoke: все 12 уроков открываются (страницы интро)', async ({ page }) => {
  56 |   await page.goto('/#/');
  57 |   await uploadZip(page);
  58 |   await page.getByRole('link', { name: /Старт/ }).first().click();
  59 |   const cards = page.locator('[data-testid="lesson-card"], article, li');
  60 |   void cards;
  61 |   const files = ['w1d1-sort-by-color','w1d2-count-1-3','w1d3-vowels-a-u-o','w2d1-number-4','w2d2-slog-ma','w2d3-abacus-intro','w3d1-big-small','w3d2-number-5','w3d3-slogi-sa-pa-ma','w4d1-plus','w4d2-two-features','w4d3-month-quest'];
  62 |   let opened = 0;
  63 |   for (const f of files) {
  64 |     await page.goto(`/#/lesson/m01-start-3-4/${encodeURIComponent(`lessons/${f}.json`)}/start`);
  65 |     const heading = page.locator('h1');
  66 |     if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) opened++;
  67 |   }
  68 |   expect(opened, `открылось ${opened}/12`).toBe(12);
  69 | });
  70 | 
```