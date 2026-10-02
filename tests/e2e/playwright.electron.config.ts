import path from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 120_000,
  workers: 1,
  forbidOnly: !!process.env.CI,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: path.resolve(process.cwd(), 'playwright-report'), open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
