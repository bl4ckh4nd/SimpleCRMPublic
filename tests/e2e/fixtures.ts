import fs from 'node:fs';
import path from 'node:path';
import { _electron as electron, expect, test as base, type ElectronApplication, type Page } from '@playwright/test';

type Fixtures = {
  app: ElectronApplication;
  page: Page;
};

export const test = base.extend<Fixtures>({
  // Playwright fixture factories require this dependency argument.
  // eslint-disable-next-line no-empty-pattern
  app: async ({}, use, testInfo) => {
    const appData = testInfo.outputPath('app-data');
    fs.mkdirSync(appData, { recursive: true });
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      SIMPLECRM_E2E: '1',
      ...(process.platform === 'win32'
        ? { APPDATA: appData, LOCALAPPDATA: appData }
        : process.platform === 'darwin'
          ? { HOME: appData }
          : { HOME: appData, XDG_CONFIG_HOME: appData }),
    };
    const app = await electron.launch({
      args: [path.resolve(process.cwd(), 'dist-electron/main.js')],
      env,
    });

    try {
      await use(app);
    } finally {
      await app.close().catch(() => undefined);
    }
  },

  page: async ({ app }, use) => {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('navigation')).toBeVisible();
    await use(page);
  },
});

export { expect };
