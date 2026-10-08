/**
 * Shared Zod Schemas
 * Source of Truth: docs/SPEC.md
 */

import { z } from 'zod';

export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'admin',
  'api',
  'mail',
  'support',
  'static',
  'assets',
  'cdn',
  'staging',
  'dev',
  'demo',
  'myzkool',
  'portal',
  'parent',
  'test',
  'status',
  'billing',
  'help',
  'docs',
  'login',
  'auth',
] as const;

export const SubdomainSchema = z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(30, 'Subdomain cannot exceed 30 characters')
  .regex(
    /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/,
    'Subdomain can only contain lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'
  )
  .refine(
    (sub) => !RESERVED_SUBDOMAINS.includes(sub as any),
    'This subdomain is reserved and cannot be used'
  );

export const IndianMobileSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number');

export const PinSchema = z
  .string()
  .regex(/^\d{4,6}$/, 'PIN must be between 4 and 6 digits');

export const OtpSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be a 6-digit number');

export const SendOtpSchema = z.object({
  mobile: IndianMobileSchema,
  purpose: z.enum(['signup', 'login', 'reset_pin', 'staff_invite']),
});

export const VerifyOtpSchema = z.object({
  mobile: IndianMobileSchema,
  code: OtpSchema,
  purpose: z.enum(['signup', 'login', 'reset_pin', 'staff_invite']),
});

export const PinLoginSchema = z.object({
  mobile: IndianMobileSchema,
  pin: PinSchema,
});

export const SetPinSchema = z.object({
  mobile: IndianMobileSchema,
  pin: PinSchema,
  otpCode: OtpSchema,
});

export const SchoolOnboardingStep1Schema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: IndianMobileSchema,
  email: z.string().email().optional(),
  pin: PinSchema,
});

export const SchoolOnboardingStep2Schema = z.object({
  name: z.string().min(2, 'School name is required'),
  board: z.string().min(1, 'Board is required'),
  medium: z.string().min(1, 'Medium is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a valid 6-digit PIN code'),
  contactPhone: IndianMobileSchema,
  strengthBand: z.string().optional(),
});

export const SchoolOnboardingStep3Schema = z.object({
  subdomain: SubdomainSchema,
  logoUrl: z.string().url().optional(),
  tagline: z.string().max(100).optional(),
  brandColor: z.string().regex(/^#([0-9a-fA-F]{6})$/, 'Must be a valid hex color').default('#2158E0'),
  address: z.string().optional(),
  phone: z.string().optional(),
});
