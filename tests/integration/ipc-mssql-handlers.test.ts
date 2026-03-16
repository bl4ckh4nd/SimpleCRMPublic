import { IPCChannels } from '../../shared/ipc/channels';

const handlers = new Map<string, any>();

jest.mock('../../electron/ipc/register', () => ({
  registerIpcHandler: jest.fn((channel: string, handler: unknown) => {
    handlers.set(channel, handler);
    return () => undefined;
  }),
}));

const keytarMocks = {
  saveMssqlSettingsWithKeytar: jest.fn(),
  getMssqlSettingsWithKeytar: jest.fn(),
  testConnectionWithKeytar: jest.fn(),
  clearMssqlPasswordFromKeytar: jest.fn(),
};

jest.mock('../../electron/mssql-keytar-service', () => keytarMocks);

jest.mock('../../electron/utils/ports', () => ({
  parsePort: jest.fn((port: any) => (port ? Number(port) : 1433)),
}));

import { registerMssqlHandlers } from '../../electron/ipc/mssql';

describe('registerMssqlHandlers', () => {
  beforeEach(() => {
    handlers.clear();
    Object.values(keytarMocks).forEach((fn) => fn.mockReset());
    registerMssqlHandlers({ logger: console, isDevelopment: false });
  });

  describe('Mssql.SaveSettings', () => {
    test('saves settings and returns success', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      const result = await handler({}, { server: 'localhost', port: '1433', database: 'CRM' });
      expect(result).toEqual({ success: true });
      expect(keytarMocks.saveMssqlSettingsWithKeytar).toHaveBeenCalledTimes(1);
    });

    test('returns error when save throws', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockRejectedValue(new Error('Keytar unavailable'));

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Keytar unavailable');
    });

    test('uses fallback message when save error has no message', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockRejectedValue(new Error(''));

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error during saveMssqlSettingsWithKeytar call');
    });

    test('handles missing payload gracefully', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      const result = await handler({}, undefined);
      expect(result).toEqual({ success: true });
    });
  });

  describe('Mssql.GetSettings', () => {
    test('returns settings from service', async () => {
      const settings = { server: 'localhost', database: 'CRM', port: 1433 };
      keytarMocks.getMssqlSettingsWithKeytar.mockResolvedValue(settings);

      const handler = handlers.get(IPCChannels.Mssql.GetSettings);
      const result = await handler({});
      expect(result).toEqual(settings);
    });

    test('returns null when no settings stored', async () => {
      keytarMocks.getMssqlSettingsWithKeytar.mockResolvedValue(null);

      const handler = handlers.get(IPCChannels.Mssql.GetSettings);
      const result = await handler({});
      expect(result).toBeNull();
    });

    test('returns error object when service throws', async () => {
      keytarMocks.getMssqlSettingsWithKeytar.mockRejectedValue(new Error('Store read failed'));

      const handler = handlers.get(IPCChannels.Mssql.GetSettings);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Store read failed');
    });

    test('uses fallback message when get error has no message', async () => {
      keytarMocks.getMssqlSettingsWithKeytar.mockRejectedValue(new Error(''));

      const handler = handlers.get(IPCChannels.Mssql.GetSettings);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve settings');
    });
  });

  describe('Mssql.TestConnection', () => {
    test('returns success when connection succeeds', async () => {
      keytarMocks.testConnectionWithKeytar.mockResolvedValue({ success: true });

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'localhost', port: '1433' });
      expect(result).toEqual({ success: true });
    });

    test('returns error details when connection fails', async () => {
      keytarMocks.testConnectionWithKeytar.mockResolvedValue({
        success: false,
        error: { userMessage: 'Cannot reach server', code: 'ECONNREFUSED' },
      });

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'unreachable' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot reach server');
      expect(result.errorDetails).toMatchObject({ code: 'ECONNREFUSED' });
    });

    test('uses fallback error when result.error has no userMessage', async () => {
      keytarMocks.testConnectionWithKeytar.mockResolvedValue({
        success: false,
        error: { code: 'UNKNOWN' },
      });

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test connection failed');
      expect(result.errorDetails).toMatchObject({ code: 'UNKNOWN' });
    });

    test('uses fallback when result.error is null', async () => {
      keytarMocks.testConnectionWithKeytar.mockResolvedValue({
        success: false,
        error: null,
      });

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test connection failed');
      expect(result.errorDetails).toBeNull();
    });

    test('returns error when service throws', async () => {
      keytarMocks.testConnectionWithKeytar.mockRejectedValue(new Error('Network timeout'));

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network timeout');
    });

    test('uses fallback message when thrown error has no message', async () => {
      keytarMocks.testConnectionWithKeytar.mockRejectedValue(new Error(''));

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      const result = await handler({}, { server: 'localhost' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test connection failed in main process');
    });
  });

  describe('Mssql.ClearPassword', () => {
    test('clears password and returns result', async () => {
      keytarMocks.clearMssqlPasswordFromKeytar.mockResolvedValue({ success: true });

      const handler = handlers.get(IPCChannels.Mssql.ClearPassword);
      const result = await handler({});
      expect(result).toEqual({ success: true });
      expect(keytarMocks.clearMssqlPasswordFromKeytar).toHaveBeenCalledTimes(1);
    });

    test('returns error when clear throws', async () => {
      keytarMocks.clearMssqlPasswordFromKeytar.mockRejectedValue(new Error('Keytar error'));

      const handler = handlers.get(IPCChannels.Mssql.ClearPassword);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('Keytar error');
    });

    test('uses fallback message when clear error has no message', async () => {
      keytarMocks.clearMssqlPasswordFromKeytar.mockRejectedValue(new Error(''));

      const handler = handlers.get(IPCChannels.Mssql.ClearPassword);
      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to clear password');
    });
  });

  test('registers all four handlers', () => {
    expect(handlers.has(IPCChannels.Mssql.SaveSettings)).toBe(true);
    expect(handlers.has(IPCChannels.Mssql.GetSettings)).toBe(true);
    expect(handlers.has(IPCChannels.Mssql.TestConnection)).toBe(true);
    expect(handlers.has(IPCChannels.Mssql.ClearPassword)).toBe(true);
  });

  describe('isDevelopment mode — sanitize debug logging paths', () => {
    beforeEach(() => {
      handlers.clear();
      Object.values(keytarMocks).forEach((fn) => fn.mockReset());
      registerMssqlHandlers({ logger: console, isDevelopment: true });
    });

    test('SaveSettings logs sanitized payload in dev mode', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      await handler({}, { server: 'localhost', user: 'admin', password: 'secret123', port: '1433' });

      expect(debugSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ user: expect.stringMatching(/\*+/), password: expect.stringMatching(/\*+/) })
      );
      debugSpy.mockRestore();
    });

    test('GetSettings logs sanitized settings in dev mode', async () => {
      keytarMocks.getMssqlSettingsWithKeytar.mockResolvedValue({ server: 'localhost', user: 'sa', password: 'pass' });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.GetSettings);
      await handler({});

      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('TestConnection logs sanitized payload in dev mode', async () => {
      keytarMocks.testConnectionWithKeytar.mockResolvedValue({ success: true });
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.TestConnection);
      await handler({}, { server: 'localhost', user: 'sa', password: 'x', port: '1433' });

      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('sanitize masks short password (≤2 chars) with all asterisks', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      await handler({}, { server: 'localhost', user: 'a', password: 'ab', port: '1433' });

      // Short password (≤2 chars) should be masked as all asterisks
      const debugCall = debugSpy.mock.calls.find((c: any[]) => c[1]?.password !== undefined);
      expect(debugCall?.[1].password).toBe('**');
      debugSpy.mockRestore();
    });

    test('sanitize handles null/undefined user and password', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      // No user or password in payload
      await handler({}, { server: 'localhost', port: '1433' });

      const debugCall = debugSpy.mock.calls.find((c: any[]) => c[1] !== undefined);
      expect(debugCall?.[1].user).toBeUndefined();
      expect(debugCall?.[1].password).toBeUndefined();
      debugSpy.mockRestore();
    });

    test('mask caps asterisks at 6 for long passwords (>8 chars)', async () => {
      keytarMocks.saveMssqlSettingsWithKeytar.mockResolvedValue(undefined);
      const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

      const handler = handlers.get(IPCChannels.Mssql.SaveSettings);
      // Long password: 'supersecret123' (14 chars) → first + 6 asterisks + last = 8 chars
      await handler({}, { server: 'localhost', user: 'admin', password: 'supersecret123', port: '1433' });

      const debugCall = debugSpy.mock.calls.find((c: any[]) => c[1]?.password !== undefined);
      // first char 's' + 6 asterisks + last char '3' = 's******3'
      expect(debugCall?.[1].password).toBe('s******3');
      debugSpy.mockRestore();
    });
  });
});
