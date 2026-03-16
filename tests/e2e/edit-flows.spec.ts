import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

const TS = Date.now();
const CUSTOMER_LAST = `EditTest-${TS}`;
const DEAL_NAME = `EditDeal-${TS}`;
const DEAL_NAME_UPDATED = `EditDeal-Updated-${TS}`;

let app: ElectronApplication;
let page: Page;

test.describe.serial('Customer and Deal edit flows', () => {
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

  test('create a customer for edit tests', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByRole('button', { name: /kunde hinzufügen/i }).click();

    const dialog = page.getByRole('dialog');
    await dialog.locator('#firstName').fill('Edit');
    await dialog.locator('#name').fill(CUSTOMER_LAST);
    await dialog.locator('#email').fill(`edit-${TS}@test.example`);
    await dialog.locator('#company').fill('Original GmbH');
    await dialog.getByRole('button', { name: 'Kunde erstellen' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(CUSTOMER_LAST)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Customer: Edit (company only — last name stays the same for stable searching)
  // ---------------------------------------------------------------------------

  test('edit the customer company from the detail page', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByRole('link', { name: new RegExp(CUSTOMER_LAST) }).first().click();
    await expect(page.url()).toContain('/customers/');

    // Open the edit dialog
    await page.getByRole('button', { name: /bearbeiten/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /kunde bearbeiten/i })).toBeVisible();

    // Change the company
    const companyInput = dialog.locator('#company');
    await companyInput.clear();
    await companyInput.fill('Bearbeitet GmbH');

    await dialog.getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(dialog).not.toBeVisible();

    // Heading still shows the unchanged last name; company shows the new value
    await expect(page.getByRole('heading', { name: new RegExp(CUSTOMER_LAST) })).toBeVisible();
    await expect(page.getByText('Bearbeitet GmbH').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Deal: Create (linked to the test customer)
  // ---------------------------------------------------------------------------

  test('create a deal linked to the test customer', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('button', { name: /neuer deal/i }).click();

    const dialog = page.getByRole('dialog', { name: /neuen deal hinzufügen/i });
    await dialog.locator('#name').fill(DEAL_NAME);

    // Select customer by last name (unchanged)
    await dialog.getByRole('combobox').first().click();
    const searchInput = page.getByPlaceholder('Kunde suchen...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(CUSTOMER_LAST);
    const customerOption = page.locator('[role="option"]').filter({ hasText: CUSTOMER_LAST });
    await customerOption.waitFor({ state: 'visible', timeout: 8000 });
    await customerOption.click();

    await dialog.locator('#value').fill('5000');
    await dialog.getByRole('button', { name: 'Deal hinzufügen' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(DEAL_NAME)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Deal: Edit name
  // ---------------------------------------------------------------------------

  test('edit the deal name from the detail page', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('link', { name: DEAL_NAME }).first().click();
    await expect(page.url()).toContain('/deals/');
    await expect(page.getByRole('heading', { name: DEAL_NAME })).toBeVisible();

    // Open the edit dialog
    await page.getByRole('button', { name: /bearbeiten/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /deal bearbeiten/i })).toBeVisible();

    const nameInput = dialog.locator('#edit-name');
    await nameInput.clear();
    await nameInput.fill(DEAL_NAME_UPDATED);

    await dialog.getByRole('button', { name: /speichern/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole('heading', { name: DEAL_NAME_UPDATED })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Cleanup: delete deal then customer
  // ---------------------------------------------------------------------------

  test('delete the test deal', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('link', { name: DEAL_NAME_UPDATED }).first().click();
    await page.getByRole('button', { name: 'Löschen' }).first().click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();
  });

  test('delete the test customer', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByPlaceholder('Kunden suchen...').fill(CUSTOMER_LAST);
    await page.waitForTimeout(400); // debounce
    const customerRow = page.locator('table tbody tr').filter({ hasText: CUSTOMER_LAST });
    await customerRow.getByRole('checkbox').click();
    await page.getByRole('button', { name: /ausgewählte löschen/i }).click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByText(CUSTOMER_LAST)).not.toBeVisible();
  });
});
