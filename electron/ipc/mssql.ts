import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  saveMssqlSettingsWithKeytar,
  getMssqlSettingsWithKeytar,
  testConnectionWithKeytar,
  clearMssqlPasswordFromKeytar,
} from '../mssql-keytar-service';
import { parsePort } from '../utils/ports';

interface MssqlHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  isDevelopment: boolean;
}

type Disposer = () => void;

export function registerMssqlHandlers(options: MssqlHandlersOptions) {
  const { logger, isDevelopment } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPCChannels.Mssql.SaveSettings, async (_event, settings: any = {}) => {
      logger.info('[IPC Main] mssql:save-settings invoked');
      try {
        const processedSettings = {
          ...settings,
          port: parsePort(settings?.port),
        };
        if (isDevelopment) {
          logger.debug('[IPC Main] mssql:save-settings sanitized payload', sanitize(processedSettings));
        }
        await saveMssqlSettingsWithKeytar(processedSettings);
        return { success: true };
      } catch (error) {
        logger.error('[IPC Main] mssql:save-settings error:', error);
        return { success: false, error: (error as Error).message || 'Unknown error during saveMssqlSettingsWithKeytar call' };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Mssql.GetSettings, async () => {
      try {
        const settings = await getMssqlSettingsWithKeytar();
        if (isDevelopment) {
          logger.debug('[IPC Main] mssql:get-settings returning sanitized settings', sanitize(settings ?? {}));
        }
        return settings;
      } catch (error) {
        logger.error('IPC Error getting MSSQL settings:', error);
        return { success: false, error: (error as Error).message || 'Failed to retrieve settings', data: null };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Mssql.TestConnection, async (_event, settings: any = {}) => {
      logger.info('[IPC Main] mssql:test-connection invoked');
      try {
        const processedSettings = {
          ...settings,
          port: parsePort(settings?.port),
        };
        if (isDevelopment) {
          logger.debug('[IPC Main] mssql:test-connection sanitized payload', sanitize(processedSettings));
        }
        const result = await testConnectionWithKeytar(processedSettings);
        if (result.success) {
          return { success: true };
        }
        return {
          success: false,
          error: result.error?.userMessage || 'Test connection failed',
          errorDetails: result.error || null,
        };
      } catch (error) {
        logger.error('[IPC Main] mssql:test-connection error:', error);
        return { success: false, error: (error as Error).message || 'Test connection failed in main process' };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Mssql.ClearPassword, async () => {
      logger.info('[IPC Main] mssql:clear-password invoked.');
      try {
        const result = await clearMssqlPasswordFromKeytar();
        logger.info('[IPC Main] mssql:clear-password result:', result);
        return result;
      } catch (error) {
        logger.error('[IPC Main] mssql:clear-password error:', error);
        return { success: false, error: (error as Error).message || 'Failed to clear password' };
      }
    }, { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}

function sanitize(settings: Record<string, any> = {}) {
  const { password, user, ...rest } = settings;
  return {
    ...rest,
    user: user ? mask(String(user)) : undefined,
    password: password ? mask(String(password)) : undefined,
  };
}

function mask(value: string) {
  if (!value) return undefined;
  if (value.length <= 2) return '*'.repeat(value.length);
  return `${value[0]}${'*'.repeat(Math.min(value.length - 2, 6))}${value[value.length - 1]}`;
}
