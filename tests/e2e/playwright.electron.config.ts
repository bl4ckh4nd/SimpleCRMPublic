import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: [
    'app-flows.spec.ts',
    'crud-workflows.spec.ts',
    'tasks-products.spec.ts',
    'edit-flows.spec.ts',
    'followup-calendar-customfields.spec.ts',
    'remaining-flows.spec.ts',
  ],
  timeout: 120_000,
  // One worker: Electron files share the same SQLite database on disk,
  // so test files must run sequentially to avoid data races.
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
