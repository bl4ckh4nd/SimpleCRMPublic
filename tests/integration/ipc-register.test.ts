const removeHandler = jest.fn();
const handle = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    removeHandler,
    handle,
  },
}));

jest.mock('../../shared/ipc/schemas', () => ({
  getPayloadSchema: jest.fn(() => ({ safeParse: (v: unknown) => ({ success: true, data: v }) })),
  getResultSchema: jest.fn(() => ({ safeParse: (v: unknown) => ({ success: true, data: v }) })),
  isDeprecatedChannel: jest.fn(() => false),
}));

import { IPCChannels } from '../../shared/ipc/channels';
import { registerIpcHandler } from '../../electron/ipc/register';

const schemasMock = jest.requireMock('../../shared/ipc/schemas') as {
  getPayloadSchema: jest.Mock;
  getResultSchema: jest.Mock;
  isDeprecatedChannel: jest.Mock;
};

describe('registerIpcHandler', () => {
  beforeEach(() => {
    removeHandler.mockClear();
    handle.mockClear();
    // Use a schema WITH _def.typeName set so parseWithSchema takes the safeParse path (not ZodAny bypass)
    const passThroughSchema = { _def: { typeName: 'ZodObject' }, safeParse: (v: unknown) => ({ success: true, data: v }) };
    schemasMock.getPayloadSchema.mockReturnValue(passThroughSchema);
    schemasMock.getResultSchema.mockReturnValue(passThroughSchema);
    schemasMock.isDeprecatedChannel.mockReturnValue(false);
  });

  test('registers wrapped ipc handler and returns disposer', async () => {
    const disposer = registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async (_event, payload) => ({ success: true, payload }),
      { logger: console }
    );

    expect(removeHandler).toHaveBeenCalledWith(IPCChannels.Tasks.GetAll);
    expect(handle).toHaveBeenCalledTimes(1);

    const wrapped = handle.mock.calls[0][1];
    const response = await wrapped({}, { limit: 10 });
    expect(response).toEqual({ success: true, payload: { limit: 10 } });

    disposer();
    expect(removeHandler).toHaveBeenCalledWith(IPCChannels.Tasks.GetAll);
  });

  test('throws when payload schema validation fails', async () => {
    const zodError = new Error('Payload invalid');
    schemasMock.getPayloadSchema.mockReturnValue({
      _def: { typeName: 'ZodObject' },
      safeParse: () => ({ success: false, error: zodError }),
    });

    registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async () => ({ success: true }),
      { logger: console }
    );

    const wrapped = handle.mock.calls[0][1];
    await expect(wrapped({}, { bad: 'data' })).rejects.toThrow('Payload invalid');
  });

  test('throws when result schema validation fails', async () => {
    const zodError = new Error('Result invalid');
    schemasMock.getResultSchema.mockReturnValue({
      _def: { typeName: 'ZodObject' },
      safeParse: () => ({ success: false, error: zodError }),
    });

    registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async () => ({ success: true }),
      { logger: console }
    );

    const wrapped = handle.mock.calls[0][1];
    await expect(wrapped({}, {})).rejects.toThrow('Result invalid');
  });

  test('skips validation when payload schema is null/falsy', async () => {
    // When schema is null/undefined, parseWithSchema passes through the value as-is
    schemasMock.getPayloadSchema.mockReturnValue(null);
    schemasMock.getResultSchema.mockReturnValue({ safeParse: (v: unknown) => ({ success: true, data: v }) });

    registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async (_event, payload) => payload,
      { logger: console }
    );

    const wrapped = handle.mock.calls[0][1];
    const result = await wrapped({}, { anything: true });
    expect(result).toEqual({ anything: true });
  });

  test('skips validation when result schema is null/falsy', async () => {
    // When result schema is null, result passes through without validation
    schemasMock.getResultSchema.mockReturnValue(null);

    registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async () => ({ arbitrary: 'data' }),
      { logger: console }
    );

    const wrapped = handle.mock.calls[0][1];
    const result = await wrapped({}, {});
    expect(result).toEqual({ arbitrary: 'data' });
  });

  test('calls onDeprecatedUse callback for deprecated channels', async () => {
    schemasMock.isDeprecatedChannel.mockReturnValue(true);
    const onDeprecatedUse = jest.fn();

    registerIpcHandler(
      IPCChannels.Tasks.GetAll,
      async () => ({ success: true }),
      { logger: console, onDeprecatedUse }
    );

    const wrapped = handle.mock.calls[0][1];
    await wrapped({}, {});
    expect(onDeprecatedUse).toHaveBeenCalledWith(IPCChannels.Tasks.GetAll);
  });
});
