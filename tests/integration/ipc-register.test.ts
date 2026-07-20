const removeHandler = jest.fn();
const handle = jest.fn();

jest.mock('electron', () => ({ ipcMain: { removeHandler, handle } }));

import { IPC } from '../../shared/ipc/channels';
import { registerIpcHandler } from '../../electron/ipc/register';

describe('registerIpcHandler', () => {
  beforeEach(() => {
    removeHandler.mockClear();
    handle.mockClear();
  });

  test('registers the endpoint channel, validates output, and disposes it', async () => {
    const dispose = registerIpcHandler(IPC.Window.GetState, async () => ({ isMaximized: false, isFullScreen: true }));

    expect(removeHandler).toHaveBeenCalledWith(IPC.Window.GetState.channel);
    const wrapped = handle.mock.calls[0][1];
    await expect(wrapped({}, undefined)).resolves.toEqual({ isMaximized: false, isFullScreen: true });

    dispose();
    expect(removeHandler).toHaveBeenLastCalledWith(IPC.Window.GetState.channel);
  });

  test('rejects an invalid payload before calling the handler', async () => {
    const handler = jest.fn();
    registerIpcHandler(IPC.Tasks.GetById, handler);
    const wrapped = handle.mock.calls[0][1];

    await expect(wrapped({}, -1)).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  test('rejects an invalid handler result', async () => {
    registerIpcHandler(IPC.Window.GetState, async () => ({ isMaximized: 'no' } as never));
    const wrapped = handle.mock.calls[0][1];
    await expect(wrapped({}, undefined)).rejects.toThrow();
  });

  test('rejects more than one payload argument', async () => {
    registerIpcHandler(IPC.Update.GetStatus, async () => ({}));
    const wrapped = handle.mock.calls[0][1];
    await expect(wrapped({}, {}, {})).rejects.toThrow('accepts one payload argument');
  });
});
