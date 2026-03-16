// Mock electron before any imports
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  app: { getPath: jest.fn(() => '/tmp/test-user-data') },
}));

const sqliteMocks = {
  getSyncInfo: jest.fn(),
  setSyncInfo: jest.fn(),
  getDb: jest.fn(),
  upsertProduct: jest.fn(),
  upsertJtlFirma: jest.fn(),
  upsertJtlWarenlager: jest.fn(),
  upsertJtlZahlungsart: jest.fn(),
  upsertJtlVersandart: jest.fn(),
};

jest.mock('../../electron/sqlite-service', () => sqliteMocks);

const mssqlMocks = {
  fetchJtlCustomers: jest.fn(),
  fetchJtlProducts: jest.fn(),
  fetchJtlFirmen: jest.fn(),
  fetchJtlWarenlager: jest.fn(),
  fetchJtlZahlungsarten: jest.fn(),
  fetchJtlVersandarten: jest.fn(),
};

jest.mock('../../electron/mssql-keytar-service', () => mssqlMocks);

import { runSync, getLastSyncStatus, initializeSyncService } from '../../electron/sync-service';

const mockWebContents = { send: jest.fn() };
const mockWindow = {
  webContents: mockWebContents,
  isDestroyed: jest.fn(() => false),
};

function makeDbMock() {
  const stmtMock = { run: jest.fn() };
  const transactionFn = jest.fn((fn: Function) => fn); // transaction returns the same fn
  return {
    prepare: jest.fn(() => stmtMock),
    transaction: transactionFn,
    _stmt: stmtMock,
  };
}

describe('sync-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the isSyncing flag between tests by ensuring runSync always finishes
    sqliteMocks.getSyncInfo.mockReturnValue('Never');
    sqliteMocks.setSyncInfo.mockReturnValue(undefined);
    sqliteMocks.upsertProduct.mockReturnValue(undefined);
    sqliteMocks.upsertJtlFirma.mockReturnValue(undefined);
    sqliteMocks.upsertJtlWarenlager.mockReturnValue(undefined);
    sqliteMocks.upsertJtlZahlungsart.mockReturnValue(undefined);
    sqliteMocks.upsertJtlVersandart.mockReturnValue(undefined);
  });

  describe('getLastSyncStatus', () => {
    test('returns status, message, and timestamp from DB', async () => {
      sqliteMocks.getSyncInfo
        .mockReturnValueOnce('Success')
        .mockReturnValueOnce('Sync completed')
        .mockReturnValueOnce('2026-03-01T10:00:00.000Z');

      const result = await getLastSyncStatus();
      expect(result).toEqual({
        status: 'Success',
        message: 'Sync completed',
        timestamp: '2026-03-01T10:00:00.000Z',
      });
    });

    test('returns Unknown status when getSyncInfo returns empty', async () => {
      sqliteMocks.getSyncInfo.mockReturnValue('');

      const result = await getLastSyncStatus();
      expect(result.status).toBe('Unknown');
      expect(result.message).toBe('');
      expect(result.timestamp).toBe('');
    });

    test('returns error status when getSyncInfo throws', async () => {
      sqliteMocks.getSyncInfo.mockImplementation(() => { throw new Error('DB read error'); });

      const result = await getLastSyncStatus();
      expect(result.status).toBe('Error');
      expect(result.message).toContain('Failed to retrieve');
    });
  });

  describe('initializeSyncService', () => {
    test('sets initial status when lastSyncStatus is empty', () => {
      sqliteMocks.getSyncInfo.mockReturnValue('');

      initializeSyncService();

      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith('lastSyncStatus', 'Never');
      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith('lastSyncMessage', 'Sync has not been run yet.');
    });

    test('does not overwrite existing status', () => {
      sqliteMocks.getSyncInfo.mockReturnValue('Success');

      initializeSyncService();

      expect(sqliteMocks.setSyncInfo).not.toHaveBeenCalled();
    });

    test('handles DB error gracefully', () => {
      sqliteMocks.getSyncInfo.mockImplementation(() => { throw new Error('DB error'); });

      expect(() => initializeSyncService()).not.toThrow();
    });
  });

  describe('runSync', () => {
    function setupSuccessfulSync() {
      const dbMock = makeDbMock();
      sqliteMocks.getDb.mockReturnValue(dbMock);
      mssqlMocks.fetchJtlCustomers.mockResolvedValue([]);
      mssqlMocks.fetchJtlProducts.mockResolvedValue([]);
      mssqlMocks.fetchJtlFirmen.mockResolvedValue([]);
      mssqlMocks.fetchJtlWarenlager.mockResolvedValue([]);
      mssqlMocks.fetchJtlZahlungsarten.mockResolvedValue([]);
      mssqlMocks.fetchJtlVersandarten.mockResolvedValue([]);
      return dbMock;
    }

    test('returns success when sync completes with empty data', async () => {
      setupSuccessfulSync();

      const result = await runSync(mockWindow as any);
      expect(result.success).toBe(true);
    });

    test('sends status updates to main window', async () => {
      setupSuccessfulSync();

      await runSync(mockWindow as any);

      expect(mockWebContents.send).toHaveBeenCalledWith(
        'sync:status-update',
        expect.objectContaining({ status: 'Running' })
      );
      expect(mockWebContents.send).toHaveBeenCalledWith(
        'sync:status-update',
        expect.objectContaining({ status: 'Success' })
      );
    });

    test('does not crash when mainWindow is null', async () => {
      setupSuccessfulSync();

      const result = await runSync(null);
      expect(result.success).toBe(true);
    });

    test('returns error when MSSQL fetch fails', async () => {
      sqliteMocks.getDb.mockReturnValue(makeDbMock());
      mssqlMocks.fetchJtlCustomers.mockRejectedValue(new Error('MSSQL connection refused'));
      mssqlMocks.fetchJtlProducts.mockResolvedValue([]);
      mssqlMocks.fetchJtlFirmen.mockResolvedValue([]);
      mssqlMocks.fetchJtlWarenlager.mockResolvedValue([]);
      mssqlMocks.fetchJtlZahlungsarten.mockResolvedValue([]);
      mssqlMocks.fetchJtlVersandarten.mockResolvedValue([]);

      const result = await runSync(null);
      expect(result.success).toBe(false);
      expect(result.message).toContain('MSSQL connection refused');
    });

    test('prevents concurrent sync runs', async () => {
      setupSuccessfulSync();

      // Start first sync but don't await
      const first = runSync(null);
      // Start second sync immediately
      const second = runSync(null);

      const [firstResult, secondResult] = await Promise.all([first, second]);
      // At least one should report already-in-progress
      const results = [firstResult, secondResult];
      const skipped = results.find((r) => r.message?.includes('Sync already in progress'));
      expect(skipped).toBeDefined();
    });

    test('saves sync status to DB on success', async () => {
      setupSuccessfulSync();

      await runSync(null);

      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith('lastSyncStatus', 'Success');
    });

    test('saves Error status to DB on failure', async () => {
      sqliteMocks.getDb.mockReturnValue(makeDbMock());
      mssqlMocks.fetchJtlCustomers.mockRejectedValue(new Error('Network error'));
      mssqlMocks.fetchJtlProducts.mockResolvedValue([]);
      mssqlMocks.fetchJtlFirmen.mockResolvedValue([]);
      mssqlMocks.fetchJtlWarenlager.mockResolvedValue([]);
      mssqlMocks.fetchJtlZahlungsarten.mockResolvedValue([]);
      mssqlMocks.fetchJtlVersandarten.mockResolvedValue([]);

      await runSync(null);

      expect(sqliteMocks.setSyncInfo).toHaveBeenCalledWith('lastSyncStatus', 'Error');
    });
  });
});
