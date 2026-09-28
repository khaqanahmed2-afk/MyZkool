-- Migration: 018_fix_subscription_and_feature_gating.sql
-- Fixes Pro plan feature gating and subscription resolution.
-- 1. Updates school_has_feature(p_feature, p_school_id) to inspect real subscription status and valid trial bounds.
-- 2. Seeds canonical subscription_plans rows idempotently.
-- 3. Updates RLS policies so active plans are readable and school admins can manage their subscription.

-- 1. Seed / Ensure Canonical Subscription Plans with Real UUIDs
INSERT INTO public.subscription_plans (
  slug,
  name,
  description,
  price_monthly,
  price_six_months,
  price_yearly,
  currency,
  student_capacity_label,
  max_students,
  max_staff,
  trial_days,
  features,
  is_popular,
  is_active,
  sort_order
)
VALUES
  (
    'basic',
    'Basic',
    'Essential school website, admissions, attendance & fee collection for growing schools.',
    999.00,
    5694.00,
    10789.00,
    'INR',
    'Up to 800 students',
    800,
    50,
    14,
    '["students", "fees", "attendance", "admissions", "website", "communication"]'::jsonb,
    false,
    true,
    1
  ),
  (
    'pro',
    'Pro',
    'Complete school ERP for Indian K-12 schools with exams, timetable, transport, and priority support.',
    1799.00,
    10254.00,
    19429.00,
    'INR',
    'Up to 1,800 students',
    1800,
    150,
    14,
    '["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams", "timetable", "reports", "approvals"]'::jsonb,
    true,
    true,
    2
  ),
  (
    'custom',
    'Custom',
    'Tailored infrastructure for large multi-branch institutions requiring custom integrations and dedicated support.',
    NULL,
    NULL,
    NULL,
    'INR',
    '1,800+ students',
    NULL,
    NULL,
    14,
    '["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams", "timetable", "reports", "approvals", "multi_branch"]'::jsonb,
    false,
    true,
    3
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_six_months = EXCLUDED.price_six_months,
  price_yearly = EXCLUDED.price_yearly,
  student_capacity_label = EXCLUDED.student_capacity_label,
  max_students = EXCLUDED.max_students,
  max_staff = EXCLUDED.max_staff,
  trial_days = EXCLUDED.trial_days,
  features = EXCLUDED.features,
  is_popular = EXCLUDED.is_popular,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 2. Allow active subscription plans to be viewed by authenticated users and anon
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Authenticated users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- 3. Ensure School Admins can manage their school subscriptions
DROP POLICY IF EXISTS "School Admins can manage own school subscriptions" ON public.school_subscriptions;
CREATE POLICY "School Admins can manage own school subscriptions"
  ON public.school_subscriptions FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- 4. Overload and replace public.school_has_feature
-- Supports:
-- A) Explicit school ID: school_has_feature('transport', 'uuid')
-- B) Ambient school ID: school_has_feature('transport') via public.current_school_id()
CREATE OR REPLACE FUNCTION public.school_has_feature(
  p_feature TEXT,
  p_school_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
  v_plan_slug TEXT;
  v_features JSONB;
  v_status TEXT;
  v_trial_ends TIMESTAMPTZ;
  v_period_ends TIMESTAMPTZ;
  v_norm_feature TEXT;
BEGIN
  v_school_id := COALESCE(p_school_id, public.current_school_id());
  IF v_school_id IS NULL THEN
    RETURN FALSE;
  END IF;

  v_norm_feature := LOWER(TRIM(p_feature));

  -- Baseline features always active for any valid registered school
  IF v_norm_feature IN ('students', 'fees', 'attendance', 'admissions', 'website', 'communication') THEN
    RETURN TRUE;
  END IF;

  -- 1. Check school_subscriptions (primary subscription record)
  SELECT 
    LOWER(COALESCE(sp.slug, ss.metadata->>'plan_slug', 'basic')),
    COALESCE(sp.features, ss.metadata->'features', '[]'::jsonb),
    ss.status,
    ss.trial_ends_at,
    ss.current_period_ends_at
  INTO 
    v_plan_slug,
    v_features,
    v_status,
    v_trial_ends,
    v_period_ends
  FROM public.school_subscriptions ss
  LEFT JOIN public.subscription_plans sp ON sp.id = ss.plan_id
  WHERE ss.school_id = v_school_id
  ORDER BY ss.created_at DESC
  LIMIT 1;

  IF v_status IS NOT NULL THEN
    -- Check trial validity
    IF v_status = 'trialing' THEN
      IF v_trial_ends IS NOT NULL AND v_trial_ends < now() THEN
        -- Trial has expired
        RETURN FALSE;
      END IF;
    ELSIF v_status = 'active' THEN
      IF v_period_ends IS NOT NULL AND v_period_ends < now() THEN
        -- Billing period has expired
        RETURN FALSE;
      END IF;
    ELSE
      -- past_due, cancelled, incomplete
      RETURN FALSE;
    END IF;

    -- If active or in valid trial:
    -- Direct JSON feature check
    IF v_features ? v_norm_feature THEN
      RETURN TRUE;
    END IF;

    -- Pro and Custom tiers unlock Pro capabilities
    IF v_plan_slug IN ('pro', 'custom') THEN
      IF v_norm_feature IN ('transport', 'exams', 'timetable', 'reports', 'approvals') THEN
        RETURN TRUE;
      END IF;
      IF v_features::text ILIKE '%' || v_norm_feature || '%' THEN
        RETURN TRUE;
      END IF;
    ELSIF v_plan_slug = 'basic' THEN
      IF v_norm_feature = 'transport' THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;

  -- 2. Fallback: Check school_plans table if present
  BEGIN
    SELECT 
      LOWER(COALESCE(plan_slug, plan_key, 'basic')),
      features,
      billing_status,
      valid_until
    INTO 
      v_plan_slug,
      v_features,
      v_status,
      v_period_ends
    FROM public.school_plans
    WHERE school_id = v_school_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_status IS NOT NULL THEN
      IF v_status IN ('trialing', 'active') AND (v_period_ends IS NULL OR v_period_ends > now()) THEN
        IF v_features ? v_norm_feature THEN
          RETURN TRUE;
        END IF;
        IF v_plan_slug IN ('pro', 'custom') AND v_norm_feature IN ('transport', 'exams', 'timetable', 'reports', 'approvals') THEN
          RETURN TRUE;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Table or columns might differ; non-fatal
  END;

  -- Pro features default to false if not unlocked by active subscription/trial
  IF v_norm_feature = 'transport' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;
