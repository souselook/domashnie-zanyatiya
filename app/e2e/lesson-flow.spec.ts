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

  // seed-модули скрыты по умолчанию — включаем переключатель «Показать демо-модули»
  await page.goto('/#/');
  const emptyState = page.getByTestId('empty-state');
  if (await emptyState.isVisible().catch(() => false)) {
    await page.getByTestId('show-seeds-link').click();
  } else {
    const toggle = page.getByTestId('toggle-seeds').locator('input');
    if (!(await toggle.isChecked())) await toggle.check({ force: true });
  }
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

  // demo-урок: 4 шага (instruction → picture-choice → offline-task → reflection).
  // UI блокирует «Дальше» до выполнения интерактива (Этап 5.1): на s2 выбираем
  // картинку, на s3 отмечаем чек-лист и подтверждаем. Проходим два шага, чтобы
  // lastStepId гарантированно был не последним шагом — иначе после reload урок
  // авто-завершается и индикатора нет.
  await page.getByRole('button', { name: /Дальше/ }).click();          // s1 → s2

  // s2 picture-choice: без выбора «Дальше» заблокирована + подсказка
  const nextBtn = page.getByTestId('next-btn');
  await expect(nextBtn).toBeDisabled();
  await expect(page.getByTestId('next-hint')).toHaveText('Выберите картинку');
  await page.getByRole('group', { name: 'Варианты ответа' }).getByRole('button').first().click();
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();                                               // s2 → s3

  // s3 offline-task: без отмеченного чек-листа «Дальше» заблокирована + подсказка
  await expect(nextBtn).toBeDisabled();
  await expect(page.getByTestId('next-hint')).toHaveText('Отметьте выполненное');
  const taskBoxes = page.locator('section[aria-label="Задание"] input[type="checkbox"]');
  const tb = await taskBoxes.count();
  for (let i = 0; i < tb; i++) await taskBoxes.nth(i).check({ force: true });
  await expect(nextBtn).toBeEnabled();
  await page.getByRole('button', { name: /Выполнили — подтверждаю/ }).click();
  // после подтверждения родителя кнопка остаётся разблокированной (все пункты отмечены)
  await expect(nextBtn).toBeEnabled();
  await expect(page.getByTestId('step-indicator')).toHaveText(/^3 \/ 4$/);
  // даём завершиться асинхронному persist() в IndexedDB перед перезагрузкой
  await page.waitForTimeout(500);

  // перезагрузка: прогресс восстановлен — не первый шаг
  await page.reload();
  const indicator = page.getByTestId('step-indicator');
  await expect(indicator).toBeVisible({ timeout: 15_000 });
  await expect(indicator).toHaveText(/^3 \/ 4$/);

  // доходим до конца: s3 → s4 (галочки и подтверждение восстановлены офлайн-синком),
  // затем «Завершить» на последнем шаге. Кнопка «Дальше/Завершить» остаётся в DOM
  // и над done-экраном — кликаем ровно stepCount раз, не полагаясь на видимость.
  const next = page.getByTestId('next-btn');
  await expect(next).toBeEnabled({ timeout: 15_000 });
  for (let i = 0; i < 2; i++) {           // s3 → s4 → finish
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(page.getByRole('heading', { name: 'Занятие окончено' })).toBeVisible();

  // Прямые переходы вместо кликов по ссылкам: после QUIT React-роутинг не
  // всегда переключает экран, hash-навигация надёжнее.
  await page.goto('/#/progress');
  // seed-модуль (demo-core-check) намеренно фильтруется из ProgressPage
  // (m.isSeed) — при пустом списке показывается empty-state «Записей пока нет».
  await expect(page.getByTestId('progress-empty')).toBeVisible({ timeout: 10_000 });
});

test('несуществующий урок даёт понятную ошибку, приложение живёт', async ({ page }) => {
  await page.goto('/#');
  await page.evaluate(() => { location.hash = '/lesson/demo-core-check/' + encodeURIComponent('lessons/no-such-lesson.json'); });
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/не найден/i).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Домашние занятия/ })).toBeVisible();
});
