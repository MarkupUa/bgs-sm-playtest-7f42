import { test, expect, type Page } from '@playwright/test';
async function open(page: Page) {
  await page.goto('./');
  await expect(page.locator('[data-car]').first()).toBeVisible();
}
async function fast(page: Page) {
  await page.locator('#settings').click();
  await page.locator('#set-fast').check();
  await page.locator('#set-sound').uncheck();
  await page.locator('#close-modal').click();
}
async function send(page: Page, id: string) {
  await page.locator(`[data-car="${id}"]`).click();
  await expect(page.locator('#restart')).toBeEnabled();
}
async function firstWin(page: Page) {
  await send(page, 'C0');
  await expect(page.locator('#next')).toBeVisible();
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('02');
}

test('Pages subpath loads all resources, keeps exact metadata and has no SDK or ads', async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(new URL(baseURL!).origin) && !r.url().startsWith('data:'))
      external.push(r.url());
  });
  await open(page);
  await expect(page).toHaveTitle('Street Memory — A Cozy Logic Puzzle');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await fast(page);
  await firstWin(page);
  expect(await page.evaluate(() => 'streetMemory' in window || 'CrazyGames' in window)).toBe(false);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('campaign, wrong home, Undo, Hint, Preview/Send, Restart, pause, sound and Next', async ({
  page,
}) => {
  await open(page);
  await fast(page);
  await firstWin(page);
  await send(page, 'C1');
  await expect(page.locator('#result')).toContainText('A different doorstep');
  await page.locator('#fix').click();
  await expect(page.locator('#delivery-count')).toHaveText('0 / 2 home');
  await send(page, 'C0');
  await send(page, 'C1');
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('03');
  await send(page, 'RED');
  await send(page, 'BLUE');
  await page.locator('#restart').click();
  await expect(page.locator('#delivery-count')).toHaveText('0 / 3 home');
  await page.locator('#hint').click();
  await expect(page.locator('[data-car="RED"]')).toHaveClass(/hinted/);
  await page.locator('#preview').click();
  await page.locator('[data-car="RED"]').click();
  await expect(page.locator('#delivery-count')).toHaveText('0 / 3 home');
  await page.locator('#send').click();
  await expect(page.locator('#restart')).toBeEnabled();
  await expect(page.locator('#delivery-count')).toHaveText('1 / 3 home');
  await page.locator('#preview').click();
  await page.locator('#pause').click();
  await expect(page.locator('#modal-title')).toHaveText('A moment of quiet.');
  await page.locator('#resume').click();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await send(page, 'BLUE');
  await send(page, 'GREEN');
  await expect(page.locator('#result')).toContainText('Everyone is home.');
  await page.locator('#levels').click();
  await expect(page.locator('[data-level="2"] small')).toHaveText('★');
  await page.locator('#close-modal').click();
});

test('closing/reopening a tab and F5 preserve progress and music preferences', async ({
  page,
  context,
}) => {
  await open(page);
  await fast(page);
  await firstWin(page);
  await page.locator('#settings').click();
  await page.locator('#set-music').uncheck();
  await page.locator('#close-modal').click();
  await page.close();
  const reopened = await context.newPage();
  await open(reopened);
  await expect(reopened.locator('#level-label')).toContainText('02');
  await reopened.reload();
  await expect(reopened.locator('#level-label')).toContainText('02');
  await reopened.locator('#settings').click();
  await expect(reopened.locator('#set-music')).not.toBeChecked();
  await expect(reopened.locator('#set-sound')).not.toBeChecked();
  await reopened.locator('#close-modal').click();
  const save = await reopened.evaluate(() =>
    JSON.parse(localStorage.getItem('street-memory:save:v2')!),
  );
  expect(save.version).toBe(2);
  expect(save.best['sm-001']).toBe(3);
  await reopened.close();
});

test('Daily uses UTC across time zones and completion keeps campaign progress', async ({
  browser,
  baseURL,
}) => {
  const fleets: string[] = [];
  for (const timezoneId of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
    const context = await browser.newContext({ baseURL, timezoneId });
    const page = await context.newPage();
    await open(page);
    await fast(page);
    await firstWin(page);
    const day = await page.evaluate(() => new Date().toISOString().slice(0, 10));
    await page.locator('#daily').click();
    await expect(page.locator('#district')).toContainText(day + ' UTC');
    fleets.push(await page.locator('#cars').innerHTML());
    if (fleets.length === 1) {
      for (let i = 0; i < 6; i++) {
        if (await page.locator('#next').isVisible()) break;
        await page.locator('#hint').click();
        const car = page.locator('.car.hinted');
        await expect(car).toHaveCount(1);
        await car.click();
        await expect(page.locator('#restart')).toBeEnabled();
      }
      await expect(page.locator('#result')).toContainText('Everyone is home.');
      await page.locator('#next').click();
      await expect(page.locator('#level-label')).toContainText('02');
    }
    await context.close();
  }
  expect(fleets[0]).toBe(fleets[1]);
});

for (const [width, height] of [
  [1920, 1080],
  [1366, 768],
  [907, 510],
  [768, 1024],
  [390, 844],
  [375, 667],
]) {
  test(`responsive production map ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.addInitScript(() =>
      localStorage.setItem(
        'street-memory:save:v2',
        JSON.stringify({
          version: 2,
          current: 47,
          best: Object.fromEntries(
            Array.from({ length: 47 }, (_, i) => ['sm-' + String(i + 1).padStart(3, '0'), 3]),
          ),
          daily: {},
          settings: { sound: false, music: false, fast: true, reduced: true },
        }),
      ),
    );
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page);
    await expect(page.locator('#level-label')).toContainText('48');
    for (const selector of [
      '.board-frame',
      '[data-car]',
      '#undo',
      '#restart',
      '#hint',
      '#preview',
      '#pause',
      '#sound',
    ]) {
      for (const element of await page.locator(selector).all()) {
        const box = await element.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
        if (selector !== '.board-frame') {
          expect(box!.width).toBeGreaterThanOrEqual(44);
          expect(box!.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`pages-${width}x${height}.png`) });
  });
}

test('touch sends once and Preview requires Send on a phone', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await open(page);
  await fast(page);
  await page.locator('[data-car]').first().tap();
  await expect(page.locator('#next')).toBeVisible();
  await page.locator('#next').tap();
  await page.locator('#preview').tap();
  await page.locator('[data-car="C0"]').tap();
  await expect(page.locator('#delivery-count')).toHaveText('0 / 2 home');
  await page.locator('#send').tap();
  await expect(page.locator('#restart')).toBeEnabled();
  await expect(page.locator('#delivery-count')).toHaveText('1 / 2 home');
  await context.close();
});
