-- Migration: 20261013000000_academic_years_calendar_range_update.sql
-- Description: Update chk_academic_year_range constraint on public.academic_years
--              to allow annual calendar cycles where end_year >= start_year (e.g., January–December).
--              Forward-only, idempotent, and non-destructive.

DO $$
BEGIN
  -- Reconcile chk_academic_year_range to allow end_year >= start_year
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.academic_years'::regclass
      AND conname = 'chk_academic_year_range'
  ) THEN
    ALTER TABLE public.academic_years DROP CONSTRAINT chk_academic_year_range;
  END IF;

  ALTER TABLE public.academic_years
    ADD CONSTRAINT chk_academic_year_range
    CHECK (end_year >= start_year);
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
