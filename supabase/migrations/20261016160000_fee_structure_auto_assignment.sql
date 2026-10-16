-- ============================================================================
-- Migration: 20261016160000_fee_structure_auto_assignment.sql
-- Description: Automatic Student Fee Assignment & Transport Isolation Engine
-- Ensures active fee structures automatically assign applicable base fees to
-- all eligible students while isolating transport fees strictly to active riders.
-- ============================================================================

-- 1. Ensure timestamps exist on student_fee_assignments to prevent trigger errors
ALTER TABLE public.student_fee_assignments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 2. Create the core auto-assignment function
CREATE OR REPLACE FUNCTION public.assign_fee_structure_to_eligible_students(
  p_school_id UUID,
  p_structure_id UUID,
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
  v_item RECORD;
  v_term RECORD;
  v_terms_count INT := 0;
  v_assigned_count INT := 0;
  v_created_dues_count INT := 0;
  v_transport_count INT := 0;
  v_assignment_id UUID;
  v_transport_head_id UUID;
  v_trans_assign RECORD;
  v_existing_due_id UUID;
  v_existing_paid BIGINT;
  v_concession_paise BIGINT;
  v_net_paise BIGINT;
BEGIN
  -- 1. Fetch structure
  SELECT * INTO v_structure
  FROM public.fee_structures
  WHERE id = p_structure_id AND school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fee structure not found');
  END IF;

  -- Ensure status is active
  IF v_structure.status <> 'active' THEN
    UPDATE public.fee_structures
    SET status = 'active', updated_at = now()
    WHERE id = p_structure_id;
    v_structure.status := 'active';
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

  -- Find Transport fee head for this school
  SELECT id INTO v_transport_head_id
  FROM public.fee_heads
  WHERE school_id = p_school_id AND (code = 'transport_fee' OR (kind = 'recurring' AND lower(name) LIKE '%transport%'))
  ORDER BY is_system DESC, created_at ASC
  LIMIT 1;

  -- 4. Loop over eligible students
  FOR v_student IN
    SELECT DISTINCT
      s.id,
      s.first_name,
      s.last_name,
      s.admission_no,
      s.is_rte,
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
    -- A. Handle student_fee_assignments
    -- Supersede any old active assignment for the same student & year for a different structure
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
    END IF;

    -- B. Generate Base Fee Dues from fee_structure_items
    FOR v_item IN
      SELECT fsi.*, fh.name as head_name, fh.rte_waivable
      FROM public.fee_structure_items fsi
      JOIN public.fee_heads fh ON fh.id = fsi.fee_head_id
      WHERE fsi.structure_id = p_structure_id
        AND fsi.school_id = p_school_id
        AND (v_transport_head_id IS NULL OR fsi.fee_head_id <> v_transport_head_id)
    LOOP
      -- Check if explicit terms exist in fee_structure_item_terms
      SELECT COUNT(*) INTO v_terms_count
      FROM public.fee_structure_item_terms
      WHERE item_id = v_item.id;

      IF v_terms_count > 0 THEN
        -- Use explicit term amounts
        FOR v_term IN
          SELECT fsit.term_id, fsit.amount_paise, ft.due_date, ft.name as term_name
          FROM public.fee_structure_item_terms fsit
          JOIN public.fee_terms ft ON ft.id = fsit.term_id
          WHERE fsit.item_id = v_item.id AND fsit.amount_paise > 0
        LOOP
          -- Check if due already exists
          SELECT id, paid_paise INTO v_existing_due_id, v_existing_paid
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

            INSERT INTO public.student_dues (
              id, school_id, student_id, academic_year_id,
              fee_head_id, term_id, source, source_ref,
              gross_paise, concession_paise, net_paise,
              paid_paise, balance_paise, due_date, status,
              created_at, updated_at, created_by
            ) VALUES (
              gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
              v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
              v_term.amount_paise, v_concession_paise, v_net_paise,
              0, v_net_paise, v_term.due_date,
              CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
              now(), now(), p_actor_id
            );
            v_created_dues_count := v_created_dues_count + 1;
          END IF;
        END LOOP;
      ELSE
        -- No explicit term items: derive terms based on frequency
        -- Monthly: all terms; Quarterly: terms 0, 3, 6, 9; Half-yearly: terms 0, 6; Yearly/One-time: term 0
        FOR v_term IN
          SELECT ft.id as term_id, ft.due_date, ft.sort_order, ft.name as term_name
          FROM public.fee_terms ft
          WHERE ft.school_id = p_school_id AND ft.academic_year_id = v_structure.academic_year_id
          ORDER BY ft.sort_order ASC
        LOOP
          IF (
            v_item.frequency = 'monthly'
            OR (v_item.frequency = 'quarterly' AND (v_term.sort_order % 3 = 0) AND v_term.sort_order < 12)
            OR (v_item.frequency = 'half_yearly' AND (v_term.sort_order = 0 OR v_term.sort_order = 6))
            OR ((v_item.frequency = 'yearly' OR v_item.frequency = 'one_time') AND v_term.sort_order = 0)
          ) THEN
            SELECT id, paid_paise INTO v_existing_due_id, v_existing_paid
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

              INSERT INTO public.student_dues (
                id, school_id, student_id, academic_year_id,
                fee_head_id, term_id, source, source_ref,
                gross_paise, concession_paise, net_paise,
                paid_paise, balance_paise, due_date, status,
                created_at, updated_at, created_by
              ) VALUES (
                gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
                v_item.amount_paise, v_concession_paise, v_net_paise,
                0, v_net_paise, v_term.due_date,
                CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
                now(), now(), p_actor_id
              );
              v_created_dues_count := v_created_dues_count + 1;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;

    -- C. Transport Fees: ONLY FOR ACTIVE TRANSPORT USERS
    -- Check if student has active transport assignment
    SELECT * INTO v_trans_assign
    FROM public.transport_assignments
    WHERE school_id = p_school_id
      AND student_id = v_student.id
      AND status = 'active'
      AND monthly_fee_paise > 0
    LIMIT 1;

    IF v_trans_assign.id IS NOT NULL AND v_transport_head_id IS NOT NULL THEN
      v_transport_count := v_transport_count + 1;

      -- For each term in academic year, ensure transport due exists
      FOR v_term IN
        SELECT ft.id as term_id, ft.due_date, ft.sort_order
        FROM public.fee_terms ft
        WHERE ft.school_id = p_school_id AND ft.academic_year_id = v_structure.academic_year_id
        ORDER BY ft.sort_order ASC
      LOOP
        SELECT id INTO v_existing_due_id
        FROM public.student_dues
        WHERE school_id = p_school_id
          AND student_id = v_student.id
          AND term_id = v_term.term_id
          AND source = 'transport';

        IF v_existing_due_id IS NULL THEN
          INSERT INTO public.student_dues (
            id, school_id, student_id, academic_year_id,
            fee_head_id, term_id, source, source_ref,
            gross_paise, concession_paise, net_paise,
            paid_paise, balance_paise, due_date, status,
            created_at, updated_at, created_by
          ) VALUES (
            gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
            v_transport_head_id, v_term.term_id, 'transport', v_trans_assign.id,
            v_trans_assign.monthly_fee_paise, 0, v_trans_assign.monthly_fee_paise,
            0, v_trans_assign.monthly_fee_paise, v_term.due_date, 'pending',
            now(), now(), p_actor_id
          );
          v_created_dues_count := v_created_dues_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned_students_count', v_assigned_count,
    'created_dues_count', v_created_dues_count,
    'transport_riders_count', v_transport_count
  );
END;
$$;

-- 3. Run auto-assignment for all existing active structures
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, school_id FROM public.fee_structures WHERE status = 'active' LOOP
    PERFORM public.assign_fee_structure_to_eligible_students(r.school_id, r.id);
  END LOOP;
END;
$$;
