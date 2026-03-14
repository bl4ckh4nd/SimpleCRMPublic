import { parsePort } from '../../electron/utils/ports';

describe('parsePort', () => {
  test('parses valid number and string inputs', () => {
    expect(parsePort(1433)).toBe(1433);
    expect(parsePort('1433')).toBe(1433);
    expect(parsePort(' 1433 ')).toBe(1433);
  });

  test('returns undefined for invalid inputs', () => {
    expect(parsePort(undefined)).toBeUndefined();
    expect(parsePort(null)).toBeUndefined();
    expect(parsePort('')).toBeUndefined();
    expect(parsePort('abc')).toBeUndefined();
    expect(parsePort(0)).toBeUndefined();
    expect(parsePort(70000)).toBeUndefined();
  });
});
