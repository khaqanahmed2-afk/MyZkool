-- Migration: 017_fee_cycle_terms.sql
-- Adds period_start, period_end, and applicable_fee_head_ids to fee_terms

ALTER TABLE public.fee_terms 
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS applicable_fee_head_ids UUID[] DEFAULT '{}';

-- Index for searching applicable fee heads
CREATE INDEX IF NOT EXISTS idx_fee_terms_applicable_heads 
  ON public.fee_terms USING GIN (applicable_fee_head_ids);
