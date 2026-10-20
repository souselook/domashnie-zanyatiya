import { expect, test } from '@playwright/test';

/**
 * Сквозной сценарий занятия (ядро + demo-модуль):
 *  список модулей → чек-лист материалов → шаги стрелками «Дальше» →
 *  перезагрузка (восстановление прогресса) → завершение → экран прогресса.
 */
test('полный сценарий demo-урока с восстановлением прогресса', async ({ page }) => {
  test.setTimeout(60_000);

  // Чистим localStorage, Service Worker и кеш-модули — тест стартует с пустого профиля.
  await page.goto('/#/');
  await page.evaluate(async () => {
    localStorage.clear();
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  });

  await page.goto('/#/');
  await expect(page.getByText('Проверка ядра (демо)')).toBeVisible();

  await page.getByRole('link', { name: /Проверка ядра/ }).click();
  await expect(page.getByRole('heading', { name: 'Проверка ядра (демо)' })).toBeVisible();

  // старт первого урока → страница чек-листа материалов
  await page.getByRole('link', { name: /^Начать$/ }).first().click();
  await expect(
    page.getByRole('heading', { level: 1, name: /Урок 1\. Проверка загрузчика/ }),
  ).toBeVisible();

  // отмечаем все материалы — кнопка меняется на «Начать занятие»
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) await boxes.nth(i).check({ force: true });
  const startLink = page.getByRole('link', { name: /Начать занятие|Начать всё равно/ });
  await expect(startLink).toHaveText(/Начать занятие/);
  await startLink.click();

  // первый шаг — «Дальше»
  await page.getByRole('button', { name: /Дальше/ }).click();

  // перезагрузка: прогресс восстановлен — не первый шаг
  await page.reload();
  const indicator = page.getByTestId('step-indicator');
  await expect(indicator).toBeVisible({ timeout: 15_000 });
  await expect(indicator).not.toHaveText(/^1 \/ /);

  // доходим до конца
  for (let i = 0; i < 10; i++) {
    const next = page.getByRole('button', { name: /Дальше|Завершить/ });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  await expect(page.getByRole('heading', { name: 'Занятие окончено' })).toBeVisible();

  await page.getByRole('link', { name: /Посмотреть прогресс/ }).click();
  await expect(page.getByRole('heading', { name: 'Прогресс' })).toBeVisible();
});

test('несуществующий урок даёт понятную ошибку, приложение живёт', async ({ page }) => {
  await page.goto('/#');
  await page.evaluate(() => { location.hash = '/lesson/demo-core-check/' + encodeURIComponent('lessons/no-such-lesson.json'); });
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/не найден/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Домашние занятия/ })).toBeVisible();
});
