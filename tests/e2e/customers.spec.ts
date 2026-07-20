import { createCustomer } from './helpers';
import { expect, test } from './fixtures';

test('custom field and customer lifecycle persists through the detail page', async ({ page }) => {
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  await page.getByRole('link', { name: 'Benutzerdefinierte Felder' }).click();
  await page.getByRole('button', { name: 'Feld hinzufügen' }).click();

  let dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name' }).fill('segment');
  await dialog.getByRole('textbox', { name: 'Bezeichnung' }).fill('Segment');
  await dialog.getByRole('button', { name: 'Feld erstellen' }).click();
  const fieldRow = page.locator('table tbody tr').filter({ hasText: 'Segment' });
  await expect(fieldRow).toBeVisible();
  await fieldRow.getByRole('button').first().click();
  dialog = page.getByRole('dialog');
  const label = dialog.getByRole('textbox', { name: 'Bezeichnung' });
  await label.fill('Kundensegment');
  await dialog.getByRole('button', { name: 'Feld aktualisieren' }).click();

  await createCustomer(page, {
    firstName: 'Clara',
    lastName: 'Kundenfluss',
    company: 'Original GmbH',
    customField: { label: 'Kundensegment', value: 'Premium' },
  });

  await page.getByRole('link', { name: /Kundenfluss/ }).click();
  await expect(page.getByRole('heading', { name: /Kundenfluss/ })).toBeVisible();
  await page.getByRole('tab', { name: 'Benutzerdefinierte Felder' }).click();
  await expect(page.getByText('Premium')).toBeVisible();

  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#company').fill('Bearbeitet GmbH');
  await dialog.getByRole('tab', { name: 'Benutzerdefinierte Felder' }).click();
  await dialog.getByLabel('Kundensegment').fill('Enterprise');
  await dialog.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.getByText('Bearbeitet GmbH')).toBeVisible();
  await page.getByRole('tab', { name: 'Benutzerdefinierte Felder' }).click();
  await expect(page.getByText('Enterprise')).toBeVisible();

  await page.getByRole('button', { name: 'Löschen' }).first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Kundenfluss/ })).not.toBeVisible();
});
