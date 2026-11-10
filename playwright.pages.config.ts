import { defineConfig } from '@playwright/test';
const live = process.env.PAGES_URL;
const baseURL = (live ?? 'http://127.0.0.1:4180/bgs-sm-playtest-7f42/').replace(/\/?$/, '/');
export default defineConfig({
  testDir: 'tests/pages',
  timeout: 45000,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-pages-report', open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 907, height: 510 },
    launchOptions: {
      executablePath:
        process.env.CHROME_PATH ?? (process.env.CI ? undefined : '/usr/bin/google-chrome'),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
    trace: 'retain-on-failure',
  },
  webServer: live
    ? undefined
    : { command: 'npm run preview:pages', url: baseURL, reuseExistingServer: !process.env.CI },
});
