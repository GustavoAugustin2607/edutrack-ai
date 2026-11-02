import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1440, height: 1000 },
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
