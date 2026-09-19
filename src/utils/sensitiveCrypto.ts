/**
 * Sensitive Data Encryption Utilities for MyZkool
 * Implements AES-GCM-256 encryption at rest and HMAC-SHA-256 search hashing
 * strictly following UIDAI and Spec A4.2 security guidelines.
 */

import crypto from 'node:crypto';

// Default keys for development / test fallback
const DEFAULT_AES_KEY = process.env.AADHAAR_ENCRYPTION_KEY || 'myzkool-aadhaar-master-key-32b!!';
const DEFAULT_HMAC_KEY = process.env.AADHAAR_HMAC_KEY || 'myzkool-aadhaar-hmac-salt-key-256';

/**
 * Derives a consistent 32-byte (256-bit) buffer key from a passphrase.
 */
function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}

export interface EncryptedPayload {
  iv: string;        // Hex encoded IV (12 bytes)
  tag: string;       // Hex encoded Auth Tag (16 bytes)
  ciphertext: string;// Hex encoded Ciphertext
}

/**
 * Encrypts an Aadhaar number (or other sensitive string) using AES-256-GCM.
 * Returns both structured payload and packed string representation.
 */
export function encryptSensitive(
  plaintext: string,
  secretKey: string = DEFAULT_AES_KEY
): { payload: EncryptedPayload; packed: string; buffer: Buffer } {
  const keyBuffer = deriveKey(secretKey);
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encryptedBuffer = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encryptedBuffer.toString('hex'),
  };

  const packed = `v1:${payload.iv}:${payload.tag}:${payload.ciphertext}`;
  const combinedBuffer = Buffer.concat([iv, tag, encryptedBuffer]);

  return { payload, packed, buffer: combinedBuffer };
}

/**
 * Decrypts AES-256-GCM encrypted payload back to plaintext.
 */
export function decryptSensitive(
  input: EncryptedPayload | string | Buffer | Uint8Array,
  secretKey: string = DEFAULT_AES_KEY
): string {
  const keyBuffer = deriveKey(secretKey);

  let iv: Buffer;
  let tag: Buffer;
  let ciphertext: Buffer;

  if (typeof input === 'string') {
    if (input.startsWith('v1:')) {
      const parts = input.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted string format');
      }
      iv = Buffer.from(parts[1], 'hex');
      tag = Buffer.from(parts[2], 'hex');
      ciphertext = Buffer.from(parts[3], 'hex');
    } else {
      throw new Error('Unsupported encrypted string format');
    }
  } else if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
    if (buf.length < 28) {
      throw new Error('Encrypted buffer too short for AES-GCM (needs >= 28 bytes for IV + Tag + Data)');
    }
    iv = buf.subarray(0, 12);
    tag = buf.subarray(12, 28);
    ciphertext = buf.subarray(28);
  } else {
    iv = Buffer.from(input.iv, 'hex');
    tag = Buffer.from(input.tag, 'hex');
    ciphertext = Buffer.from(input.ciphertext, 'hex');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Computes an HMAC-SHA-256 search hash for indexing without exposing the raw Aadhaar.
 */
export function hashAadhaar(
  rawAadhaar: string,
  hmacKey: string = DEFAULT_HMAC_KEY
): string {
  const clean = rawAadhaar.replace(/[\s-]/g, '');
  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(clean);
  return hmac.digest('hex');
}

