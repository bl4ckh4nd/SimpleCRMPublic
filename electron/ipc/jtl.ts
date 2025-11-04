import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllJtlFirmen,
  getAllJtlWarenlager,
  getAllJtlZahlungsarten,
  getAllJtlVersandarten,
} from '../sqlite-service';
import { createJtlOrder } from '../jtl-order-service';

interface JtlHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerJtlHandlers(options: JtlHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerIpcHandler(IPCChannels.Jtl.GetFirmen, async () => {
    try {
      return getAllJtlFirmen();
    } catch (error) {
      logger.error('IPC Error getting JTL Firmen:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Jtl.GetWarenlager, async () => {
    try {
      return getAllJtlWarenlager();
    } catch (error) {
      logger.error('IPC Error getting JTL Warenlager:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Jtl.GetZahlungsarten, async () => {
    try {
      return getAllJtlZahlungsarten();
    } catch (error) {
      logger.error('IPC Error getting JTL Zahlungsarten:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Jtl.GetVersandarten, async () => {
    try {
      return getAllJtlVersandarten();
    } catch (error) {
      logger.error('IPC Error getting JTL Versandarten:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.Jtl.CreateOrder, async (_event, orderPayload: any) => {
    try {
      return await createJtlOrder(orderPayload);
    } catch (error) {
      logger.error('IPC Error creating JTL order:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
