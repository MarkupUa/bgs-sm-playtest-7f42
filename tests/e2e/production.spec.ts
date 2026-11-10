import { test, expect } from '@playwright/test';
declare global {
  interface Window {
    sdkMock: { events: string[]; mute: (v: boolean) => void };
  }
}
const sdkMock = `window.sdkMock={events:[],mute:()=>{}};window.CrazyGames={SDK:{init:async()=>{window.sdkMock.events.push('init')},game:{settings:{muteAudio:true},gameplayStart:()=>window.sdkMock.events.push('start'),gameplayStop:()=>window.sdkMock.events.push('stop'),addSettingsChangeListener:fn=>{window.sdkMock.mute=value=>fn({muteAudio:value})},removeSettingsChangeListener:()=>{}},ad:{requestAd:()=>{throw Error('Basic attempted advertising')}}}};`;
test('production standalone wins, relative assets work, no SDK or dev hooks', async ({ page }) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(r.url());
  });
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1') && !r.url().startsWith('data:'))
      external.push(r.url());
  });
  await page.goto('/standalone/');
  await page.locator('[data-car]').first().click();
  await expect(page.locator('#next')).toBeVisible({ timeout: 12000 });
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('02');
  expect(await page.evaluate(() => 'streetMemory' in window)).toBe(false);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
test('Basic SDK success starts/stops gameplay and sound stays platform-muted', async ({ page }) => {
  await page.route('https://sdk.crazygames.com/**', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: sdkMock }),
  );
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/crazygames/');
  await expect(page.locator('[data-car]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => window.sdkMock.events)).toEqual(['init', 'start']);
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Sound muted by platform');
  await page.locator('#sound').click();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => window.sdkMock.mute(false));
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Sound on');
  await page.evaluate(() => window.sdkMock.mute(true));
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#pause').click();
  await expect
    .poll(() => page.evaluate(() => window.sdkMock.events))
    .toEqual(['init', 'start', 'stop']);
  await page.locator('#resume').click();
  await expect
    .poll(() => page.evaluate(() => window.sdkMock.events))
    .toEqual(['init', 'start', 'stop', 'start']);
  await page.locator('[data-car]').click();
  await expect(page.locator('#next')).toBeVisible({ timeout: 12000 });
  await expect.poll(() => page.evaluate(() => window.sdkMock.events.at(-1))).toBe('stop');
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('02');
  expect(errors).toEqual([]);
});
test('Basic SDK initialization failure degrades to playable local game', async ({ page }) => {
  await page.route('https://sdk.crazygames.com/**', (r) =>
    r.fulfill({
      contentType: 'application/javascript',
      body: sdkMock.replace("window.sdkMock.events.push('init')", "throw Error('SDK offline')"),
    }),
  );
  await page.goto('/crazygames/');
  await page.locator('[data-car]').click();
  await expect(page.locator('#next')).toBeVisible({ timeout: 12000 });
});
test('unpacked upload ZIP boots and is playable', async ({ page }) => {
  await page.route('https://sdk.crazygames.com/**', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: sdkMock }),
  );
  await page.goto('http://127.0.0.1:4175/');
  await page.locator('[data-car]').click();
  await expect(page.locator('#next')).toBeVisible({ timeout: 12000 });
});
