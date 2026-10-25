-- Migration: 20261025070000_fee_and_receipt_settings_rebuild.sql
-- Description: Add receipt themes, school branding, signature, terms, footer, and invoice settings to fee_settings

ALTER TABLE public.fee_settings
  ADD COLUMN IF NOT EXISTS receipt_theme TEXT NOT NULL DEFAULT 'myzkool_blue',
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signatory_name TEXT DEFAULT 'Authorized Signatory',
  ADD COLUMN IF NOT EXISTS signatory_designation TEXT DEFAULT 'Accounts Officer',
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_header_title TEXT DEFAULT 'Official Fee Receipt',
  ADD COLUMN IF NOT EXISTS receipt_terms JSONB DEFAULT '["Fee once paid is non-refundable except security deposit.", "Please retain this official receipt for tax & records.", "Any discrepancy must be reported within 7 business days."]'::jsonb,
  ADD COLUMN IF NOT EXISTS receipt_footer TEXT DEFAULT 'This is a computer generated receipt and does not require a physical signature unless stamped.',
  ADD COLUMN IF NOT EXISTS refund_policy_note TEXT DEFAULT 'Refunds are processed in accordance with school management policies and audited ledger reconciliation.',
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  ADD COLUMN IF NOT EXISTS invoice_due_days INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS invoice_notes TEXT DEFAULT 'Payment due within 15 days of issue.',
  ADD COLUMN IF NOT EXISTS enable_cash_reconciliation BOOLEAN NOT NULL DEFAULT true;

-- Update receipt_paper constraint to include 'a4'
ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_receipt_paper_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_receipt_paper_check CHECK (receipt_paper IN ('a4', 'a5', 'thermal80'));

-- Add constraint for receipt_theme (3 predefined themes only)
ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_receipt_theme_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_receipt_theme_check CHECK (receipt_theme IN ('myzkool_blue', 'mint_pastel', 'lavender_pastel'));
