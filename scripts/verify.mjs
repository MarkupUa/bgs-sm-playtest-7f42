import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
mkdirSync('release/metadata/logs', { recursive: true });
const commands = [
  'typecheck',
  'lint',
  'test',
  'validate:levels',
  'build:standalone',
  'build:crazygames-basic',
  'build:crazygames-full',
  'package',
  'audit:package',
  'audit:assets',
  'audit:layout',
  'test:e2e',
];
const results = [];
for (const name of commands) {
  const started = new Date().toISOString();
  const log = `release/metadata/logs/${name.replaceAll(':', '-')}.log`;
  const stream = createWriteStream(log);
  console.log(`Checking npm run ${name}`);
  const code = await new Promise((resolve) => {
    const child = spawn('npm', ['run', name], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (chunk) => {
      stream.write(chunk);
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stream.write(chunk);
      process.stderr.write(chunk);
    });
    child.on('close', (code) => {
      stream.end();
      resolve(code);
    });
  });
  results.push({ command: 'npm run ' + name, started, exitCode: code, log });
  writeFileSync('release/metadata/qa-commands.json', JSON.stringify(results, null, 2) + '\n');
  if (code !== 0) process.exit(code ?? 1);
}
