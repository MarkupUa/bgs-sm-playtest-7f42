import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
const dir = 'release/covers';
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const house = (x, y, s, color) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="50" cy="95" rx="45" ry="9" fill="#284d43" opacity=".12"/><rect x="15" y="40" width="70" height="50" rx="7" fill="#fff7df"/><path d="M8 46L46 9q4-4 8 0l38 37q3 6-4 8H12q-7-2-4-8" fill="${color}"/><rect x="59" y="58" width="18" height="32" rx="5" fill="${color}"/><rect x="25" y="61" width="20" height="18" rx="4" fill="#a9c8ba"/><path d="M35 62v16m-9-8h18" stroke="#fff5df" stroke-width="3"/></g>`;
const tree = (x, y, s) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="42" rx="24" ry="8" fill="#2c4b3d" opacity=".1"/><path d="M0 0v40" stroke="#a18a60" stroke-width="7" stroke-linecap="round"/><circle cy="-5" r="23" fill="#97af82"/><circle cx="-11" cy="8" r="18" fill="#97af82"/><circle cx="12" cy="8" r="18" fill="#97af82"/></g>`;
for (const [name, w, h] of [
  ['landscape', 1920, 1080],
  ['portrait', 800, 1200],
  ['square', 800, 800],
]) {
  const tall = h > w,
    wide = w > h;
  const artY = wide ? h * 0.39 : tall ? 550 : h * 0.49;
  const artX = wide ? w * 0.72 : w * 0.5;
  const scale = wide ? 1.25 : w / 1000;
  const titleX = wide ? w * 0.25 : w * 0.5;
  const titleY = wide ? h * 0.39 : tall ? 185 : h * 0.22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#bdc6a3" opacity=".3"/></pattern><filter id="shadow"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#405c42" flood-opacity=".12"/></filter></defs><rect width="${w}" height="${h}" fill="#f3f0e3"/><rect width="${w}" height="${h}" fill="url(#dots)"/><circle cx="${wide ? w * 0.73 : w * 0.5}" cy="${wide ? h * 0.65 : h * 0.74}" r="${wide ? w * 0.3 : w * 0.43}" fill="#e0e7ce"/><g fill="#2e5144" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" letter-spacing="-5"><text x="${titleX}" y="${titleY}" font-size="${wide ? w * 0.076 : w * 0.1}">Street</text><text x="${titleX}" y="${titleY + (wide ? w * 0.09 : w * 0.103)}" font-size="${wide ? w * 0.084 : w * 0.115}">Memory<tspan fill="#d68c6f">.</tspan></text></g><g transform="translate(${artX} ${artY}) scale(${scale})"><path d="M-40 520V190L-325 -5M-40 190L300 5" stroke="#fdf9ed" stroke-width="96" fill="none" stroke-linejoin="round"/><path d="M-40 520V190L-325 -5M-40 190L300 5" stroke="#8b9786" stroke-width="73" fill="none" stroke-linejoin="round"/><path d="M-40 520V190L-325 -5M-40 190L300 5" stroke="#f1e8cd" stroke-width="4" stroke-dasharray="15 18" fill="none" stroke-linejoin="round"/>${house(-400, -130, 1.5, '#e78c74')}${house(242, -130, 1.5, '#79b6c7')}${house(230, 250, 1.2, '#d5b36d')}${tree(-330, 260, 1.2)}${tree(350, 150, 0.9)}${tree(-200, -40, 0.65)}<g transform="translate(-40 183)"><path d="M0 0v-78" stroke="#b3aa8a" stroke-width="12"/><rect x="-66" y="-129" width="132" height="90" rx="25" fill="#fffae9" stroke="#c8ceb2" stroke-width="4" filter="url(#shadow)"/><path d="M-31-95h57m-18-18 20 18-20 18" fill="none" stroke="#315845" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/></g><g transform="translate(-40 370) rotate(-15)" filter="url(#shadow)"><ellipse cy="42" rx="125" ry="25" fill="#36513c" opacity=".13"/><rect x="-103" y="-52" width="40" height="119" rx="13" fill="#344a3f"/><rect x="63" y="-52" width="40" height="119" rx="13" fill="#344a3f"/><rect x="-120" y="-62" width="240" height="127" rx="48" fill="#e88972"/><path d="M-78-35Q0-90 78-35v65H-78z" fill="#ffefd1"/><rect x="-48" y="-55" width="96" height="102" rx="26" fill="#e88972"/><path d="M-22 19v-54h17q40 0 12 29l23 25M-20-7h22" fill="none" stroke="#304f40" stroke-width="10" stroke-linecap="round"/><rect x="-115" y="-11" width="19" height="34" rx="7" fill="#fff3b9"/><rect x="98" y="-11" width="14" height="34" rx="6" fill="#bd6858"/></g></g></svg>`;
  writeFileSync(`${dir}/${name}.svg`, svg);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(svg);
  await page.evaluate(() => {
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
  });
  await page.screenshot({ path: `${dir}/${name}.png` });
  await page.close();
  console.log(`${name}: ${w} × ${h}, opaque PNG + SVG master`);
}
await browser.close();
