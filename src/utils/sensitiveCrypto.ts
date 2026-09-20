/**
 * Sensitive Data Encryption Utilities for MyZkool
 * Implements AES-GCM-256 encryption at rest and HMAC-SHA-256 search hashing
 * strictly following UIDAI and Spec A4.2 security guidelines.
 * 
 * Fully cross-platform: executes synchronously and seamlessly in both Node.js
 * and Browser environments without crashing on `process` or `Buffer`.
 */

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch {}
  try {
    if (typeof process !== "undefined" && process?.env) {
      return process.env[key];
    }
  } catch {}
  return undefined;
};

// Default keys for development / test fallback
const DEFAULT_AES_KEY = getEnvVar("AADHAAR_ENCRYPTION_KEY") || "myzkool-aadhaar-master-key-32b!!";
const DEFAULT_HMAC_KEY = getEnvVar("AADHAAR_HMAC_KEY") || "myzkool-aadhaar-hmac-salt-key-256";

// Helper utilities for byte conversions (Browser + Node safe)
function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0xd800 || code >= 0xe000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      i++;
      code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    if (b0 < 0x80) {
      str += String.fromCharCode(b0);
    } else if (b0 < 0xe0) {
      const b1 = bytes[i++];
      str += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
    } else if (b0 < 0xf0) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      str += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    } else {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      let code = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      code -= 0x10000;
      str += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
    }
  }
  return str;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

// ============================================================================
// Pure JS SHA-256 & HMAC-SHA-256 Implementation (FIPS 180-4, RFC 2104)
// ============================================================================

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function pureSha256(data: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const newLen = (((len + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(newLen);
  padded.set(data);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLen >>> 0, false);
  view.setUint32(newLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);

  for (let i = 0; i < newLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[j] + w[j]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const resView = new DataView(result.buffer);
  resView.setUint32(0, h0, false); resView.setUint32(4, h1, false);
  resView.setUint32(8, h2, false); resView.setUint32(12, h3, false);
  resView.setUint32(16, h4, false); resView.setUint32(20, h5, false);
  resView.setUint32(24, h6, false); resView.setUint32(28, h7, false);
  return result;
}

function pureHmacSha256(keyBytes: Uint8Array, msgBytes: Uint8Array): Uint8Array {
  let k = keyBytes;
  if (k.length > 64) k = pureSha256(k);
  const keyPad = new Uint8Array(64);
  keyPad.set(k);
  const oKeyPad = new Uint8Array(64);
  const iKeyPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyPad[i] ^ 0x5c;
    iKeyPad[i] = keyPad[i] ^ 0x36;
  }
  const inner = new Uint8Array(64 + msgBytes.length);
  inner.set(iKeyPad, 0);
  inner.set(msgBytes, 64);
  const innerHash = pureSha256(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oKeyPad, 0);
  outer.set(innerHash, 64);
  return pureSha256(outer);
}

// ============================================================================
// Pure JS AES-256-GCM Implementation (NIST SP 800-38D)
// ============================================================================

const AES_SBOX = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
]);

const AES_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function expandKey(key: Uint8Array): Uint32Array {
  const Nk = 8, Nr = 14;
  const w = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    w[i] = (key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3];
  }
  for (let i = Nk; i < 4 * (Nr + 1); i++) {
    let temp = w[i - 1];
    if (i % Nk === 0) {
      temp = (temp << 8) | (temp >>> 24);
      temp =
        (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
        (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
        (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
        AES_SBOX[temp & 0xff];
      temp ^= (AES_RCON[(i / Nk) - 1] << 24);
    } else if (Nk > 6 && i % Nk === 4) {
      temp =
        (AES_SBOX[(temp >>> 24) & 0xff] << 24) |
        (AES_SBOX[(temp >>> 16) & 0xff] << 16) |
        (AES_SBOX[(temp >>> 8) & 0xff] << 8) |
        AES_SBOX[temp & 0xff];
    }
    w[i] = w[i - Nk] ^ temp;
  }
  return w;
}

function xtime(x: number): number {
  return ((x << 1) ^ (((x >> 7) & 1) * 0x11b)) & 0xff;
}

function encryptBlock(block: Uint8Array, w: Uint32Array): Uint8Array {
  const s = new Uint8Array(block);
  for (let c = 0; c < 4; c++) {
    const rk = w[c];
    s[c * 4] ^= (rk >>> 24) & 0xff;
    s[c * 4 + 1] ^= (rk >>> 16) & 0xff;
    s[c * 4 + 2] ^= (rk >>> 8) & 0xff;
    s[c * 4 + 3] ^= rk & 0xff;
  }
  for (let r = 1; r < 14; r++) {
    const t0 = AES_SBOX[s[0]], t1 = AES_SBOX[s[5]], t2 = AES_SBOX[s[10]], t3 = AES_SBOX[s[15]];
    const t4 = AES_SBOX[s[4]], t5 = AES_SBOX[s[9]], t6 = AES_SBOX[s[14]], t7 = AES_SBOX[s[3]];
    const t8 = AES_SBOX[s[8]], t9 = AES_SBOX[s[13]], t10 = AES_SBOX[s[2]], t11 = AES_SBOX[s[7]];
    const t12 = AES_SBOX[s[12]], t13 = AES_SBOX[s[1]], t14 = AES_SBOX[s[6]], t15 = AES_SBOX[s[11]];
    for (let c = 0; c < 4; c++) {
      const a0 = c === 0 ? t0 : c === 1 ? t4 : c === 2 ? t8 : t12;
      const a1 = c === 0 ? t1 : c === 1 ? t5 : c === 2 ? t9 : t13;
      const a2 = c === 0 ? t2 : c === 1 ? t6 : c === 2 ? t10 : t14;
      const a3 = c === 0 ? t3 : c === 1 ? t7 : c === 2 ? t11 : t15;
      const rk = w[r * 4 + c];
      s[c * 4] = (xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3 ^ (rk >>> 24)) & 0xff;
      s[c * 4 + 1] = (a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3 ^ ((rk >>> 16) & 0xff)) & 0xff;
      s[c * 4 + 2] = (a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3 ^ ((rk >>> 8) & 0xff)) & 0xff;
      s[c * 4 + 3] = (xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3) ^ (rk & 0xff)) & 0xff;
    }
  }
  const t0 = AES_SBOX[s[0]], t1 = AES_SBOX[s[5]], t2 = AES_SBOX[s[10]], t3 = AES_SBOX[s[15]];
  const t4 = AES_SBOX[s[4]], t5 = AES_SBOX[s[9]], t6 = AES_SBOX[s[14]], t7 = AES_SBOX[s[3]];
  const t8 = AES_SBOX[s[8]], t9 = AES_SBOX[s[13]], t10 = AES_SBOX[s[2]], t11 = AES_SBOX[s[7]];
  const t12 = AES_SBOX[s[12]], t13 = AES_SBOX[s[1]], t14 = AES_SBOX[s[6]], t15 = AES_SBOX[s[11]];
  const rkOff = 14 * 4;
  s[0] = t0 ^ ((w[rkOff] >>> 24) & 0xff);
  s[1] = t1 ^ ((w[rkOff] >>> 16) & 0xff);
  s[2] = t2 ^ ((w[rkOff] >>> 8) & 0xff);
  s[3] = t3 ^ (w[rkOff] & 0xff);
  s[4] = t4 ^ ((w[rkOff + 1] >>> 24) & 0xff);
  s[5] = t5 ^ ((w[rkOff + 1] >>> 16) & 0xff);
  s[6] = t6 ^ ((w[rkOff + 1] >>> 8) & 0xff);
  s[7] = t7 ^ (w[rkOff + 1] & 0xff);
  s[8] = t8 ^ ((w[rkOff + 2] >>> 24) & 0xff);
  s[9] = t9 ^ ((w[rkOff + 2] >>> 16) & 0xff);
  s[10] = t10 ^ ((w[rkOff + 2] >>> 8) & 0xff);
  s[11] = t11 ^ (w[rkOff + 2] & 0xff);
  s[12] = t12 ^ ((w[rkOff + 3] >>> 24) & 0xff);
  s[13] = t13 ^ ((w[rkOff + 3] >>> 16) & 0xff);
  s[14] = t14 ^ ((w[rkOff + 3] >>> 8) & 0xff);
  s[15] = t15 ^ (w[rkOff + 3] & 0xff);
  return s;
}

function gfMul(X: Uint8Array, Y: Uint8Array): Uint8Array {
  const Z = new Uint8Array(16);
  const V = new Uint8Array(Y);
  for (let i = 0; i < 16; i++) {
    for (let bit = 7; bit >= 0; bit--) {
      if ((X[i] & (1 << bit)) !== 0) {
        for (let j = 0; j < 16; j++) Z[j] ^= V[j];
      }
      const lsb = V[15] & 1;
      for (let j = 15; j > 0; j--) {
        V[j] = (V[j] >>> 1) | ((V[j - 1] & 1) << 7);
      }
      V[0] >>>= 1;
      if (lsb !== 0) V[0] ^= 0xe1;
    }
  }
  return Z;
}

function ghash(H: Uint8Array, data: Uint8Array): Uint8Array {
  let Y = new Uint8Array(16);
  for (let i = 0; i < data.length; i += 16) {
    const block = new Uint8Array(16);
    const chunk = data.subarray(i, Math.min(i + 16, data.length));
    block.set(chunk);
    for (let j = 0; j < 16; j++) Y[j] ^= block[j];
    Y = gfMul(Y, H);
  }
  return Y;
}

function gcmEncryptBytes(
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array
): { ciphertext: Uint8Array; tag: Uint8Array } {
  const w = expandKey(key);
  const zeroBlock = new Uint8Array(16);
  const H = encryptBlock(zeroBlock, w);

  const J0 = new Uint8Array(16);
  J0.set(iv);
  J0[15] = 1;

  const ciphertext = new Uint8Array(plaintext.length);
  const CB = new Uint8Array(J0);

  for (let i = 0; i < plaintext.length; i += 16) {
    let c = (CB[12] << 24) | (CB[13] << 16) | (CB[14] << 8) | CB[15];
    c = (c + 1) >>> 0;
    CB[12] = (c >>> 24) & 0xff;
    CB[13] = (c >>> 16) & 0xff;
    CB[14] = (c >>> 8) & 0xff;
    CB[15] = c & 0xff;

    const stream = encryptBlock(CB, w);
    const chunkLen = Math.min(16, plaintext.length - i);
    for (let j = 0; j < chunkLen; j++) {
      ciphertext[i + j] = plaintext[i + j] ^ stream[j];
    }
  }

  const lenBlock = new Uint8Array(16);
  const dataBits = plaintext.length * 8;
  const view = new DataView(lenBlock.buffer);
  view.setUint32(8, Math.floor(dataBits / 0x100000000), false);
  view.setUint32(12, dataBits >>> 0, false);

  const ghashInput = new Uint8Array(Math.ceil(ciphertext.length / 16) * 16 + 16);
  ghashInput.set(ciphertext);
  ghashInput.set(lenBlock, Math.ceil(ciphertext.length / 16) * 16);

  const S = ghash(H, ghashInput);
  const encJ0 = encryptBlock(J0, w);
  const tag = new Uint8Array(16);
  for (let i = 0; i < 16; i++) tag[i] = S[i] ^ encJ0[i];

  return { ciphertext, tag };
}

function gcmDecryptBytes(
  key: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array
): Uint8Array {
  const w = expandKey(key);
  const zeroBlock = new Uint8Array(16);
  const H = encryptBlock(zeroBlock, w);

  const J0 = new Uint8Array(16);
  J0.set(iv);
  J0[15] = 1;

  const lenBlock = new Uint8Array(16);
  const dataBits = ciphertext.length * 8;
  const view = new DataView(lenBlock.buffer);
  view.setUint32(8, Math.floor(dataBits / 0x100000000), false);
  view.setUint32(12, dataBits >>> 0, false);

  const ghashInput = new Uint8Array(Math.ceil(ciphertext.length / 16) * 16 + 16);
  ghashInput.set(ciphertext);
  ghashInput.set(lenBlock, Math.ceil(ciphertext.length / 16) * 16);

  const S = ghash(H, ghashInput);
  const encJ0 = encryptBlock(J0, w);
  const expectedTag = new Uint8Array(16);
  let tagMatch = 0;
  for (let i = 0; i < 16; i++) {
    expectedTag[i] = S[i] ^ encJ0[i];
    tagMatch |= expectedTag[i] ^ tag[i];
  }
  if (tagMatch !== 0) {
    throw new Error("Authentication tag verification failed for AES-GCM data");
  }

  const plaintext = new Uint8Array(ciphertext.length);
  const CB = new Uint8Array(J0);
  for (let i = 0; i < ciphertext.length; i += 16) {
    let c = (CB[12] << 24) | (CB[13] << 16) | (CB[14] << 8) | CB[15];
    c = (c + 1) >>> 0;
    CB[12] = (c >>> 24) & 0xff;
    CB[13] = (c >>> 16) & 0xff;
    CB[14] = (c >>> 8) & 0xff;
    CB[15] = c & 0xff;

    const stream = encryptBlock(CB, w);
    const chunkLen = Math.min(16, ciphertext.length - i);
    for (let j = 0; j < chunkLen; j++) {
      plaintext[i + j] = ciphertext[i + j] ^ stream[j];
    }
  }

  return plaintext;
}

// ============================================================================
// Exported Interfaces and Methods
// ============================================================================

export interface EncryptedPayload {
  iv: string;        // Hex encoded IV (12 bytes)
  tag: string;       // Hex encoded Auth Tag (16 bytes)
  ciphertext: string;// Hex encoded Ciphertext
}

/**
 * Derives a consistent 32-byte (256-bit) buffer key from a passphrase.
 */
function deriveKey(secret: string): Uint8Array {
  const secretBytes = utf8ToBytes(secret);
  return pureSha256(secretBytes);
}

/**
 * Encrypts an Aadhaar number (or other sensitive string) using AES-256-GCM.
 * Returns structured payload, packed string representation, and combined buffer.
 */
export function encryptSensitive(
  plaintext: string,
  secretKey: string = DEFAULT_AES_KEY
): { payload: EncryptedPayload; packed: string; buffer: Buffer | Uint8Array } {
  const keyBytes = deriveKey(secretKey);
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const plainBytes = utf8ToBytes(plaintext);

  const { ciphertext, tag } = gcmEncryptBytes(keyBytes, iv, plainBytes);

  const payload: EncryptedPayload = {
    iv: bytesToHex(iv),
    tag: bytesToHex(tag),
    ciphertext: bytesToHex(ciphertext),
  };

  const packed = `v1:${payload.iv}:${payload.tag}:${payload.ciphertext}`;

  // Combined bytes: IV (12) + Tag (16) + Ciphertext
  const combined = new Uint8Array(12 + 16 + ciphertext.length);
  combined.set(iv, 0);
  combined.set(tag, 12);
  combined.set(ciphertext, 28);

  const outBuffer: Buffer | Uint8Array =
    typeof Buffer !== "undefined" ? Buffer.from(combined) : combined;

  return { payload, packed, buffer: outBuffer };
}

/**
 * Decrypts AES-256-GCM encrypted payload back to plaintext.
 */
export function decryptSensitive(
  input: EncryptedPayload | string | Buffer | Uint8Array,
  secretKey: string = DEFAULT_AES_KEY
): string {
  const keyBytes = deriveKey(secretKey);

  let ivBytes: Uint8Array;
  let tagBytes: Uint8Array;
  let cipherBytes: Uint8Array;

  if (typeof input === "string") {
    if (input.startsWith("v1:")) {
      const parts = input.split(":");
      if (parts.length !== 4) {
        throw new Error("Invalid encrypted string format");
      }
      ivBytes = hexToBytes(parts[1]);
      tagBytes = hexToBytes(parts[2]);
      cipherBytes = hexToBytes(parts[3]);
    } else {
      throw new Error("Unsupported encrypted string format");
    }
  } else if (
    (typeof Buffer !== "undefined" && Buffer.isBuffer(input)) ||
    input instanceof Uint8Array
  ) {
    const rawBytes =
      typeof Buffer !== "undefined" && Buffer.isBuffer(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.length)
        : input;

    if (rawBytes.length < 28) {
      throw new Error(
        "Encrypted buffer too short for AES-GCM (needs >= 28 bytes for IV + Tag + Data)"
      );
    }
    ivBytes = rawBytes.subarray(0, 12);
    tagBytes = rawBytes.subarray(12, 28);
    cipherBytes = rawBytes.subarray(28);
  } else {
    ivBytes = hexToBytes(input.iv);
    tagBytes = hexToBytes(input.tag);
    cipherBytes = hexToBytes(input.ciphertext);
  }

  const decryptedBytes = gcmDecryptBytes(keyBytes, ivBytes, cipherBytes, tagBytes);
  return bytesToUtf8(decryptedBytes);
}

/**
 * Computes an HMAC-SHA-256 search hash for indexing without exposing the raw Aadhaar.
 */
export function hashAadhaar(
  rawAadhaar: string,
  hmacKey: string = DEFAULT_HMAC_KEY
): string {
  const clean = rawAadhaar.replace(/[\s-]/g, "");
  const keyBytes = utf8ToBytes(hmacKey);
  const msgBytes = utf8ToBytes(clean);
  const hashBytes = pureHmacSha256(keyBytes, msgBytes);
  return bytesToHex(hashBytes);
}
