/**
 * Unit Tests for AES-256-GCM Encryption with APP_MASTER_KEY
 */

import { encrypt, decrypt, getMasterKey } from '../src/utils/encryption';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('AES-256-GCM (APP_MASTER_KEY) Unit Tests');
  console.log('============================================================');

  // 1. Basic Key Generation
  const masterKey = getMasterKey();
  assert(masterKey.length === 32, 'Master key resolves to exactly 32 bytes');

  // 2. Round-trip Encryption & Decryption
  const testAadhaar = '548912345678';
  const encResult = encrypt(testAadhaar);
  assert(encResult.packed.split(':').length === 3, 'Packed format contains iv:tag:ciphertext');
  assert(encResult.ciphertext !== testAadhaar, 'Ciphertext is not plaintext');

  const decrypted = decrypt(encResult.packed);
  assert(decrypted === testAadhaar, 'Decrypted packed string matches original plaintext');

  const decryptedFromParts = decrypt({
    iv: encResult.iv,
    tag: encResult.tag,
    ciphertext: encResult.ciphertext,
  });
  assert(decryptedFromParts === testAadhaar, 'Decrypted from parts object matches original plaintext');

  // 3. Random IV Uniqueness
  const enc1 = encrypt(testAadhaar);
  const enc2 = encrypt(testAadhaar);
  assert(enc1.iv !== enc2.iv, 'Two encryptions of identical plaintext produce distinct IVs');
  assert(enc1.ciphertext !== enc2.ciphertext, 'Two encryptions of identical plaintext produce distinct ciphertexts');

  // 4. Tamper Resistance (GCM auth tag verification)
  let tamperedCaught = false;
  try {
    // Change last char of ciphertext
    const tamperedCipher = encResult.ciphertext.slice(0, -2) + (encResult.ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    decrypt({
      iv: encResult.iv,
      tag: encResult.tag,
      ciphertext: tamperedCipher,
    });
  } catch (err) {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered ciphertext fails auth tag verification');

  // 5. Tampered Tag Resistance
  let tamperedTagCaught = false;
  try {
    const tamperedTag = encResult.tag.slice(0, -2) + (encResult.tag.slice(-2) === '00' ? '11' : '00');
    decrypt({
      iv: encResult.iv,
      tag: tamperedTag,
      ciphertext: encResult.ciphertext,
    });
  } catch (err) {
    tamperedTagCaught = true;
  }
  assert(tamperedTagCaught, 'Tampered auth tag is rejected by decipher');

  // 6. Unicode and Special Characters (Devanagari names, symbols)
  const unicodeSample = 'आदरणीय प्रधानाचार्य महोदय 🎓 School ERP 100% Secure!';
  const encUnicode = encrypt(unicodeSample);
  const decUnicode = decrypt(encUnicode.packed);
  assert(decUnicode === unicodeSample, 'Unicode and Devanagari text correctly round-tripped');

  // 7. Large payload (Secrets, JSON tokens)
  const secretPayload = JSON.stringify({
    razorpay_key_secret: 'sec_test_1234567890abcdef',
    google_tokens: { access: 'ya29.xyz', refresh: '1//abc' },
  });
  const encSecret = encrypt(secretPayload);
  const decSecret = decrypt(encSecret.packed);
  assert(decSecret === secretPayload, 'JSON and API secrets payload round-trip preserved');

  console.log('============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
