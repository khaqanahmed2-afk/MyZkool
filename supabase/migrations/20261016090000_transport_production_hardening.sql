-- Migration: 20261016090000_transport_production_hardening.sql
-- Hardens Transport Module database integrity, idempotency, and cross-tenant safeguards.

-- 1. Idempotency Unique Indexes on student_dues for Transport Source
-- Prevents duplicate transport dues and duplicate ledger entries during network retries or repeated executions.
CREATE UNIQUE INDEX IF NOT EXISTS unique_transport_due_per_assignment_term
  ON public.student_dues (school_id, source_ref, term_id)
  WHERE source = 'transport' AND term_id IS NOT NULL AND status != 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS unique_transport_due_per_assignment_null_term
  ON public.student_dues (school_id, source_ref)
  WHERE source = 'transport' AND term_id IS NULL AND status != 'cancelled';

-- 2. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_transport_assignments_stops
  ON public.transport_assignments (pickup_stop_id, drop_stop_id);

CREATE INDEX IF NOT EXISTS idx_route_stops_school_route
  ON public.route_stops (school_id, route_id);

CREATE INDEX IF NOT EXISTS idx_route_stops_route_seq
  ON public.route_stops (route_id, sequence);

CREATE INDEX IF NOT EXISTS idx_transport_fee_zones_school
  ON public.transport_fee_zones (school_id)
  WHERE deleted_at IS NULL;

-- 3. Trigger Function: Validate Transport Assignment Stops and Student School
-- Ensures at the database level that:
-- a) pickup_stop_id and drop_stop_id belong to route_id and school_id
-- b) student_id belongs to the same school_id
CREATE OR REPLACE FUNCTION public.validate_transport_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_route UUID;
  v_pickup_school UUID;
  v_drop_route UUID;
  v_drop_school UUID;
  v_student_school UUID;
BEGIN
  -- 1. Validate student belongs to the same school
  SELECT school_id INTO v_student_school
  FROM public.students
  WHERE id = NEW.student_id;

  IF v_student_school IS NULL THEN
    RAISE EXCEPTION 'Student % does not exist', NEW.student_id;
  END IF;

  IF v_student_school <> NEW.school_id THEN
    RAISE EXCEPTION 'Cross-tenant violation: Student % does not belong to school %', NEW.student_id, NEW.school_id;
  END IF;

  -- 2. Validate pickup_stop_id
  SELECT route_id, school_id INTO v_pickup_route, v_pickup_school
  FROM public.route_stops
  WHERE id = NEW.pickup_stop_id;

  IF v_pickup_route IS NULL THEN
    RAISE EXCEPTION 'Pickup stop % does not exist', NEW.pickup_stop_id;
  END IF;

  IF v_pickup_route <> NEW.route_id OR v_pickup_school <> NEW.school_id THEN
    RAISE EXCEPTION 'Pickup stop % does not belong to route % in school %', NEW.pickup_stop_id, NEW.route_id, NEW.school_id;
  END IF;

  -- 3. Validate drop_stop_id
  SELECT route_id, school_id INTO v_drop_route, v_drop_school
  FROM public.route_stops
  WHERE id = NEW.drop_stop_id;

  IF v_drop_route IS NULL THEN
    RAISE EXCEPTION 'Drop stop % does not exist', NEW.drop_stop_id;
  END IF;

  IF v_drop_route <> NEW.route_id OR v_drop_school <> NEW.school_id THEN
    RAISE EXCEPTION 'Drop stop % does not belong to route % in school %', NEW.drop_stop_id, NEW.route_id, NEW.school_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_transport_assignment ON public.transport_assignments;
CREATE TRIGGER trg_validate_transport_assignment
  BEFORE INSERT OR UPDATE ON public.transport_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transport_assignment();

COMMENT ON FUNCTION public.validate_transport_assignment() IS 'Enforces that student belongs to school and that pickup/drop stops belong to the selected route and school.';
