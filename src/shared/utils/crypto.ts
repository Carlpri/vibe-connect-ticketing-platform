import crypto from 'crypto';

/**
 * Cryptographic utility functions for verification tokens and OTPs.
 */

/**
 * Generates a cryptographically secure, unpredictable random hex token (64 chars).
 */
export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export const generateSecureOtp = (): string => {
  // Generates integer in [100000, 999999]
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Produces a SHA-256 digest of any raw string token or OTP.
 * Used to store only hashes in the database.
 */
export const hashVerificationCode = (code: string): string => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Constant-time comparison to prevent timing attacks.
 */
export const timingSafeMatch = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};
