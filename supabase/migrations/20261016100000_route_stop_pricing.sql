-- Migration: 20261016100000_route_stop_pricing.sql
-- Supports route-wise, individual-stop transport pricing (both-way, pickup-only, drop-only)

-- 1. Ensure columns exist on route_stops table with non-negative constraints
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS monthly_fee_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_only_monthly_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drop_only_monthly_paise BIGINT NOT NULL DEFAULT 0;

UPDATE public.route_stops SET monthly_fee_paise = 0 WHERE monthly_fee_paise IS NULL;
ALTER TABLE public.route_stops ALTER COLUMN monthly_fee_paise SET NOT NULL;
ALTER TABLE public.route_stops ALTER COLUMN monthly_fee_paise SET DEFAULT 0;

-- 2. Add check constraints if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_route_stops_monthly_fee_paise_nonneg'
  ) THEN
    ALTER TABLE public.route_stops
      ADD CONSTRAINT check_route_stops_monthly_fee_paise_nonneg
      CHECK (monthly_fee_paise >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_route_stops_pickup_only_monthly_paise_nonneg'
  ) THEN
    ALTER TABLE public.route_stops
      ADD CONSTRAINT check_route_stops_pickup_only_monthly_paise_nonneg
      CHECK (pickup_only_monthly_paise >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_route_stops_drop_only_monthly_paise_nonneg'
  ) THEN
    ALTER TABLE public.route_stops
      ADD CONSTRAINT check_route_stops_drop_only_monthly_paise_nonneg
      CHECK (drop_only_monthly_paise >= 0);
  END IF;
END $$;

-- 3. Index for performance querying stops with school and route
CREATE INDEX IF NOT EXISTS idx_route_stops_school_route_seq
  ON public.route_stops (school_id, route_id, sequence);
