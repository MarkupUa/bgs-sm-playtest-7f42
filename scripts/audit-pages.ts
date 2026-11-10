import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const root = 'dist',
  base = '/bgs-sm-playtest-7f42/';
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) =>
    statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)],
  );
const files = walk(root);
const bytes = files.reduce((sum, path) => sum + statSync(path).size, 0);
if (!existsSync('dist/index.html') || bytes > 10 * 1024 * 1024 || files.length > 30)
  throw Error('Invalid Pages artifact');
if (files.some((path) => /\.map$|node_modules|\.env|\.ts$|\.zip$/.test(path)))
  throw Error('Unexpected source or private artifact in dist');
const html = readFileSync('dist/index.html', 'utf8');
if (
  !html.includes('<title>Street Memory — A Cozy Logic Puzzle</title>') ||
  !html.includes('noindex, nofollow')
)
  throw Error('Missing playtest metadata');
for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!url.startsWith(base) || !existsSync(join(root, url.slice(base.length))))
    throw Error('Invalid Pages asset path ' + url);
}
const js = files
  .filter((path) => path.endsWith('.js'))
  .map((path) => readFileSync(path, 'utf8'))
  .join('');
if (
  /sdk\.crazygames\.com|requestAd\(|googlesyndication|google-analytics|doubleclick|streetMemory:|renderInfo:/.test(
    js,
  )
)
  throw Error('SDK, ads or developer hooks in public playtest');
console.log(
  `PASS Pages dist: ${files.length} files, ${bytes} bytes; base ${base}; no SDK/ads/dev hooks.`,
);
