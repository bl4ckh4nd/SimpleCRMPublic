import { IpcMainInvokeEvent } from 'electron';
import { IPC } from '../../shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomers,
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
    registerIpcHandler(IPC.Db.GetCustomers, async (_event: IpcMainInvokeEvent, { includeCustomFields }) => {
      try {
        if (isDevelopment) {
          logger.debug('[IPC] db:get-customers', { includeCustomFields });
        }
        return getAllCustomers(includeCustomFields);
      } catch (error) {
        logger.error('IPC Error getting customers:', error);
        throw error;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Db.GetCustomersDropdown, async () => {
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
    registerIpcHandler(IPC.Db.SearchCustomers, async (_event: IpcMainInvokeEvent, { query, limit = 20 }) => {
      try {
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
    registerIpcHandler(IPC.Db.GetCustomer, async (_event, customerId: number) => {
      try {
        return getCustomerById(customerId);
      } catch (error) {
        logger.error(`IPC Error getting customer ${customerId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Db.CreateCustomer, async (_event, customerData) => {
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
    registerIpcHandler(IPC.Db.UpdateCustomer, async (_event, payload) => {
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
    registerIpcHandler(IPC.Db.DeleteCustomer, async (_event, customerId: number) => {
      try {
        return deleteCustomers([customerId]);
      } catch (error) {
        logger.error(`IPC Error deleting customer ${customerId}:`, error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Db.DeleteCustomers, async (_event, { customerIds }) => {
      try {
        return deleteCustomers(customerIds);
      } catch (error) {
        logger.error('IPC Error deleting customers:', error);
        return { success: false, error: (error as Error).message };
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Db.GetDealsForCustomer, async (_event, customerId: number) => {
      try {
        return getDealsForCustomer(customerId);
      } catch (error) {
        logger.error(`IPC Error getting deals for customer ${customerId}:`, error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Db.GetTasksForCustomer, async (_event, customerId: number) => {
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
    registerIpcHandler(IPC.Products.GetAll, async () => {
      try {
        return getAllProducts();
      } catch (error) {
        logger.error('IPC Error getting products:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Products.Search, async (_event: IpcMainInvokeEvent, { query, limit = 20 }) => {
      try {
        return searchProducts(query, limit);
      } catch (error) {
        logger.error('IPC Error searching products:', error);
        return [];
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Products.GetById, async (_event, productId: number) => {
      try {
        return getProductById(productId);
      } catch (error) {
        logger.error(`IPC Error getting product ${productId}:`, error);
        return null;
      }
    }, { logger })
  );

  disposers.push(
    registerIpcHandler(IPC.Products.Create, async (_event, productData) => {
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
    registerIpcHandler(IPC.Products.Update, async (_event, payload) => {
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
    registerIpcHandler(IPC.Products.Delete, async (_event, productId: number) => {
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
