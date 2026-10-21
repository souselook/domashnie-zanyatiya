// Этап 4.7/4.8 — визуальный smoke: 12 уроков m01-start-3-4.zip через реальный UI.
// Для каждого урока: открыть → дойти до reflection → вернуться.
// Плюс проверка: sprite-missing placeholder'ов нет ни на одном шаге (после 4.6).
// Маршруты приложения — HashRouter (все рабочие e2e используют '/#/...').
// m01-модуль живёт в zip (в registry его нет) — загружается через zip-input,
// как в m01-zip.spec.ts.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const ZIP = readFileSync(new URL('../public/modules/m01-start-3-4.zip', import.meta.url));
const MODULE = 'm01-start-3-4';
const LESSONS = [
  'w1d1-sort-by-color',
  'w1d2-count-1-3',
  'w1d3-vowels-a-u-o',
  'w2d1-number-4',
  'w2d2-slog-ma',
  'w2d3-abacus-intro',
  'w3d1-big-small',
  'w3d2-number-5',
  'w3d3-slogi-sa-pa-ma',
  'w4d1-plus',
  'w4d2-two-features',
  'w4d3-month-quest',
];

test.describe.configure({ mode: 'serial' });

async function uploadZip(page: import('@playwright/test').Page) {
  await page.getByTestId('zip-input').setInputFiles({ name: 'm01-start-3-4.zip', mimeType: 'application/zip', buffer: ZIP });
  await expect(page.getByText('Старт 3–4', { exact: false }).first()).toBeVisible({ timeout: 15_000 });
}

for (const file of LESSONS) {
  test(`smoke ${file}: старт → reflection → назад`, async ({ page }) => {
    const failures: string[] = [];
    page.on('pageerror', (e) => failures.push(String(e)));

    // Чистый профиль + загрузка m01-зипа через UI (модуль не в registry).
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
    await page.goto('/#/');
    await uploadZip(page);

    // Страница предпросмотра урока должна отрендериться (не redirect-404).
    await page.goto(`/#/module/${MODULE}/preview/lessons/${file}.json`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });

    // Интро-страница (чек-лист материалов), затем плеер.
    await page.goto(`/#/lesson/${MODULE}/${encodeURIComponent(`lessons/${file}.json`)}/start`);
    const startBtn = page.getByRole('button', { name: /начать|старт/i });
    if (await startBtn.isVisible().catch(() => false)) await startBtn.click();

    await page.goto(`/#/lesson/${MODULE}/${encodeURIComponent(`lessons/${file}.json`)}`);
    await expect(page.getByTestId('step-indicator')).toBeVisible({ timeout: 15_000 });
    // ждём дозагрузку спрайт-листов: Sprite рендерит временную заглушку,
    // пока <use href="лист#symbol"> не готов (loader кэширует на страницу)
    await page.waitForTimeout(800);

    for (let i = 0; i < 40; i++) {
      // плейсхолдеры запрещены на любом шаге
      const ph = await page.locator('[data-testid="sprite-missing"]').count();
      expect(ph, `плейсхолдер спрайта на шаге ${i} урока ${file}`).toBe(0);

      if (await page.getByText(/Занятие окончено/i).first().isVisible().catch(() => false)) break;
      const next = page.getByRole('button', { name: /дальше|готово|продолжить|завершить/i }).first();
      if (!(await next.isVisible().catch(() => false))) break;
      if (!(await next.isEnabled().catch(() => false))) {
        // picture-choice: выбрать вариант (работает в обоих режимах tap/drag)
        const opt = page.getByRole('group', { name: 'Варианты ответа' }).getByRole('button').first();
        if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {});
        // шаг с чекбоксом-заданиями: отметить все чекбоксы и подтвердить
        const boxes = page.locator('input[type="checkbox"]');
        const n = await boxes.count();
        for (let k = 0; k < n; k++) await boxes.nth(k).check({ force: true }).catch(() => {});
        const confirm = page.getByRole('button', { name: /подтверждаю/i });
        if (await confirm.isVisible().catch(() => false)) await confirm.click().catch(() => {});
        if (!(await next.isEnabled().catch(() => false))) break;
      }
      await next.click();
      await page.waitForTimeout(300); // дай Sprite долиться реальным спрайтом
    }
    await expect(page.getByText(/Занятие окончено/i).first(), `рефлексия/финал не достигнут в ${file}`).toBeVisible({ timeout: 10_000 });
    expect(failures, `pageerror в ${file}`).toEqual([]);

    // Вернуться к списку модуля
    await page.goBack().catch(() => {});
    await page.goto(`/#/module/${MODULE}`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });
}

test('все 12 SVG-листов отдаются dev-сервером', async ({ request }) => {
  const sheets = [
    'character/luntic.svg', 'cubes/zaytsev.svg', 'icons/materials.svg',
    'letters/cyrillic-upper.svg', 'numbers/digits.svg', 'objects/animals.svg',
    'objects/dishes.svg', 'objects/flowers.svg', 'objects/fruits.svg',
    'objects/shapes.svg', 'symbols/math.svg', 'symbols/ui.svg',
  ];
  for (const s of sheets) {
    const r = await request.get(`/sprites/${s}`);
    expect(r.status(), `лист ${s}`).toBe(200);
    const body = await r.text();
    expect(body, `лист ${s} содержит symbol`).toContain('<symbol');
  }
});
