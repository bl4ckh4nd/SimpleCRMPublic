import { createCustomer } from './helpers';
import { expect, test } from './fixtures';

test('product-backed deal moves through sales and enforces protected deletion', async ({ page }) => {
  await createCustomer(page, { firstName: 'Sally', lastName: 'Vertrieb', company: 'Sales GmbH' });

  await page.getByRole('link', { name: 'Produkte', exact: true }).click();
  await page.getByRole('button', { name: 'Neues Produkt' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder(/SuperWidget/i).fill('E2E Beratung');
  await dialog.getByPlaceholder(/SWP-123/i).fill('E2E-SKU');
  await dialog.locator('input[type="number"]').first().fill('49.99');
  await dialog.getByRole('button', { name: 'Produkt erstellen' }).click();
  await expect(page.getByText('E2E Beratung')).toBeVisible();

  const productRow = page.locator('table tbody tr').filter({ hasText: 'E2E Beratung' });
  await productRow.getByRole('button', { name: 'Menü öffnen' }).click();
  await page.getByRole('menuitem', { name: 'Bearbeiten' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder(/SuperWidget/i).fill('E2E Beratung Pro');
  await dialog.getByRole('button', { name: 'Änderungen speichern' }).click();
  await expect(page.getByRole('cell', { name: 'E2E Beratung Pro', exact: true })).toBeVisible();

  await page.locator('a[href="/deals"]').first().click();
  await page.getByRole('button', { name: /Neuer Deal/i }).click();
  dialog = page.getByRole('dialog', { name: /Neuen Deal hinzufügen/i });
  await dialog.locator('#name').fill('E2E Verkaufschance');
  await dialog.getByRole('combobox').first().click();
  await page.getByPlaceholder('Kunde suchen...').fill('Vertrieb');
  await page.locator('[role="option"]').filter({ hasText: 'Vertrieb' }).click();
  await dialog.locator('#value').fill('500');
  await dialog.getByRole('button', { name: 'Deal hinzufügen' }).click();
  await page.getByRole('link', { name: 'E2E Verkaufschance' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Verkaufschance' })).toBeVisible();

  await page.getByRole('button', { name: 'Produkt hinzufügen', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Produkt zum Deal hinzufügen' });
  await dialog.getByRole('combobox').click();
  await page.getByPlaceholder('Produkt suchen...').fill('E2E Beratung Pro');
  await page.locator('[role="option"]').filter({ hasText: 'E2E Beratung Pro' }).click();
  await dialog.locator('#quantity').fill('2');
  await dialog.getByRole('button', { name: 'Hinzufügen' }).click();
  await expect(page.getByRole('row', { name: /E2E Beratung Pro E2E-SKU 2/ })).toBeVisible();

  await page.getByRole('button', { name: 'Bearbeiten' }).first().click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#edit-name').fill('E2E Verkaufschance Pro');
  await dialog.locator('#edit-value-calculation-method').click();
  await page.getByRole('option', { name: 'Dynamisch (aus Produkten)' }).click();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Verkaufschance Pro' })).toBeVisible();
  await expect(page.getByText('(Dynamisch berechnet)')).toBeVisible();

  await page.locator('a[href="/deals"]').first().click();
  await page.getByRole('button', { name: /Kanban/i }).click();
  const stage = page.getByRole('link', { name: 'E2E Verkaufschance Pro' })
    .locator('xpath=ancestor::div[.//button[@role="combobox"]][1]')
    .getByRole('combobox');
  await stage.click();
  await page.getByRole('option', { name: 'Qualifiziert', exact: true }).click();

  await page.getByRole('link', { name: 'Kunden', exact: true }).click();
  const customerRow = page.locator('table tbody tr').filter({ hasText: 'Vertrieb' });
  await customerRow.getByRole('checkbox').click();
  await page.getByRole('button', { name: /Ausgewählte löschen/i }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('Kunden konnten nicht gelöscht werden.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sally Vertrieb' })).toBeVisible();
});
