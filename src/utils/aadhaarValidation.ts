/**
 * Verhoeff Algorithm and Aadhaar Validation Utilities for MyZkool
 * Strictly implements the Verhoeff decimal checksum algorithm for 12-digit Aadhaar validation.
 */

// Multiplication table d
const D_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table p
const P_TABLE: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Inverse table inv
const INV_TABLE: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates a number string using the Verhoeff checksum algorithm.
 */
export function validateVerhoeff(numStr: string): boolean {
  if (!numStr || !/^\d+$/.test(numStr)) return false;
  let c = 0;
  const invertedArray = numStr.split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = D_TABLE[c][P_TABLE[i % 8][invertedArray[i]]];
  }
  return c === 0;
}

/**
 * Generates the Verhoeff checksum digit for a given number string.
 */
export function generateVerhoeffChecksum(numStr: string): number {
  let c = 0;
  const invertedArray = numStr.split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = D_TABLE[c][P_TABLE[(i + 1) % 8][invertedArray[i]]];
  }
  return INV_TABLE[c];
}

/**
 * Generates a valid 12-digit Aadhaar number for testing/mocking.
 */
export function generateValidAadhaar(prefix11Digits: string = '23456789012'): string {
  const clean = prefix11Digits.replace(/\D/g, '').slice(0, 11);
  const padded = clean.padEnd(11, '3');
  const checksum = generateVerhoeffChecksum(padded);
  return `${padded}${checksum}`;
}

/**
 * Cleans an Aadhaar string (removes spaces, hyphens).
 */
export function cleanAadhaar(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

/**
 * Validates an Aadhaar number according to UIDAI rules:
 * 1. Must be exactly 12 numeric digits
 * 2. Cannot start with '0' or '1'
 * 3. Must satisfy Verhoeff checksum
 */
export function validateAadhaar(raw: string): { valid: boolean; error?: string; cleanNumber?: string } {
  if (!raw) {
    return { valid: false, error: 'Aadhaar number is required.' };
  }

  const clean = cleanAadhaar(raw);

  if (!/^\d+$/.test(clean)) {
    return { valid: false, error: 'Aadhaar must contain only digits.' };
  }

  if (clean.length !== 12) {
    return { valid: false, error: `Aadhaar must be exactly 12 digits (currently ${clean.length}).` };
  }

  if (clean[0] === '0' || clean[0] === '1') {
    return { valid: false, error: 'Aadhaar cannot start with 0 or 1.' };
  }

  if (!validateVerhoeff(clean)) {
    return { valid: false, error: 'Invalid Aadhaar checksum (Verhoeff validation failed).' };
  }

  return { valid: true, cleanNumber: clean };
}

/**
 * Masks Aadhaar number showing only the last 4 digits: XXXX-XXXX-1234
 */
export function maskAadhaar(aadhaarOrLast4: string | null | undefined): string {
  if (!aadhaarOrLast4) return '';
  const clean = cleanAadhaar(aadhaarOrLast4);
  const last4 = clean.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Formats Aadhaar as 4-digit grouped chunks for input display: 1234 5678 9012
 */
export function formatAadhaarInput(val: string): string {
  const clean = val.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.substring(i, i + 4));
  }
  return parts.join(' ');
}

