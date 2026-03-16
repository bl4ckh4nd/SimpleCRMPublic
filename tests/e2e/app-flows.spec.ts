import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const mainPath = path.resolve(process.cwd(), 'dist-electron/main.js');
  app = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app.close();
});

test('loads dashboard and top-level navigation', async () => {
  // Dashboard no longer has an h1 heading — verify nav links instead
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kunden', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Deals', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aufgaben', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Produkte', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kalender', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Einstellungen', exact: true })).toBeVisible();
});

test('customers flow: opens add dialog', async () => {
  // Use exact:true + first() because the dashboard also has an "Alle Kunden anzeigen" link
  await page.getByRole('link', { name: 'Kunden', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();
  await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neuen kunden hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('deals flow: opens create dialog', async () => {
  await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();
  await page.getByRole('button', { name: /neuer deal/i }).click();
  await expect(page.getByRole('heading', { name: /neuen deal hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('tasks flow: opens add dialog and calendar toggle behavior', async () => {
  await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
  // Page card title is "Aufgabenliste" (rendered as a div, not a heading)
  await expect(page.getByText('Aufgabenliste').first()).toBeVisible();
  await page.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
  await expect(page.getByRole('heading', { name: /neue aufgabe hinzufügen/i })).toBeVisible();

  const toggle = page.getByRole('switch', { name: /in kalender eintragen/i });
  await expect(toggle).toBeDisabled();
  await page.locator('input#due_date').fill('2026-03-12');
  await expect(toggle).toBeEnabled();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('calendar flow: opens event create modal', async () => {
  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  // Calendar page shows the calendar widget directly — verify via the add button
  await expect(page.getByRole('button', { name: /ereignis hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: /ereignis hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neues ereignis hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('products and settings pages render key controls', async () => {
  await page.getByRole('link', { name: 'Produkte', exact: true }).click();
  // Products page has no page-level h1 — verify via the "Neues Produkt" button
  await expect(page.getByRole('button', { name: /neues produkt/i })).toBeVisible();

  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  // Settings card title is "MSSQL-Server & JTL" (rendered as a div, not a heading)
  await expect(page.getByText('MSSQL-Server & JTL').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /verbindung testen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /synchronisation starten/i })).toBeVisible();
});
