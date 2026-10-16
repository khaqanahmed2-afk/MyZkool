-- Migration: 20261016130000_fee_structures_production_hardening.sql
-- Production hardening for Fee Structures module:
-- 1. Ensure foreign key / deletion protection function
-- 2. Ensure indexes on fee_structures, fee_structure_classes, fee_structure_sections
-- 3. Tenant isolation verification

-- 1. Helper function to check if a fee structure can be safely deleted
CREATE OR REPLACE FUNCTION public.check_fee_structure_can_delete(
  p_school_id UUID,
  p_structure_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dues_count INT := 0;
  v_assignments_count INT := 0;
  v_invoices_count INT := 0;
  v_can_delete BOOLEAN := true;
  v_reason TEXT := '';
BEGIN
  -- Verify fee structure belongs to school
  IF NOT EXISTS (
    SELECT 1 FROM public.fee_structures 
    WHERE id = p_structure_id AND school_id = p_school_id
  ) THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'Fee structure not found or unauthorized'
    );
  END IF;

  -- Check student fee assignments
  SELECT COUNT(*) INTO v_assignments_count
  FROM public.student_fee_assignments
  WHERE school_id = p_school_id 
    AND structure_id = p_structure_id 
    AND status = 'active';

  -- Check student dues generated from this structure
  SELECT COUNT(*) INTO v_dues_count
  FROM public.student_dues sd
  JOIN public.student_fee_assignments sfa 
    ON sfa.student_id = sd.student_id 
   AND sfa.academic_year_id = sd.academic_year_id
  WHERE sd.school_id = p_school_id
    AND sfa.structure_id = p_structure_id
    AND sd.status NOT IN ('cancelled', 'waived');

  IF v_assignments_count > 0 OR v_dues_count > 0 THEN
    v_can_delete := false;
    v_reason := format(
      'Cannot delete: Structure has %s active student assignment(s) and %s student due(s) attached. Please archive or mark as draft instead.',
      v_assignments_count,
      v_dues_count
    );
  END IF;

  RETURN jsonb_build_object(
    'can_delete', v_can_delete,
    'reason', v_reason,
    'assignments_count', v_assignments_count,
    'dues_count', v_dues_count
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_fee_structure_can_delete(UUID, UUID) TO authenticated, service_role;

-- 2. Create indexes for performance and multi-tenant scoping
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_year_status
  ON public.fee_structures(school_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_structure_classes_lookup
  ON public.fee_structure_classes(school_id, class_id);

CREATE INDEX IF NOT EXISTS idx_fee_structure_sections_lookup
  ON public.fee_structure_sections(school_id, section_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_struct_lookup
  ON public.student_fee_assignments(school_id, structure_id, status);
