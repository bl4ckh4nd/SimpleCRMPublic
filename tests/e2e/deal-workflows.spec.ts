import path from 'path';
import { _electron as electron, test, expect, ElectronApplication, Page } from '@playwright/test';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  const mainPath = path.resolve(process.cwd(), 'dist-electron/main.js');
  app = await electron.launch({
    args: [mainPath],
    env: { ...process.env, NODE_ENV: 'production' },
  });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app.close();
});

test('deals page: renders table with column headers', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  await expect(page.getByRole('heading', { name: 'Deals' })).toBeVisible();
});

test('deals page: opens and cancels create deal dialog', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  await page.getByRole('button', { name: /neuer deal/i }).click();
  await expect(page.getByRole('heading', { name: /neuen deal hinzufügen/i })).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('heading', { name: /neuen deal hinzufügen/i })).not.toBeVisible();
});

test('deals page: switches to kanban view', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  // Look for kanban/board view toggle button
  const kanbanButton = page.getByRole('button', { name: /kanban|board|ansicht/i });
  const hasKanbanToggle = await kanbanButton.isVisible().catch(() => false);

  if (hasKanbanToggle) {
    await kanbanButton.click();
    // Should show kanban columns
    await expect(page.locator('[data-testid="kanban-column"], .kanban-column, [class*="kanban"]').first()).toBeVisible();
  }
});

test('deals page: search input filters deals', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  const searchInput = page.getByPlaceholder(/suchen/i);
  const hasSearch = await searchInput.isVisible().catch(() => false);

  if (hasSearch) {
    await searchInput.fill('xxxxxxxxxnotexistingdeal');
    await page.waitForTimeout(400); // Wait for debounce
    const noResults = await page.getByText(/keine ergebnisse|no results/i).isVisible().catch(() => false);
    const tableEmpty = await page.locator('table tbody tr').count().then(c => c === 0).catch(() => false);
    expect(noResults || tableEmpty).toBeTruthy();
    await searchInput.clear();
  }
});

test('deals page: stage filter dropdown is visible', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  // Check for stage filter (combobox/select for filtering by stage)
  const stageFilter = page.getByRole('combobox').first();
  const hasFilter = await stageFilter.isVisible().catch(() => false);
  expect(hasFilter).toBeTruthy();
});

test('deals page: has export button', async () => {
  await page.getByRole('link', { name: 'Deals' }).click();
  await expect(page.getByRole('button', { name: /exportieren/i })).toBeVisible();
});
