import { getFriendlyMssqlError } from '../../shared/errors/mssql';

describe('getFriendlyMssqlError', () => {
  test('maps known connection timeout error', () => {
    const parsed = getFriendlyMssqlError({ message: 'ETIMEOUT', code: 'ETIMEOUT' }, 'de');
    expect(parsed.title).toContain('Timeout');
    expect(parsed.category).toBe('timeout');
    expect(parsed.severity).toBe('medium');
  });

  test('maps login failure by error number signature', () => {
    const parsed = getFriendlyMssqlError('Login failed for user. number: 18456', 'de');
    expect(parsed.category).toBe('authentication');
    expect(parsed.title).toContain('Anmeldung');
  });

  test('falls back to unknown category', () => {
    const parsed = getFriendlyMssqlError('completely unknown failure', 'de');
    expect(parsed.category).toBe('unknown');
    expect(parsed.code).toBeDefined();
  });
});
