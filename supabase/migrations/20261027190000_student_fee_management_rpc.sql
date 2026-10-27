-- Migration: 20261027190000_student_fee_management_rpc.sql
-- Description:
-- 1. Implements RPC get_student_fee_management_data for server-side aggregation,
--    filtering, sorting, and pagination of student fee summaries and KPIs.
-- 2. Enforces multi-tenant isolation via is_school_member / is_school_admin.
-- 3. Provides optimized composite indexes for high-throughput fee management querying.

-- ============================================================================
-- 1. Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_student_dues_mgmt_composite
  ON public.student_dues(school_id, academic_year_id, student_id, status, due_date)
  INCLUDE (gross_paise, concession_paise, net_paise, paid_paise, balance_paise, source);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_mgmt_composite
  ON public.student_enrollments(school_id, academic_year_id, student_id, class_id, section_id, status);

CREATE INDEX IF NOT EXISTS idx_fee_credits_mgmt_remaining
  ON public.fee_credits(school_id, student_id, remaining_paise);

CREATE INDEX IF NOT EXISTS idx_transport_assignments_mgmt_active
  ON public.transport_assignments(school_id, student_id, status);

-- ============================================================================
-- 2. get_student_fee_management_data RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_fee_management_data(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_class_id         UUID DEFAULT NULL,
  p_section_id       UUID DEFAULT NULL,
  p_fee_status       TEXT DEFAULT 'all',
  p_transport_filter TEXT DEFAULT 'all',
  p_quick_pill       TEXT DEFAULT 'with_invoices',
  p_search           TEXT DEFAULT '',
  p_due_date_from    DATE DEFAULT NULL,
  p_due_date_to      DATE DEFAULT NULL,
  p_sort_by          TEXT DEFAULT 'admission_no',
  p_sort_order       TEXT DEFAULT 'asc',
  p_limit            INT DEFAULT 50,
  p_offset           INT DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date            DATE;
  v_effective_ay_id       UUID := p_academic_year_id;
  v_effective_ay_name     TEXT := 'Academic Year';
  v_total_enrolled_count  INT := 0;
  v_structure_assigned_cnt INT := 0;
  v_students_invoices_cnt INT := 0;
  v_transport_only_cnt    INT := 0;

  v_total_gross_paise     BIGINT := 0;
  v_total_concessions_paise BIGINT := 0;
  v_total_net_fees_paise  BIGINT := 0;
  v_total_collected_paise BIGINT := 0;
  v_total_pending_paise   BIGINT := 0;
  v_total_overdue_paise   BIGINT := 0;
  v_total_advance_credit  BIGINT := 0;

  v_fully_paid_cnt        INT := 0;
  v_with_dues_cnt         INT := 0;
  v_partially_paid_cnt    INT := 0;
  v_upcoming_cnt          INT := 0;
  v_overdue_cnt           INT := 0;

  v_total_filtered_count  INT := 0;
  v_students_json         JSONB := '[]'::JSONB;
BEGIN
  -- Strict multi-tenant security verification
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to access student fee records for school %', p_school_id;
    END IF;
  END IF;

  v_today_date := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;

  -- Resolve academic year if not provided
  IF v_effective_ay_id IS NULL THEN
    SELECT id, COALESCE(label, name, 'Current Year')
    INTO v_effective_ay_id, v_effective_ay_name
    FROM public.academic_years
    WHERE school_id = p_school_id AND is_current = true
    LIMIT 1;

    IF v_effective_ay_id IS NULL THEN
      SELECT id, COALESCE(label, name, 'Academic Year')
      INTO v_effective_ay_id, v_effective_ay_name
      FROM public.academic_years
      WHERE school_id = p_school_id
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
  ELSE
    SELECT COALESCE(label, name, 'Academic Year')
    INTO v_effective_ay_name
    FROM public.academic_years
    WHERE id = v_effective_ay_id AND school_id = p_school_id;
  END IF;

  -- Temporary table of student base metrics for the school & academic year
  CREATE TEMP TABLE temp_student_fee_base ON COMMIT DROP AS
  WITH base_enrollments AS (
    SELECT DISTINCT ON (se.student_id)
      se.student_id,
      se.class_id,
      se.section_id,
      c.name AS class_name,
      sec.name AS section_name
    FROM public.student_enrollments se
    JOIN public.classes c ON c.id = se.class_id
    LEFT JOIN public.sections sec ON sec.id = se.section_id
    WHERE se.school_id = p_school_id
      AND (v_effective_ay_id IS NULL OR se.academic_year_id = v_effective_ay_id)
      AND se.status IN ('active', 'enrolled')
    ORDER BY se.student_id, se.created_at DESC
  ),
  student_dues_agg AS (
    SELECT
      d.student_id,
      COUNT(d.id) AS total_invoices_cnt,
      COALESCE(SUM(d.gross_paise), 0) AS total_gross,
      COALESCE(SUM(d.concession_paise), 0) AS total_concession,
      COALESCE(SUM(d.net_paise), 0) AS total_net,
      COALESCE(SUM(d.paid_paise), 0) AS total_paid,
      COALESCE(SUM(d.balance_paise), 0) AS total_balance,
      COALESCE(SUM(CASE WHEN d.due_date < v_today_date AND d.balance_paise > 0 THEN d.balance_paise ELSE 0 END), 0) AS total_overdue,
      MIN(CASE WHEN d.balance_paise > 0 THEN d.due_date ELSE NULL END) AS earliest_unpaid_due,
      MIN(CASE WHEN d.balance_paise > 0 AND d.due_date < v_today_date THEN d.due_date ELSE NULL END) AS earliest_overdue_date,
      BOOL_OR(d.source = 'transport') AS has_transport_dues
    FROM public.student_dues d
    WHERE d.school_id = p_school_id
      AND d.status NOT IN ('cancelled', 'waived')
      AND (v_effective_ay_id IS NULL OR d.academic_year_id = v_effective_ay_id)
    GROUP BY d.student_id
  ),
  credits_agg AS (
    SELECT
      fc.student_id,
      COALESCE(SUM(fc.remaining_paise), 0) AS advance_credit_paise
    FROM public.fee_credits fc
    WHERE fc.school_id = p_school_id AND fc.remaining_paise > 0
    GROUP BY fc.student_id
  ),
  transport_agg AS (
    SELECT
      ta.student_id,
      true AS has_active_transport
    FROM public.transport_assignments ta
    WHERE ta.school_id = p_school_id AND ta.status = 'active'
    GROUP BY ta.student_id
  ),
  assignments_agg AS (
    SELECT
      sfa.student_id,
      fs.name AS fee_structure_name
    FROM public.student_fee_assignments sfa
    JOIN public.fee_structures fs ON fs.id = sfa.structure_id
    WHERE sfa.school_id = p_school_id
      AND (v_effective_ay_id IS NULL OR sfa.academic_year_id = v_effective_ay_id)
      AND fs.status = 'active'
    ORDER BY sfa.created_at DESC
  ),
  primary_parents AS (
    SELECT DISTINCT ON (sp.student_id)
      sp.student_id,
      p.full_name AS parent_name,
      p.phone AS parent_phone,
      sp.relation AS parent_relation
    FROM public.student_parents sp
    JOIN public.parents p ON p.id = sp.parent_id
    WHERE sp.school_id = p_school_id
    ORDER BY sp.student_id, sp.is_primary_contact DESC NULLS LAST
  )
  SELECT
    s.id AS student_id,
    TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, ''))) AS student_name,
    COALESCE(s.admission_no, 'ADM-0000') AS admission_no,
    s.photo_path AS avatar_url,
    s.gender,
    COALESCE(s.status, 'active') AS student_status,
    COALESCE(be.class_id, s.admission_class_id) AS class_id,
    COALESCE(be.class_name, 'Class') AS class_name,
    be.section_id,
    COALESCE(be.section_name, 'Section A') AS section_name,
    v_effective_ay_id AS academic_year_id,
    v_effective_ay_name AS academic_year_name,
    COALESCE(asg.fee_structure_name, NULL) AS applicable_fee_structure_name,
    (asg.fee_structure_name IS NOT NULL) AS has_fee_structure,
    COALESCE(ta.has_active_transport, false) AS has_transport,
    COALESCE(pp.parent_name, s.guardian_name, 'Guardian') AS parent_name,
    COALESCE(pp.parent_phone, s.contact_phone, '—') AS parent_phone,
    COALESCE(pp.parent_relation, 'Parent') AS parent_relation,
    COALESCE(sda.total_invoices_cnt, 0) AS total_invoices_count,
    COALESCE(sda.total_gross, 0) AS total_billed_paise,
    COALESCE(sda.total_concession, 0) AS total_concession_paise,
    COALESCE(sda.total_net, 0) AS total_applicable_paise,
    COALESCE(sda.total_paid, 0) AS total_paid_paise,
    COALESCE(sda.total_balance, 0) AS total_pending_paise,
    COALESCE(sda.total_overdue, 0) AS total_overdue_paise,
    COALESCE(ca.advance_credit_paise, 0) AS advance_credit_paise,
    GREATEST(0, COALESCE(sda.total_balance, 0) - COALESCE(ca.advance_credit_paise, 0)) AS net_pending_paise,
    GREATEST(0, COALESCE(sda.total_overdue, 0) - COALESCE(ca.advance_credit_paise, 0)) AS net_overdue_paise,
    sda.earliest_unpaid_due AS next_due_date,
    sda.earliest_overdue_date,
    CASE
      WHEN sda.earliest_overdue_date IS NOT NULL THEN
        GREATEST(0, (v_today_date - sda.earliest_overdue_date))
      ELSE 0
    END AS overdue_days,
    (asg.fee_structure_name IS NULL AND (COALESCE(ta.has_active_transport, false) OR COALESCE(sda.has_transport_dues, false))) AS is_transport_only,
    CASE
      WHEN COALESCE(sda.total_gross, 0) = 0 AND COALESCE(sda.total_net, 0) = 0 THEN 'no_dues'
      WHEN COALESCE(sda.total_balance, 0) = 0 OR (COALESCE(sda.total_balance, 0) - COALESCE(ca.advance_credit_paise, 0)) <= 0 THEN 'fully_paid'
      WHEN (COALESCE(sda.total_overdue, 0) - COALESCE(ca.advance_credit_paise, 0)) > 0 THEN 'overdue'
      WHEN COALESCE(sda.total_paid, 0) > 0 THEN 'partially_paid'
      WHEN sda.earliest_unpaid_due IS NOT NULL AND sda.earliest_unpaid_due >= v_today_date THEN 'upcoming'
      ELSE 'pending'
    END AS fee_status
  FROM public.students s
  LEFT JOIN base_enrollments be ON be.student_id = s.id
  LEFT JOIN student_dues_agg sda ON sda.student_id = s.id
  LEFT JOIN credits_agg ca ON ca.student_id = s.id
  LEFT JOIN transport_agg ta ON ta.student_id = s.id
  LEFT JOIN assignments_agg asg ON asg.student_id = s.id
  LEFT JOIN primary_parents pp ON pp.student_id = s.id
  WHERE s.school_id = p_school_id
    AND s.deleted_at IS NULL
    AND (s.status IS NULL OR s.status IN ('active', 'enrolled'));

  -- Aggregate Total KPIs
  SELECT
    COUNT(*),
    COALESCE(SUM(CASE WHEN has_fee_structure THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_transport_only THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN total_invoices_count > 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(total_billed_paise), 0),
    COALESCE(SUM(total_concession_paise), 0),
    COALESCE(SUM(total_applicable_paise), 0),
    COALESCE(SUM(total_paid_paise), 0),
    COALESCE(SUM(total_pending_paise), 0),
    COALESCE(SUM(net_overdue_paise), 0),
    COALESCE(SUM(advance_credit_paise), 0),
    COALESCE(SUM(CASE WHEN fee_status = 'fully_paid' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN net_pending_paise > 0 THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fee_status = 'partially_paid' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fee_status = 'upcoming' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fee_status = 'overdue' OR net_overdue_paise > 0 THEN 1 ELSE 0 END), 0)
  INTO
    v_total_enrolled_count,
    v_structure_assigned_cnt,
    v_transport_only_cnt,
    v_students_invoices_cnt,
    v_total_gross_paise,
    v_total_concessions_paise,
    v_total_net_fees_paise,
    v_total_collected_paise,
    v_total_pending_paise,
    v_total_overdue_paise,
    v_total_advance_credit,
    v_fully_paid_cnt,
    v_with_dues_cnt,
    v_partially_paid_cnt,
    v_upcoming_cnt,
    v_overdue_cnt
  FROM temp_student_fee_base;

  -- Ensure invariant: Overdue <= Pending
  IF v_total_overdue_paise > v_total_pending_paise THEN
    v_total_overdue_paise := v_total_pending_paise;
  END IF;

  -- Filter query for paginated results
  CREATE TEMP TABLE temp_filtered_students ON COMMIT DROP AS
  SELECT *
  FROM temp_student_fee_base tb
  WHERE
    (p_class_id IS NULL OR tb.class_id = p_class_id)
    AND (p_section_id IS NULL OR tb.section_id = p_section_id)
    AND (
      p_fee_status = 'all'
      OR (p_fee_status = 'with_dues' AND tb.total_pending_paise > 0)
      OR tb.fee_status = p_fee_status
    )
    AND (
      p_transport_filter = 'all'
      OR (p_transport_filter = 'transport_only' AND tb.has_transport)
      OR (p_transport_filter = 'non_transport' AND NOT tb.has_transport)
    )
    AND (
      p_quick_pill = 'all'
      OR (p_quick_pill = 'structure_assigned' AND tb.has_fee_structure)
      OR (p_quick_pill = 'with_invoices' AND (tb.total_invoices_count > 0 OR tb.total_billed_paise > 0))
      OR (p_quick_pill = 'with_dues' AND tb.total_pending_paise > 0)
      OR (p_quick_pill = 'overdue' AND (tb.fee_status = 'overdue' OR tb.total_overdue_paise > 0))
      OR (p_quick_pill = 'fully_paid' AND (tb.fee_status = 'fully_paid' OR tb.total_pending_paise = 0))
      OR (p_quick_pill = 'partially_paid' AND tb.fee_status = 'partially_paid')
      OR (p_quick_pill = 'upcoming' AND tb.fee_status = 'upcoming')
      OR (p_quick_pill = 'transport_only' AND tb.is_transport_only)
    )
    AND (
      LENGTH(TRIM(p_search)) = 0
      OR tb.student_name ILIKE '%' || TRIM(p_search) || '%'
      OR tb.admission_no ILIKE '%' || TRIM(p_search) || '%'
      OR tb.parent_name ILIKE '%' || TRIM(p_search) || '%'
      OR tb.parent_phone ILIKE '%' || TRIM(p_search) || '%'
      OR tb.class_name ILIKE '%' || TRIM(p_search) || '%'
      OR tb.section_name ILIKE '%' || TRIM(p_search) || '%'
    )
    AND (p_due_date_from IS NULL OR tb.next_due_date >= p_due_date_from)
    AND (p_due_date_to IS NULL OR tb.next_due_date <= p_due_date_to);

  SELECT COUNT(*) INTO v_total_filtered_count FROM temp_filtered_students;

  -- Build JSON of paginated student rows
  SELECT COALESCE(
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'student_id', t.student_id,
        'student_name', t.student_name,
        'admission_no', t.admission_no,
        'avatar_url', t.avatar_url,
        'gender', t.gender,
        'student_status', t.student_status,
        'class_id', t.class_id,
        'class_name', t.class_name,
        'section_id', t.section_id,
        'section_name', t.section_name,
        'academic_year_id', t.academic_year_id,
        'academic_year_name', t.academic_year_name,
        'applicable_fee_structure_name', COALESCE(t.applicable_fee_structure_name, CASE WHEN t.is_transport_only THEN 'Transport Only' ELSE 'No Fee Structure' END),
        'has_fee_structure', t.has_fee_structure,
        'is_transport_only', t.is_transport_only,
        'parent_name', t.parent_name,
        'parent_phone', t.parent_phone,
        'parent_relation', t.parent_relation,
        'has_transport', t.has_transport,
        'total_billed_paise', t.total_billed_paise,
        'total_concession_paise', t.total_concession_paise,
        'total_applicable_paise', t.total_applicable_paise,
        'total_paid_paise', t.total_paid_paise,
        'total_pending_paise', t.total_pending_paise,
        'total_overdue_paise', t.net_overdue_paise,
        'advance_credit_paise', t.advance_credit_paise,
        'net_pending_paise', t.net_pending_paise,
        'next_due_date', t.next_due_date,
        'overdue_days', t.overdue_days,
        'fee_status', t.fee_status,
        'total_invoices_count', t.total_invoices_count
      )
    ), '[]'::JSONB
  ) INTO v_students_json
  FROM (
    SELECT *
    FROM temp_filtered_students
    ORDER BY
      CASE WHEN p_sort_by = 'student_name' AND p_sort_order = 'asc' THEN student_name END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'student_name' AND p_sort_order = 'desc' THEN student_name END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'class' AND p_sort_order = 'asc' THEN class_name END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'class' AND p_sort_order = 'desc' THEN class_name END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'total_fee' AND p_sort_order = 'asc' THEN total_applicable_paise END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'total_fee' AND p_sort_order = 'desc' THEN total_applicable_paise END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'paid' AND p_sort_order = 'asc' THEN total_paid_paise END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'paid' AND p_sort_order = 'desc' THEN total_paid_paise END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'pending' AND p_sort_order = 'asc' THEN total_pending_paise END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'pending' AND p_sort_order = 'desc' THEN total_pending_paise END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'overdue' AND p_sort_order = 'asc' THEN net_overdue_paise END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'overdue' AND p_sort_order = 'desc' THEN net_overdue_paise END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'next_due_date' AND p_sort_order = 'asc' THEN next_due_date END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'next_due_date' AND p_sort_order = 'desc' THEN next_due_date END DESC NULLS LAST,
      CASE WHEN p_sort_by = 'status' AND p_sort_order = 'asc' THEN fee_status END ASC NULLS LAST,
      CASE WHEN p_sort_by = 'status' AND p_sort_order = 'desc' THEN fee_status END DESC NULLS LAST,
      admission_no ASC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN JSONB_BUILD_OBJECT(
    'metrics', JSONB_BUILD_OBJECT(
      'total_enrolled_count', v_total_enrolled_count,
      'structure_assigned_count', v_structure_assigned_cnt,
      'students_with_invoices_count', v_students_invoices_cnt,
      'transport_only_count', v_transport_only_cnt,
      'total_gross_paise', v_total_gross_paise,
      'total_concessions_paise', v_total_concessions_paise,
      'total_fees_paise', v_total_net_fees_paise,
      'total_collected_paise', v_total_collected_paise,
      'total_pending_paise', v_total_pending_paise,
      'total_overdue_paise', v_total_overdue_paise,
      'total_advance_credit_paise', v_total_advance_credit,
      'net_pending_paise', GREATEST(0, v_total_pending_paise - v_total_advance_credit),
      'fully_paid_count', v_fully_paid_cnt,
      'with_dues_count', v_with_dues_cnt,
      'partially_paid_count', v_partially_paid_cnt,
      'upcoming_count', v_upcoming_cnt,
      'overdue_count', v_overdue_cnt,
      'total_students_count', v_total_enrolled_count,
      'collection_percentage', CASE WHEN v_total_net_fees_paise > 0 THEN ROUND(((v_total_collected_paise::NUMERIC / v_total_net_fees_paise::NUMERIC) * 100), 1) ELSE 0 END,
      'pending_percentage', CASE WHEN v_total_net_fees_paise > 0 THEN ROUND(((v_total_pending_paise::NUMERIC / v_total_net_fees_paise::NUMERIC) * 100), 1) ELSE 0 END,
      'overdue_percentage', CASE WHEN v_total_net_fees_paise > 0 THEN ROUND(((v_total_overdue_paise::NUMERIC / v_total_net_fees_paise::NUMERIC) * 100), 1) ELSE 0 END,
      'fully_paid_percentage', CASE WHEN v_total_enrolled_count > 0 THEN ROUND(((v_fully_paid_cnt::NUMERIC / v_total_enrolled_count::NUMERIC) * 100), 1) ELSE 0 END,
      'with_dues_percentage', CASE WHEN v_total_enrolled_count > 0 THEN ROUND(((v_with_dues_cnt::NUMERIC / v_total_enrolled_count::NUMERIC) * 100), 1) ELSE 0 END
    ),
    'students', v_students_json,
    'total_count', v_total_filtered_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;
