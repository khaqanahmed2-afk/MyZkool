/**
 * MyZkool Constants
 * Source of Truth: docs/SPEC.md
 */

import { PlanCode, PlanDefinition } from './types';

export const PLANS: Record<PlanCode, PlanDefinition> = {
  basic: {
    code: 'basic',
    name: 'Basic',
    pricePaise: 99900, // Rs 999
    studentCap: 800,
    features: {
      students: 800,
      fees: true,
      website: 8, // 8 pages
      website_storage_mb: 200,
      transport: false,
    },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    pricePaise: 179900, // Rs 1,799
    studentCap: 1800,
    features: {
      students: 1800,
      fees: true,
      website: 20, // 20 pages
      website_storage_mb: 1000,
      transport: true,
    },
  },
};

export const BRAND_COLORS = {
  primary: '#2158E0', // Brand blue
  success: '#1FAE7A', // Emerald green
};

export const AUTH_LIMITS = {
  OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
  OTP_MAX_ATTEMPTS: 5,
  OTP_RESEND_COOLDOWN_MS: 60 * 1000, // 60 seconds
  PIN_MAX_FAILED_ATTEMPTS: 5,
  PIN_LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  NEW_DEVICE_INACTIVITY_DAYS: 30,
};
