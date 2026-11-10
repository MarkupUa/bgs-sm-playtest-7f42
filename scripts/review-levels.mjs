import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 907, height: 510 } });
await page.goto('http://127.0.0.1:4173');
await page.waitForSelector('[data-car]');
mkdirSync('release/metadata/review', { recursive: true });
for (let i = 0; i < 48; i++) {
  await page.evaluate((n) => window.streetMemory.load(n), i);
  await page.waitForTimeout(80);
  await page
    .locator('.board-frame')
    .screenshot({ path: `release/metadata/review/${String(i + 1).padStart(2, '0')}.png` });
}
await page.setViewportSize({ width: 360, height: 640 });
await page.evaluate(() => window.streetMemory.load(47));
await page.waitForTimeout(250);
await page.screenshot({ path: 'release/metadata/mobile-review.png' });
await browser.close();
