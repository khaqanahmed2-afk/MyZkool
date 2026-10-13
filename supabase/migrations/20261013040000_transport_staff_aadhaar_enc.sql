-- Migration: 20261013040000_transport_staff_aadhaar_enc.sql
-- Add aadhaar_enc column to transport_staff for encrypted 12-digit Aadhaar storage.
-- Fully backwards-compatible with existing 4-digit id_proof_last4 records.

ALTER TABLE public.transport_staff
  ADD COLUMN IF NOT EXISTS aadhaar_enc TEXT;

COMMENT ON COLUMN public.transport_staff.aadhaar_enc IS 'AES-256-GCM encrypted 12-digit Aadhaar number (packed format). id_proof_last4 retains last 4 digits for masked display.';
