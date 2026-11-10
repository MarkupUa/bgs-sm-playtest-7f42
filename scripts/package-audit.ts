import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const walk = (p: string): string[] =>
  readdirSync(p).flatMap((n) =>
    statSync(join(p, n)).isDirectory() ? walk(join(p, n)) : [join(p, n)],
  );
for (const dir of ['release/standalone', 'release/crazygames', 'release/crazygames-full']) {
  const files = walk(dir);
  const bytes = files.reduce((n, p) => n + statSync(p).size, 0);
  if (files.length > 1500 || bytes > 10 * 1024 * 1024) throw Error('Budget exceeded');
  if (files.some((f) => /\.map$|node_modules|\.env|\.ts$/.test(f)))
    throw Error('Source/secret in package');
  const html = readFileSync(dir + '/index.html', 'utf8');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (!url.startsWith('./') || !existsSync(join(dir, url)))
      throw Error('Non-relative/missing asset: ' + url);
  }
  const js = files
    .filter((p) => p.endsWith('.js'))
    .map((p) => readFileSync(p, 'utf8'))
    .join('');
  if (dir.endsWith('standalone') && /sdk\.crazygames\.com|requestAd\(/.test(js))
    throw Error('SDK leaked into standalone');
  if (/googlesyndication|google-analytics|doubleclick|AdSense/.test(js))
    throw Error('Unwanted network code');
  if (/streetMemory:|renderInfo:/.test(js)) throw Error('Developer hooks in production');
  console.log(`PASS ${dir}: ${files.length} files, ${bytes} bytes`);
}
if (!existsSync('release/street-memory-crazygames-basic.zip')) throw Error('ZIP missing');
