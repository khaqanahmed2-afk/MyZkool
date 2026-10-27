-- Migration: 20261027170000_fee_dashboard_performance_and_aggregation.sql
-- Description:
-- 1. Adds composite indexes for high-performance dashboard aggregations.
-- 2. Implements RPC get_fee_dashboard_metrics for instant, server-side financial KPI calculation.
-- 3. Implements RPC get_dashboard_recent_collections with server-side pagination, search, and filtering.
-- 4. Implements RPC get_dashboard_top_pending_dues with server-side pagination, search, and overdue calculation.
-- 5. Guarantees multi-tenant isolation and strict school authorization checks in all functions.

-- ============================================================================
-- 1. Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_student_dues_dash_agg
  ON public.student_dues(school_id, academic_year_id, status, due_date)
  INCLUDE (net_paise, paid_paise, balance_paise, concession_paise, gross_paise);

CREATE INDEX IF NOT EXISTS idx_fee_receipts_dash_agg
  ON public.fee_receipts(school_id, academic_year_id, status, receipt_date)
  INCLUDE (total_paise);

CREATE INDEX IF NOT EXISTS idx_fee_credits_dash_remaining
  ON public.fee_credits(school_id, student_id, remaining_paise);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_dash_active
  ON public.student_enrollments(school_id, academic_year_id, class_id, status);

-- ============================================================================
-- 2. get_fee_dashboard_metrics RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fee_dashboard_metrics(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_class_id         UUID DEFAULT NULL,
  p_start_date       DATE DEFAULT NULL,
  p_end_date         DATE DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date            DATE;
  v_cur_month_start       DATE;
  v_prev_month_start      DATE;
  v_prev_month_end        DATE;

  v_total_collected_paise BIGINT := 0;
  v_month_collected_paise BIGINT := 0;
  v_prev_collected_paise  BIGINT := 0;
  v_today_collected_paise BIGINT := 0;

  v_gross_billed_paise    BIGINT := 0;
  v_concessions_paise     BIGINT := 0;
  v_net_billed_paise      BIGINT := 0;
  v_allocated_paid_paise  BIGINT := 0;
  v_total_outstanding_paise BIGINT := 0;
  v_total_overdue_paise   BIGINT := 0;
  v_pending_current_paise BIGINT := 0;

  v_total_students_count  INT := 0;
  v_collection_rate_pct   NUMERIC := 0;
  v_month_change_pct      NUMERIC := NULL;

  v_monthly_trend         JSONB := '[]'::JSONB;
BEGIN
  -- Strict multi-tenant security verification
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Current user is not authorized to access financial metrics for school %', p_school_id;
    END IF;
  END IF;

  -- Timezone-safe Asia/Kolkata date resolution
  v_today_date       := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_cur_month_start  := DATE_TRUNC('month', v_today_date)::DATE;
  v_prev_month_start := (v_cur_month_start - INTERVAL '1 month')::DATE;
  v_prev_month_end   := (v_cur_month_start - INTERVAL '1 day')::DATE;

  -- 1. Total Collections from active fee_receipts
  -- If class filter is supplied, join student_enrollments
  IF p_class_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(r.total_paise), 0),
      COALESCE(SUM(CASE WHEN r.receipt_date >= v_cur_month_start AND r.receipt_date <= v_today_date THEN r.total_paise ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN r.receipt_date >= v_prev_month_start AND r.receipt_date <= v_prev_month_end THEN r.total_paise ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN r.receipt_date = v_today_date THEN r.total_paise ELSE 0 END), 0)
    INTO
      v_total_collected_paise,
      v_month_collected_paise,
      v_prev_collected_paise,
      v_today_collected_paise
    FROM public.fee_receipts r
    JOIN public.student_enrollments se ON se.student_id = r.student_id AND se.school_id = r.school_id
    WHERE r.school_id = p_school_id
      AND r.status = 'active'
      AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id)
      AND se.class_id = p_class_id
      AND se.status = 'active'
      AND (p_start_date IS NULL OR r.receipt_date >= p_start_date)
      AND (p_end_date IS NULL OR r.receipt_date <= p_end_date);
  ELSE
    SELECT
      COALESCE(SUM(total_paise), 0),
      COALESCE(SUM(CASE WHEN receipt_date >= v_cur_month_start AND receipt_date <= v_today_date THEN total_paise ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN receipt_date >= v_prev_month_start AND receipt_date <= v_prev_month_end THEN total_paise ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN receipt_date = v_today_date THEN total_paise ELSE 0 END), 0)
    INTO
      v_total_collected_paise,
      v_month_collected_paise,
      v_prev_collected_paise,
      v_today_collected_paise
    FROM public.fee_receipts
    WHERE school_id = p_school_id
      AND status = 'active'
      AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
      AND (p_start_date IS NULL OR receipt_date >= p_start_date)
      AND (p_end_date IS NULL OR receipt_date <= p_end_date);
  END IF;

  -- 2. Dues Aggregation (Demand, Outstanding, Overdue)
  -- Active dues: status NOT IN ('cancelled', 'waived')
  IF p_class_id IS NOT NULL THEN
    SELECT
      COALESCE(SUM(d.gross_paise), 0),
      COALESCE(SUM(d.concession_paise), 0),
      COALESCE(SUM(d.net_paise), 0),
      COALESCE(SUM(d.paid_paise), 0),
      COALESCE(SUM(d.balance_paise), 0),
      COALESCE(SUM(CASE WHEN d.due_date < v_today_date AND d.balance_paise > 0 THEN d.balance_paise ELSE 0 END), 0)
    INTO
      v_gross_billed_paise,
      v_concessions_paise,
      v_net_billed_paise,
      v_allocated_paid_paise,
      v_total_outstanding_paise,
      v_total_overdue_paise
    FROM public.student_dues d
    JOIN public.student_enrollments se ON se.student_id = d.student_id AND se.school_id = d.school_id
    WHERE d.school_id = p_school_id
      AND d.status NOT IN ('cancelled', 'waived')
      AND (p_academic_year_id IS NULL OR d.academic_year_id = p_academic_year_id)
      AND se.class_id = p_class_id
      AND se.status = 'active';
  ELSE
    SELECT
      COALESCE(SUM(gross_paise), 0),
      COALESCE(SUM(concession_paise), 0),
      COALESCE(SUM(net_paise), 0),
      COALESCE(SUM(paid_paise), 0),
      COALESCE(SUM(balance_paise), 0),
      COALESCE(SUM(CASE WHEN due_date < v_today_date AND balance_paise > 0 THEN balance_paise ELSE 0 END), 0)
    INTO
      v_gross_billed_paise,
      v_concessions_paise,
      v_net_billed_paise,
      v_allocated_paid_paise,
      v_total_outstanding_paise,
      v_total_overdue_paise
    FROM public.student_dues
    WHERE school_id = p_school_id
      AND status NOT IN ('cancelled', 'waived')
      AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id);
  END IF;

  -- 3. Net Advance Credits deduction per student
  WITH student_credits AS (
    SELECT student_id, COALESCE(SUM(remaining_paise), 0) as credit_paise
    FROM public.fee_credits
    WHERE school_id = p_school_id AND remaining_paise > 0
    GROUP BY student_id
  ),
  student_due_totals AS (
    SELECT
      d.student_id,
      SUM(d.balance_paise) as raw_balance,
      SUM(CASE WHEN d.due_date < v_today_date THEN d.balance_paise ELSE 0 END) as raw_overdue
    FROM public.student_dues d
    WHERE d.school_id = p_school_id
      AND d.status NOT IN ('cancelled', 'waived')
      AND (p_academic_year_id IS NULL OR d.academic_year_id = p_academic_year_id)
    GROUP BY d.student_id
  ),
  adjusted AS (
    SELECT
      sdt.student_id,
      GREATEST(0, sdt.raw_balance - COALESCE(sc.credit_paise, 0)) as net_bal,
      GREATEST(0, sdt.raw_overdue - COALESCE(sc.credit_paise, 0)) as net_ovd
    FROM student_due_totals sdt
    LEFT JOIN student_credits sc ON sc.student_id = sdt.student_id
  )
  SELECT
    COALESCE(SUM(net_bal), 0),
    COALESCE(SUM(net_ovd), 0)
  INTO
    v_total_outstanding_paise,
    v_total_overdue_paise
  FROM adjusted;

  -- Invariant: Overdue is strictly a subset of outstanding
  IF v_total_overdue_paise > v_total_outstanding_paise THEN
    v_total_overdue_paise := v_total_outstanding_paise;
  END IF;
  v_pending_current_paise := v_total_outstanding_paise - v_total_overdue_paise;

  -- 4. Active Students Count
  IF p_class_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT se.student_id)
    INTO v_total_students_count
    FROM public.student_enrollments se
    JOIN public.students s ON s.id = se.student_id
    WHERE se.school_id = p_school_id
      AND se.class_id = p_class_id
      AND se.status = 'active'
      AND s.deleted_at IS NULL
      AND (p_academic_year_id IS NULL OR se.academic_year_id = p_academic_year_id);
  ELSE
    SELECT COUNT(DISTINCT s.id)
    INTO v_total_students_count
    FROM public.students s
    WHERE s.school_id = p_school_id
      AND s.deleted_at IS NULL
      AND (s.status IS NULL OR s.status IN ('active', 'enrolled'));
  END IF;

  -- 5. Collection Rate Percentage
  IF v_net_billed_paise > 0 THEN
    v_collection_rate_pct := ROUND(((v_total_collected_paise::NUMERIC / v_net_billed_paise::NUMERIC) * 100), 1);
  ELSIF v_gross_billed_paise > 0 THEN
    v_collection_rate_pct := ROUND(((v_total_collected_paise::NUMERIC / v_gross_billed_paise::NUMERIC) * 100), 1);
  ELSE
    v_collection_rate_pct := 0;
  END IF;
  IF v_collection_rate_pct > 100 THEN
    v_collection_rate_pct := 100;
  END IF;

  -- 6. Month-over-month growth
  IF v_prev_collected_paise > 0 THEN
    v_month_change_pct := ROUND((((v_month_collected_paise::NUMERIC - v_prev_collected_paise::NUMERIC) / v_prev_collected_paise::NUMERIC) * 100), 1);
  END IF;

  -- 7. Monthly Collection Trend (Trailing 12 months)
  WITH months AS (
    SELECT
      TO_CHAR(d, 'YYYY-MM') AS month_key,
      TO_CHAR(d, 'Mon') AS month_label,
      DATE_TRUNC('month', d)::DATE AS m_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month - 1 day')::DATE AS m_end
    FROM generate_series(
      (DATE_TRUNC('month', v_today_date) - INTERVAL '11 months')::DATE,
      DATE_TRUNC('month', v_today_date)::DATE,
      '1 month'::INTERVAL
    ) d
  ),
  month_collections AS (
    SELECT
      TO_CHAR(r.receipt_date, 'YYYY-MM') AS month_key,
      COALESCE(SUM(r.total_paise), 0) AS collected_paise
    FROM public.fee_receipts r
    WHERE r.school_id = p_school_id
      AND r.status = 'active'
      AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id)
      AND r.receipt_date >= (DATE_TRUNC('month', v_today_date) - INTERVAL '11 months')::DATE
      AND r.receipt_date <= v_today_date
    GROUP BY TO_CHAR(r.receipt_date, 'YYYY-MM')
  ),
  month_dues AS (
    SELECT
      TO_CHAR(d.due_date, 'YYYY-MM') AS month_key,
      COALESCE(SUM(d.net_paise), 0) AS billed_paise
    FROM public.student_dues d
    WHERE d.school_id = p_school_id
      AND d.status NOT IN ('cancelled', 'waived')
      AND (p_academic_year_id IS NULL OR d.academic_year_id = p_academic_year_id)
      AND d.due_date >= (DATE_TRUNC('month', v_today_date) - INTERVAL '11 months')::DATE
      AND d.due_date <= (DATE_TRUNC('month', v_today_date) + INTERVAL '1 month - 1 day')::DATE
    GROUP BY TO_CHAR(d.due_date, 'YYYY-MM')
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'label', m.month_label,
      'collectedPaise', COALESCE(mc.collected_paise, 0),
      'billedPaise', COALESCE(md.billed_paise, 0)
    ) ORDER BY m.month_key ASC
  )
  INTO v_monthly_trend
  FROM months m
  LEFT JOIN month_collections mc ON mc.month_key = m.month_key
  LEFT JOIN month_dues md ON md.month_key = m.month_key;

  RETURN jsonb_build_object(
    'totalCollectedPaise', v_total_collected_paise,
    'thisMonthCollectedPaise', v_month_collected_paise,
    'lastMonthCollectedPaise', v_prev_collected_paise,
    'todayCollectedPaise', v_today_collected_paise,
    'totalOutstandingPaise', v_total_outstanding_paise,
    'totalOverduePaise', v_total_overdue_paise,
    'pendingCurrentPaise', v_pending_current_paise,
    'totalGrossBilledPaise', v_gross_billed_paise,
    'totalConcessionsPaise', v_concessions_paise,
    'totalNetBilledPaise', v_net_billed_paise,
    'totalStudentsCount', v_total_students_count,
    'collectionRatePct', v_collection_rate_pct,
    'monthChangePct', v_month_change_pct,
    'monthlyTrend', COALESCE(v_monthly_trend, '[]'::JSONB)
  );
END;
$$;

-- ============================================================================
-- 3. get_dashboard_recent_collections RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_recent_collections(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_class_id         UUID DEFAULT NULL,
  p_status           TEXT DEFAULT NULL,
  p_payment_mode     TEXT DEFAULT NULL,
  p_search           TEXT DEFAULT NULL,
  p_page             INT DEFAULT 1,
  p_page_size        INT DEFAULT 10
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset     INT;
  v_total      BIGINT := 0;
  v_items      JSONB := '[]'::JSONB;
  v_search_pat TEXT;
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
  END IF;

  v_offset := GREATEST(0, (COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 10));
  IF p_search IS NOT NULL AND LENGTH(TRIM(p_search)) > 0 THEN
    v_search_pat := '%' || LOWER(TRIM(p_search)) || '%';
  END IF;

  -- Count total
  SELECT COUNT(DISTINCT r.id)
  INTO v_total
  FROM public.fee_receipts r
  JOIN public.students s ON s.id = r.student_id
  LEFT JOIN public.student_enrollments se ON se.student_id = r.student_id AND se.school_id = r.school_id AND se.status = 'active'
  LEFT JOIN public.fee_payments p ON p.receipt_id = r.id
  WHERE r.school_id = p_school_id
    AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id)
    AND (p_class_id IS NULL OR se.class_id = p_class_id)
    AND (p_status IS NULL OR r.status = p_status)
    AND (p_payment_mode IS NULL OR p.mode = p_payment_mode)
    AND (
      v_search_pat IS NULL OR
      LOWER(r.receipt_no) LIKE v_search_pat OR
      LOWER(s.first_name || ' ' || COALESCE(s.last_name, '')) LIKE v_search_pat OR
      LOWER(s.admission_no) LIKE v_search_pat
    );

  -- Retrieve items
  SELECT jsonb_agg(sub)
  INTO v_items
  FROM (
    SELECT DISTINCT ON (r.created_at, r.id)
      r.id,
      r.receipt_no,
      r.student_id,
      TRIM(s.first_name || ' ' || COALESCE(s.last_name, '')) AS student_name,
      s.admission_no,
      COALESCE(c.name, '—') AS class_name,
      r.total_paise,
      COALESCE(p.mode, r.source, 'cash') AS payment_mode,
      r.receipt_date,
      r.status,
      r.created_at
    FROM public.fee_receipts r
    JOIN public.students s ON s.id = r.student_id
    LEFT JOIN public.student_enrollments se ON se.student_id = r.student_id AND se.school_id = r.school_id AND se.status = 'active'
    LEFT JOIN public.classes c ON c.id = se.class_id
    LEFT JOIN public.fee_payments p ON p.receipt_id = r.id
    WHERE r.school_id = p_school_id
      AND (p_academic_year_id IS NULL OR r.academic_year_id = p_academic_year_id)
      AND (p_class_id IS NULL OR se.class_id = p_class_id)
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_payment_mode IS NULL OR p.mode = p_payment_mode)
      AND (
        v_search_pat IS NULL OR
        LOWER(r.receipt_no) LIKE v_search_pat OR
        LOWER(s.first_name || ' ' || COALESCE(s.last_name, '')) LIKE v_search_pat OR
        LOWER(s.admission_no) LIKE v_search_pat
      )
    ORDER BY r.created_at DESC, r.id
    LIMIT COALESCE(p_page_size, 10)
    OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::JSONB),
    'total', v_total,
    'page', COALESCE(p_page, 1),
    'pageSize', COALESCE(p_page_size, 10),
    'totalPages', CEIL(v_total::NUMERIC / GREATEST(1, COALESCE(p_page_size, 10)))::INT
  );
END;
$$;

-- ============================================================================
-- 4. get_dashboard_top_pending_dues RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_top_pending_dues(
  p_school_id        UUID,
  p_academic_year_id UUID DEFAULT NULL,
  p_class_id         UUID DEFAULT NULL,
  p_search           TEXT DEFAULT NULL,
  p_page             INT DEFAULT 1,
  p_page_size        INT DEFAULT 10
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_date DATE;
  v_offset     INT;
  v_total      BIGINT := 0;
  v_items      JSONB := '[]'::JSONB;
  v_search_pat TEXT;
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF auth.uid() IS NULL OR NOT (public.is_school_member(p_school_id) OR public.is_school_admin(p_school_id)) THEN
      RAISE EXCEPTION 'UNAUTHORIZED';
    END IF;
  END IF;

  v_today_date := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_offset := GREATEST(0, (COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 10));
  IF p_search IS NOT NULL AND LENGTH(TRIM(p_search)) > 0 THEN
    v_search_pat := '%' || LOWER(TRIM(p_search)) || '%';
  END IF;

  -- Aggregate student pending dues with advance credit offsets
  WITH student_credits AS (
    SELECT student_id, COALESCE(SUM(remaining_paise), 0) as credit_paise
    FROM public.fee_credits
    WHERE school_id = p_school_id AND remaining_paise > 0
    GROUP BY student_id
  ),
  aggregated_dues AS (
    SELECT
      d.student_id,
      SUM(d.balance_paise) as raw_balance,
      MIN(CASE WHEN d.due_date < v_today_date AND d.balance_paise > 0 THEN d.due_date ELSE NULL END) as earliest_overdue_date
    FROM public.student_dues d
    WHERE d.school_id = p_school_id
      AND d.status NOT IN ('cancelled', 'waived')
      AND (p_academic_year_id IS NULL OR d.academic_year_id = p_academic_year_id)
    GROUP BY d.student_id
  ),
  netted_students AS (
    SELECT
      ad.student_id,
      GREATEST(0, ad.raw_balance - COALESCE(sc.credit_paise, 0)) as balance_paise,
      ad.earliest_overdue_date,
      CASE
        WHEN ad.earliest_overdue_date IS NOT NULL
        THEN GREATEST(0, (v_today_date - ad.earliest_overdue_date))
        ELSE 0
      END as days_past_due
    FROM aggregated_dues ad
    LEFT JOIN student_credits sc ON sc.student_id = ad.student_id
    WHERE GREATEST(0, ad.raw_balance - COALESCE(sc.credit_paise, 0)) > 0
  ),
  filtered_students AS (
    SELECT
      ns.student_id,
      TRIM(s.first_name || ' ' || COALESCE(s.last_name, '')) as student_name,
      s.admission_no,
      COALESCE(c.name, '—') as class_name,
      ns.balance_paise,
      ns.days_past_due,
      ns.earliest_overdue_date
    FROM netted_students ns
    JOIN public.students s ON s.id = ns.student_id
    LEFT JOIN public.student_enrollments se ON se.student_id = s.id AND se.school_id = s.school_id AND se.status = 'active'
    LEFT JOIN public.classes c ON c.id = se.class_id
    WHERE s.deleted_at IS NULL
      AND (p_class_id IS NULL OR se.class_id = p_class_id)
      AND (
        v_search_pat IS NULL OR
        LOWER(s.first_name || ' ' || COALESCE(s.last_name, '')) LIKE v_search_pat OR
        LOWER(s.admission_no) LIKE v_search_pat
      )
  )
  SELECT
    (SELECT COUNT(*) FROM filtered_students),
    (
      SELECT jsonb_agg(f)
      FROM (
        SELECT
          student_id as "studentId",
          student_name as "studentName",
          admission_no as "admissionNo",
          class_name as "className",
          balance_paise as "balancePaise",
          days_past_due as "daysPastDue",
          earliest_overdue_date as "earliestOverdueDate"
        FROM filtered_students
        ORDER BY balance_paise DESC, days_past_due DESC
        LIMIT COALESCE(p_page_size, 10)
        OFFSET v_offset
      ) f
    )
  INTO v_total, v_items;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::JSONB),
    'total', v_total,
    'page', COALESCE(p_page, 1),
    'pageSize', COALESCE(p_page_size, 10),
    'totalPages', CEIL(v_total::NUMERIC / GREATEST(1, COALESCE(p_page_size, 10)))::INT
  );
END;
$$;
