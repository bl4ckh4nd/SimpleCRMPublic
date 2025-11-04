import { BrowserWindow } from 'electron';
import { registerWindowHandlers } from './window';
import { registerDatabaseHandlers } from './database';
import { registerDealHandlers } from './deals';
import { registerTaskHandlers } from './tasks';
import { registerCalendarHandlers } from './calendar';
import { registerCustomFieldHandlers } from './custom-fields';
import { registerSyncHandlers } from './sync';
import { registerDashboardHandlers } from './dashboard';
import { registerMssqlHandlers } from './mssql';
import { registerJtlHandlers } from './jtl';

interface IpcRouterOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  isDevelopment: boolean;
  getMainWindow: () => BrowserWindow | null;
}

type Disposer = () => void;

export function registerAllIpcHandlers(options: IpcRouterOptions) {
  const { logger, isDevelopment, getMainWindow } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerWindowHandlers({ getMainWindow, logger }));
  disposers.push(registerDatabaseHandlers({ logger, isDevelopment }));
  disposers.push(registerDealHandlers({ logger, isDevelopment }));
  disposers.push(registerTaskHandlers({ logger }));
  disposers.push(registerCalendarHandlers({ logger }));
  disposers.push(registerCustomFieldHandlers({ logger }));
  disposers.push(registerSyncHandlers({ logger, getMainWindow }));
  disposers.push(registerDashboardHandlers({ logger }));
  disposers.push(registerMssqlHandlers({ logger, isDevelopment }));
  disposers.push(registerJtlHandlers({ logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
