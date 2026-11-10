import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('release/previews', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
for (const [name, width, height] of [
  ['landscape', 1920, 1080],
  ['portrait', 1080, 1620],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: { dir: '/tmp/street-memory-capture', size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(process.env.GAME_URL ?? 'http://127.0.0.1:4173');
  await page.waitForSelector('[data-car]');
  await page.evaluate(() => {
    window.streetMemory.load(2);
    window.streetMemory.fast(false);
  });
  await page.waitForTimeout(500);
  const start = Date.now();
  await page.waitForTimeout(700);
  for (const id of ['RED', 'BLUE', 'GREEN']) {
    await page.locator(`[data-car="${id}"]`).click();
    await page.waitForFunction(() => window.streetMemory.state().phase !== 'animating');
    await page.waitForTimeout(350);
  }
  await page.waitForTimeout(Math.max(100, 18500 - (Date.now() - start)));
  const video = page.video();
  await context.close();
  const raw = await video.path();
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-loop',
      '1',
      '-t',
      '0.35',
      '-i',
      `release/covers/${name}.png`,
      '-i',
      raw,
      '-filter_complex',
      `[0:v]scale=${width}:${height},setsar=1,fps=30,trim=duration=0.35,setpts=PTS-STARTPTS[c];[1:v]trim=start=1:duration=17.65,setpts=PTS-STARTPTS,fps=30,setsar=1[g];[c][g]concat=n=2:v=1:a=0[out]`,
      '-map',
      '[out]',
      '-t',
      '18',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `release/previews/${name}.mp4`,
    ],
    { encoding: 'utf8' },
  );
  if (r.status) throw Error(r.stderr);
  console.log(`${name}: captured actual reference gameplay, normal speed, no sound.`);
}
await browser.close();
