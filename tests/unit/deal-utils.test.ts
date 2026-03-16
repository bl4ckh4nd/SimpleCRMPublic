import { getDealStageColor, formatCurrency, formatDate } from '@/types/deal';

describe('getDealStageColor', () => {
  test('"Gewonnen" returns "default"', () => {
    expect(getDealStageColor('Gewonnen')).toBe('default');
  });

  test('"Abgeschlossen Gewonnen" returns "default"', () => {
    expect(getDealStageColor('Abgeschlossen Gewonnen')).toBe('default');
  });

  test('"Verloren" returns "destructive"', () => {
    expect(getDealStageColor('Verloren')).toBe('destructive');
  });

  test('"Abgeschlossen Verloren" returns "destructive"', () => {
    expect(getDealStageColor('Abgeschlossen Verloren')).toBe('destructive');
  });

  test('"Verhandlung" returns "secondary"', () => {
    expect(getDealStageColor('Verhandlung')).toBe('secondary');
  });

  test('"Angebot" returns "secondary"', () => {
    expect(getDealStageColor('Angebot')).toBe('secondary');
  });

  test('"Vorschlag" returns "secondary"', () => {
    expect(getDealStageColor('Vorschlag')).toBe('secondary');
  });

  test('"Prospekt" returns "outline" (default case)', () => {
    expect(getDealStageColor('Prospekt')).toBe('outline');
  });

  test('unknown stage returns "outline"', () => {
    expect(getDealStageColor('Unknown Stage')).toBe('outline');
  });

  test('empty string returns "outline"', () => {
    expect(getDealStageColor('')).toBe('outline');
  });
});

describe('formatCurrency', () => {
  test('formats integer as EUR currency in de-DE locale', () => {
    const result = formatCurrency('1000');
    expect(result).toContain('1.000');
    expect(result).toContain('€');
  });

  test('formats zero correctly', () => {
    const result = formatCurrency('0');
    expect(result).toContain('0');
    expect(result).toContain('€');
  });

  test('formats large number with thousands separators', () => {
    const result = formatCurrency('1234567');
    expect(result).toContain('1.234.567');
    expect(result).toContain('€');
  });

  test('formats decimal value', () => {
    const result = formatCurrency('1500.50');
    expect(result).toContain('€');
  });
});

describe('formatDate', () => {
  test('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  test('returns null-ish values as empty string', () => {
    expect(formatDate(null as any)).toBe('');
    expect(formatDate(undefined as any)).toBe('');
  });

  test('returns already-formatted dd.mm.yyyy string unchanged', () => {
    expect(formatDate('15.03.2026')).toBe('15.03.2026');
  });

  test('formats ISO date string to de-DE locale format', () => {
    const result = formatDate('2026-03-15');
    // de-DE format: 15.3.2026 or 15.03.2026 depending on implementation
    expect(result).toContain('2026');
    expect(result).toContain('3');
    expect(result).toContain('15');
  });

  test('formats ISO datetime string', () => {
    const result = formatDate('2026-01-01T00:00:00.000Z');
    expect(result).toContain('2026');
  });
});
