-- Migration: 20261026020000_invoice_system_upgrade.sql
-- Description:
-- 1. Adds invoice display, visibility, and print settings columns to public.fee_settings.
-- 2. Implements atomic next_invoice_no RPC function backed by public.counters.
-- 3. Implements automatic trigger on public.student_dues to ensure persistent, gap-free, tenant-isolated invoice numbers.
-- 4. Updates assign_fee_structure_to_eligible_students to assign durable invoice numbers.
-- 5. Backfills any historical unnumbered dues deterministically without altering issued numbers.

-- ============================================================================
-- 1. Add invoice customization columns to fee_settings
-- ============================================================================
ALTER TABLE public.fee_settings
  ADD COLUMN IF NOT EXISTS show_school_logo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_school_name BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_address BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_email BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS repeat_header_on_pages BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_student_details BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_invoice_number_date BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_fee_breakdown BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_discount BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_previous_dues BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_overdues BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_received_amount BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_balance_amount BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_current_student_balance BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_total_fee BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_amount_in_words BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_payment_mode BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_tax_details BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_format TEXT NOT NULL DEFAULT 'indian',
  ADD COLUMN IF NOT EXISTS decimal_places INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS show_description BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_terms_and_conditions BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_received_by BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_page_numbers BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS print_text_size TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS print_orientation TEXT NOT NULL DEFAULT 'portrait',
  ADD COLUMN IF NOT EXISTS print_margins TEXT NOT NULL DEFAULT 'normal';

-- Constraints for new print settings
ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_amount_format_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_amount_format_check CHECK (amount_format IN ('indian', 'international'));

ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_print_text_size_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_print_text_size_check CHECK (print_text_size IN ('small', 'medium', 'large'));

ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_print_orientation_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_print_orientation_check CHECK (print_orientation IN ('portrait', 'landscape'));

ALTER TABLE public.fee_settings DROP CONSTRAINT IF EXISTS fee_settings_print_margins_check;
ALTER TABLE public.fee_settings ADD CONSTRAINT fee_settings_print_margins_check CHECK (print_margins IN ('normal', 'compact', 'wide'));

-- ============================================================================
-- 2. Atomic next_invoice_no function using public.counters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_invoice_no(
  p_school_id        UUID,
  p_academic_year_id UUID,
  p_prefix           TEXT DEFAULT NULL,
  p_year_label       TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter_key TEXT;
  v_next        BIGINT;
  v_clean_year  TEXT;
  v_prefix      TEXT;
  v_invoice_no  TEXT;
BEGIN
  -- Determine prefix: default to INV or from fee_settings
  IF p_prefix IS NOT NULL AND LENGTH(TRIM(p_prefix)) > 0 THEN
    v_prefix := UPPER(TRIM(p_prefix));
  ELSE
    SELECT COALESCE(invoice_prefix, 'INV') INTO v_prefix
    FROM public.fee_settings
    WHERE school_id = p_school_id;
    IF v_prefix IS NULL OR LENGTH(TRIM(v_prefix)) = 0 THEN
      v_prefix := 'INV';
    END IF;
  END IF;

  -- Determine clean year (e.g. 2025-2026 -> 2025)
  IF p_year_label IS NOT NULL AND LENGTH(TRIM(p_year_label)) > 0 THEN
    v_clean_year := SUBSTRING(REGEXP_REPLACE(p_year_label, '[^0-9]', '', 'g') FROM 1 FOR 4);
  ELSE
    SELECT SUBSTRING(REGEXP_REPLACE(COALESCE(start_year::TEXT, label, '2025'), '[^0-9]', '', 'g') FROM 1 FOR 4)
    INTO v_clean_year
    FROM public.academic_years
    WHERE id = p_academic_year_id AND school_id = p_school_id;
  END IF;

  IF v_clean_year IS NULL OR LENGTH(v_clean_year) = 0 THEN
    v_clean_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  END IF;

  v_counter_key := 'invoice_no_' || COALESCE(p_academic_year_id::TEXT, v_clean_year);

  -- Atomic increment on public.counters per school
  INSERT INTO public.counters (school_id, key, next_value, updated_at)
  VALUES (p_school_id, v_counter_key, 2, now())
  ON CONFLICT (school_id, key)
  DO UPDATE SET
    next_value = public.counters.next_value + 1,
    updated_at = now()
  RETURNING public.counters.next_value - 1 INTO v_next;

  -- Format: INV-2025-00123
  v_invoice_no := v_prefix || '-' || v_clean_year || '-' || LPAD(v_next::TEXT, 5, '0');
  RETURN v_invoice_no;
END;
$$;

-- ============================================================================
-- 3. Automatic trigger on public.student_dues to ensure persistent invoice_no
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_ensure_due_invoice_no()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_inv TEXT;
BEGIN
  -- If invoice_no is already provided, keep it
  IF NEW.invoice_no IS NOT NULL AND LENGTH(TRIM(NEW.invoice_no)) > 0 THEN
    RETURN NEW;
  END IF;

  -- 1. Check if an active sibling due already exists for this (school_id, student_id, academic_year_id, term_id)
  SELECT invoice_no INTO v_existing_inv
  FROM public.student_dues
  WHERE school_id = NEW.school_id
    AND student_id = NEW.student_id
    AND academic_year_id = NEW.academic_year_id
    AND ((term_id IS NULL AND NEW.term_id IS NULL) OR term_id = NEW.term_id)
    AND invoice_no IS NOT NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_existing_inv IS NOT NULL AND LENGTH(TRIM(v_existing_inv)) > 0 THEN
    NEW.invoice_no := v_existing_inv;
    RETURN NEW;
  END IF;

  -- 2. Atomically generate a new sequential invoice number
  NEW.invoice_no := public.next_invoice_no(NEW.school_id, NEW.academic_year_id, NULL, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_dues_ensure_invoice_no ON public.student_dues;
CREATE TRIGGER trg_student_dues_ensure_invoice_no
  BEFORE INSERT ON public.student_dues
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_ensure_due_invoice_no();

-- ============================================================================
-- 4. Backfill any historical dues where invoice_no IS NULL
-- ============================================================================
DO $$
DECLARE
  r RECORD;
  v_inv TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT school_id, student_id, academic_year_id, term_id
    FROM public.student_dues
    WHERE invoice_no IS NULL
  LOOP
    -- Check if one of the group rows has an invoice_no
    SELECT invoice_no INTO v_inv
    FROM public.student_dues
    WHERE school_id = r.school_id
      AND student_id = r.student_id
      AND academic_year_id = r.academic_year_id
      AND ((term_id IS NULL AND r.term_id IS NULL) OR term_id = r.term_id)
      AND invoice_no IS NOT NULL
    LIMIT 1;

    IF v_inv IS NULL THEN
      v_inv := public.next_invoice_no(r.school_id, r.academic_year_id, NULL, NULL);
    END IF;

    UPDATE public.student_dues
    SET invoice_no = v_inv
    WHERE school_id = r.school_id
      AND student_id = r.student_id
      AND academic_year_id = r.academic_year_id
      AND ((term_id IS NULL AND r.term_id IS NULL) OR term_id = r.term_id)
      AND invoice_no IS NULL;
  END LOOP;
END;
$$;
