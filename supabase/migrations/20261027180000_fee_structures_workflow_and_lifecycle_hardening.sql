-- ============================================================================
-- Migration: 20261027180000_fee_structures_workflow_and_lifecycle_hardening.sql
-- Description: Fee Structures Lifecycle, Revision Safety & Idempotent Bulk Billing
-- 1. Expands status constraint to include ('draft', 'active', 'superseded', 'archived')
-- 2. Adds composite indexes for fast filtering and student assignment lookups
-- 3. Provides preview_fee_structure_assignment RPC for previewing affected students
-- 4. Provides bulk_assign_fee_structure RPC for transactional, idempotent billing
-- ============================================================================

-- 1. Ensure status check constraint on fee_structures supports 'superseded'
DO $$
BEGIN
  ALTER TABLE public.fee_structures DROP CONSTRAINT IF EXISTS fee_structures_status_check;
  ALTER TABLE public.fee_structures ADD CONSTRAINT fee_structures_status_check
    CHECK (status IN ('draft', 'active', 'superseded', 'archived'));
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint update skipped or failed: %', SQLERRM;
END $$;

-- 2. Indexes for fast class/section/year query filters and tenant isolation
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_ay_status_class
  ON public.fee_structures (school_id, academic_year_id, status, class_id);

CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_school_ay_status
  ON public.student_fee_assignments (school_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS idx_student_fee_assignments_structure
  ON public.student_fee_assignments (school_id, structure_id, status);

CREATE INDEX IF NOT EXISTS idx_student_dues_source_ref_lookup
  ON public.student_dues (school_id, student_id, source, source_ref);

-- ============================================================================
-- 3. RPC: preview_fee_structure_assignment
-- Previews eligible students, existing assignments, transport riders and projected dues
-- before any changes are committed.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.preview_fee_structure_assignment(
  p_school_id UUID,
  p_structure_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_structure RECORD;
  v_ay RECORD;
  v_target_class_ids UUID[];
  v_target_section_ids UUID[];
  v_total_eligible INT := 0;
  v_already_assigned INT := 0;
  v_transport_riders INT := 0;
  v_rte_count INT := 0;
  v_projected_dues_paise BIGINT := 0;
  v_structure_annual_paise BIGINT := 0;
  v_students JSONB := '[]'::jsonb;
  v_student_row RECORD;
  v_item RECORD;
BEGIN
  -- Multi-tenant authorization check
  IF auth.uid() IS NOT NULL AND NOT (
    public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access to school records');
  END IF;

  -- 1. Fetch fee structure
  SELECT * INTO v_structure
  FROM public.fee_structures
  WHERE id = p_structure_id AND school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fee structure not found');
  END IF;

  -- 2. Fetch academic year
  SELECT * INTO v_ay
  FROM public.academic_years
  WHERE id = v_structure.academic_year_id AND school_id = p_school_id;

  -- 3. Resolve target classes
  IF v_structure.class_ids IS NOT NULL AND array_length(v_structure.class_ids, 1) > 0 THEN
    v_target_class_ids := v_structure.class_ids;
  ELSIF v_structure.class_id IS NOT NULL THEN
    v_target_class_ids := ARRAY[v_structure.class_id];
  ELSE
    SELECT array_agg(class_id) INTO v_target_class_ids
    FROM public.fee_structure_classes
    WHERE fee_structure_id = p_structure_id AND school_id = p_school_id;
  END IF;

  -- Resolve target sections
  IF v_structure.section_ids IS NOT NULL AND array_length(v_structure.section_ids, 1) > 0 THEN
    v_target_section_ids := v_structure.section_ids;
  ELSE
    SELECT array_agg(section_id) INTO v_target_section_ids
    FROM public.fee_structure_sections
    WHERE fee_structure_id = p_structure_id AND school_id = p_school_id;
  END IF;

  -- Calculate structure annualized base fee in paise
  FOR v_item IN
    SELECT fsi.id, fsi.amount_paise, fsi.frequency, fh.code, fh.rte_waivable
    FROM public.fee_structure_items fsi
    JOIN public.fee_heads fh ON fh.id = fsi.fee_head_id
    WHERE fsi.structure_id = p_structure_id AND fsi.school_id = p_school_id
  LOOP
    IF v_item.code <> 'transport_fee' THEN
      DECLARE
        v_mult INT := 1;
      BEGIN
        IF v_item.frequency = 'monthly' THEN v_mult := 12;
        ELSIF v_item.frequency = 'quarterly' THEN v_mult := 4;
        ELSIF v_item.frequency = 'half_yearly' THEN v_mult := 2;
        ELSIF v_item.frequency = 'yearly' OR v_item.frequency = 'one_time' THEN v_mult := 1;
        END IF;
        v_structure_annual_paise := v_structure_annual_paise + (COALESCE(v_item.amount_paise, 0) * v_mult);
      END;
    END IF;
  END LOOP;

  -- 4. Gather student preview data
  FOR v_student_row IN
    SELECT
      s.id AS student_id,
      s.first_name,
      s.last_name,
      s.admission_no,
      COALESCE(s.is_rte, false) AS is_rte,
      c.id AS class_id,
      c.name AS class_name,
      sec.id AS section_id,
      sec.name AS section_name,
      EXISTS (
        SELECT 1 FROM public.student_fee_assignments sfa
        WHERE sfa.school_id = p_school_id
          AND sfa.student_id = s.id
          AND sfa.academic_year_id = v_structure.academic_year_id
          AND sfa.structure_id = p_structure_id
          AND sfa.status = 'active'
      ) AS is_already_assigned,
      EXISTS (
        SELECT 1 FROM public.transport_assignments ta
        WHERE ta.school_id = p_school_id
          AND ta.student_id = s.id
          AND ta.status = 'active'
      ) AS has_transport,
      COALESCE((
        SELECT ta.monthly_fee_paise FROM public.transport_assignments ta
        WHERE ta.school_id = p_school_id
          AND ta.student_id = s.id
          AND ta.status = 'active'
        LIMIT 1
      ), 0) AS monthly_transport_paise
    FROM public.student_enrollments se
    JOIN public.students s ON s.id = se.student_id
    LEFT JOIN public.classes c ON c.id = se.class_id
    LEFT JOIN public.sections sec ON sec.id = se.section_id
    WHERE se.school_id = p_school_id
      AND se.academic_year_id = v_structure.academic_year_id
      AND se.status = 'active'
      AND (
        v_structure.target_type = 'all_classes'
        OR (
          (v_structure.target_type = 'specific_classes' OR v_structure.target_type IS NULL)
          AND (v_target_class_ids IS NULL OR se.class_id = ANY(v_target_class_ids))
        )
        OR (
          v_structure.target_type = 'specific_sections'
          AND (v_target_section_ids IS NULL OR se.section_id = ANY(v_target_section_ids))
        )
        OR (
          v_structure.target_type = 'specific_students'
          AND (v_structure.student_ids IS NOT NULL AND s.id = ANY(v_structure.student_ids))
        )
      )
    ORDER BY c.name, sec.name, s.first_name, s.last_name
  LOOP
    v_total_eligible := v_total_eligible + 1;
    IF v_student_row.is_already_assigned THEN
      v_already_assigned := v_already_assigned + 1;
    END IF;
    IF v_student_row.has_transport THEN
      v_transport_riders := v_transport_riders + 1;
    END IF;
    IF v_student_row.is_rte THEN
      v_rte_count := v_rte_count + 1;
    END IF;

    -- Add to projected dues (if student is not RTE)
    IF NOT v_student_row.is_rte THEN
      v_projected_dues_paise := v_projected_dues_paise + v_structure_annual_paise;
    END IF;
    -- Transport portion
    IF v_student_row.has_transport THEN
      v_projected_dues_paise := v_projected_dues_paise + (v_student_row.monthly_transport_paise * 12);
    END IF;

    -- Append to students array
    v_students := v_students || jsonb_build_object(
      'student_id', v_student_row.student_id,
      'first_name', v_student_row.first_name,
      'last_name', v_student_row.last_name,
      'admission_no', v_student_row.admission_no,
      'class_name', v_student_row.class_name,
      'section_name', v_student_row.section_name,
      'is_rte', v_student_row.is_rte,
      'is_already_assigned', v_student_row.is_already_assigned,
      'has_transport', v_student_row.has_transport,
      'monthly_transport_paise', v_student_row.monthly_transport_paise
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'structure', jsonb_build_object(
      'id', v_structure.id,
      'name', v_structure.name,
      'academic_year_id', v_structure.academic_year_id,
      'version', v_structure.version,
      'status', v_structure.status,
      'annual_fee_paise', v_structure_annual_paise
    ),
    'summary', jsonb_build_object(
      'total_eligible', v_total_eligible,
      'already_assigned', v_already_assigned,
      'newly_eligible', v_total_eligible - v_already_assigned,
      'transport_riders', v_transport_riders,
      'rte_count', v_rte_count,
      'projected_dues_paise', v_projected_dues_paise
    ),
    'students', v_students
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.preview_fee_structure_assignment(UUID, UUID) TO authenticated, service_role;

-- ============================================================================
-- 4. RPC: bulk_assign_fee_structure
-- Executes bulk assignment and billing transactionally and idempotently.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bulk_assign_fee_structure(
  p_school_id UUID,
  p_structure_id UUID,
  p_generate_dues BOOLEAN DEFAULT true,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_structure RECORD;
  v_ay RECORD;
  v_target_class_ids UUID[];
  v_target_section_ids UUID[];
  v_student RECORD;
  v_assigned_count INT := 0;
  v_already_assigned_count INT := 0;
  v_created_dues_count INT := 0;
  v_skipped_count INT := 0;
  v_transport_count INT := 0;
  v_assignment_id UUID;
  v_transport_head_id UUID;
  v_trans_assign RECORD;
  v_item RECORD;
  v_term RECORD;
  v_terms_count INT := 0;
  v_existing_due_id UUID;
  v_concession_paise BIGINT;
  v_net_paise BIGINT;
  v_due_id UUID;
BEGIN
  -- Multi-tenant authorization check
  IF auth.uid() IS NOT NULL AND NOT (
    public.is_school_admin(p_school_id) OR public.is_school_member(p_school_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access to school records');
  END IF;

  -- 1. Fetch structure
  SELECT * INTO v_structure
  FROM public.fee_structures
  WHERE id = p_structure_id AND school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fee structure not found');
  END IF;

  -- 2. Fetch academic year
  SELECT * INTO v_ay
  FROM public.academic_years
  WHERE id = v_structure.academic_year_id AND school_id = p_school_id;

  -- 3. Resolve target class IDs
  IF v_structure.class_ids IS NOT NULL AND array_length(v_structure.class_ids, 1) > 0 THEN
    v_target_class_ids := v_structure.class_ids;
  ELSIF v_structure.class_id IS NOT NULL THEN
    v_target_class_ids := ARRAY[v_structure.class_id];
  ELSE
    SELECT array_agg(class_id) INTO v_target_class_ids
    FROM public.fee_structure_classes
    WHERE fee_structure_id = p_structure_id AND school_id = p_school_id;
  END IF;

  -- Resolve target section IDs
  IF v_structure.section_ids IS NOT NULL AND array_length(v_structure.section_ids, 1) > 0 THEN
    v_target_section_ids := v_structure.section_ids;
  ELSE
    SELECT array_agg(section_id) INTO v_target_section_ids
    FROM public.fee_structure_sections
    WHERE fee_structure_id = p_structure_id AND school_id = p_school_id;
  END IF;

  -- Find Transport fee head
  SELECT id INTO v_transport_head_id
  FROM public.fee_heads
  WHERE school_id = p_school_id AND (code = 'transport_fee' OR (kind = 'recurring' AND lower(name) LIKE '%transport%'))
  ORDER BY is_system DESC, created_at ASC
  LIMIT 1;

  -- 4. Process eligible students
  FOR v_student IN
    SELECT DISTINCT
      s.id,
      s.first_name,
      s.last_name,
      s.admission_no,
      COALESCE(s.is_rte, false) AS is_rte,
      se.class_id,
      se.section_id
    FROM public.student_enrollments se
    JOIN public.students s ON s.id = se.student_id
    WHERE se.school_id = p_school_id
      AND se.academic_year_id = v_structure.academic_year_id
      AND se.status = 'active'
      AND (
        v_structure.target_type = 'all_classes'
        OR (
          (v_structure.target_type = 'specific_classes' OR v_structure.target_type IS NULL)
          AND (v_target_class_ids IS NULL OR se.class_id = ANY(v_target_class_ids))
        )
        OR (
          v_structure.target_type = 'specific_sections'
          AND (v_target_section_ids IS NULL OR se.section_id = ANY(v_target_section_ids))
        )
        OR (
          v_structure.target_type = 'specific_students'
          AND (v_structure.student_ids IS NOT NULL AND s.id = ANY(v_structure.student_ids))
        )
      )
  LOOP
    -- A. Replace any old assignment for different structure in same year
    UPDATE public.student_fee_assignments
    SET status = 'replaced', updated_at = now()
    WHERE school_id = p_school_id
      AND student_id = v_student.id
      AND academic_year_id = v_structure.academic_year_id
      AND structure_id <> p_structure_id
      AND status = 'active';

    -- Check if active assignment exists for this structure
    SELECT id INTO v_assignment_id
    FROM public.student_fee_assignments
    WHERE school_id = p_school_id
      AND student_id = v_student.id
      AND academic_year_id = v_structure.academic_year_id
      AND structure_id = p_structure_id
      AND status = 'active'
    LIMIT 1;

    IF v_assignment_id IS NULL THEN
      v_assignment_id := gen_random_uuid();
      INSERT INTO public.student_fee_assignments (
        id, school_id, student_id, academic_year_id,
        structure_id, structure_version, assigned_at,
        assigned_by, status, created_at, updated_at
      ) VALUES (
        v_assignment_id, p_school_id, v_student.id, v_structure.academic_year_id,
        p_structure_id, COALESCE(v_structure.version, 1), now(),
        p_actor_id, 'active', now(), now()
      );
      v_assigned_count := v_assigned_count + 1;
    ELSE
      v_already_assigned_count := v_already_assigned_count + 1;
    END IF;

    -- B. If requested, generate dues idempotently
    IF p_generate_dues THEN
      FOR v_item IN
        SELECT fsi.*, fh.name AS head_name, fh.rte_waivable
        FROM public.fee_structure_items fsi
        JOIN public.fee_heads fh ON fh.id = fsi.fee_head_id
        WHERE fsi.structure_id = p_structure_id
          AND fsi.school_id = p_school_id
          AND (v_transport_head_id IS NULL OR fsi.fee_head_id <> v_transport_head_id)
      LOOP
        SELECT COUNT(*) INTO v_terms_count
        FROM public.fee_structure_item_terms
        WHERE item_id = v_item.id;

        IF v_terms_count > 0 THEN
          FOR v_term IN
            SELECT fsit.term_id, fsit.amount_paise, ft.due_date, ft.name AS term_name
            FROM public.fee_structure_item_terms fsit
            JOIN public.fee_terms ft ON ft.id = fsit.term_id
            WHERE fsit.item_id = v_item.id AND fsit.amount_paise > 0
          LOOP
            SELECT id INTO v_existing_due_id
            FROM public.student_dues
            WHERE school_id = p_school_id
              AND student_id = v_student.id
              AND academic_year_id = v_structure.academic_year_id
              AND fee_head_id = v_item.fee_head_id
              AND term_id = v_term.term_id
              AND source = 'structure';

            IF v_existing_due_id IS NULL THEN
              v_concession_paise := 0;
              IF v_student.is_rte AND v_item.rte_waivable THEN
                v_concession_paise := v_term.amount_paise;
              END IF;
              v_net_paise := v_term.amount_paise - v_concession_paise;
              v_due_id := gen_random_uuid();

              INSERT INTO public.student_dues (
                id, school_id, student_id, academic_year_id,
                fee_head_id, term_id, source, source_ref,
                description, gross_paise, concession_paise, net_paise,
                paid_paise, balance_paise, due_date, status,
                created_at, updated_at, created_by
              ) VALUES (
                v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
                v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
                v_item.head_name || ' - ' || v_term.term_name, v_term.amount_paise, v_concession_paise, v_net_paise,
                0, v_net_paise, v_term.due_date, CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
                now(), now(), p_actor_id
              );

              -- Append to fee_ledger
              IF v_concession_paise > 0 THEN
                INSERT INTO public.fee_ledger (
                  id, school_id, student_id, academic_year_id,
                  due_id, entry_type, amount_paise, note, created_at, created_by
                ) VALUES
                  (gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id, v_due_id, 'due_created', v_term.amount_paise, 'Gross due created', now(), p_actor_id),
                  (gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id, v_due_id, 'concession', -v_concession_paise, 'RTE concession waiver', now(), p_actor_id);
              ELSIF v_net_paise > 0 THEN
                INSERT INTO public.fee_ledger (
                  id, school_id, student_id, academic_year_id,
                  due_id, entry_type, amount_paise, note, created_at, created_by
                ) VALUES
                  (gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id, v_due_id, 'due_created', v_net_paise, 'Due created from fee structure', now(), p_actor_id);
              END IF;

              v_created_dues_count := v_created_dues_count + 1;
            ELSE
              v_skipped_count := v_skipped_count + 1;
            END IF;
          END LOOP;
        ELSE
          -- Fallback: Use fee_terms derived from academic year
          FOR v_term IN
            SELECT ft.id AS term_id, ft.due_date, ft.name AS term_name, ft.sort_order
            FROM public.fee_terms ft
            WHERE ft.school_id = p_school_id AND ft.academic_year_id = v_structure.academic_year_id
            ORDER BY ft.sort_order ASC
          LOOP
            DECLARE
              v_matches BOOLEAN := false;
            BEGIN
              IF v_item.frequency = 'monthly' THEN
                v_matches := true;
              ELSIF v_item.frequency = 'quarterly' AND (v_term.sort_order % 3 = 0) AND v_term.sort_order < 12 THEN
                v_matches := true;
              ELSIF v_item.frequency = 'half_yearly' AND (v_term.sort_order = 0 OR v_term.sort_order = 6) THEN
                v_matches := true;
              ELSIF (v_item.frequency = 'yearly' OR v_item.frequency = 'one_time') AND v_term.sort_order = 0 THEN
                v_matches := true;
              END IF;

              IF v_matches AND COALESCE(v_item.amount_paise, 0) > 0 THEN
                SELECT id INTO v_existing_due_id
                FROM public.student_dues
                WHERE school_id = p_school_id
                  AND student_id = v_student.id
                  AND academic_year_id = v_structure.academic_year_id
                  AND fee_head_id = v_item.fee_head_id
                  AND term_id = v_term.term_id
                  AND source = 'structure';

                IF v_existing_due_id IS NULL THEN
                  v_concession_paise := 0;
                  IF v_student.is_rte AND v_item.rte_waivable THEN
                    v_concession_paise := v_item.amount_paise;
                  END IF;
                  v_net_paise := v_item.amount_paise - v_concession_paise;
                  v_due_id := gen_random_uuid();

                  INSERT INTO public.student_dues (
                    id, school_id, student_id, academic_year_id,
                    fee_head_id, term_id, source, source_ref,
                    description, gross_paise, concession_paise, net_paise,
                    paid_paise, balance_paise, due_date, status,
                    created_at, updated_at, created_by
                  ) VALUES (
                    v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
                    v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
                    v_item.head_name || ' - ' || v_term.term_name, v_item.amount_paise, v_concession_paise, v_net_paise,
                    0, v_net_paise, v_term.due_date, CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
                    now(), now(), p_actor_id
                  );

                  IF v_net_paise > 0 THEN
                    INSERT INTO public.fee_ledger (
                      id, school_id, student_id, academic_year_id,
                      due_id, entry_type, amount_paise, note, created_at, created_by
                    ) VALUES (
                      gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                      v_due_id, 'due_created', v_net_paise, 'Due created from fee structure', now(), p_actor_id
                    );
                  END IF;

                  v_created_dues_count := v_created_dues_count + 1;
                ELSE
                  v_skipped_count := v_skipped_count + 1;
                END IF;
              END IF;
            END;
          END LOOP;
        END IF;
      END LOOP;

      -- C. Transport Dues strictly for active riders
      IF v_transport_head_id IS NOT NULL THEN
        SELECT * INTO v_trans_assign
        FROM public.transport_assignments
        WHERE school_id = p_school_id
          AND student_id = v_student.id
          AND status = 'active'
          AND monthly_fee_paise > 0
        LIMIT 1;

        IF FOUND THEN
          v_transport_count := v_transport_count + 1;
          FOR v_term IN
            SELECT ft.id AS term_id, ft.due_date, ft.name AS term_name
            FROM public.fee_terms ft
            WHERE ft.school_id = p_school_id AND ft.academic_year_id = v_structure.academic_year_id
            ORDER BY ft.sort_order ASC
          LOOP
            SELECT id INTO v_existing_due_id
            FROM public.student_dues
            WHERE school_id = p_school_id
              AND student_id = v_student.id
              AND academic_year_id = v_structure.academic_year_id
              AND term_id = v_term.term_id
              AND source = 'transport'
              AND status <> 'cancelled';

            IF v_existing_due_id IS NULL THEN
              v_due_id := gen_random_uuid();
              INSERT INTO public.student_dues (
                id, school_id, student_id, academic_year_id,
                fee_head_id, term_id, source, source_ref,
                description, gross_paise, concession_paise, net_paise,
                paid_paise, balance_paise, due_date, status,
                created_at, updated_at, created_by
              ) VALUES (
                v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
                v_transport_head_id, v_term.term_id, 'transport', v_trans_assign.id,
                'Transport Fee - ' || v_term.term_name, v_trans_assign.monthly_fee_paise, 0, v_trans_assign.monthly_fee_paise,
                0, v_trans_assign.monthly_fee_paise, v_term.due_date, 'pending',
                now(), now(), p_actor_id
              );

              INSERT INTO public.fee_ledger (
                id, school_id, student_id, academic_year_id,
                due_id, entry_type, amount_paise, note, created_at, created_by
              ) VALUES (
                gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                v_due_id, 'due_created', v_trans_assign.monthly_fee_paise, 'Transport due created', now(), p_actor_id
              );

              v_created_dues_count := v_created_dues_count + 1;
            ELSE
              v_skipped_count := v_skipped_count + 1;
            END IF;
          END LOOP;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'already_assigned_count', v_already_assigned_count,
    'created_dues_count', v_created_dues_count,
    'skipped_count', v_skipped_count,
    'transport_riders_count', v_transport_count
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_assign_fee_structure(UUID, UUID, BOOLEAN, UUID) TO authenticated, service_role;
