import { createCustomer, localDate } from './helpers';
import { expect, test } from './fixtures';

test('scheduled task spans tasks, calendar, and follow-up', async ({ page }) => {
  await createCustomer(page, { firstName: 'Tina', lastName: 'Nachfassen' });

  await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
  await page.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: /Neue Aufgabe hinzufügen/i });
  await dialog.locator('#title').fill('E2E Rückruf');
  await dialog.locator('#due_date').fill(localDate());
  await dialog.getByRole('switch', { name: /in Kalender eintragen/i }).check();
  await dialog.getByRole('combobox').first().click();
  await page.getByPlaceholder('Kunde suchen...').fill('Nachfassen');
  await page.locator('[role="option"]').filter({ hasText: 'Nachfassen' }).click();
  await dialog.getByRole('button', { name: 'Aufgabe hinzufügen', exact: true }).click();
  await expect(page.getByText('E2E Rückruf')).toBeVisible();

  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  await page.getByRole('button', { name: 'Tag', exact: true }).click();
  await expect(page.getByText('E2E Rückruf').first()).toBeVisible();

  await page.getByRole('link', { name: 'Nachverfolgung', exact: true }).click();
  await expect(page.getByText('Nachfassen').first()).toBeVisible();
  await page.locator('.divide-y > div').filter({ hasText: 'Nachfassen' }).first().click();
  await page.getByRole('button', { name: 'Notiz', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('#activity-title').fill('Rückruf besprochen');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Rückruf besprochen')).toBeVisible();

  await page.getByRole('button', { name: 'Zurückstellen', exact: true }).last().click();
  await page.getByRole('button', { name: 'Morgen', exact: true }).click();
  await expect(page.getByText('Nachfassen').first()).not.toBeVisible();

  await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
  const taskRow = page.locator('table tbody tr').filter({ hasText: 'E2E Rückruf' });
  await taskRow.getByRole('checkbox').click();
  await expect(taskRow.locator('span.line-through')).toBeVisible();
});

test('standalone calendar event can be created, edited, and deleted', async ({ page }) => {
  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  await page.getByRole('button', { name: 'Tag', exact: true }).click();
  await page.getByRole('button', { name: /Ereignis hinzufügen/i }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('#title').fill('E2E Kalendertermin');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await page.getByText('E2E Kalendertermin').first().click();

  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Bearbeiten' }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.locator('#title').fill('E2E Kalendertermin aktualisiert');
  await editDialog.getByRole('button', { name: 'Aktualisieren' }).click();
  await expect(page.getByText('E2E Kalendertermin aktualisiert').first()).toBeVisible();

  await page.getByText('E2E Kalendertermin aktualisiert').first().click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('E2E Kalendertermin aktualisiert').first()).not.toBeVisible();
});
