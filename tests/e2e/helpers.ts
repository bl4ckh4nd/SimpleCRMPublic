import type { Page } from '@playwright/test';
import { expect } from './fixtures';

export async function createCustomer(
  page: Page,
  options: { firstName?: string; lastName: string; company?: string; customField?: { label: string; value: string } },
) {
  await page.getByRole('link', { name: 'Kunden', exact: true }).click();
  await page.getByRole('button', { name: 'Kunde hinzufügen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#firstName').fill(options.firstName ?? 'E2E');
  await dialog.locator('#name').fill(options.lastName);
  await dialog.locator('#email').fill(`${options.lastName.toLowerCase()}@test.example`);
  if (options.company) await dialog.locator('#company').fill(options.company);
  if (options.customField) {
    await dialog.getByRole('tab', { name: 'Benutzerdefinierte Felder' }).click();
    await dialog.getByLabel(options.customField.label).fill(options.customField.value);
  }
  await dialog.getByRole('button', { name: 'Kunde erstellen' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('link', { name: `${options.firstName ?? 'E2E'} ${options.lastName}` })).toBeVisible();
}

export function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
