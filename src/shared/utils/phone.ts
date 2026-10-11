/**
 * Phone number normalization and validation utility.
 * Focuses on Kenyan mobile numbers and international E.164 compliance.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  e164?: string;
  error?: string;
}

/**
 * Normalizes a phone number to standard international E.164 format.
 * Converts common Kenyan formats (07xx, 01xx, 2547xx, 7xx, 1xx) to +254...
 * Also accepts valid non-Kenyan international E.164 numbers (+...).
 */
export const normalizePhoneNumber = (raw: string): PhoneValidationResult => {
  if (!raw || typeof raw !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove spaces, hyphens, parentheses, and dots
  const cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.length === 0) {
    return { isValid: false, error: 'Phone number cannot be empty' };
  }

  // Case 1: Already has + prefix
  if (cleaned.startsWith('+')) {
    // Check if it's a Kenyan number (+254...)
    const kenyaMatch = cleaned.match(/^\+254([17]\d{8})$/);
    if (kenyaMatch) {
      return { isValid: true, e164: `+254${kenyaMatch[1]}` };
    }

    // Generic international E.164 format (+ followed by 8 to 15 digits)
    const internationalMatch = cleaned.match(/^\+[1-9]\d{7,14}$/);
    if (internationalMatch) {
      return { isValid: true, e164: cleaned };
    }

    return {
      isValid: false,
      error: 'Invalid international phone number format. Kenyan format must be +2547XXXXXXXX or +2541XXXXXXXX',
    };
  }

  // Case 2: Starts with country code 254 (without +)
  if (cleaned.startsWith('254')) {
    const match = cleaned.match(/^254([17]\d{8})$/);
    if (match) {
      return { isValid: true, e164: `+254${match[1]}` };
    }
    return { isValid: false, error: 'Invalid Kenyan phone number. Expected 9 digits after 254 starting with 7 or 1' };
  }

  // Case 3: Local Kenyan format starting with 07 or 01 (10 digits total)
  if (cleaned.startsWith('0')) {
    const match = cleaned.match(/^0([17]\d{8})$/);
    if (match) {
      return { isValid: true, e164: `+254${match[1]}` };
    }
    return { isValid: false, error: 'Invalid Kenyan phone number. Expected 10 digits starting with 07 or 01' };
  }

  // Case 4: 9 digits starting with 7 or 1 (omitted leading 0)
  if (cleaned.match(/^[17]\d{8}$/)) {
    return { isValid: true, e164: `+254${cleaned}` };
  }

  return {
    isValid: false,
    error: 'Invalid phone number format. Please provide a valid Kenyan phone number (e.g., 0712345678 or +254712345678)',
  };
};
