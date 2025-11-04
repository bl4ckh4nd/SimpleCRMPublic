import { CustomField, CustomFieldValue, CustomFieldOption } from './types';
import { IPCChannels } from '@shared/ipc/channels';

// Define interfaces for IPC responses
interface SuccessResponse {
  success: boolean;
  error?: string;
}

interface CustomFieldResponse extends SuccessResponse {
  field: CustomField;
}

/**
 * Custom Field Service - Handles communication with the SQLite database through Electron IPC
 */
export const customFieldService = {
  /**
   * Fetch all custom fields
   */
  async getAllCustomFields(): Promise<CustomField[]> {
    try {
      const fields = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.GetAll>(
        IPCChannels.CustomFields.GetAll
      ) as CustomField[];
      return fields.map(field => ({
        ...field,
        required: Boolean(field.required),
        active: Boolean(field.active)
      }));
    } catch (error) {
      console.error('Failed to fetch custom fields:', error);
      return [];
    }
  },

  /**
   * Fetch only active custom fields
   */
  async getActiveCustomFields(): Promise<CustomField[]> {
    try {
      console.log(`🔍 [Frontend] customFieldService.getActiveCustomFields() called`);
      console.log(`🔍 [Frontend] CustomFieldService call stack:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));
      
      const fields = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.GetActive>(
        IPCChannels.CustomFields.GetActive
      ) as CustomField[];
      console.log(`🔍 [Frontend] customFieldService received ${fields.length} active fields`);
      
      const result = fields.map(field => ({
        ...field,
        required: Boolean(field.required),
        active: Boolean(field.active)
      }));
      
      console.log(`🔍 [Frontend] customFieldService returning ${result.length} formatted fields`);
      return result;
    } catch (error) {
      console.error('Failed to fetch active custom fields:', error);
      return [];
    }
  },

  /**
   * Get a single custom field by ID
   */
  async getCustomFieldById(fieldId: number): Promise<CustomField | null> {
    try {
      const field = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.GetById>(
        IPCChannels.CustomFields.GetById,
        fieldId
      ) as CustomField;
      if (!field) return null;

      return {
        ...field,
        required: Boolean(field.required),
        active: Boolean(field.active)
      };
    } catch (error) {
      console.error(`Failed to fetch custom field with ID ${fieldId}:`, error);
      return null;
    }
  },

  /**
   * Create a new custom field
   */
  async createCustomField(fieldData: Omit<CustomField, 'id' | 'created_at' | 'updated_at'>): Promise<CustomField | null> {
    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.Create>(
        IPCChannels.CustomFields.Create,
        fieldData
      ) as CustomFieldResponse;
      if (result.success) {
        return result.field;
      }
      return null;
    } catch (error) {
      console.error('Failed to create custom field:', error);
      return null;
    }
  },

  /**
   * Update an existing custom field
   */
  async updateCustomField(fieldId: number, fieldData: Partial<CustomField>): Promise<CustomField | null> {
    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.Update>(
        IPCChannels.CustomFields.Update,
        { id: fieldId, fieldData }
      ) as CustomFieldResponse;
      if (result.success) {
        return result.field;
      }
      return null;
    } catch (error) {
      console.error(`Failed to update custom field with ID ${fieldId}:`, error);
      return null;
    }
  },

  /**
   * Delete a custom field
   */
  async deleteCustomField(fieldId: number): Promise<boolean> {
    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.Delete>(
        IPCChannels.CustomFields.Delete,
        fieldId
      ) as SuccessResponse;
      return result.success;
    } catch (error) {
      console.error(`Failed to delete custom field with ID ${fieldId}:`, error);
      return false;
    }
  },

  /**
   * Get custom field values for a specific customer
   */
  async getCustomFieldValuesForCustomer(customerId: number): Promise<CustomFieldValue[]> {
    try {
      const values = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.GetValuesForCustomer>(
        IPCChannels.CustomFields.GetValuesForCustomer,
        customerId
      ) as CustomFieldValue[];
      return values;
    } catch (error) {
      console.error(`Failed to fetch custom field values for customer ${customerId}:`, error);
      return [];
    }
  },

  /**
   * Set a custom field value for a customer
   */
  async setCustomFieldValue(customerId: number, fieldId: number, value: any): Promise<boolean> {
    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.SetValue>(
        IPCChannels.CustomFields.SetValue,
        { customerId, fieldId, value }
      ) as SuccessResponse;
      return result.success;
    } catch (error) {
      console.error(`Failed to set custom field value for customer ${customerId}, field ${fieldId}:`, error);
      return false;
    }
  },

  /**
   * Delete a custom field value
   */
  async deleteCustomFieldValue(customerId: number, fieldId: number): Promise<boolean> {
    try {
      const result = await window.electronAPI.invoke<typeof IPCChannels.CustomFields.DeleteValue>(
        IPCChannels.CustomFields.DeleteValue,
        { customerId, fieldId }
      ) as SuccessResponse;
      return result.success;
    } catch (error) {
      console.error(`Failed to delete custom field value for customer ${customerId}, field ${fieldId}:`, error);
      return false;
    }
  },

  /**
   * Parse options string to array of options
   */
  parseOptions(optionsString: string | undefined): CustomFieldOption[] {
    if (!optionsString) return [];

    try {
      return JSON.parse(optionsString);
    } catch (error) {
      console.error('Failed to parse options string:', error);
      return [];
    }
  }
};
