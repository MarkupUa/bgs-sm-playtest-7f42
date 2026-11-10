import { test, expect, type Page } from '@playwright/test';
import type { State, Level } from '../../src/core/model';
interface TestGame {
  load(n: number): void;
  state(): State;
  level(): Level;
  solve(): { solution: string[] };
  fast(v?: boolean): void;
  audio: { forced: boolean; user: boolean; musicEnabled: boolean };
  platform: { muted: boolean };
}
declare global {
  interface Window {
    streetMemory: TestGame;
  }
}
const boot = async (p: Page) => {
  await p.goto('/');
  await expect(p.locator('[data-car]').first()).toBeVisible();
  await p.evaluate(() => window.streetMemory.fast());
};
async function settle(p: Page) {
  await p.waitForFunction(() => window.streetMemory.state().phase !== 'animating');
}
async function win(p: Page) {
  const solution = await p.evaluate(() => window.streetMemory.solve().solution);
  for (const id of solution) {
    await p.locator(`[data-car="${id}"]`).click();
    await settle(p);
  }
  await expect(p.locator('#result')).toContainText('Everyone is home.');
}
test('first action, sign change, win and Next', async ({ page }) => {
  await boot(page);
  await page.locator('[data-car]').first().click();
  await settle(page);
  expect(await page.evaluate(() => window.streetMemory.state().switchStates.X)).toBe('R');
  await expect(page.locator('#next')).toBeVisible();
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('02');
});
test('reference mistake, immutable Undo, two moves and Restart, double input ignored', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => window.streetMemory.load(2));
  const before = await page.evaluate(() => window.streetMemory.state());
  await page.locator('[data-car="BLUE"]').click();
  await settle(page);
  await expect(page.locator('#result')).toContainText('A different doorstep');
  await page.locator('#fix').click();
  expect(await page.evaluate(() => window.streetMemory.state())).toEqual(before);
  await page.locator('[data-car="RED"]').click();
  await page.evaluate(() =>
    document.querySelector<HTMLButtonElement>('[data-car="BLUE"]')?.click(),
  );
  await settle(page);
  expect(await page.evaluate(() => window.streetMemory.state().deliveredCarIds)).toEqual(['RED']);
  await page.locator('[data-car="BLUE"]').click();
  await settle(page);
  await page.locator('#restart').click();
  expect(await page.evaluate(() => window.streetMemory.state())).toEqual(before);
  await win(page);
});
test('first ten puzzles playable through actual controls', async ({ page }) => {
  await boot(page);
  for (let i = 0; i < 10; i++) {
    await page.evaluate((n) => window.streetMemory.load(n), i);
    await win(page);
  }
});
test('preview is pure; Send, Hint, keyboard and pause mid-journey', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.streetMemory.load(2));
  const before = await page.evaluate(() => window.streetMemory.state());
  await page.locator('#preview').click();
  await page.locator('[data-car="RED"]').click();
  expect(await page.evaluate(() => window.streetMemory.state())).toEqual(before);
  await expect(page.locator('#send')).toBeVisible();
  await page.locator('#send').click();
  await page.locator('#pause').click();
  const paused = await page.evaluate(() => window.streetMemory.state());
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.streetMemory.state())).toEqual(paused);
  await page.locator('#resume').click();
  await settle(page);
  await page.locator('#preview').click();
  await page.locator('#hint').click();
  await expect(page.locator('[data-car="BLUE"]')).toHaveClass(/hinted/);
  await page.keyboard.press('2');
  await settle(page);
  await page.keyboard.press('z');
  expect(await page.evaluate(() => window.streetMemory.state().deliveredCarIds.length)).toBe(1);
  await page.keyboard.press('r');
  await page.locator('#cancel-restart').click();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#settings').click();
  await expect(page.locator('#set-sound')).not.toBeChecked();
  await page.locator('#close-modal').click();
});
test('save reload and Daily preserve campaign, corrupt storage is safe', async ({ page }) => {
  await boot(page);
  await win(page);
  await page.locator('#next').click();
  await page.reload();
  await expect(page.locator('#level-label')).toContainText('02');
  await page.locator('#daily').click();
  await expect(page.locator('#level-label')).toHaveText('DAILY CHALLENGE');
  await win(page);
  await page.locator('#next').click();
  await expect(page.locator('#level-label')).toContainText('02');
  await page.addInitScript(() => localStorage.setItem('street-memory:save:v2', 'broken'));
  await page.reload();
  await expect(page.locator('#level-label')).toContainText('01');
});
test('30 restart + 20 Undo cycles retain control and exact data', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.streetMemory.load(2));
  const initial = await page.evaluate(() => window.streetMemory.state());
  for (let i = 0; i < 30; i++) await page.locator('#restart').click();
  for (let i = 0; i < 20; i++) {
    await page.locator('[data-car="RED"]').click();
    await settle(page);
    await page.locator('#undo').click();
  }
  expect(await page.evaluate(() => window.streetMemory.state())).toEqual(initial);
  await win(page);
});
test('responsive snapshots, controls stay visible, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await boot(page);
  for (const [width, height] of [
    [907, 510],
    [821, 462],
    [800, 450],
    [360, 640],
    [1920, 1080],
    [1077, 606],
    [1216, 684],
    [1366, 768],
    [1080, 607],
  ]) {
    await page.setViewportSize({ width, height });
    for (const n of [0, 2, 14, 29, 47]) {
      await page.evaluate((n) => window.streetMemory.load(n), n);
      await page.waitForTimeout(100);
      for (const id of ['undo', 'restart', 'hint', 'preview', 'pause', 'sound']) {
        const r = await page.locator('#' + id).boundingBox();
        expect(r?.height).toBeGreaterThanOrEqual(44);
        expect(r?.width).toBeGreaterThanOrEqual(44);
        expect(r!.x).toBeGreaterThanOrEqual(0);
        expect(r!.y + r!.height).toBeLessThanOrEqual(height);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      if (width === 907 || width === 360)
        await page.screenshot({
          path: `release/metadata/screenshots/street-${n + 1}-${width}x${height}.png`,
        });
    }
  }
  expect(errors).toEqual([]);
});
test('touch sends once; touch Preview/Send; modal blocks background', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await boot(page);
  await page.locator('[data-car]').first().tap();
  await settle(page);
  await expect(page.locator('#next')).toBeVisible();
  await page.locator('#next').tap();
  await page.locator('#preview').tap();
  await page.locator('[data-car="C0"]').tap();
  expect(await page.evaluate(() => window.streetMemory.state().moves)).toBe(0);
  await page.locator('#send').tap();
  await settle(page);
  expect(await page.evaluate(() => window.streetMemory.state().moves)).toBe(1);
  await page.locator('#pause').tap();
  await expect(page.locator('#modal')).toBeVisible();
  await page.locator('#resume').tap();
  await context.close();
});

test('a locally correct delivery can strand the fleet; Hint is honest', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.streetMemory.load(9));
  await page.locator('[data-car="C0"]').click();
  await settle(page);
  expect(await page.evaluate(() => window.streetMemory.state().phase)).toBe('ready');
  await page.locator('#hint').click();
  await expect(page.locator('#caption')).toHaveText('No solution from here — Undo or Restart');
  await page.locator('#undo').click();
  expect(await page.evaluate(() => window.streetMemory.solve().solution.length)).toBe(4);
});

test('resize during a trip and complete the final six-car street', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.streetMemory.load(47);
    window.streetMemory.fast(false);
  });
  const id = await page.evaluate(() => window.streetMemory.solve().solution[0]);
  await page.locator(`[data-car="${id}"]`).click();
  await page.setViewportSize({ width: 800, height: 450 });
  await settle(page);
  expect(await page.evaluate(() => window.streetMemory.state().deliveredCarIds)).toEqual([id]);
  await page.evaluate(() => window.streetMemory.fast());
  await win(page);
  await page.locator('#next').click();
  await expect(page.locator('#modal-title')).toHaveText('Your neighbourhoods');
  await page.locator('#close-modal').click();
});

test('real Web Audio signal reaches the output and respects forced mute', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.streetMemory.audio.musicEnabled = false;
  });
  await page.locator('#sound').click(); // A real gesture creates the context, then turns sound off.
  await page.evaluate(async () => {
    const audio = window.streetMemory.audio as unknown as {
      context: AudioContext;
      master: GainNode;
    };
    await audio.context.resume();
    const analyser = audio.context.createAnalyser();
    analyser.fftSize = 2048;
    audio.master.disconnect();
    audio.master.connect(analyser);
    analyser.connect(audio.context.destination);
    const buffer = new Float32Array(analyser.fftSize);
    const probe = { peak: 0, timer: 0 };
    Object.assign(window, { audioProbe: probe });
    probe.timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      for (const sample of buffer) probe.peak = Math.max(probe.peak, Math.abs(sample));
    }, 5);
  });
  await page.locator('#sound').click();
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      () => (window as unknown as { audioProbe: { peak: number } }).audioProbe.peak,
    ),
  ).toBeGreaterThan(0.09);
  await expect(page.locator('#sound')).toHaveAttribute('aria-label', 'Sound on');
  await page.evaluate(() => {
    (window as unknown as { audioProbe: { peak: number } }).audioProbe.peak = 0;
  });
  await page.locator('[data-car]').first().click();
  await settle(page);
  const peak = await page.evaluate(
    () => (window as unknown as { audioProbe: { peak: number } }).audioProbe.peak,
  );
  console.log('Measured Web Audio output peak:', peak);
  expect(peak).toBeGreaterThan(0.09);
  expect(peak).toBeLessThan(0.95);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.streetMemory.audio.forced = true;
    const probe = (window as unknown as { audioProbe: { peak: number } }).audioProbe;
    probe.peak = 0;
  });
  // Flush the analyser's 2048-frame history before measuring the muted output.
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    (window as unknown as { audioProbe: { peak: number } }).audioProbe.peak = 0;
    (window.streetMemory.audio as unknown as { tone(type: 'sign'): void }).tone('sign');
  });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => (window as unknown as { audioProbe: { peak: number } }).audioProbe.peak,
    ),
  ).toBe(0);
  await page.evaluate(() =>
    clearInterval((window as unknown as { audioProbe: { timer: number } }).audioProbe.timer),
  );
});

test('background music starts after a gesture, pauses, respects mute and saves its preference', async ({
  page,
}) => {
  await boot(page);
  expect(
    await page.evaluate(
      () =>
        (window.streetMemory.audio as unknown as { context?: AudioContext }).context === undefined,
    ),
  ).toBe(true);
  await page.locator('#preview').click(); // Start music with a real gesture, without a sound effect.
  await page.evaluate(async () => {
    const audio = window.streetMemory.audio as unknown as {
      context: AudioContext;
      master: GainNode;
    };
    await audio.context.resume();
    const analyser = audio.context.createAnalyser();
    analyser.fftSize = 2048;
    audio.master.disconnect();
    audio.master.connect(analyser);
    analyser.connect(audio.context.destination);
    const buffer = new Float32Array(analyser.fftSize),
      probe = { peak: 0, timer: 0 };
    Object.assign(window, { musicProbe: probe });
    probe.timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      for (const sample of buffer) probe.peak = Math.max(probe.peak, Math.abs(sample));
    }, 5);
  });
  const reset = () =>
    page.evaluate(() => {
      (window as unknown as { musicProbe: { peak: number } }).musicProbe.peak = 0;
    });
  const peak = () =>
    page.evaluate(() => (window as unknown as { musicProbe: { peak: number } }).musicProbe.peak);
  await page.waitForTimeout(900);
  expect(await peak()).toBeGreaterThan(0.005);
  expect(await peak()).toBeLessThan(0.2);
  await page.locator('#settings').click();
  await expect(page.locator('#set-music')).toBeChecked();
  await page.waitForTimeout(100);
  await reset();
  await page.waitForTimeout(250);
  expect(await peak()).toBe(0);
  await page.locator('#set-music').uncheck();
  await page.locator('#close-modal').click();
  await reset();
  await page.waitForTimeout(500);
  expect(await peak()).toBe(0);
  await page.locator('#settings').click();
  await page.locator('#set-music').check();
  await page.locator('#close-modal').click();
  await reset();
  await page.waitForTimeout(900);
  expect(await peak()).toBeGreaterThan(0.005);
  await page.evaluate(() => {
    window.streetMemory.audio.forced = true;
    window.streetMemory.audio.user = false;
    window.streetMemory.audio.user = true;
  });
  await page.waitForTimeout(100);
  await reset();
  await page.waitForTimeout(300);
  expect(await peak()).toBe(0);
  await page.evaluate(() => {
    window.streetMemory.audio.forced = false;
  });
  await reset();
  await page.waitForTimeout(900);
  expect(await peak()).toBeGreaterThan(0.005);
  expect(
    await page.evaluate(
      () =>
        (window.streetMemory.audio as unknown as { musicLoop: { voices: Set<unknown> } }).musicLoop
          .voices.size,
    ),
  ).toBeLessThan(20);
  await page.locator('#settings').click();
  await page.locator('#set-music').uncheck();
  await page.locator('#close-modal').click();
  await page.evaluate(() =>
    clearInterval((window as unknown as { musicProbe: { timer: number } }).musicProbe.timer),
  );
  await page.reload();
  await expect(page.locator('[data-car]').first()).toBeVisible();
  await page.locator('#settings').click();
  await expect(page.locator('#set-music')).not.toBeChecked();
});

test('HiDPI camera keeps Phaser pointer coordinates in logical CSS pixels after resize', async ({
  browser,
}) => {
  for (const dpr of [1, 2, 3]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: dpr,
    });
    const page = await context.newPage();
    await boot(page);
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1366, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      const box = (await page.locator('canvas').boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.37, box.y + box.height * 0.61);
      await page.waitForTimeout(50);
      const diag = await page.evaluate(() =>
        (
          window.streetMemory as unknown as {
            boardDiagnostics(): {
              density: number;
              pointer: { x: number; y: number };
              texts: { resolution: number }[];
            };
          }
        ).boardDiagnostics(),
      );
      expect(diag.density).toBe(dpr);
      // Browser mouse events quantize their CSS client coordinates to integers.
      expect(Math.abs(diag.pointer.x - box.width * 0.37)).toBeLessThanOrEqual(1);
      expect(Math.abs(diag.pointer.y - box.height * 0.61)).toBeLessThanOrEqual(1);
      expect(diag.texts.every((t) => t.resolution === dpr)).toBe(true);
      const dimensions = await page.locator('canvas').evaluate((c) => ({
        width: (c as HTMLCanvasElement).width,
        height: (c as HTMLCanvasElement).height,
      }));
      expect(Math.abs(dimensions.width / box.width - dpr)).toBeLessThan(0.02);
      expect(Math.abs(dimensions.height / box.height - dpr)).toBeLessThan(0.02);
    }
    await context.close();
  }
});

test('display follows a silent DPR change without a CSS resize', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const page = await context.newPage();
  await boot(page);
  const session = await context.newCDPSession(page);
  const initial = (await page.locator('canvas').boundingBox())!;
  for (const density of [3, 2, 1]) {
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: density,
      mobile: true,
    });
    await expect(page.locator('canvas')).toHaveAttribute('data-render-density', String(density));
    const box = (await page.locator('canvas').boundingBox())!;
    expect(box.width).toBe(initial.width);
    expect(box.height).toBe(initial.height);
    expect(await page.locator('canvas').evaluate((c) => (c as HTMLCanvasElement).width)).toBe(
      initial.width * density,
    );
  }
  await context.close();
});
