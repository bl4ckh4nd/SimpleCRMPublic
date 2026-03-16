import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

const TS = Date.now();
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// Shared names for setup/teardown
const FOLLOWUP_CUSTOMER = `FollowupTest-${TS}`;
const FOLLOWUP_TASK = `FollowupAufgabe-${TS}`;
const LOG_TITLE = `Notiz-${TS}`;

const KANBAN_CUSTOMER = `KanbanTest-${TS}`;
const KANBAN_DEAL = `KanbanDeal-${TS}`;

const CAL_EVENT = `CalEdit-${TS}`;
const CAL_EVENT_UPDATED = `CalEdit-Updated-${TS}`;

let app: ElectronApplication;
let page: Page;

test.describe.serial('Nachverfolgung — log-activity dialog', () => {
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

  test('create a customer and a task due today for the followup queue', async () => {
    // Create customer
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
    const customerDialog = page.getByRole('dialog');
    await customerDialog.locator('#firstName').fill('Followup');
    await customerDialog.locator('#name').fill(FOLLOWUP_CUSTOMER);
    await customerDialog.locator('#email').fill(`followup-${TS}@test.example`);
    await customerDialog.getByRole('button', { name: 'Kunde erstellen' }).click();
    await expect(customerDialog).not.toBeVisible();

    // Create task with today as due date
    await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
    await page.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();

    const taskDialog = page.getByRole('dialog', { name: /neue aufgabe hinzufügen/i });
    await taskDialog.locator('#title').fill(FOLLOWUP_TASK);
    await taskDialog.locator('#due_date').fill(TODAY);

    // Link to the new customer
    await taskDialog.getByRole('combobox').first().click();
    const searchInput = page.getByPlaceholder('Kunde suchen...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(FOLLOWUP_CUSTOMER);
    const customerOption = page.locator('[role="option"]').filter({ hasText: FOLLOWUP_CUSTOMER });
    await customerOption.waitFor({ state: 'visible', timeout: 8000 });
    await customerOption.click();

    await taskDialog.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
    await expect(taskDialog).not.toBeVisible();
    await expect(page.getByText(FOLLOWUP_TASK)).toBeVisible();
  });

  test('task appears in the Nachverfolgung "Heute" queue', async () => {
    await page.getByRole('link', { name: 'Nachverfolgung', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nachverfolgung' })).toBeVisible();

    // The "Heute" queue is active by default; the task should be visible in the execution list
    await expect(page.getByText(FOLLOWUP_CUSTOMER).first()).toBeVisible({ timeout: 8000 });
  });

  test('select the item and open the log-activity dialog via "Notiz"', async () => {
    // Click the row that contains our customer name to select it
    await page.locator('.divide-y > div').filter({ hasText: FOLLOWUP_CUSTOMER }).first().click();

    // The InstantDetailPanel shows QuickActions: Anruf, E-Mail, Notiz
    await expect(page.getByRole('button', { name: 'Notiz', exact: true })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Notiz', exact: true }).click();

    const logDialog = page.getByRole('dialog');
    await expect(logDialog.getByRole('heading', { name: /aktivität protokollieren/i })).toBeVisible();

    await logDialog.locator('#activity-title').fill(LOG_TITLE);
    await logDialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(logDialog).not.toBeVisible();
  });

  test('cleanup: delete the followup task customer', async () => {
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByPlaceholder('Kunden suchen...').fill(FOLLOWUP_CUSTOMER);
    await page.waitForTimeout(400);
    const row = page.locator('table tbody tr').filter({ hasText: FOLLOWUP_CUSTOMER });
    await row.getByRole('checkbox').click();
    await page.getByRole('button', { name: /ausgewählte löschen/i }).click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByText(FOLLOWUP_CUSTOMER)).not.toBeVisible();
  });
});

test.describe.serial('Deal Kanban — stage change via dropdown', () => {
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

  test('create a customer and deal for the kanban test', async () => {
    // Customer
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByRole('button', { name: /kunde hinzufügen/i }).click();
    const customerDialog = page.getByRole('dialog');
    await customerDialog.locator('#firstName').fill('Kanban');
    await customerDialog.locator('#name').fill(KANBAN_CUSTOMER);
    await customerDialog.locator('#email').fill(`kanban-${TS}@test.example`);
    await customerDialog.getByRole('button', { name: 'Kunde erstellen' }).click();
    await expect(customerDialog).not.toBeVisible();

    // Deal (defaults to "Interessent" stage)
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('button', { name: /neuer deal/i }).click();
    const dealDialog = page.getByRole('dialog', { name: /neuen deal hinzufügen/i });
    await dealDialog.locator('#name').fill(KANBAN_DEAL);
    await dealDialog.getByRole('combobox').first().click();
    const searchInput = page.getByPlaceholder('Kunde suchen...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(KANBAN_CUSTOMER);
    const customerOption = page.locator('[role="option"]').filter({ hasText: KANBAN_CUSTOMER });
    await customerOption.waitFor({ state: 'visible', timeout: 8000 });
    await customerOption.click();
    await dealDialog.locator('#value').fill('1000');
    await dealDialog.getByRole('button', { name: 'Deal hinzufügen' }).click();
    await expect(dealDialog).not.toBeVisible();
    await expect(page.getByText(KANBAN_DEAL)).toBeVisible();
  });

  test('switch to Kanban view and change deal stage via the card dropdown', async () => {
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();

    // Switch to Kanban view
    await page.getByRole('button', { name: /kanban/i }).click();

    // The deal card should be in the "Interessent" column
    await expect(page.getByRole('heading', { name: /interessent/i })).toBeVisible();

    // Find the stage Select combobox that lives inside the same card as our deal link.
    // Navigate from the deal link up to the nearest ancestor <div> that also contains a combobox.
    const stageCombobox = page
      .getByRole('link', { name: KANBAN_DEAL })
      .locator('xpath=ancestor::div[.//button[@role="combobox"]][1]')
      .getByRole('combobox');

    await stageCombobox.click();
    await page.getByRole('option', { name: 'Qualifiziert', exact: true }).click();

    // The card's stage badge should update to "Qualifiziert"
    const dealCard = page.getByRole('link', { name: KANBAN_DEAL })
      .locator('xpath=ancestor::div[.//button[@role="combobox"]][1]');
    await expect(dealCard.getByText('Qualifiziert').first()).toBeVisible({ timeout: 5000 });
  });

  test('cleanup: delete the kanban deal and customer', async () => {
    // Delete deal from detail page
    await page.getByRole('link', { name: 'Deals', exact: true }).first().click();
    await page.getByRole('link', { name: KANBAN_DEAL }).first().click();
    await page.getByRole('button', { name: 'Löschen' }).first().click();
    const dealAlert = page.getByRole('alertdialog');
    await expect(dealAlert).toBeVisible();
    await dealAlert.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();

    // Delete customer
    await page.getByRole('link', { name: 'Kunden', exact: true }).click();
    await page.getByPlaceholder('Kunden suchen...').fill(KANBAN_CUSTOMER);
    await page.waitForTimeout(400);
    const row = page.locator('table tbody tr').filter({ hasText: KANBAN_CUSTOMER });
    await row.getByRole('checkbox').click();
    await page.getByRole('button', { name: /ausgewählte löschen/i }).click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Löschen' }).click();
    await expect(page.getByText(KANBAN_CUSTOMER)).not.toBeVisible();
  });
});

test.describe.serial('Calendar — event create, edit, delete', () => {
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

  test('create a calendar event', async () => {
    await page.getByRole('link', { name: 'Kalender', exact: true }).click();
    // Use day view so events are never hidden behind "+X more"
    await page.getByRole('button', { name: 'Tag', exact: true }).click();
    await page.getByRole('button', { name: /ereignis hinzufügen/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /neues ereignis hinzufügen/i })).toBeVisible();
    await dialog.locator('#title').fill(CAL_EVENT);
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(CAL_EVENT).first()).toBeVisible({ timeout: 8000 });
  });

  test('open the event detail and edit the title', async () => {
    await page.getByRole('link', { name: 'Kalender', exact: true }).click();
    await page.getByRole('button', { name: 'Tag', exact: true }).click();
    await page.getByText(CAL_EVENT).first().click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByRole('button', { name: 'Bearbeiten' })).toBeVisible({ timeout: 5000 });
    await detailDialog.getByRole('button', { name: 'Bearbeiten' }).click();

    // Edit form dialog
    const editDialog = page.getByRole('dialog');
    await expect(editDialog.getByRole('heading', { name: /ereignis bearbeiten/i })).toBeVisible();

    const titleInput = editDialog.locator('#title');
    await titleInput.clear();
    await titleInput.fill(CAL_EVENT_UPDATED);

    await editDialog.getByRole('button', { name: 'Aktualisieren' }).click();
    await expect(editDialog).not.toBeVisible();

    await expect(page.getByText(CAL_EVENT_UPDATED).first()).toBeVisible({ timeout: 8000 });
  });

  test('delete the edited calendar event', async () => {
    await page.getByRole('link', { name: 'Kalender', exact: true }).click();
    await page.getByRole('button', { name: 'Tag', exact: true }).click();
    await page.getByText(CAL_EVENT_UPDATED).first().click();
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByRole('button', { name: 'Löschen' })).toBeVisible({ timeout: 5000 });
    await detailDialog.getByRole('button', { name: 'Löschen' }).click();

    // Wait for the detail dialog to close, then verify event is gone from the calendar
    await expect(detailDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(CAL_EVENT_UPDATED).first()).not.toBeVisible({ timeout: 6000 });
  });
});

test.describe.serial('Settings — MSSQL connection test feedback', () => {
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

  test('clicking "Verbindung testen" shows a failure toast when no server is configured', async () => {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await expect(page.getByText('MSSQL-Server & JTL').first()).toBeVisible();

    const testButton = page.getByRole('button', { name: /verbindung testen/i });
    await expect(testButton).toBeVisible();

    await testButton.click();

    // Wait for the IPC round-trip to complete (button becomes enabled again)
    await expect(testButton).not.toBeDisabled({ timeout: 30_000 });

    // After a failed connection (no server configured), the status icon changes to XCircle
    // which has class "text-red-500" — this persists until the next successful test
    await expect(page.locator('svg.text-red-500').first()).toBeVisible({ timeout: 5000 });
  });
});
