import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

// Use timestamp-based unique names so parallel runs don't collide with leftover data
const TS = Date.now();
const CUSTOMER_FIRST = 'E2E';
const CUSTOMER_LAST = `Testperson-${TS}`;
const DEAL_NAME = `E2E-Deal-${TS}`;

let app: ElectronApplication;
let page: Page;

test.describe.serial('CRUD workflows — customers and deals', () => {
  test.beforeAll(async () => {
    const mainPath = path.resolve(process.cwd(), 'dist-electron/main.js');
    app = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'production' },
    });
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Customer: Create
  // ---------------------------------------------------------------------------

  test('create a new customer via the add dialog', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();

    await page.getByRole('button', { name: /kunde hinzufügen/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /neuen kunden hinzufügen/i })).toBeVisible();

    await dialog.locator('#firstName').fill(CUSTOMER_FIRST);
    await dialog.locator('#name').fill(CUSTOMER_LAST);
    await dialog.locator('#email').fill(`e2e-${TS}@test.example`);
    await dialog.locator('#phone').fill('+49 123 456789');
    await dialog.locator('#company').fill('E2E Test GmbH');

    await dialog.getByRole('button', { name: 'Kunde erstellen' }).click();

    // Dialog must close and customer must appear in the list
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(CUSTOMER_LAST)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Customer: Read (detail page)
  // ---------------------------------------------------------------------------

  test('customer detail page shows the saved data', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();

    // Click the link whose visible text contains our customer's last name
    await page.getByRole('link', { name: new RegExp(CUSTOMER_LAST) }).first().click();

    await expect(page.url()).toContain('/customers/');
    await expect(page.getByRole('heading', { name: new RegExp(CUSTOMER_LAST) })).toBeVisible();
    await expect(page.getByText('E2E Test GmbH').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Deal: Create (linked to the customer above)
  // ---------------------------------------------------------------------------

  test('create a new deal and link it to the test customer', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();

    await page.getByRole('button', { name: /neuer deal/i }).click();

    const dialog = page.getByRole('dialog', { name: /neuen deal hinzufügen/i });
    await expect(dialog.getByRole('heading', { name: /neuen deal hinzufügen/i })).toBeVisible();

    // Deal name
    await dialog.locator('#name').fill(DEAL_NAME);

    // Customer combobox: open, search by company name, pick the matching row.
    // (IPC: single arg only — registerIpcHandler wraps multiple args into an array)
    await dialog.getByRole('combobox').first().click();
    const searchInput = page.getByPlaceholder('Kunde suchen...');
    await expect(searchInput).toBeVisible();
    await searchInput.click();
    await searchInput.fill('E2E Test GmbH');

    // Wait for the debounce (300 ms) + IPC round-trip, then click our customer
    const customerOption = page.locator('[role="option"]').filter({ hasText: CUSTOMER_LAST });
    await customerOption.waitFor({ state: 'visible', timeout: 8000 });
    await customerOption.click();

    // Value
    await dialog.locator('#value').fill('9999');

    await dialog.getByRole('button', { name: 'Deal hinzufügen' }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(DEAL_NAME)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Deal: Read (detail page)
  // ---------------------------------------------------------------------------

  test('deal detail page shows name and linked customer', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('link', { name: DEAL_NAME }).first().click();

    await expect(page.url()).toContain('/deals/');
    await expect(page.getByRole('heading', { name: DEAL_NAME })).toBeVisible();
    await expect(page.getByText(new RegExp(CUSTOMER_LAST)).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Deal: Delete
  // ---------------------------------------------------------------------------

  test('delete the deal from its detail page', async () => {
    // Navigate to deal detail if not already there
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('link', { name: DEAL_NAME }).first().click();
    await expect(page.url()).toContain('/deals/');

    // The destructive "Löschen" button in the deal header
    await page.getByRole('button', { name: 'Löschen' }).first().click();

    // Confirm in the AlertDialog
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();

    // Should navigate back to the deals list and deal should be gone
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();
    await expect(page.getByText(DEAL_NAME)).not.toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Customer: Delete
  // ---------------------------------------------------------------------------

  test('delete the test customer via checkbox selection', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();

    // Search to ensure the customer is visible regardless of pagination
    await page.getByPlaceholder('Kunden suchen...').fill(CUSTOMER_LAST);
    await page.waitForTimeout(400); // debounce

    // Locate the row and tick its checkbox
    const customerRow = page.locator('table tbody tr').filter({ hasText: CUSTOMER_LAST });
    await customerRow.getByRole('checkbox').click();

    // Bulk-delete button should now be visible
    await page.getByRole('button', { name: /ausgewählte löschen/i }).click();

    // Confirm deletion
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();

    // Customer should no longer appear in the table
    await expect(page.getByText(CUSTOMER_LAST)).not.toBeVisible();
  });
});
