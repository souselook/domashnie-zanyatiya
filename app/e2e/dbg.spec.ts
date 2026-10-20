import { test } from '@playwright/test';
test('dbg raw', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => { if (r.url().includes('/modules/')) reqs.push(r.url()); });
  await page.goto('/#/');
  await page.evaluate(() => localStorage.clear());
  await page.addInitScript(() => {
    localStorage.setItem('hl.progress.v1', JSON.stringify({
      'demo-core-check/demo-loader': {
        lessonId: 'demo-loader', moduleId: 'demo-core-check',
        startedAt: 'FIXED-TIME', steps: { s1: { completedAt: 'X', secondsSpent: 5 } },
        lastStepId: 's2',
      },
    }));
  });
  await page.goto('/#/lesson/demo-core-check/' + encodeURIComponent('lessons/demo-loader.json'));
  await page.waitForSelector('[data-testid="step-indicator"]');
  await page.waitForTimeout(800);
  console.log('REQS:', reqs.join('\nREQS: '));
  console.log('LS:', await page.evaluate(() => localStorage.getItem('hl.progress.v1')));
});
