/**
 * PIN Authentication Service
 * Source of Truth: docs/SPEC.md Section 4.3 & 8.3
 */

import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { AUTH_LIMITS } from '../../../packages/shared/src/constants';
import { verifyOtp } from './otpService';

export interface UserAccount {
  userId: string;
  mobile: string;
  pinHash: string;
  fullName: string;
  role: string;
  schoolId: string;
  lastLoginAt: string | null;
  lockedUntil: string | null;
  failedPinAttempts: number;
}

// In-memory store for accounts and IP rate limits
const memoryAccounts: Map<string, UserAccount> = new Map();
const ipRateLimits: Map<string, { failedAttempts: number; lockedUntil: number | null }> = new Map();

/**
 * Hash a user PIN with salt
 */
export function hashPin(pin: string, mobile: string): string {
  const salt = process.env.PIN_SALT || 'myzkool-pin-salt-2026';
  return crypto
    .createHash('sha256')
    .update(`${pin}:${mobile}:${salt}`)
    .digest('hex');
}

/**
 * Register or seed a user PIN account (for onboarding & testing)
 */
export function registerUserPin(
  userId: string,
  mobile: string,
  pin: string,
  fullName: string,
  role: string,
  schoolId: string,
  lastLoginAt: string | null = null
): UserAccount {
  const account: UserAccount = {
    userId,
    mobile,
    pinHash: hashPin(pin, mobile),
    fullName,
    role,
    schoolId,
    lastLoginAt,
    lockedUntil: null,
    failedPinAttempts: 0,
  };
  memoryAccounts.set(mobile, account);
  return account;
}

/**
 * PIN Login with rate-limiting, 15-min lockout, and 30-day inactivity check
 */
export async function loginWithPin(
  mobile: string,
  pin: string,
  ip: string = '127.0.0.1'
): Promise<{
  success: boolean;
  user?: {
    id: string;
    mobile: string;
    fullName: string;
    role: string;
    schoolId: string;
  };
  token?: string;
  requiresOtp?: boolean;
}> {
  const now = Date.now();

  // 1. Check IP rate limit
  const ipData = ipRateLimits.get(ip) || { failedAttempts: 0, lockedUntil: null };
  if (ipData.lockedUntil && ipData.lockedUntil > now) {
    const minutesLeft = Math.ceil((ipData.lockedUntil - now) / 60000);
    throw {
      code: 'IP_LOCKED',
      message: `Too many failed attempts from this IP. Please try again in ${minutesLeft} minutes.`,
    };
  }

  // 2. Fetch user account
  const account = memoryAccounts.get(mobile);
  if (!account) {
    // Increment IP failure to prevent user enumeration
    ipData.failedAttempts += 1;
    if (ipData.failedAttempts >= AUTH_LIMITS.PIN_MAX_FAILED_ATTEMPTS) {
      ipData.lockedUntil = now + AUTH_LIMITS.PIN_LOCKOUT_DURATION_MS;
    }
    ipRateLimits.set(ip, ipData);

    throw {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid mobile number or PIN.',
    };
  }

  // 3. Check account lockout (15 minutes after 5 failures)
  if (account.lockedUntil) {
    const lockedUntilMs = new Date(account.lockedUntil).getTime();
    if (lockedUntilMs > now) {
      const minutesLeft = Math.ceil((lockedUntilMs - now) / 60000);
      throw {
        code: 'ACCOUNT_LOCKED',
        message: `Account is locked due to 5 consecutive failed PIN attempts. Please wait ${minutesLeft} minutes or reset your PIN via OTP.`,
      };
    } else {
      // Lockout expired, reset counter
      account.lockedUntil = null;
      account.failedPinAttempts = 0;
    }
  }

  // 4. Validate PIN
  const computedHash = hashPin(pin, mobile);
  if (computedHash !== account.pinHash) {
    account.failedPinAttempts += 1;
    ipData.failedAttempts += 1;

    if (account.failedPinAttempts >= AUTH_LIMITS.PIN_MAX_FAILED_ATTEMPTS) {
      account.lockedUntil = new Date(now + AUTH_LIMITS.PIN_LOCKOUT_DURATION_MS).toISOString();
      ipData.lockedUntil = now + AUTH_LIMITS.PIN_LOCKOUT_DURATION_MS;
      ipRateLimits.set(ip, ipData);

      throw {
        code: 'ACCOUNT_LOCKED',
        message: 'Account is locked for 15 minutes due to 5 consecutive failed PIN attempts.',
      };
    }

    ipRateLimits.set(ip, ipData);
    const attemptsRemaining = AUTH_LIMITS.PIN_MAX_FAILED_ATTEMPTS - account.failedPinAttempts;
    throw {
      code: 'INVALID_PIN',
      message: `Incorrect PIN. ${attemptsRemaining} attempts remaining before account lockout.`,
      attemptsRemaining,
    };
  }

  // 5. 30-day inactivity check (SPEC 4.3: new-device OTP after 30 days inactivity)
  if (account.lastLoginAt) {
    const lastLoginMs = new Date(account.lastLoginAt).getTime();
    const daysSinceLastLogin = (now - lastLoginMs) / (1000 * 60 * 60 * 24);
    if (daysSinceLastLogin > AUTH_LIMITS.NEW_DEVICE_INACTIVITY_DAYS) {
      return {
        success: false,
        requiresOtp: true,
      };
    }
  }

  // 6. Login Success: reset counters, update last_login_at
  account.failedPinAttempts = 0;
  account.lockedUntil = null;
  account.lastLoginAt = new Date(now).toISOString();
  ipRateLimits.delete(ip);

  // Generate synthetic test token
  const token = `zkool_${account.userId}_${Date.now()}`;

  return {
    success: true,
    user: {
      id: account.userId,
      mobile: account.mobile,
      fullName: account.fullName,
      role: account.role,
      schoolId: account.schoolId,
    },
    token,
  };
}

/**
 * Reset PIN via verified OTP
 */
export async function resetPinWithOtp(
  mobile: string,
  otpCode: string,
  newPin: string
): Promise<{ success: boolean; message: string }> {
  // 1. Verify OTP first
  await verifyOtp(mobile, 'reset_pin', otpCode);

  // 2. Fetch account
  const account = memoryAccounts.get(mobile);
  if (!account) {
    throw {
      code: 'USER_NOT_FOUND',
      message: 'No registered user found with this mobile number.',
    };
  }

  // 3. Update PIN hash and unlock
  account.pinHash = hashPin(newPin, mobile);
  account.failedPinAttempts = 0;
  account.lockedUntil = null;

  return {
    success: true,
    message: 'PIN successfully reset. You may now login with your new PIN.',
  };
}
