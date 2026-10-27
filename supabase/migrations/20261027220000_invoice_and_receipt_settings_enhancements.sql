-- Migration: 20261027220000_invoice_and_receipt_settings_enhancements.sql
-- Description:
-- 1. Adds separate payment receipt visibility columns and additional invoice configuration columns to public.fee_settings.
-- 2. Preserves all existing fee_settings data and defaults.
-- 3. Enables independent configuration of Invoice and Receipt documents while maintaining authoritative school profile branding.

ALTER TABLE public.fee_settings
  -- Additional Invoice detail toggles
  ADD COLUMN IF NOT EXISTS show_parent_name BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_concession_breakdown BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_billing_period BOOLEAN NOT NULL DEFAULT true,

  -- Payment Receipt specific visibility toggles
  ADD COLUMN IF NOT EXISTS show_receipt_school_logo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_school_name BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_address BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_phone BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_number_date BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_student_details BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_parent_name BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_payment_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_transaction_ref BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_fee_allocation BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_amount_received BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_amount_in_words BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_balance_remaining BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_advance_credit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_receipt_cashier BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_signatory BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_terms BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_receipt_acknowledgement BOOLEAN NOT NULL DEFAULT true;
