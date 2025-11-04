import { IpcMainInvokeEvent } from 'electron';
import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getDealsForCustomer,
  getTasksForCustomer,
  searchCustomers,
  getCustomersForDropdown,
  getAllProducts,
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../sqlite-service';

interface DatabaseHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
  isDevelopment: boolean;
}

type Disposer = () => void;

export function registerDatabaseHandlers(options: DatabaseHandlersOptions) {
  const { logger, isDevelopment } = options;
  const disposers: Disposer[] = [];

  disposers.push(
    registerIpcHandler(IPCChannels.Db.GetCustomers, async (_event: IpcMainInvokeEvent, includeCustomFields?: boolean) => {
      try {
        if (isDevelopment) {
          logger.debug('[IPC] db:get-customers', { includeCustomFields });
        }
        return getAllCustomers(Boolean(includeCustomFields));
      } catch (error) {
        logger.error('IPC Error getting customers:', error);
        throw error;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.GetCustomersDropdown, async () => {
      try {
        if (isDevelopment) {
          logger.debug('[IPC] db:get-customers-dropdown invoked');
        }
        return getCustomersForDropdown();
      } catch (error) {
        logger.error('IPC Error getting customers for dropdown:', error);
        throw error;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.SearchCustomers, async (_event, args: any[] = []) => {
      try {
        const [query, limit = 20] = Array.isArray(args) ? args : [args];
        if (isDevelopment) {
          logger.debug('[IPC] db:search-customers', { query, limit });
        }
        const startTime = Date.now();
        const result = searchCustomers(query, limit);
        if (isDevelopment) {
          logger.debug('[IPC] db:search-customers result', { count: result.length, duration: Date.now() - startTime });
        }
        return result;
      } catch (error) {
        logger.error('IPC Error searching customers:', error);
        throw error;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.GetCustomer, async (_event, customerId: number) => {
      try {
        return getCustomerById(customerId);
      } catch (error) {
        logger.error(`IPC Error getting customer ${customerId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.CreateCustomer, async (_event, customerData: any) => {
      try {
        const customer = createCustomer(customerData);
        return { success: true, customer };
      } catch (error) {
        logger.error('IPC Error creating customer:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.UpdateCustomer, async (_event, payload: any) => {
      try {
        const updatedCustomer = updateCustomer(payload?.id, payload?.customerData);
        return { success: Boolean(updatedCustomer), customer: updatedCustomer };
      } catch (error) {
        logger.error('IPC Error updating customer:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.DeleteCustomer, async (_event, customerId: number) => {
      try {
        const result = deleteCustomer(customerId);
        return { success: result };
      } catch (error) {
        logger.error(`IPC Error deleting customer ${customerId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.GetDealsForCustomer, async (_event, customerId: number) => {
      try {
        return getDealsForCustomer(customerId);
      } catch (error) {
        logger.error(`IPC Error getting deals for customer ${customerId}:`, error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Db.GetTasksForCustomer, async (_event, customerId: number) => {
      try {
        return getTasksForCustomer(customerId);
      } catch (error) {
        logger.error(`IPC Error getting tasks for customer ${customerId}:`, error);
        return [];
      }
    }, { logger })
  );

  // --- Products ---
  disposers.push(
    registerIpcHandler(IPCChannels.Products.GetAll, async () => {
      try {
        return getAllProducts();
      } catch (error) {
        logger.error('IPC Error getting products:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Products.Search, async (_event, args: any = []) => {
      try {
        const [query = '', limit = 20] = Array.isArray(args) ? args : [args];
        return searchProducts(query, limit);
      } catch (error) {
        logger.error('IPC Error searching products:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Products.GetById, async (_event, productId: number) => {
      try {
        return getProductById(productId);
      } catch (error) {
        logger.error(`IPC Error getting product ${productId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Products.Create, async (_event, productData: any) => {
      try {
        const result = createProduct(productData);
        return { success: true, productId: result.lastInsertRowid };
      } catch (error) {
        logger.error('IPC Error creating product:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Products.Update, async (_event, payload: any) => {
      try {
        const { id, productData } = payload ?? {};
        const result = updateProduct(id, productData);
        return { success: result.changes > 0, changes: result.changes };
      } catch (error) {
        logger.error('IPC Error updating product:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPCChannels.Products.Delete, async (_event, productId: number) => {
      try {
        const result = deleteProduct(productId);
        return { success: result.changes > 0, changes: result.changes };
      } catch (error) {
        if ((error as Error).message?.includes('linked to one or more deals')) {
          return { success: false, error: 'Product is linked to existing deals and cannot be deleted.' };
        }
        logger.error(`IPC Error deleting product ${productId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
