import { IPCChannels, AllowedInvokeChannels, DeprecatedInvokeChannels } from '../../shared/ipc/channels';
import { getPayloadSchema, getResultSchema, isDeprecatedChannel } from '../../shared/ipc/schemas';

describe('IPC contracts', () => {
  test('contains key invoke channels', () => {
    expect(AllowedInvokeChannels).toContain(IPCChannels.Deals.AddProduct);
    expect(AllowedInvokeChannels).toContain(IPCChannels.Mssql.TestConnection);
    expect(DeprecatedInvokeChannels).toContain(IPCChannels.Deals.UpdateProductQuantityLegacy);
  });

  test('validates deal payload schemas', () => {
    const addPayload = {
      dealId: 1,
      productId: 2,
      quantity: 1,
      price: 19.99,
    };
    expect(() => getPayloadSchema(IPCChannels.Deals.AddProduct).parse(addPayload)).not.toThrow();
    expect(() =>
      getPayloadSchema(IPCChannels.Deals.RemoveProduct).parse({ dealId: 1 })
    ).toThrow();
  });

  test('marks deprecated channels and supports result schema', () => {
    expect(isDeprecatedChannel(IPCChannels.Deals.UpdateProductQuantityLegacy)).toBe(true);
    expect(() =>
      getResultSchema(IPCChannels.Mssql.TestConnection).parse({ success: false, error: 'boom' })
    ).not.toThrow();
  });

  test('FollowUp channels are in AllowedInvokeChannels', () => {
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.GetItems);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.GetQueueCounts);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.SnoozeTask);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.LogActivity);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.GetTimeline);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.GetSavedViews);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.CreateSavedView);
    expect(AllowedInvokeChannels).toContain(IPCChannels.FollowUp.DeleteSavedView);
  });

  test('FollowUp channels have registered payload and result schemas', () => {
    const followUpChannels = Object.values(IPCChannels.FollowUp);
    for (const channel of followUpChannels) {
      expect(() => getPayloadSchema(channel as any)).not.toThrow();
      expect(() => getResultSchema(channel as any)).not.toThrow();
    }
  });

  test('FollowUp.SnoozeTask payload validates required fields', () => {
    expect(() =>
      getPayloadSchema(IPCChannels.FollowUp.SnoozeTask).parse({ taskId: 1, snoozedUntil: '2026-03-20' })
    ).not.toThrow();
    expect(() =>
      getPayloadSchema(IPCChannels.FollowUp.SnoozeTask).parse({})
    ).toThrow();
  });

  test('FollowUp.CreateSavedView payload validates required fields', () => {
    expect(() =>
      getPayloadSchema(IPCChannels.FollowUp.CreateSavedView).parse({ name: 'My View', filters: '{}' })
    ).not.toThrow();
    expect(() =>
      getPayloadSchema(IPCChannels.FollowUp.CreateSavedView).parse({ name: 'My View' })
    ).toThrow();
  });
});
