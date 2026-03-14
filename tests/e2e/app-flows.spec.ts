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
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kunden' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Deals' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aufgaben' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Produkte' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kalender' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Einstellungen' })).toBeVisible();
});

test('customers flow: opens add dialog', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();
  await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neuen kunden hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('deals flow: opens create dialog', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();
  await page.getByRole('button', { name: /neuer deal/i }).click();
  await expect(page.getByRole('heading', { name: /neuen deal hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('tasks flow: opens add dialog and calendar toggle behavior', async () => {
  await page.getByRole('link', { name: 'Aufgaben' }).click();
  await expect(page.getByRole('heading', { name: 'Aufgaben' })).toBeVisible();
  await page.getByRole('button', { name: /aufgabe hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neue aufgabe hinzufügen/i })).toBeVisible();

  const toggle = page.getByRole('switch', { name: /in kalender eintragen/i });
  await expect(toggle).toBeDisabled();
  await page.locator('input#due_date').fill('2026-03-12');
  await expect(toggle).toBeEnabled();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('calendar flow: opens event create modal', async () => {
  await page.getByRole('link', { name: 'Kalender' }).click();
  await expect(page.getByRole('heading', { name: 'Terminplaner' })).toBeVisible();
  await page.getByRole('button', { name: /ereignis hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neues ereignis hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
});

test('products and settings pages render key controls', async () => {
  await page.getByRole('link', { name: 'Produkte' }).click();
  await expect(page.getByRole('heading', { name: 'Produktliste' })).toBeVisible();
  await expect(page.getByRole('button', { name: /neues produkt erstellen/i })).toBeVisible();

  await page.getByRole('link', { name: 'Einstellungen' }).click();
  await expect(page.getByRole('heading', { name: /Einstellungen zur Verbindung mit MSSQL-Server & JTL/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /verbindung testen/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /synchronisation starten/i })).toBeVisible();
});
