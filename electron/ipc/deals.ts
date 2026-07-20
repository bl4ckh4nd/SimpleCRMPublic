import { IpcMainInvokeEvent } from 'electron';
import { IPC } from '../../shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getProductsForDeal,
  getTasksForDeal,
  getAllDeals,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  deleteDeal,
} from '../sqlite-service';
import { addDealProduct, removeDealProductLine, updateDealProductLine } from '../deal-products';

interface DealsHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  isDevelopment: boolean;
}

type Disposer = () => void;

export function registerDealHandlers(options: DealsHandlersOptions) {
  const { logger, isDevelopment } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPC.Deals.GetAll, async (event: IpcMainInvokeEvent, params = {}) => {
      const { limit, offset, filter } = params ?? {};
      if (isDevelopment) {
        logger.debug('[IPC] deals:get-all', { limit, offset, filter, senderUrl: event.sender.getURL() });
      }
      try {
        const start = Date.now();
        const result = getAllDeals(limit, offset, filter);
        if (isDevelopment) {
          logger.debug('[IPC] deals:get-all result', { count: result.length, duration: Date.now() - start });
        }
        return result;
      } catch (error) {
        logger.error('IPC Error getting all deals:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.GetById, async (_event, dealId: number) => {
      try {
        return getDealById(dealId);
      } catch (error) {
        logger.error(`IPC Error getting deal by id ${dealId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.Create, async (_event, dealData) => {
      try {
        return createDeal(dealData);
      } catch (error) {
        logger.error('IPC Error creating deal:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.Update, async (_event, payload) => {
      try {
        const { id, dealData } = payload ?? {};
        return updateDeal(id, dealData);
      } catch (error) {
        logger.error(`IPC Error updating deal:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.Delete, async (_event, dealId: number) => {
      try {
        return deleteDeal(dealId);
      } catch (error) {
        logger.error(`IPC Error deleting deal ${dealId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.UpdateStage, async (_event, payload) => {
      try {
        const { dealId, newStage } = payload ?? {};
        return updateDealStage(dealId, newStage);
      } catch (error) {
        logger.error('IPC Error updating deal stage:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.GetProducts, async (_event, dealId: number) => {
      try {
        return getProductsForDeal(dealId);
      } catch (error) {
        logger.error(`IPC Error getting products for deal ${dealId}:`, error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.GetTasks, async (_event, dealId: number) => {
      try {
        return getTasksForDeal(dealId);
      } catch (error) {
        logger.error(`IPC Error getting tasks for deal ${dealId}:`, error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.AddProduct, async (_event, { dealId, productId, quantity, unitPrice }) =>
      addDealProduct(dealId, productId, quantity, unitPrice), { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.RemoveProduct, async (_event, { dealProductId }) =>
      removeDealProductLine(dealProductId), { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Deals.UpdateProduct, async (_event, { dealProductId, quantity, unitPrice }) =>
      updateDealProductLine(dealProductId, quantity, unitPrice), { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
