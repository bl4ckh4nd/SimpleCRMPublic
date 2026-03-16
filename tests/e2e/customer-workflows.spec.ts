import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const mainPath = path.resolve(process.cwd(), 'dist-electron/main.js');
  app = await electron.launch({
    args: [mainPath],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app.close();
});

test('customers page: renders table and search', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();
  await expect(page.getByPlaceholder(/suchen/i)).toBeVisible();
});

test('customers page: opens and cancels add customer dialog', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
  await expect(page.getByRole('heading', { name: /neuen kunden hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('heading', { name: /neuen kunden hinzufügen/i })).not.toBeVisible();
});

test('customers page: search filters the list', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  const searchInput = page.getByPlaceholder(/suchen/i);
  await searchInput.fill('xxxxxxxxxnotexistingcustomer');
  // Wait for filter to apply
  await page.waitForTimeout(300);
  // Table should show no results or empty state
  const tableRows = page.locator('table tbody tr');
  const count = await tableRows.count();
  // Either 0 rows or "no results" text
  const noResults = await page.getByText(/keine ergebnisse/i).isVisible().catch(() => false);
  expect(count === 0 || noResults).toBeTruthy();
  // Clear search
  await searchInput.clear();
});

test('customers page: has export button', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  await expect(page.getByRole('button', { name: /exportieren/i })).toBeVisible();
});

test('customer detail: navigates to customer detail page', async () => {
  await page.getByRole('link', { name: 'Kunden' }).click();
  await page.waitForLoadState('networkidle');

  // Click first customer row if any exist
  const firstRow = page.locator('table tbody tr').first();
  const hasRows = await firstRow.isVisible().catch(() => false);

  if (hasRows) {
    await firstRow.click();
    // Should navigate to customer detail
    await expect(page.url()).toContain('/customers/');
  }
});
