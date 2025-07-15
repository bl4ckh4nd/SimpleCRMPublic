/**
 * Utility functions for handling customer contact information
 */

export interface CustomerContact {
  phone?: string;
  mobile?: string;
  email?: string;
}

/**
 * Gets the primary phone number with proper prioritization
 * Priority: mobile phone > landline phone
 */
export function getPrimaryPhone(contact: CustomerContact): string {
  if (contact.mobile && contact.mobile.trim()) {
    return contact.mobile.trim();
  }
  if (contact.phone && contact.phone.trim()) {
    return contact.phone.trim();
  }
  return '';
}

/**
 * Gets the primary contact method (phone or email) for display
 * Priority: email > mobile > phone
 */
export function getPrimaryContact(contact: CustomerContact): string {
  if (contact.email && contact.email.trim()) {
    return contact.email.trim();
  }
  return getPrimaryPhone(contact) || 'Keine Kontaktdaten';
}

/**
 * Gets formatted phone display with type indicator
 */
export function getFormattedPhone(contact: CustomerContact): string {
  if (contact.mobile && contact.mobile.trim()) {
    return `${contact.mobile.trim()} (Mobil)`;
  }
  if (contact.phone && contact.phone.trim()) {
    return `${contact.phone.trim()} (Festnetz)`;
  }
  return '';
}

/**
 * Checks if customer has any contact information
 */
export function hasContactInfo(contact: CustomerContact): boolean {
  return !!(contact.email?.trim() || contact.phone?.trim() || contact.mobile?.trim());
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates phone number format (basic check)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  // Basic check: at least 5 digits, can contain spaces, dashes, parentheses, plus
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{5,}$/;
  return phoneRegex.test(phone.trim());
}