/**
 * AES-256-GCM Encryption / Decryption Utility using APP_MASTER_KEY
 * Source of Truth: docs/SPEC.md (Rules 5, 6 & Section 8.3)
 */

import crypto from 'crypto';

// Fallback 32-byte key in Base64 for development and testing
const DEV_FALLBACK_KEY_BASE64 = Buffer.from('myzkool-32-byte-master-key-2026!').toString('base64');

export interface EncryptedPayload {
  iv: string; // Hex
  tag: string; // Hex
  ciphertext: string; // Hex
  packed: string; // iv:tag:ciphertext
}

/**
 * Retrieves the 32-byte key buffer from APP_MASTER_KEY (base64 encoded)
 */
export function getMasterKey(): Buffer {
  const envKey = process.env.APP_MASTER_KEY || DEV_FALLBACK_KEY_BASE64;
  const keyBuf = Buffer.from(envKey, 'base64');
  if (keyBuf.length !== 32) {
    throw new Error(`APP_MASTER_KEY must be exactly 32 bytes when decoded from base64 (got ${keyBuf.length} bytes)`);
  }
  return keyBuf;
}

/**
 * Encrypts a plaintext string with AES-256-GCM using APP_MASTER_KEY
 */
export function encrypt(plaintext: string, customKey?: Buffer): EncryptedPayload {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Plaintext must be a string');
  }

  const key = customKey || getMasterKey();
  const iv = crypto.randomBytes(12); // Standard 12-byte IV for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertextBuf = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  const ivHex = iv.toString('hex');
  const tagHex = tag.toString('hex');
  const cipherHex = ciphertextBuf.toString('hex');
  const packed = `${ivHex}:${tagHex}:${cipherHex}`;

  return {
    iv: ivHex,
    tag: tagHex,
    ciphertext: cipherHex,
    packed,
  };
}

/**
 * Decrypts an encrypted payload or packed string with AES-256-GCM using APP_MASTER_KEY
 */
export function decrypt(
  input: string | { iv: string; tag: string; ciphertext: string },
  customKey?: Buffer
): string {
  const key = customKey || getMasterKey();
  let ivHex: string;
  let tagHex: string;
  let cipherHex: string;

  if (typeof input === 'string') {
    const parts = input.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid packed encryption format. Expected iv:tag:ciphertext');
    }
    [ivHex, tagHex, cipherHex] = parts;
  } else {
    ivHex = input.iv;
    tagHex = input.tag;
    cipherHex = input.ciphertext;
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const decryptedBuf = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decryptedBuf.toString('utf8');
}
