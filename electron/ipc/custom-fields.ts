import { IPCChannels } from '@shared/ipc/channels';
import { registerIpcHandler } from './register';
import {
  getAllCustomFields,
  getActiveCustomFields,
  getCustomFieldById,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getCustomFieldValuesForCustomer,
  setCustomFieldValue,
  deleteCustomFieldValue,
} from '../sqlite-service';

interface CustomFieldHandlersOptions {
  logger: Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
}

type Disposer = () => void;

export function registerCustomFieldHandlers(options: CustomFieldHandlersOptions) {
  const { logger } = options;
  const disposers: Disposer[] = [];

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.GetAll, async () => {
    try {
      return getAllCustomFields();
    } catch (error) {
      logger.error('IPC Error getting custom fields:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.GetActive, async () => {
    try {
      return getActiveCustomFields();
    } catch (error) {
      logger.error('IPC Error getting active custom fields:', error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.GetById, async (_event, fieldId: number) => {
    try {
      return getCustomFieldById(fieldId);
    } catch (error) {
      logger.error(`IPC Error getting custom field ${fieldId}:`, error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.Create, async (_event, fieldData: any) => {
    try {
      const result = createCustomField(fieldData);
      return { success: true, field: result };
    } catch (error) {
      logger.error('IPC Error creating custom field:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.Update, async (_event, payload: any) => {
    try {
      const { id, fieldData } = payload ?? {};
      const result = updateCustomField(id, fieldData);
      return { success: true, field: result };
    } catch (error) {
      logger.error('IPC Error updating custom field:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.Delete, async (_event, fieldId: number) => {
    try {
      const result = deleteCustomField(fieldId);
      return { success: result };
    } catch (error) {
      logger.error('IPC Error deleting custom field:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.GetValuesForCustomer, async (_event, customerId: number) => {
    try {
      return getCustomFieldValuesForCustomer(customerId);
    } catch (error) {
      logger.error(`IPC Error getting custom field values for customer ${customerId}:`, error);
      throw error;
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.SetValue, async (_event, payload: any) => {
    try {
      const { customerId, fieldId, value } = payload ?? {};
      return setCustomFieldValue(customerId, fieldId, value);
    } catch (error) {
      logger.error('IPC Error setting custom field value:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  disposers.push(registerIpcHandler(IPCChannels.CustomFields.DeleteValue, async (_event, payload: any) => {
    try {
      const { customerId, fieldId } = payload ?? {};
      return deleteCustomFieldValue(customerId, fieldId);
    } catch (error) {
      logger.error('IPC Error deleting custom field value:', error);
      return { success: false, error: (error as Error).message };
    }
  }, { logger }));

  return () => {
    disposers.forEach((dispose) => dispose());
  };
}
