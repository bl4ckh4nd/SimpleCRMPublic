import { getDealStageColor, formatCurrency, formatDate } from '@/types/deal';

describe('getDealStageColor', () => {
  test('"Gewonnen" returns "success"', () => {
    expect(getDealStageColor('Gewonnen')).toBe('success');
  });

  test('"Abgeschlossen Gewonnen" returns "success"', () => {
    expect(getDealStageColor('Abgeschlossen Gewonnen')).toBe('success');
  });

  test('"Verloren" returns "danger"', () => {
    expect(getDealStageColor('Verloren')).toBe('danger');
  });

  test('"Abgeschlossen Verloren" returns "danger"', () => {
    expect(getDealStageColor('Abgeschlossen Verloren')).toBe('danger');
  });

  test('"Verhandlung" returns "info"', () => {
    expect(getDealStageColor('Verhandlung')).toBe('info');
  });

  test('"Angebot" returns "info"', () => {
    expect(getDealStageColor('Angebot')).toBe('info');
  });

  test('"Vorschlag" returns "info"', () => {
    expect(getDealStageColor('Vorschlag')).toBe('info');
  });

  test('"Prospekt" returns "neutral" (default case)', () => {
    expect(getDealStageColor('Prospekt')).toBe('neutral');
  });

  test('unknown stage returns "neutral"', () => {
    expect(getDealStageColor('Unknown Stage')).toBe('neutral');
  });

  test('empty string returns "neutral"', () => {
    expect(getDealStageColor('')).toBe('neutral');
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
    expect(formatDate(null as unknown)).toBe('');
    expect(formatDate(undefined as unknown)).toBe('');
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
