/**
 * Authentication limits and security throttles.
 * Source of Truth: docs/SPEC.md Section 4.3 & 8.3
 */
export const AUTH_LIMITS = {
  OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_MS: 60 * 1000, // 60 seconds
  PIN_MAX_FAILED_ATTEMPTS: 5,
  PIN_LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  NEW_DEVICE_INACTIVITY_DAYS: 30,
} as const;
