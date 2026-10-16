-- ============================================================================
-- Migration: 20261016200000_phase2c_financial_calculation_hardening.sql
-- Description: Phase 2C Financial Calculation & Ledger Synchronization Hardening
--
-- 1. Updates public.assign_fee_structure_to_eligible_students:
--    - Calculates exact billable months for transport fees using >= 15 days overlap.
--    - Enforces transport assignment effective_from and effective_to boundaries.
--    - Eliminates double billing and pre-enrollment charges.
--    - Atomically creates corresponding fee_ledger entries (due_created, concession)
--      for every newly created student due.
--
-- 2. Updates public.get_fee_collections_summary:
--    - Adds optional p_start_date and p_end_date parameters.
--    - Scopes Cash and Online payment aggregates to the reporting period (defaulting
--      to the current calendar month in Asia/Kolkata).
--    - Ensures split payment lines are aggregated accurately without double-counting.
--    - Excludes cancelled, reversed, or non-active receipts.
--    - Enforces strict multi-tenant authorization for authenticated callers.
-- ============================================================================

-- ============================================================================
-- 1. assign_fee_structure_to_eligible_students
-- ============================================================================
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
  v_concession_paise BIGINT;
  v_net_paise BIGINT;
  v_gross_paise BIGINT;
  v_due_id UUID;
  v_term_months INT;
  v_total_ay_terms INT;
BEGIN
  -- Multi-tenant authorization check when invoked by authenticated user
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to assign fee structures for school %', p_school_id;
    END IF;
  END IF;

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

  -- Count total terms in academic year for fallback calculation
  SELECT COUNT(*) INTO v_total_ay_terms
  FROM public.fee_terms
  WHERE school_id = p_school_id AND academic_year_id = v_structure.academic_year_id;

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
    UPDATE public.student_fee_assignments
    SET status = 'replaced', updated_at = now()
    WHERE school_id = p_school_id
      AND student_id = v_student.id
      AND academic_year_id = v_structure.academic_year_id
      AND structure_id <> p_structure_id
      AND status = 'active';

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
      SELECT COUNT(*) INTO v_terms_count
      FROM public.fee_structure_item_terms
      WHERE item_id = v_item.id;

      IF v_terms_count > 0 THEN
        FOR v_term IN
          SELECT fsit.term_id, fsit.amount_paise, ft.due_date, ft.name as term_name
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
            AND source = 'structure'
            AND status <> 'cancelled';

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
              gross_paise, concession_paise, net_paise,
              paid_paise, balance_paise, due_date, status,
              created_at, updated_at, created_by
            ) VALUES (
              v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
              v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
              v_term.amount_paise, v_concession_paise, v_net_paise,
              0, v_net_paise, v_term.due_date,
              CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
              now(), now(), p_actor_id
            );

            -- Atomic fee_ledger synchronization
            IF v_concession_paise > 0 THEN
              INSERT INTO public.fee_ledger (
                id, school_id, student_id, academic_year_id,
                due_id, receipt_id, entry_type, amount_paise,
                note, created_by, created_at
              ) VALUES
              (
                gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                v_due_id, NULL, 'due_created', v_term.amount_paise,
                'Due created: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                p_actor_id, now()
              ),
              (
                gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                v_due_id, NULL, 'concession', -v_concession_paise,
                'RTE Waiver: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                p_actor_id, now()
              );
            ELSIF v_net_paise > 0 THEN
              INSERT INTO public.fee_ledger (
                id, school_id, student_id, academic_year_id,
                due_id, receipt_id, entry_type, amount_paise,
                note, created_by, created_at
              ) VALUES (
                gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                v_due_id, NULL, 'due_created', v_net_paise,
                'Due created: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                p_actor_id, now()
              );
            END IF;

            v_created_dues_count := v_created_dues_count + 1;
          END IF;
        END LOOP;
      ELSE
        -- No explicit term items: derive terms based on frequency
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
            SELECT id INTO v_existing_due_id
            FROM public.student_dues
            WHERE school_id = p_school_id
              AND student_id = v_student.id
              AND academic_year_id = v_structure.academic_year_id
              AND fee_head_id = v_item.fee_head_id
              AND term_id = v_term.term_id
              AND source = 'structure'
              AND status <> 'cancelled';

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
                gross_paise, concession_paise, net_paise,
                paid_paise, balance_paise, due_date, status,
                created_at, updated_at, created_by
              ) VALUES (
                v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
                v_item.fee_head_id, v_term.term_id, 'structure', v_assignment_id,
                v_item.amount_paise, v_concession_paise, v_net_paise,
                0, v_net_paise, v_term.due_date,
                CASE WHEN v_net_paise = 0 THEN 'waived' ELSE 'pending' END,
                now(), now(), p_actor_id
              );

              -- Atomic fee_ledger synchronization
              IF v_concession_paise > 0 THEN
                INSERT INTO public.fee_ledger (
                  id, school_id, student_id, academic_year_id,
                  due_id, receipt_id, entry_type, amount_paise,
                  note, created_by, created_at
                ) VALUES
                (
                  gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                  v_due_id, NULL, 'due_created', v_item.amount_paise,
                  'Due created: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                  p_actor_id, now()
                ),
                (
                  gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                  v_due_id, NULL, 'concession', -v_concession_paise,
                  'RTE Waiver: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                  p_actor_id, now()
                );
              ELSIF v_net_paise > 0 THEN
                INSERT INTO public.fee_ledger (
                  id, school_id, student_id, academic_year_id,
                  due_id, receipt_id, entry_type, amount_paise,
                  note, created_by, created_at
                ) VALUES (
                  gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
                  v_due_id, NULL, 'due_created', v_net_paise,
                  'Due created: ' || v_item.head_name || ' (' || v_term.term_name || ')',
                  p_actor_id, now()
                );
              END IF;

              v_created_dues_count := v_created_dues_count + 1;
            END IF;
          END IF;
        END LOOP;
      END IF;
    END LOOP;

    -- C. Transport Fees: ONLY FOR ACTIVE TRANSPORT USERS WITHIN VALID ASSIGNMENT BOUNDARIES
    SELECT * INTO v_trans_assign
    FROM public.transport_assignments
    WHERE school_id = p_school_id
      AND student_id = v_student.id
      AND status = 'active'
      AND monthly_fee_paise > 0
    LIMIT 1;

    IF v_trans_assign.id IS NOT NULL AND v_transport_head_id IS NOT NULL THEN
      v_transport_count := v_transport_count + 1;

      FOR v_term IN
        SELECT ft.id as term_id, ft.due_date, ft.sort_order, ft.name as term_name, ft.period_start, ft.period_end
        FROM public.fee_terms ft
        WHERE ft.school_id = p_school_id AND ft.academic_year_id = v_structure.academic_year_id
        ORDER BY ft.sort_order ASC
      LOOP
        SELECT id INTO v_existing_due_id
        FROM public.student_dues
        WHERE school_id = p_school_id
          AND student_id = v_student.id
          AND term_id = v_term.term_id
          AND source = 'transport'
          AND status <> 'cancelled';

        IF v_existing_due_id IS NULL THEN
          -- Calculate active billable months for this term respecting assignment dates
          IF v_term.period_start IS NOT NULL AND v_term.period_end IS NOT NULL THEN
            SELECT COUNT(*) INTO v_term_months
            FROM generate_series(
              date_trunc('month', v_term.period_start - INTERVAL '1 day')::date,
              date_trunc('month', v_term.period_end + INTERVAL '1 day')::date,
              '1 month'::interval
            ) m
            WHERE (
              LEAST(v_term.period_end, (m + interval '1 month - 1 day')::date) - 
              GREATEST(v_term.period_start, m::date) + 1 >= 15
            )
            AND (
              (m + interval '1 month - 1 day')::date >= v_trans_assign.effective_from
              AND m::date <= COALESCE(v_trans_assign.effective_to, '9999-12-31'::date)
            );
          ELSE
            -- Term without explicit dates: check approximate term boundaries
            v_term_months := 1;
            IF v_trans_assign.effective_from > v_term.due_date THEN
              v_term_months := 0;
            END IF;
            IF v_trans_assign.effective_to IS NOT NULL AND v_trans_assign.effective_to < v_term.due_date THEN
              v_term_months := 0;
            END IF;
          END IF;

          -- Only bill if term contains at least 1 valid billable month
          IF v_term_months > 0 THEN
            v_gross_paise := v_trans_assign.monthly_fee_paise * v_term_months;
            v_due_id := gen_random_uuid();

            INSERT INTO public.student_dues (
              id, school_id, student_id, academic_year_id,
              fee_head_id, term_id, source, source_ref,
              gross_paise, concession_paise, net_paise,
              paid_paise, balance_paise, due_date, status,
              created_at, updated_at, created_by
            ) VALUES (
              v_due_id, p_school_id, v_student.id, v_structure.academic_year_id,
              v_transport_head_id, v_term.term_id, 'transport', v_trans_assign.id,
              v_gross_paise, 0, v_gross_paise,
              0, v_gross_paise, v_term.due_date, 'pending',
              now(), now(), p_actor_id
            );

            -- Atomic fee_ledger synchronization
            INSERT INTO public.fee_ledger (
              id, school_id, student_id, academic_year_id,
              due_id, receipt_id, entry_type, amount_paise,
              note, created_by, created_at
            ) VALUES (
              gen_random_uuid(), p_school_id, v_student.id, v_structure.academic_year_id,
              v_due_id, NULL, 'due_created', v_gross_paise,
              'Due created: Transport Fee (' || v_term.term_name || ')',
              p_actor_id, now()
            );

            v_created_dues_count := v_created_dues_count + 1;
          END IF;
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


-- ============================================================================
-- 2. get_fee_collections_summary
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_fee_collections_summary(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_start_date       DATE DEFAULT NULL,
  p_end_date         DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date       DATE;
  v_first_of_month   DATE;
  v_period_start     DATE;
  v_period_end       DATE;
  v_today_paise      BIGINT := 0;
  v_today_count      BIGINT := 0;
  v_month_paise      BIGINT := 0;
  v_month_count      BIGINT := 0;
  v_online_paise     BIGINT := 0;
  v_online_count     BIGINT := 0;
  v_cash_paise       BIGINT := 0;
  v_cash_count       BIGINT := 0;
BEGIN
  -- Multi-tenant authorization check when invoked by authenticated user
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to access collections summary for school %', p_school_id;
    END IF;
  END IF;

  -- Get IST current date (Asia/Kolkata timezone)
  v_today_date := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_first_of_month := DATE_TRUNC('month', v_today_date)::DATE;

  -- Scope period for Cash and Online breakdown (defaulting to current month)
  v_period_start := COALESCE(p_start_date, v_first_of_month);
  v_period_end   := COALESCE(p_end_date, v_today_date);

  -- 1. Today's collections
  SELECT COALESCE(SUM(total_paise), 0), COUNT(*)
  INTO v_today_paise, v_today_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date = v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 2. This month's collections
  SELECT COALESCE(SUM(total_paise), 0), COUNT(*)
  INTO v_month_paise, v_month_count
  FROM public.fee_receipts
  WHERE school_id = p_school_id
    AND receipt_date >= v_first_of_month
    AND receipt_date <= v_today_date
    AND status = 'active'
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);

  -- 3. Online Payments for reporting period (UPI, Bank Transfer, Online gateway, Card)
  SELECT COALESCE(SUM(p.amount_paise), 0), COUNT(DISTINCT r.id)
  INTO v_online_paise, v_online_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND r.receipt_date >= v_period_start
    AND r.receipt_date <= v_period_end
    AND p.mode IN ('upi', 'bank_transfer', 'online', 'card')
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  -- 4. Cash Payments for reporting period
  SELECT COALESCE(SUM(p.amount_paise), 0), COUNT(DISTINCT r.id)
  INTO v_cash_paise, v_cash_count
  FROM public.fee_payments p
  JOIN public.fee_receipts r ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND r.status = 'active'
    AND r.receipt_date >= v_period_start
    AND r.receipt_date <= v_period_end
    AND p.mode = 'cash'
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id);

  RETURN jsonb_build_object(
    'todayPaise', v_today_paise,
    'todayCount', v_today_count,
    'thisMonthPaise', v_month_paise,
    'thisMonthCount', v_month_count,
    'onlinePaise', v_online_paise,
    'onlineCount', v_online_count,
    'cashPaise', v_cash_paise,
    'cashCount', v_cash_count
  );
END;
$$;
