import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const phase = process.env.VISUAL_PHASE ?? 'before';
const url = process.env.VISUAL_URL ?? 'https://markupua.github.io/bgs-sm-playtest-7f42/';
const root = `.deployment/visual-quality/${phase}`;
mkdirSync(root, { recursive: true });
const matrix = [
  [390, 844, 3],
  [360, 800, 3],
  [375, 667, 2],
  [768, 1024, 2],
  [1366, 768, 1],
  [1920, 1080, 1],
  [1920, 1080, 2],
];
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ?? (process.env.CI ? undefined : '/usr/bin/google-chrome'),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = [];
for (const [width, height, dpr] of matrix) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile: width < 500,
    hasTouch: width < 850,
  });
  for (const level of [1, 48]) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(
      (n) =>
        window.localStorage.setItem(
          'street-memory:save:v2',
          JSON.stringify({
            version: 2,
            current: n - 1,
            best: Object.fromEntries(
              Array.from({ length: 48 }, (_, i) => ['sm-' + String(i + 1).padStart(3, '0'), 3]),
            ),
            daily: {},
            settings: { sound: false, music: false, fast: false, reduced: false },
          }),
        ),
      level,
    );
    await page.goto(url);
    await page.waitForSelector('[data-car]');
    await page.waitForTimeout(300);
    const name = `${width}x${height}-dpr${dpr}-street${level}`;
    await page.screenshot({ path: `${root}/${name}.png`, scale: 'device' });
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas'),
        box = canvas.getBoundingClientRect();
      const font = (selector) =>
        [...document.querySelectorAll(selector)]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({ text: e.textContent, font: window.getComputedStyle(e).fontSize }));
      return {
        dpr: window.devicePixelRatio,
        canvas: {
          width: canvas.width,
          height: canvas.height,
          cssWidth: box.width,
          cssHeight: box.height,
          ratioX: canvas.width / box.width,
          ratioY: canvas.height / box.height,
          dataset: { ...canvas.dataset },
        },
        fonts: font(
          '.car-meta,.car-meta em,.car-meta b,.car-index,.car-dock,.eyebrow,.caption,.tools button span,.garage-label>span,.level-indicator>span',
        ),
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        touchTargets: [...document.querySelectorAll('button:not(:disabled)')]
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            id: e.id,
            width: e.getBoundingClientRect().width,
            height: e.getBoundingClientRect().height,
          })),
      };
    });
    await page.locator('#hint').click();
    const hinted = page.locator('.car.hinted');
    if (await hinted.count()) {
      await page.evaluate(() => {
        window.visualFrames = [];
        let end = window.performance.now() + 3200,
          previous = window.performance.now();
        const tick = (now) => {
          window.visualFrames.push(now - previous);
          previous = now;
          if (now < end) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      });
      await hinted.click();
      await page.waitForTimeout(550);
      await page.screenshot({ path: `${root}/${name}-moving.png`, scale: 'device' });
      await page.waitForTimeout(2750);
      const frames = await page.evaluate(() =>
        window.visualFrames.filter((n) => n > 0 && n < 1000),
      );
      frames.sort((a, b) => a - b);
      metrics.performance = {
        frames: frames.length,
        medianMs: frames[Math.floor(frames.length / 2)],
        p95Ms: frames[Math.floor(frames.length * 0.95)],
        approxFps: (frames.length * 1000) / frames.reduce((a, b) => a + b, 0),
      };
    }
    report.push({ name, level, ...metrics, errors });
    console.log(
      name,
      JSON.stringify({ canvas: metrics.canvas, performance: metrics.performance, errors }),
    );
    await page.close();
  }
  await context.close();
}
writeFileSync(`${root}/measurements.json`, JSON.stringify(report, null, 2));
await browser.close();
if (phase !== 'before') {
  for (const entry of report) {
    assert.equal(entry.errors.length, 0, `${entry.name}: runtime errors`);
    assert.equal(entry.overflow, false, `${entry.name}: page overflow`);
    assert.ok(
      Math.abs(entry.canvas.ratioX - entry.dpr) < 0.02,
      `${entry.name}: horizontal backing scale`,
    );
    assert.ok(
      Math.abs(entry.canvas.ratioY - entry.dpr) < 0.02,
      `${entry.name}: vertical backing scale`,
    );
    for (const font of entry.fonts)
      assert.ok(parseFloat(font.font) >= 12, `${entry.name}: tiny ${font.text}`);
    for (const target of entry.touchTargets)
      assert.ok(
        target.width >= 44 && target.height >= 44,
        `${entry.name}: small target ${target.id}`,
      );
    assert.ok(entry.performance?.p95Ms < 50, `${entry.name}: animation frame budget`);
  }
}
