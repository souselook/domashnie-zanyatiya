// Этап 5.3 — offline-подтверждение PWA браузерно.
// Сценарий: онлайн-первый визит (SW регистрируется + precache), затем
// context.setOffline(true) → перезагрузка → главная открывается из кэша →
// загруженный ранее модуль и урок рендерят сцену со спрайтами из кэша.
// Маршруты — HashRouter; webServer в playwright.config гоняет build+preview,
// т.е. обслуживается реальный dist со sw.js.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ZIP = readFileSync(new URL('../public/modules/m01-start-3-4.zip', import.meta.url));

test('offline: приложение открывается без сети после первой загрузки', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Онлайн: первый визит, загрузка модуля через UI, активация SW.
  await page.goto('/#/');
  // zip-input — скрытый <input type=file class="hidden"> (виден только label-кнопка);
  // проверяем, что главная отрендерилась, через сам элемент в DOM.
  await expect(page.getByTestId('zip-input')).toBeAttached({ timeout: 15_000 });

  await page.getByTestId('zip-input').setInputFiles({
    name: 'm01-start-3-4.zip',
    mimeType: 'application/zip',
    buffer: ZIP,
  });
  await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });

  // Ждём регистрации и активной фазы SW (autoUpdate skipWaiting возьмёт контроль).
  await page.evaluate(() =>
    navigator.serviceWorker
      .getRegistration()
      .then((r) => (r && r.active ? r.active : r?.waiting ?? r?.installing)?.state ?? 'none')
      .then(async (state) => {
        if (state !== 'activated') {
          await new Promise<void>((res) => {
            navigator.serviceWorker.addEventListener('controllerchange', () => res(), { once: true });
            setTimeout(res, 10_000);
          });
        }
      }),
  );
  // Дать precache доработать до 100%.
  await page.waitForTimeout(1500);

  // 2. Офлайн: перезагрузка — главная работает из кэша.
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('zip-input')).toBeAttached({ timeout: 15_000 });
  await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });

  // 3. Офлайн: открыть урок напрямую по маршруту (как в visual-smoke) —
  //    сцена рендерится, спрайты из кэша, placeholder'ов нет.
  await page.goto('/#/lesson/m01-start-3-4/' + encodeURIComponent('lessons/w1d1-sort-by-color.json'));
  await expect(page.getByTestId('step-indicator')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800); // дозагрузка спрайт-листов (см. visual-smoke)
  await expect(page.getByTestId('sprite-missing')).toHaveCount(0);
  await expect(page.locator('svg').first()).toBeVisible();

  // 4. Вернуться в сеть.
  await context.setOffline(false);
  await context.close();
});
