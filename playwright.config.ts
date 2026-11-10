import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90000,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 907, height: 510 },
    launchOptions: {
      executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
    },
    {
      command: 'python3 -m http.server 4174 --bind 127.0.0.1 --directory release',
      url: 'http://127.0.0.1:4174/standalone/',
      reuseExistingServer: true,
    },
    {
      command:
        'python3 -m http.server 4175 --bind 127.0.0.1 --directory /tmp/street-memory-zip-review',
      url: 'http://127.0.0.1:4175/',
      reuseExistingServer: true,
    },
  ],
  projects: [
    { name: 'chromium', testMatch: 'game.spec.ts', use: { browserName: 'chromium' } },
    {
      name: 'release-chromium',
      testMatch: 'production.spec.ts',
      use: { browserName: 'chromium', baseURL: 'http://127.0.0.1:4174' },
    },
  ],
});
