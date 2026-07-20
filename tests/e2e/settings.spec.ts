import { expect, test } from './fixtures';

test('external settings provide hermetic validation and persisted notification preferences', async ({ page }) => {
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  const connectionButton = page.getByRole('button', { name: /Verbindung testen/i });
  await connectionButton.click();
  await expect(connectionButton).toBeEnabled();
  await expect(page.locator('svg.text-red-500').first()).toBeVisible();

  await page.getByRole('link', { name: 'E-Mail-Benachrichtigungen' }).click();
  await expect(page.getByRole('heading', { name: 'E-Mail-Benachrichtigungen' })).toBeVisible();
  await page.getByRole('switch', { name: 'Benachrichtigungen aktivieren' }).check();
  await page.getByRole('button', { name: 'Einstellungen speichern' }).click();
  await expect(page.getByText('Eingaben prüfen')).toBeVisible();

  await page.getByRole('switch', { name: 'Benachrichtigungen aktivieren' }).uncheck();
  await page.locator('#digest-hour').fill('9');
  await page.locator('#deals-days').fill('14');
  await page.getByRole('button', { name: 'Einstellungen speichern' }).click();
  await expect(page.getByText('E-Mail-Einstellungen gespeichert')).toBeVisible();

  await page.reload();
  await expect(page.locator('#digest-hour')).toHaveValue('9');
  await expect(page.locator('#deals-days')).toHaveValue('14');
  await page.getByRole('button', { name: 'Test-E-Mail senden' }).click();
  await expect(page.getByText('Test-E-Mail fehlgeschlagen')).toBeVisible();
});
