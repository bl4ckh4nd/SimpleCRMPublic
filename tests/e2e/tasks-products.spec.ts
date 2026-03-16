import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

const TS = Date.now();
const CUSTOMER_LAST = `TaskTest-${TS}`;
const TASK_TITLE = `E2E-Aufgabe-${TS}`;
const PRODUCT_NAME = `E2E-Produkt-${TS}`;
const PRODUCT_NAME_EDITED = `${PRODUCT_NAME}-Edit`;

let app: ElectronApplication;
let page: Page;

test.describe.serial('Tasks — CRUD', () => {
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
  // Setup: create a customer to link the task to
  // ---------------------------------------------------------------------------

  test('create a customer for task linking', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#firstName').fill('Task');
    await dialog.locator('#name').fill(CUSTOMER_LAST);
    await dialog.locator('#email').fill(`task-${TS}@test.example`);
    await dialog.getByRole('button', { name: 'Kunde erstellen' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(CUSTOMER_LAST)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Task: Create
  // ---------------------------------------------------------------------------

  test('create a new task linked to the test customer', async () => {
    await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
    await page.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: /neue aufgabe hinzufügen/i });
    await expect(dialog.getByRole('heading', { name: /neue aufgabe hinzufügen/i })).toBeVisible();

    await dialog.locator('#title').fill(TASK_TITLE);
    await dialog.locator('#description').fill('E2E-Testbeschreibung');

    // Select the test customer via the combobox
    await dialog.getByRole('combobox').first().click();
    const searchInput = page.getByPlaceholder('Kunde suchen...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(CUSTOMER_LAST);
    const customerOption = page.locator('[role="option"]').filter({ hasText: CUSTOMER_LAST });
    await customerOption.waitFor({ state: 'visible', timeout: 8000 });
    await customerOption.click();

    await dialog.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
    await expect(dialog).not.toBeVisible();

    // Task should appear in the list
    await expect(page.getByText(TASK_TITLE)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Task: Complete (toggle checkbox)
  // ---------------------------------------------------------------------------

  test('mark the task as complete via checkbox', async () => {
    await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();

    // Find the row with our task and tick its checkbox
    const taskRow = page.locator('table tbody tr').filter({ hasText: TASK_TITLE });
    await taskRow.getByRole('checkbox').click();

    // The task title should now appear with line-through styling
    await expect(taskRow.locator('span.line-through')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Cleanup: delete the test customer
  // ---------------------------------------------------------------------------

  test('cleanup: delete the test customer', async () => {
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

test.describe.serial('Products — CRUD', () => {
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
  // Product: Create
  // ---------------------------------------------------------------------------

  test('create a new product', async () => {
    await page.getByRole('link', { name: 'Produkte', exact: true }).click();
    await page.getByRole('button', { name: /neues produkt/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /neues produkt erstellen/i })).toBeVisible();

    await dialog.getByPlaceholder(/superwidget/i).fill(PRODUCT_NAME);
    await dialog.getByPlaceholder(/swp-123/i).fill(`SKU-${TS}`);
    await dialog.locator('input[type="number"]').first().fill('49.99');

    await dialog.getByRole('button', { name: 'Produkt erstellen' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Product: Edit
  // ---------------------------------------------------------------------------

  test('edit the product name via dropdown menu', async () => {
    await page.getByRole('link', { name: 'Produkte', exact: true }).click();

    // Open the actions dropdown for the product row
    const productRow = page.locator('table tbody tr').filter({ hasText: PRODUCT_NAME });
    await productRow.getByRole('button', { name: /menü öffnen/i }).click();
    await page.getByRole('menuitem', { name: /bearbeiten/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /produkt bearbeiten/i })).toBeVisible();

    const nameInput = dialog.getByPlaceholder(/superwidget/i);
    await nameInput.clear();
    await nameInput.fill(PRODUCT_NAME_EDITED);

    await dialog.getByRole('button', { name: /speichern/i }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(PRODUCT_NAME_EDITED)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Product: Delete
  // ---------------------------------------------------------------------------

  test('delete the product via dropdown menu', async () => {
    await page.getByRole('link', { name: 'Produkte', exact: true }).click();

    const productRow = page.locator('table tbody tr').filter({ hasText: PRODUCT_NAME_EDITED });
    await productRow.getByRole('button', { name: /menü öffnen/i }).click();
    await page.getByRole('menuitem', { name: /löschen/i }).click();

    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();

    await expect(page.getByText(PRODUCT_NAME_EDITED)).not.toBeVisible();
  });
});
