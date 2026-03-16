import { getFriendlyMssqlError } from '../../shared/errors/mssql';

describe('getFriendlyMssqlError', () => {
  // --- Input type branches ---

  test('handles plain string error (string branch)', () => {
    const parsed = getFriendlyMssqlError('Connection timed out ETIMEOUT', 'de');
    expect(parsed.originalMessage).toBe('Connection timed out ETIMEOUT');
    // message-scan loop picks up ETIMEOUT from string
    expect(parsed.category).toBe('timeout');
  });

  test('handles object with message and code (non-Error object branch)', () => {
    const parsed = getFriendlyMssqlError({ message: 'connect ECONNREFUSED', code: 'ECONNREFUSED' }, 'de');
    expect(parsed.category).toBe('network');
    expect(parsed.code).toBe('ECONNREFUSED');
  });

  test('falls back to unknown category for unrecognized error', () => {
    const parsed = getFriendlyMssqlError('completely unknown failure', 'de');
    expect(parsed.category).toBe('unknown');
    expect(parsed.code).toBeDefined();
  });

  test('handles null input with fallback title', () => {
    const parsed = getFriendlyMssqlError(null, 'de');
    expect(parsed.title).toContain('Verbindungsfehler');
    expect(parsed.category).toBe('unknown');
  });

  test('handles non-object input (number) with fallback', () => {
    const parsed = getFriendlyMssqlError(42 as any, 'de');
    expect(parsed.category).toBe('unknown');
  });

  // --- All MSSQL_ERROR_MAP keys ---

  test('maps ETIMEOUT code to timeout category', () => {
    const parsed = getFriendlyMssqlError({ message: 'timeout', code: 'ETIMEOUT' }, 'de');
    expect(parsed.title).toContain('Timeout');
    expect(parsed.category).toBe('timeout');
    expect(parsed.severity).toBe('medium');
  });

  test('maps ECONNREFUSED code to network category with high severity', () => {
    const parsed = getFriendlyMssqlError({ message: 'refused', code: 'ECONNREFUSED' }, 'de');
    expect(parsed.category).toBe('network');
    expect(parsed.severity).toBe('high');
    expect(parsed.docsUrl).toBeDefined();
  });

  test('maps ELOGIN code to authentication category', () => {
    const parsed = getFriendlyMssqlError({ message: 'login failed', code: 'ELOGIN' }, 'de');
    expect(parsed.category).toBe('authentication');
    expect(parsed.title).toContain('Anmeldefehler');
  });

  test('maps ENETUNREACH code to network category', () => {
    const parsed = getFriendlyMssqlError({ message: 'unreachable', code: 'ENETUNREACH' }, 'de');
    expect(parsed.category).toBe('network');
    expect(parsed.title).toContain('Netzwerk');
  });

  test('maps ESOCKET code to network category with medium severity', () => {
    const parsed = getFriendlyMssqlError({ message: 'socket error', code: 'ESOCKET' }, 'de');
    expect(parsed.category).toBe('network');
    expect(parsed.severity).toBe('medium');
  });

  test('maps login failure by error number 18456 in message', () => {
    const parsed = getFriendlyMssqlError('Login failed for user. number: 18456', 'de');
    expect(parsed.category).toBe('authentication');
    expect(parsed.title).toContain('Anmeldung');
  });

  test('maps database not found by error number 4060 in message', () => {
    const parsed = getFriendlyMssqlError({ message: 'Cannot open database "CRM". number: 4060', code: undefined }, 'de');
    expect(parsed.category).toBe('database');
    expect(parsed.title).toContain('Datenbank');
  });

  test('maps SSL certificate error by message content', () => {
    const parsed = getFriendlyMssqlError({ message: 'ssl certificate verify failed', code: undefined }, 'de');
    expect(parsed.category).toBe('ssl');
    expect(parsed.title).toContain('SSL');
  });

  test('maps certificate error (alternative spelling)', () => {
    const parsed = getFriendlyMssqlError({ message: 'Unable to verify the certificate', code: undefined }, 'de');
    expect(parsed.category).toBe('ssl');
  });

  test('maps PORT_NOT_FOUND by message content', () => {
    const parsed = getFriendlyMssqlError({ message: 'Port for MSSQLSERVER not found in instance list', code: undefined }, 'de');
    expect(parsed.category).toBe('configuration');
    expect(parsed.title).toContain('Port');
  });

  // --- Language switching ---

  test('returns English title when lang is "en"', () => {
    const parsed = getFriendlyMssqlError({ message: 'timeout', code: 'ETIMEOUT' }, 'en');
    expect(parsed.title).toBe('Connection Timeout');
    expect(parsed.description).toContain('The server did not respond');
  });

  test('returns English fallback title for unknown error when lang is "en"', () => {
    const parsed = getFriendlyMssqlError('unknown glitch', 'en');
    expect(parsed.title).toBe('Connection Error');
    expect(parsed.description).toContain('Could not connect');
  });

  test('returns German title by default (no lang param)', () => {
    const parsed = getFriendlyMssqlError({ message: 'x', code: 'ECONNREFUSED' });
    expect(parsed.title).toContain('Verbindung');
  });

  // --- Message-scan loop (no code field, picks up key from message text) ---

  test('matches error code from message text when no .code field present', () => {
    // No code property — scan loop finds 'ECONNREFUSED' in message string
    const parsed = getFriendlyMssqlError({ message: 'connect ECONNREFUSED 127.0.0.1:1433' }, 'de');
    expect(parsed.category).toBe('network');
  });

  // --- Error number re-assignment guard ---

  test('known errorCode takes precedence over number: 18456 in message', () => {
    // ETIMEOUT is already recognized → 18456 should NOT override it
    const parsed = getFriendlyMssqlError({ message: 'timeout number: 18456', code: 'ETIMEOUT' }, 'de');
    expect(parsed.category).toBe('timeout');
  });

  // --- Actionable advice ---

  test('includes actionable advice for known errors', () => {
    const parsed = getFriendlyMssqlError({ message: 'refused', code: 'ECONNREFUSED' }, 'de');
    expect(parsed.actionableAdvice).toBeTruthy();
    expect(parsed.actionableAdvice).toContain('Überprüfen');
  });

  test('returns undefined actionableAdvice for errors without advice (ENETUNREACH)', () => {
    const parsed = getFriendlyMssqlError({ message: 'x', code: 'ENETUNREACH' }, 'de');
    expect(parsed.actionableAdvice).toBeUndefined();
  });

  // --- err.name branch (lines 151-152) + errorName map lookup (line 194) ---

  test('uses error name as fallback key when no code but name matches error map', () => {
    // Object with .name (not .code) matching MSSQL_ERROR_MAP key → err.name branch + matchedDetailKey=errorName
    const parsed = getFriendlyMssqlError({ message: 'some unrecognized text', name: 'ETIMEOUT' }, 'de');
    expect(parsed.category).toBe('timeout');
    expect(parsed.title).toContain('Timeout');
  });
});
