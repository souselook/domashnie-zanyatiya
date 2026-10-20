// v1.1.1: drag-and-drop для picture-choice (interaction:"drag").
// Демо-модуль examples/demo-drag.zip: урок d1 — drag-шаг, урок d2 — tap-шаг (compat).
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ZIP = readFileSync(new URL('../examples/demo-drag.zip', import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto('/#/');
  await page.evaluate(async () => {
    // ВАЖНО (фикс 1.1.1): НЕ делаем localStorage.clear() — он стирал флаг
    // hl.seeded.v1, после перезагрузки запускался async seedOnce и гонка с
    // uploadDemo давала «Модуль уже установлен» (zip не загружался, урок d1
    // не открывался). Вместо полного clear — точечное удаление прогресса:
    try { localStorage.removeItem('hl.progress.v1'); } catch { /* ignore */ }
    const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    const req = indexedDB.deleteDatabase('home-lessons');
    await new Promise((res) => { req.onsuccess = res; req.onerror = res; req.onblocked = res; });
  });
  await page.reload();
  // ждём завершения async seedOnce: на главной появляется карточка m01-start-3-4
  await expect(page.getByText(/Старт|start/i).first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
});

async function uploadDemo(page: import('@playwright/test').Page) {
  await page.getByTestId('zip-input').setInputFiles({ name: 'demo-drag.zip', mimeType: 'application/zip', buffer: ZIP });
  await expect(page.getByText('Drag-демо', { exact: false }).first()).toBeVisible({ timeout: 15_000 });

  // Страховка: после загрузки демо точечно чистим ТОЛЬКО store progress
  // (модуль demo-drag остаётся в IndexedDB), чтобы плеер гарантированно
  // стартовал с шага 1 (иначе RESET доматывает до s4 → «Занятие окончено»).
  await clearProgressStore(page);
}

async function openLesson(page: import('@playwright/test').Page, name: RegExp) {
  // главная: ссылка на карточку модуля («Drag-демо») ведёт на страницу модуля
  await page.getByRole('link', { name: /Drag-демо/ }).first().click();

  // страница модуля: карточка урока — <li> с заголовком; кнопка «Начать» ведёт на интро
  const card = page.locator('li').filter({ hasText: name });
  await expect(card.first()).toBeVisible({ timeout: 15_000 });
  await card.getByRole('link', { name: /^Начать$/ }).first().click();

  // интро грузится асинхронно («Загружаем урок…»): ждём кнопку старта, отмечаем чекбоксы
  const startLink = page.getByRole('link', { name: /▶ Начать занятие|▶ Начать всё равно/ });
  await expect(startLink).toBeVisible({ timeout: 15_000 });
  const boxes = page.locator('input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check({ force: true });
  await startLink.click();

  // ФИКС 1.1.1 (корневая причина «Занятие окончено» при маунте): переход
  // интро → плеер происходит СРАЗУ после клика «▶ Начать занятие», а запись
  // прогресса (setLastStep(s1)) из монтирования плеера пишется в IndexedDB
  // АСИНХРОННО. Если сразу уйти с плеера (например, helper'ом вперёд по
  // шагам), этот async-write может переслать устаревший снимок (lastStepId
  // последнего шага прошлого прогона) ПОСЛЕ гидратации зеркала — RESET
  // доматывает плеер до конца урока. Поэтому: ждём фактического монтирования
  // плеера, вычищаем зеркало+IDB-store progress (уникальный момент — больше
  // никто не пишет), даём app-гидратации перечитать пустой IDB и только then
  // возвращаемся на страницу занятия.
  const playerUrl = page.url();
  await expect(page.getByTestId('step-indicator')).toBeVisible({ timeout: 15_000 });
  await clearProgressStore(page);
  await page.goto('/#/');
  await page.reload(); // bootstrap: hydrateProgressCache() перечитает чистый IDB в зеркало
  await page.goto(playerUrl);
  await page.waitForURL(/#\/lesson\//);
  await expect(page.getByTestId('step-indicator')).toBeVisible({ timeout: 15_000 });
  // старт строго с шага 1 — если нет, гонка прогресса вернулась
  await expect(page.getByTestId('step-indicator')).toHaveText(/1 \/ \d+/);
}

// Точечная чистка store progress в IndexedDB + зеркало hl.progress.v1
// (модули остаются установленными). Используется как страховка после uploadDemo
// и перед возвратом на страницу занятия.
async function clearProgressStore(page: import('@playwright/test').Page) {
  try { localStorage.removeItem('hl.progress.v1'); } catch { /* ignore */ }
  await page.evaluate(async () => {
    try { localStorage.removeItem('hl.progress.v1'); } catch { /* ignore */ }
    await new Promise<void>((res, rej) => {
      const open = indexedDB.open('home-lessons');
      open.onsuccess = () => {
        const db = open.result;
        try {
          if (db.objectStoreNames.contains('progress')) {
            const tx = db.transaction('progress', 'readwrite');
            tx.objectStore('progress').clear();
            tx.oncomplete = () => { db.close(); res(); };
            tx.onerror = () => { db.close(); rej(tx.error); };
          } else { db.close(); res(); }
        } catch (e) { db.close(); rej(e as Error); }
      };
      open.onerror = () => rej(open.error ?? new Error('idb open fail'));
      open.onblocked = () => res();
    });
  });
}

// Перейти со текущего picture-choice-шага на следующий (после решения теста).
async function advanceToNextStep(page: import('@playwright/test').Page) {
  await page.getByTestId('next-btn').click();
  await page.waitForTimeout(200);
}

// v1.1.1: seed-демо m01 несёт предзаполненный прогресс; при старте урока
// RESET перематывает плеер к восстановленному шагу. Полный сброс — через UI
// «Настройки → Сбросить весь прогресс» (чистит IndexedDB + зеркало + кэш),
// затем перезагрузка для гидратации пустого кэша.
async function resetAllProgress(page: import('@playwright/test').Page) {
  await page.goto('/#/settings');
  await page.getByRole('button', { name: /Сбросить весь прогресс/ }).click();
  await page.getByRole('button', { name: /Да, удалить всё/ }).click();
  await page.waitForTimeout(300); // async dbClearProgress
  await page.goto('/#/');
  await page.reload();
  // input[type=file] скрыт (кнопка-загрузчик кликает по нему) — ждём саму страницу
  await expect(page.getByTestId('zip-input')).toBeAttached({ timeout: 15_000 });
}

// после сброса прогресса demo-модуль тоже удалён из IndexedDB? Да: resetAllProgress
// чистит всю базу (включая загруженные модули), поэтому демо нужно загрузить ПОВТОРНО
// после сброса. Порядок: сброс → перезагрузка UI → uploadDemo → открыть урок.
async function openFreshLesson(page: import('@playwright/test').Page, name: RegExp) {
  await resetAllProgress(page);
  await uploadDemo(page);
  await openLesson(page, name);
}

async function pointerDrag(page: import('@playwright/test').Page, sourceId: string, toZone: boolean) {
  const src = page.getByTestId(`drag-source-${sourceId}`);
  const zone = page.getByTestId('drop-zone');
  const sb = await src.boundingBox();
  const zb = await zone.boundingBox();
  if (!sb || !zb) throw new Error('no bounding box');
  const from = { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 };
  const to = toZone
    ? { x: zb.x + zb.width / 2, y: zb.y + zb.height / 2 }
    : { x: Math.max(4, from.x - 260), y: Math.max(4, from.y - 80) }; // мимо зоны
  const opts = (x: number, y: number) => ({ pointerId: 1, isPrimary: true, pointerType: 'mouse', button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true });
  await src.dispatchEvent('pointerdown', opts(from.x, from.y));
  await expect(page.getByTestId('drag-active')).toBeVisible();
  // промежуточные move'ы — на document (в UI они не обязательны, но реалистичнее)
  await page.locator('body').dispatchEvent('pointermove', opts((from.x + to.x) / 2, (from.y + to.y) / 2));
  const target = toZone ? zone : page.locator('body');
  await target.dispatchEvent('pointerup', { ...opts(to.x, to.y), buttons: 0 });
}

test('drag: успешный drop в зону выбирает вариант', async ({ page }) => {
  await page.goto('/#/');
  await openFreshLesson(page, /Drag урок 1/);
  await expect(page.getByTestId('drop-zone')).toBeVisible();
  await pointerDrag(page, 'circle', true);
  await expect(page.getByTestId('drop-zone')).toContainText('Выбрано: Круг', { timeout: 5_000 });
  // «Дальше» разблокирована после размещения
  await expect(page.getByTestId('next-btn')).toBeEnabled({ timeout: 5_000 });
});

test('drag: неверный drop — вариант возвращается, ничего не выбрано', async ({ page }) => {
  await page.goto('/#/');
  await openFreshLesson(page, /Drag урок 1/);
  await pointerDrag(page, 'square', false);
  await expect(page.getByTestId('drag-active')).toBeHidden();
  await expect(page.getByTestId('drop-zone')).not.toContainText('Выбрано');
  await expect(page.getByTestId('next-btn')).toBeDisabled();
});

test('tap-tap fallback в drag-режиме: тап по варианту, тап по зоне', async ({ page }) => {
  await page.goto('/#/');
  await openFreshLesson(page, /Tap урок 2/);
  await expect(page.getByTestId('drop-zone')).toBeVisible();
  await page.getByTestId('drag-source-triangle').click();
  await page.getByTestId('drop-zone').click();
  await expect(page.getByTestId('drop-zone')).toContainText('Выбрано: Треугольник', { timeout: 5_000 });
});

test('tap-режим без interaction остаётся прежним: drop-зоны нет', async ({ page }) => {
  await page.goto('/#/');
  await openFreshLesson(page, /Tap урок 2/);
  // шаг s1 — drag; проходим его tap-tap'ом, попадаем на s2 (tap, без interaction)
  await page.getByTestId('drag-source-triangle').click();
  await page.getByTestId('drop-zone').click();
  await advanceToNextStep(page);
  await expect(page.getByTestId('drop-zone')).toHaveCount(0);
  await page.locator('.task-option').first().click();
  await expect(page.getByTestId('next-btn')).toBeEnabled({ timeout: 5_000 });
});
