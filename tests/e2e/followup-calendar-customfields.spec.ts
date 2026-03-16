import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

const TS = Date.now();
const EVENT_TITLE = `E2E-Termin-${TS}`;
const FIELD_NAME = `e2efield${TS}`;
const FIELD_LABEL = `E2E Testfeld ${TS}`;
const FIELD_LABEL_UPDATED = `E2E Testfeld Updated ${TS}`;

let app: ElectronApplication;
let page: Page;

test.describe.serial('Nachverfolgung, Calendar, and Custom Fields', () => {
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
  // Nachverfolgung page
  // ---------------------------------------------------------------------------

  test('Nachverfolgung page renders with correct heading', async () => {
    await page.getByRole('link', { name: 'Nachverfolgung', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nachverfolgung' })).toBeVisible();
    // Detail panel placeholder appears when no item is selected
    await expect(page.getByText('Zeile auswählen um Details anzuzeigen')).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Calendar: Create an event
  // ---------------------------------------------------------------------------

  test('create a calendar event via the add button', async () => {
    await page.getByRole('link', { name: 'Kalender', exact: true }).click();
    await page.getByRole('button', { name: /ereignis hinzufügen/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /neues ereignis hinzufügen/i })).toBeVisible();

    // Fill in the event title
    await dialog.locator('#title').fill(EVENT_TITLE);

    // Start and end are pre-populated; just submit
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(dialog).not.toBeVisible();

    // Switch to day view to guarantee the event is visible (month view can hide events behind "+X more")
    await page.getByRole('button', { name: 'Tag', exact: true }).click();
    await expect(page.getByText(EVENT_TITLE).first()).toBeVisible({ timeout: 8000 });
  });

  // ---------------------------------------------------------------------------
  // Calendar: Click event to view details, then delete
  // ---------------------------------------------------------------------------

  test('delete the calendar event from its detail panel', async () => {
    await page.getByRole('link', { name: 'Kalender', exact: true }).click();

    // Switch to day view so the event is never hidden behind "+X more"
    await page.getByRole('button', { name: 'Tag', exact: true }).click();

    // Click the event to open the detail dialog
    await page.getByText(EVENT_TITLE).first().click();

    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByRole('button', { name: 'Löschen' })).toBeVisible({ timeout: 6000 });
    await detailDialog.getByRole('button', { name: 'Löschen' }).click();

    // Wait for the dialog to close before asserting the event is gone
    await expect(detailDialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(EVENT_TITLE).first()).not.toBeVisible({ timeout: 6000 });
  });

  // ---------------------------------------------------------------------------
  // Custom Fields: Navigate via Settings tab
  // ---------------------------------------------------------------------------

  test('navigate to Custom Fields via the Settings tab', async () => {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('link', { name: 'Benutzerdefinierte Felder', exact: true }).click();
    await expect(page.getByText('Benutzerdefinierte Felder').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Custom Fields: Create
  // ---------------------------------------------------------------------------

  test('create a custom field', async () => {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('link', { name: 'Benutzerdefinierte Felder', exact: true }).click();

    await page.getByRole('button', { name: /benutzerdefiniertes feld hinzufügen/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /benutzerdefiniertes feld erstellen/i })).toBeVisible();

    // Name field (internal key) — identified by its accessible label "Name"
    await dialog.getByRole('textbox', { name: 'Name' }).fill(FIELD_NAME);
    // Label field (display name) — identified by its accessible label "Bezeichnung"
    await dialog.getByRole('textbox', { name: 'Bezeichnung' }).fill(FIELD_LABEL);
    // Field type is already "text" by default — leave it

    await dialog.getByRole('button', { name: 'Feld erstellen' }).click();
    await expect(dialog).not.toBeVisible();

    // Should appear in the table
    await expect(page.getByText(FIELD_LABEL)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Custom Fields: Edit
  // ---------------------------------------------------------------------------

  test('edit the custom field label', async () => {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('link', { name: 'Benutzerdefinierte Felder', exact: true }).click();

    // Find the edit button in the row for our field
    const fieldRow = page.locator('table tbody tr').filter({ hasText: FIELD_LABEL });
    // First button in actions is Edit (Pencil icon)
    await fieldRow.getByRole('button').first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /benutzerdefiniertes feld bearbeiten/i })).toBeVisible();

    const labelInput = dialog.getByRole('textbox', { name: 'Bezeichnung' });
    await labelInput.clear();
    await labelInput.fill(FIELD_LABEL_UPDATED);

    await dialog.getByRole('button', { name: 'Feld aktualisieren' }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText(FIELD_LABEL_UPDATED)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // Custom Fields: Delete
  // ---------------------------------------------------------------------------

  test('delete the custom field via the delete button', async () => {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('link', { name: 'Benutzerdefinierte Felder', exact: true }).click();

    const fieldRow = page.locator('table tbody tr').filter({ hasText: FIELD_LABEL_UPDATED });

    // Handle the native window.confirm dialog before clicking delete
    page.once('dialog', (dialog) => dialog.accept());

    // Second button in the row is Delete (Trash icon)
    await fieldRow.getByRole('button').nth(1).click();

    await expect(page.getByText(FIELD_LABEL_UPDATED)).not.toBeVisible();
  });
});
