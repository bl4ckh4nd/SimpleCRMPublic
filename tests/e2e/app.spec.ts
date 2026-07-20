import { expect, test } from './fixtures';

test('fresh install loads every major application area', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('link', { name: 'Nachverfolgung', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nachverfolgung' })).toBeVisible();

  await page.getByRole('link', { name: 'Kunden', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Kunden' })).toBeVisible();

  await page.getByRole('link', { name: 'Deals', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();

  await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Aufgaben' })).toBeVisible();

  await page.getByRole('link', { name: 'Produkte', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Neues Produkt' })).toBeVisible();

  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  await expect(page.getByRole('button', { name: /Ereignis hinzufügen/i })).toBeVisible();

  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  await expect(page.getByText('MSSQL-Server & JTL').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Benutzerdefinierte Felder' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'E-Mail-Benachrichtigungen' })).toBeVisible();
});
