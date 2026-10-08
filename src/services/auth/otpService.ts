/**
 * OTP Service
 * Source of Truth: docs/SPEC.md Section 4.3 & 8.3
 */

import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getSmsAdapter } from './smsAdapter';
import { AUTH_LIMITS } from '../../../packages/shared/src/constants';

export interface OtpRecord {
  id: string;
  mobile: string;
  purpose: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
  ip?: string;
}

// In-memory store for unit test resilience and fallback when Supabase is unconfigured
const memoryOtpStore: Map<string, OtpRecord> = new Map();

/**
 * Creates SHA-256 hash of (mobile + purpose + code + salt)
 */
export function hashOtpCode(mobile: string, purpose: string, code: string): string {
  const salt = process.env.OTP_SALT || 'myzkool-otp-hash-salt-2026';
  return crypto
    .createHash('sha256')
    .update(`${mobile}:${purpose}:${code}:${salt}`)
    .digest('hex');
}

/**
 * Generates a cryptographically random 6-digit OTP code
 */
export function generateOtpCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return num.toString();
}

/**
 * Sends an OTP with rate limiting and resend throttle
 */
export async function sendOtp(
  mobile: string,
  purpose: string,
  ip?: string
): Promise<{ success: boolean; id: string; message: string; codeForTest?: string }> {
  const now = Date.now();

  // 1. Resend throttle check (60 seconds)
  const existing = Array.from(memoryOtpStore.values())
    .filter((r) => r.mobile === mobile && r.purpose === purpose && !r.verified_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (existing) {
    const elapsed = now - new Date(existing.created_at).getTime();
    if (elapsed < AUTH_LIMITS.OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((AUTH_LIMITS.OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw {
        code: 'RESEND_THROTTLED',
        message: `Please wait ${waitSec} seconds before requesting a new OTP.`,
      };
    }
  }

  // 2. Generate code and hash
  const code = generateOtpCode();
  const codeHash = hashOtpCode(mobile, purpose, code);
  const expiresAt = new Date(now + AUTH_LIMITS.OTP_EXPIRY_MS).toISOString();
  const id = crypto.randomUUID();

  const record: OtpRecord = {
    id,
    mobile,
    purpose,
    code_hash: codeHash,
    attempts: 0,
    expires_at: expiresAt,
    verified_at: null,
    created_at: new Date(now).toISOString(),
    ip,
  };

  memoryOtpStore.set(id, record);

  // If Supabase is connected, persist to otp_requests table
  if (isSupabaseConfigured) {
    try {
      await supabase.from('otp_requests').insert({
        id,
        mobile,
        purpose,
        code_hash: codeHash,
        attempts: 0,
        expires_at: expiresAt,
        ip,
      });
    } catch (e) {
      // Fallback already in memory
    }
  }

  // 3. Dispatch via SMS Adapter
  const adapter = getSmsAdapter();
  await adapter.sendOtp(mobile, code, purpose);

  return {
    success: true,
    id,
    message: 'OTP sent successfully',
    // codeForTest is only provided in non-production test mode for test assertions
    codeForTest: process.env.NODE_ENV === 'test' ? code : undefined,
  };
}

/**
 * Verifies an OTP code
 */
export async function verifyOtp(
  mobile: string,
  purpose: string,
  code: string
): Promise<{ success: boolean; message: string; attemptsRemaining?: number }> {
  const now = Date.now();

  // Find most recent unverified request
  const record = Array.from(memoryOtpStore.values())
    .filter((r) => r.mobile === mobile && r.purpose === purpose && !r.verified_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  if (!record) {
    throw {
      code: 'OTP_NOT_FOUND',
      message: 'No pending OTP request found. Please request a new OTP.',
    };
  }

  // Check expiration
  if (new Date(record.expires_at).getTime() < now) {
    throw {
      code: 'OTP_EXPIRED',
      message: 'This OTP has expired. Please request a new one.',
    };
  }

  // Check max attempts
  if (record.attempts >= AUTH_LIMITS.OTP_MAX_ATTEMPTS) {
    throw {
      code: 'MAX_ATTEMPTS_EXCEEDED',
      message: 'Maximum verification attempts exceeded. Please request a new OTP.',
    };
  }

  // Increment attempts
  record.attempts += 1;

  // Check code hash
  const expectedHash = hashOtpCode(mobile, purpose, code);
  if (record.code_hash !== expectedHash) {
    const remaining = Math.max(0, AUTH_LIMITS.OTP_MAX_ATTEMPTS - record.attempts);
    if (remaining === 0) {
      throw {
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Maximum verification attempts exceeded. Please request a new OTP.',
      };
    }
    throw {
      code: 'INVALID_OTP',
      message: `Invalid OTP code. ${remaining} attempts remaining.`,
      attemptsRemaining: remaining,
    };
  }

  // Mark verified
  record.verified_at = new Date(now).toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('otp_requests')
        .update({ verified_at: record.verified_at, attempts: record.attempts })
        .eq('id', record.id);
    } catch {}
  }

  return {
    success: true,
    message: 'OTP verified successfully',
  };
}
