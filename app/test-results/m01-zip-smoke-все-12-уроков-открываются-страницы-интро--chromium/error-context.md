# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m01-zip.spec.ts >> smoke: все 12 уроков открываются (страницы интро)
- Location: e2e/m01-zip.spec.ts:54:1

# Error details

```
Error: открылось 0/12

expect(received).toBe(expected) // Object.is equality

Expected: 12
Received: 0
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - navigation "Главная навигация" [ref=e5]:
      - link "🏡 Домашние занятия" [ref=e6] [cursor=pointer]:
        - /url: "#/"
      - link "Прогресс" [ref=e7] [cursor=pointer]:
        - /url: "#/progress"
      - link "Настройки" [ref=e8] [cursor=pointer]:
        - /url: "#/settings"
  - main [ref=e9]:
    - alert [ref=e10]:
      - heading "Что-то не так с модулем" [level=3] [ref=e11]
      - paragraph [ref=e12]: Файл модуля не найден. Убедитесь, что папка модуля лежит в /modules/ и путь в реестре верный.
      - paragraph [ref=e13]: Урок «w4d3-month-quest» отсутствует в модуле «m01-start-3-4».
  - contentinfo [ref=e14]: Занятия проходят дома, вместе с родителем. Без оценок и рейтингов.
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
  40 |   await expect(startLink).toHaveText(/Начать занятие/);
  41 |   await startLink.click();
  42 |   // плеер: проходим шаги кнопкой «Дальше» (instruction/offline — тап), picture-choice/count — клик по варианту
  43 |   for (let step = 0; step < 30; step++) {
  44 |     if (await page.getByText(/Урок пройден|Занятие завершено|Рефлексия/i).last().isVisible().catch(() => false)) break;
  45 |     const next = page.getByRole('button', { name: /Дальше|Готово|Завершить/ });
  46 |     if (await next.first().isEnabled().catch(() => false)) { await next.first().click(); continue; }
  47 |     const opt = page.locator('[data-testid*="option"], button[role="radio"]').first();
  48 |     if (await opt.isVisible().catch(() => false)) { await opt.click(); continue; }
  49 |     break;
  50 |   }
  51 |   await expect(page.getByTestId('player-next'), 'плеер дошёл до конца шагов').toBeVisible();
  52 | });
  53 | 
  54 | test('smoke: все 12 уроков открываются (страницы интро)', async ({ page }) => {
  55 |   await page.goto('/#/');
  56 |   await uploadZip(page);
  57 |   await page.getByRole('link', { name: /Старт/ }).first().click();
  58 |   const cards = page.locator('[data-testid="lesson-card"], article, li');
  59 |   void cards;
  60 |   const files = ['w1d1-sort-by-color','w1d2-count-1-3','w1d3-vowels-a-u-o','w2d1-number-4','w2d2-slog-ma','w2d3-abacus-intro','w3d1-big-small','w3d2-number-5','w3d3-slogi-sa-pa-ma','w4d1-plus','w4d2-two-features','w4d3-month-quest'];
  61 |   let opened = 0;
  62 |   for (const f of files) {
  63 |     await page.goto(`/#/lesson/m01-start-3-4/${f}/start`);
  64 |     const heading = page.locator('h1');
  65 |     if (await heading.first().isVisible({ timeout: 5000 }).catch(() => false)) opened++;
  66 |   }
> 67 |   expect(opened, `открылось ${opened}/12`).toBe(12);
     |                                            ^ Error: открылось 0/12
  68 | });
  69 | 
```