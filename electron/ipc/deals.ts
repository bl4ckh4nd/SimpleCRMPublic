import { IpcMainInvokeEvent } from 'electron';
import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getProductsForDeal,
  addProductToDeal,
  removeProductFromDeal,
  removeProductFromDealById,
  updateDealProduct,
  updateProductQuantityInDeal,
  updateDealValueBasedOnCalculationMethod,
  getAllDeals,
  getDealById,
  createDeal,
  updateDeal,
  updateDealStage,
  getDb,
} from '../sqlite-service';
import { DEAL_PRODUCTS_TABLE } from '../database-schema';

interface DealsHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  isDevelopment: boolean;
}

type Disposer = () => void;

export function registerDealHandlers(options: DealsHandlersOptions) {
  const { logger, isDevelopment } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.GetAll, async (event: IpcMainInvokeEvent, params: any = {}) => {
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
    registerIpcHandler(IPCChannels.Deals.GetById, async (_event, dealId: number) => {
      try {
        return getDealById(dealId);
      } catch (error) {
        logger.error(`IPC Error getting deal by id ${dealId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.Create, async (_event, dealData: any) => {
      try {
        return createDeal(dealData);
      } catch (error) {
        logger.error('IPC Error creating deal:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.Update, async (_event, payload: any) => {
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
    registerIpcHandler(IPCChannels.Deals.UpdateStage, async (_event, payload: any) => {
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
    registerIpcHandler(IPCChannels.Deals.GetProducts, async (_event, dealId: number) => {
      try {
        return getProductsForDeal(dealId);
      } catch (error) {
        logger.error(`IPC Error getting products for deal ${dealId}:`, error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.AddProduct, async (_event, payload: any = {}) => {
      let dealId: number | undefined;
      let productId: number | undefined;
      try {
        ({ dealId, productId } = payload);
        const { quantity, price, priceAtTime } = payload;

        if (typeof dealId !== 'number' || typeof productId !== 'number') {
          throw new Error('dealId and productId are required');
        }
        if (typeof quantity !== 'number' || quantity <= 0) {
          throw new Error('quantity must be a positive number');
        }
        const resolvedPrice = typeof price === 'number' ? price : priceAtTime;
        if (typeof resolvedPrice !== 'number') {
          throw new Error('price is required');
        }

        const result = addProductToDeal(dealId, productId, quantity, resolvedPrice);
        updateDealValueBasedOnCalculationMethod(dealId);
        return { success: true, lastInsertRowid: result.lastInsertRowid };
      } catch (error) {
        logger.error('IPC Error adding product to deal:', { dealId, productId, error });
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.RemoveProduct, async (_event, payload: any = {}) => {
      try {
        const { dealProductId, dealId, productId } = payload;
        if (typeof dealProductId === 'number') {
          const getDealIdStmt = getDb().prepare(
            `SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`
          );
          const dealIdResult = getDealIdStmt.get(dealProductId) as { deal_id?: number } | undefined;
          const resolvedDealId = dealIdResult?.deal_id;

          const result = removeProductFromDealById(dealProductId);
          if (resolvedDealId) {
            updateDealValueBasedOnCalculationMethod(resolvedDealId);
          }

          return { success: true, changes: result.changes };
        }

        if (typeof dealId === 'number' && typeof productId === 'number') {
          const result = removeProductFromDeal(dealId, productId);
          updateDealValueBasedOnCalculationMethod(dealId);
          return { success: result.changes > 0, changes: result.changes };
        }

        throw new Error('dealProductId is required');
      } catch (error) {
        logger.error('IPC Error removing deal product:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.UpdateProduct, async (_event, payload: any = {}) => {
      try {
        const { dealProductId, dealId, productId, quantity, price, priceAtTime } = payload;
        if (typeof quantity !== 'number' || quantity <= 0) {
          throw new Error('Quantity must be greater than 0 to update.');
        }

        let targetDealProductId = dealProductId as number | undefined;
        if (typeof targetDealProductId !== 'number' && typeof dealId === 'number' && typeof productId === 'number') {
          const lookupStmt = getDb().prepare(
            `SELECT id FROM ${DEAL_PRODUCTS_TABLE} WHERE deal_id = ? AND product_id = ?`
          );
          const match = lookupStmt.get(dealId, productId) as { id?: number } | undefined;
          targetDealProductId = match?.id;
        }

        if (typeof targetDealProductId !== 'number') {
          throw new Error('dealProductId is required to update deal products');
        }

        let finalPrice = typeof price === 'number' ? price : priceAtTime;
        if (typeof finalPrice !== 'number') {
          const priceStmt = getDb().prepare(
            `SELECT price_at_time_of_adding FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`
          );
          const existing = priceStmt.get(targetDealProductId) as { price_at_time_of_adding?: number } | undefined;
          finalPrice = existing?.price_at_time_of_adding;
        }

        if (typeof finalPrice !== 'number') {
          throw new Error('price is required to update deal products');
        }

        const result = updateDealProduct(targetDealProductId, quantity, finalPrice);
        const getDealIdStmt = getDb().prepare(
          `SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`
        );
        const dealIdResult = getDealIdStmt.get(targetDealProductId) as { deal_id?: number } | undefined;
        if (dealIdResult?.deal_id) {
          updateDealValueBasedOnCalculationMethod(dealIdResult.deal_id);
        }

        return { success: true, changes: result.changes };
      } catch (error) {
        logger.error('IPC Error updating deal product:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Deals.UpdateProductQuantityLegacy, async (_event, payload: any = {}) => {
      try {
        const { dealProductId, dealId, productId, newQuantity, quantity, price, priceAtTime } = payload;
        const resolvedQuantity = typeof quantity === 'number' ? quantity : newQuantity;

        if (typeof resolvedQuantity !== 'number' || resolvedQuantity <= 0) {
          return { success: false, error: 'quantity must be greater than 0' };
        }

        const resolvedPrice = typeof price === 'number' ? price : priceAtTime;

        if (typeof dealProductId === 'number') {
          let finalPrice = resolvedPrice;
          if (typeof finalPrice !== 'number') {
            const priceStmt = getDb().prepare(
              `SELECT price_at_time_of_adding, deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`
            );
            const existing = priceStmt.get(dealProductId) as { price_at_time_of_adding?: number; deal_id?: number } | undefined;
            finalPrice = existing?.price_at_time_of_adding;
          }

          if (typeof finalPrice !== 'number') {
            return { success: false, error: 'price is required to update deal products' };
          }

          const updateResult = updateDealProduct(dealProductId, resolvedQuantity, finalPrice);
          const dealLookup = getDb().prepare(
            `SELECT deal_id FROM ${DEAL_PRODUCTS_TABLE} WHERE id = ?`
          ).get(dealProductId) as { deal_id?: number } | undefined;
          if (dealLookup?.deal_id) {
            updateDealValueBasedOnCalculationMethod(dealLookup.deal_id);
          }
          return { success: updateResult.changes > 0, changes: updateResult.changes };
        }

        if (typeof dealId === 'number' && typeof productId === 'number') {
          const updateResult = updateProductQuantityInDeal(dealId, productId, resolvedQuantity);
          if (typeof resolvedPrice === 'number') {
            const priceStmt = getDb().prepare(
              `UPDATE ${DEAL_PRODUCTS_TABLE}
               SET price_at_time_of_adding = @price
               WHERE deal_id = @dealId AND product_id = @productId`
            );
            priceStmt.run({ price: resolvedPrice, dealId, productId });
          }
          updateDealValueBasedOnCalculationMethod(dealId);
          return { success: updateResult.changes > 0, changes: updateResult.changes };
        }

        return { success: false, error: 'dealProductId or (dealId and productId) are required' };
      } catch (error) {
        logger.error('IPC Error updating deal product quantity (legacy handler):', error);
        return { success: false, error: (error as Error).message };
      }
    }, {
      logger,
      onDeprecatedUse: (channel) => {
        logger.warn(`[IPC] Deprecated channel invoked: ${channel}`);
      },
    })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
