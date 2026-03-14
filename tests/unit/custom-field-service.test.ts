import { IPCChannels } from '@shared/ipc/channels';
import { customFieldService } from '@/services/data/customFieldService';

describe('customFieldService', () => {
  const invoke = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { invoke },
    });
  });

  test('maps boolean flags from backend fields', async () => {
    invoke.mockResolvedValueOnce([
      { id: 1, name: 'vip', label: 'VIP', type: 'boolean', required: 1, active: 0 },
    ]);
    const result = await customFieldService.getAllCustomFields();
    expect(result[0].required).toBe(true);
    expect(result[0].active).toBe(false);
  });

  test('returns empty array on load error', async () => {
    invoke.mockRejectedValueOnce(new Error('boom'));
    await expect(customFieldService.getActiveCustomFields()).resolves.toEqual([]);
  });

  test('creates and deletes fields through IPC', async () => {
    invoke
      .mockResolvedValueOnce({ success: true, field: { id: 3, name: 'x' } })
      .mockResolvedValueOnce({ success: true });
    const created = await customFieldService.createCustomField({
      name: 'x',
      label: 'X',
      type: 'text',
      required: false,
      display_order: 0,
      active: true,
    } as any);
    const deleted = await customFieldService.deleteCustomField(3);
    expect(created).toEqual({ id: 3, name: 'x' });
    expect(deleted).toBe(true);
    expect(invoke).toHaveBeenCalledWith(IPCChannels.CustomFields.Delete, 3);
  });

  test('parses option JSON defensively', () => {
    expect(customFieldService.parseOptions('[{"value":"a","label":"A"}]')).toEqual([{ value: 'a', label: 'A' }]);
    expect(customFieldService.parseOptions('not-json')).toEqual([]);
    expect(customFieldService.parseOptions(undefined)).toEqual([]);
  });
});
