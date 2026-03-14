import {
  getPrimaryPhone,
  getPrimaryContact,
  getFormattedPhone,
  hasContactInfo,
  isValidEmail,
  isValidPhone,
} from '@/lib/contact-utils';

describe('contact-utils', () => {
  test('prefers mobile number over phone', () => {
    expect(getPrimaryPhone({ mobile: ' 0171 ', phone: '030' })).toBe('0171');
    expect(getPrimaryPhone({ phone: ' 030 ' })).toBe('030');
    expect(getPrimaryPhone({})).toBe('');
  });

  test('returns primary contact with expected priority', () => {
    expect(getPrimaryContact({ email: ' test@example.com ', mobile: '0171' })).toBe('test@example.com');
    expect(getPrimaryContact({ mobile: '0171', phone: '030' })).toBe('0171');
    expect(getPrimaryContact({})).toBe('Keine Kontaktdaten');
  });

  test('formats phone labels', () => {
    expect(getFormattedPhone({ mobile: '0171' })).toBe('0171 (Mobil)');
    expect(getFormattedPhone({ phone: '030' })).toBe('030 (Festnetz)');
    expect(getFormattedPhone({})).toBe('');
  });

  test('detects presence of any contact info', () => {
    expect(hasContactInfo({ email: 'a@b.com' })).toBe(true);
    expect(hasContactInfo({ phone: '12345' })).toBe(true);
    expect(hasContactInfo({ mobile: '12345' })).toBe(true);
    expect(hasContactInfo({})).toBe(false);
  });

  test('validates email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail(' user@example.com ')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  test('validates phone numbers with basic format', () => {
    expect(isValidPhone('+49 30 12345')).toBe(true);
    expect(isValidPhone('(030) 12345')).toBe(true);
    expect(isValidPhone('1234')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});
