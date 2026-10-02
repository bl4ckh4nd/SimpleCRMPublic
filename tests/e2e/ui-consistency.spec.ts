import { expect, test } from './fixtures';

test('long dialogs retain reachable headings, fields, and actions at the minimum window size', async ({ app, page }, testInfo) => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1024, 600));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
    await page.getByRole('combobox', { name: 'Darstellung' }).click();
    await page.getByRole('option', { name: theme === 'light' ? 'Hell' : 'Dunkel', exact: true }).click();
    for (const [route, trigger, footer] of [
      ['/customers', 'Kunde hinzufügen', 'Kunde erstellen'],
      ['/tasks', 'Aufgabe hinzufügen', 'Aufgabe hinzufügen'],
      ['/products', 'Neues Produkt', 'Produkt erstellen'],
      ['/deals', 'Neuer Deal', 'Deal hinzufügen'],
      ['/settings/custom-fields', 'Feld hinzufügen', 'Feld erstellen'],
      ['/calendar', 'Ereignis hinzufügen', 'Speichern'],
    ]) {
      await page.goto(`app://-${route}`);
      await page.getByRole('button', { name: trigger, exact: true }).click();
      const dialog = page.getByRole('dialog');
      if (route === '/calendar') await dialog.getByRole('switch', { name: 'Wiederholung', exact: true }).check();
      const bounds = await dialog.boundingBox();
      const viewport = await page.evaluate(() => ({ height: innerHeight, titlebar: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--titlebar-height')) }));
      expect(bounds!.y).toBeGreaterThanOrEqual(viewport.titlebar + 15);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 15);
      await expect(dialog.getByRole('heading').first()).toBeInViewport();
      await expect(dialog.getByRole('button', { name: footer, exact: true })).toBeInViewport();
      const styleChecks = await dialog.evaluate(element => {
        const ratio = (a: string, b: string) => {
          const luminance = (color: string) => {
            const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => channel / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const x = luminance(a), y = luminance(b);
          return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
        };
        const sample = document.createElement('span'); document.body.append(sample);
        const contrasts = ['success', 'warning', 'info', 'danger', 'neutral', 'destructive'].map(tone => {
          sample.style.backgroundColor = `var(--color-${tone})`;
          sample.style.color = `var(--color-${tone}-foreground)`;
          const style = getComputedStyle(sample); return ratio(style.color, style.backgroundColor);
        });
        sample.remove();
        const input = element.querySelector('input:not([type=hidden])')!;
        const style = getComputedStyle(input);
        return { contrasts, boundary: ratio(style.borderColor, style.backgroundColor), animation: getComputedStyle(element).animationName };
      });
      for (const contrast of styleChecks.contrasts) expect(contrast).toBeGreaterThanOrEqual(4.5);
      expect(styleChecks.boundary).toBeGreaterThanOrEqual(3);
      expect(styleChecks.animation).toBe('none');
      const lastField = dialog.locator('input:not([type=hidden]), textarea').last();
      await lastField.focus();
      await expect(lastField).toBeInViewport();
      await testInfo.attach(`${theme}-${route.slice(1)}-dialog`, { body: await page.screenshot(), contentType: 'image/png' });
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(page.getByRole('button', { name: trigger, exact: true })).toBeFocused();
    }
  }
});

test('theme choice persists, System responds, and navigation remains reachable at Electron 200 percent zoom', async ({ app, page }, testInfo) => {
  await page.getByRole('link', { name: 'Einstellungen', exact: true }).click();
  const appearance = page.getByRole('combobox', { name: 'Darstellung' });
  await appearance.click();
  await page.getByRole('option', { name: 'Dunkel', exact: true }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await appearance.click();
  await page.getByRole('option', { name: 'System', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(1024, 600);
    win.webContents.setZoomFactor(2);
  });
  for (const name of ['Dashboard', 'Nachverfolgung', 'Kunden', 'Deals', 'Aufgaben', 'Produkte', 'Kalender', 'Einstellungen']) {
    await page.getByRole('button', { name: 'Seiten öffnen' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await testInfo.attach('electron-zoom200', { body: await page.screenshot(), contentType: 'image/png' });
});

test('failed task reads are distinct from empty results and support retry', async ({ app, page }) => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('tasks:get-all');
    ipcMain.handle('tasks:get-all', () => { throw new Error('UI-Test: Lesen fehlgeschlagen'); });
  });
  await page.getByRole('link', { name: 'Aufgaben', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Lesen fehlgeschlagen');
  await expect(page.getByRole('heading', { name: 'Aufgaben', exact: true })).toBeVisible();
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('tasks:get-all');
    ipcMain.handle('tasks:get-all', () => []);
  });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await expect(page.getByText('Keine Aufgaben vorhanden.', { exact: true })).toBeVisible();
});

test('custom field definitions load before visiting their tab and block saving until retry succeeds', async ({ app, page }) => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('custom-fields:get-active');
    ipcMain.handle('custom-fields:get-active', () => { throw new Error('Schema unavailable'); });
  });
  await page.getByRole('link', { name: 'Kunden', exact: true }).click();
  await page.getByRole('button', { name: 'Kunde hinzufügen', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nachname*', { exact: true }).fill('Schema-Test');
  await expect(dialog.getByRole('button', { name: 'Kunde erstellen' })).toBeDisabled();
  await dialog.getByRole('tab', { name: 'Benutzerdefinierte Felder' }).click();
  await expect(dialog.getByRole('alert').filter({ hasText: 'Vorhandene Werte bleiben erhalten' })).toContainText('Vorhandene Werte bleiben erhalten');
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('custom-fields:get-active');
    ipcMain.handle('custom-fields:get-active', () => []);
  });
  await dialog.getByRole('button', { name: 'Erneut versuchen' }).click();
  await expect(dialog.getByRole('button', { name: 'Kunde erstellen' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Kunde erstellen' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('link', { name: 'Schema-Test', exact: true })).toBeVisible();
});

test('stored calendar colors retain readable foregrounds in every calendar view', async ({ page }, testInfo) => {
  await page.evaluate(async () => {
    for (const [index, color] of ['#ffffff', '#000000', '#777777'].entries()) {
      const start = new Date(); start.setHours(10 + index * 2, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const result = await window.electronAPI.invoke('calendar:save-entry', { event: { title: `Kontrast ${index}`, start_date: start.toISOString(), end_date: end.toISOString(), all_day: false, color_code: color, event_type: 'event' } });
      if (!result.success) throw new Error(result.error);
    }
  });
  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  for (const name of ['Monat', 'Woche', 'Tag', 'Agenda']) {
    await page.getByRole('radio', { name, exact: true }).click();
    await expect(page.getByText('Kontrast 0').first()).toBeVisible();
    if (name !== 'Agenda') {
      const colors = await page.locator('.rbc-event').evaluateAll(events => events.map(event => ({ bg: getComputedStyle(event).backgroundColor, fg: getComputedStyle(event).color })));
      expect(colors).toEqual(expect.arrayContaining([{ bg: 'rgb(255, 255, 255)', fg: 'rgb(0, 0, 0)' }, { bg: 'rgb(0, 0, 0)', fg: 'rgb(255, 255, 255)' }, { bg: 'rgb(119, 119, 119)', fg: 'rgb(0, 0, 0)' }]));
    }
    await testInfo.attach(`calendar-${name}`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('follow-up read errors remain retryable without being reported as an empty queue', async ({ app, page }) => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('followup:get-items');
    ipcMain.handle('followup:get-items', () => { throw new Error('Queue unavailable'); });
  });
  await page.getByRole('link', { name: 'Nachverfolgung', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Arbeitsliste');
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('followup:get-items');
    ipcMain.handle('followup:get-items', () => []);
  });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
});

test('dashboard read failure keeps its title and does not present first-run onboarding', async ({ app, page }) => {
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('dashboard:get-stats');
    ipcMain.handle('dashboard:get-stats', () => { throw new Error('Stats unavailable'); });
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Dashboard-Daten');
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('dashboard:get-stats');
    ipcMain.handle('dashboard:get-stats', () => ({ totalCustomers: 0, newCustomersLastMonth: 0, activeDealsCount: 0, activeDealsValue: 0, pendingTasksCount: 0, dueTodayTasksCount: 0, conversionRate: 0 }));
  });
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
});

test('calendar drag and resize retain their persisted behavior with shared calendar styles', async ({ page }, testInfo) => {
  const originalStart = await page.evaluate(async () => {
    const start = new Date(); start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const result = await window.electronAPI.invoke('calendar:save-entry', { event: { title: 'Verschieben und verlängern', start_date: start.toISOString(), end_date: end.toISOString(), all_day: false, color_code: '#777777', event_type: 'event' } });
    if (!result.success) throw new Error(result.error);
    return start.toISOString();
  });
  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  const event = page.locator('.rbc-event').filter({ hasText: 'Verschieben und verlängern' });
  await expect(event).toBeVisible();
  const todayIndex = await page.locator('.rbc-day-bg').evaluateAll(cells => cells.findIndex(cell => cell.classList.contains('rbc-today')));
  const target = await page.locator('.rbc-day-bg').nth(todayIndex + 1).boundingBox();
  const source = await event.boundingBox();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(target!.x + target!.width / 2, target!.y + 45, { steps: 15 });
  await page.mouse.up();
  const persisted = async () => page.evaluate(async () => {
    const events = await window.electronAPI.invoke('db:getCalendarEvents');
    return events.find((entry: Record<string, unknown>) => entry.title === 'Verschieben und verlängern');
  });
  await expect.poll(async () => (await persisted())?.start_date).not.toBe(originalStart);
  const beforeResize = await persisted();
  expect(beforeResize.all_day).toBe(0);
  const anchor = event.locator('.rbc-addons-dnd-resize-ew-anchor').last();
  await event.hover();
  const handle = await anchor.boundingBox();
  expect(handle).not.toBeNull();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle!.x + target!.width, handle!.y + handle!.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect.poll(async () => new Date((await persisted()).end_date).getTime()).toBeGreaterThan(new Date(beforeResize.end_date).getTime());
  await page.reload();
  await expect(event).toBeVisible();
  await testInfo.attach('calendar-after-drag-resize', { body: await page.screenshot(), contentType: 'image/png' });
});

test('calendar rejects failed saves and deletion without reporting a local success', async ({ app, page }) => {
  await page.evaluate(async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const result = await window.electronAPI.invoke('calendar:save-entry', { event: { title: 'Geschützter Termin', start_date: start.toISOString(), end_date: end.toISOString(), all_day: true, color_code: '#3174ad', event_type: 'event' } });
    if (!result.success) throw new Error(result.error);
  });
  await page.getByRole('link', { name: 'Kalender', exact: true }).click();
  await page.getByText('Geschützter Termin').first().click();
  const dialog = page.getByRole('dialog');
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('db:deleteCalendarEvent');
    ipcMain.handle('db:deleteCalendarEvent', () => ({ success: false, error: 'Test: Löschen blockiert' }));
  });
  await dialog.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByText(/Test: Löschen blockiert/).first()).toBeVisible();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.rbc-event').filter({ hasText: 'Geschützter Termin' })).toBeVisible();
  await page.getByRole('button', { name: 'Ereignis hinzufügen', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Titel*', { exact: true }).fill('Nicht gespeicherter Termin');
  await app.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('calendar:save-entry');
    ipcMain.handle('calendar:save-entry', () => ({ success: false, error: 'Test: Speichern blockiert' }));
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern', exact: true }).click();
  await expect(page.getByText(/Test: Speichern blockiert/).first()).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Titel*', { exact: true })).toHaveValue('Nicht gespeicherter Termin');
});
