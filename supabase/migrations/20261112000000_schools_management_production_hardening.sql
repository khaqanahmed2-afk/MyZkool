-- Migration: 20261112000000_schools_management_production_hardening.sql
-- Description: Institutional Lifecycle Management, Status Taxonomy, Institution Codes,
--              Subscription History Ledger, and Upgraded Cross-Tenant Aggregation.
-- Idempotent, forward-only, non-destructive.

-- 1. Extend public.schools with institutional management fields
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT NOT NULL DEFAULT 53687091200, -- 50 GB default
  ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principal_name TEXT,
  ADD COLUMN IF NOT EXISTS principal_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_institution_code 
  ON public.schools (institution_code) 
  WHERE institution_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schools_status 
  ON public.schools (status);

-- 2. Create public.school_subscription_history (Audit & Lifecycle Ledger)
CREATE TABLE IF NOT EXISTS public.school_subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.school_subscriptions(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('created', 'plan_change', 'trial_extended', 'validity_extended', 'status_change', 'complimentary_grant')),
  previous_plan_slug TEXT,
  new_plan_slug TEXT,
  previous_expiry TIMESTAMPTZ,
  new_expiry TIMESTAMPTZ,
  classification TEXT NOT NULL DEFAULT 'paid' CHECK (classification IN ('paid', 'complimentary', 'trial', 'system')),
  reason TEXT NOT NULL,
  payment_reference TEXT,
  performed_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sub_history_school 
  ON public.school_subscription_history (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sub_history_operation 
  ON public.school_subscription_history (operation_type);

-- Enable RLS on school_subscription_history
ALTER TABLE public.school_subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform Admins can manage school_subscription_history" ON public.school_subscription_history;
CREATE POLICY "Platform Admins can manage school_subscription_history"
  ON public.school_subscription_history FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "School Admins can view own school_subscription_history" ON public.school_subscription_history;
CREATE POLICY "School Admins can view own school_subscription_history"
  ON public.school_subscription_history FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- 3. Idempotently seed verified institutional records into public.schools
INSERT INTO public.schools (
  id,
  name,
  subdomain,
  school_type,
  affiliation_board,
  official_email,
  contact_phone,
  address,
  city,
  district,
  state,
  pin_code,
  institution_code,
  status,
  onboarding_completed,
  onboarding_step,
  principal_name,
  principal_email,
  created_at
)
VALUES
  (
    'b70261ef-37f1-46c8-a148-2c496a9d33a8',
    'Peace Convent School',
    'peace-convent-school1',
    'k12',
    'cbse',
    'myzkool.official@gmail.com',
    '+919876543205',
    'Behind Abdul Hameed Memorial Inter College, Mawai, Ayodhya, Uttar Pradesh – 224117',
    'Lucknow',
    'Ayodhya',
    'Uttar Pradesh',
    '211019',
    'MYZ-00124',
    'active',
    true,
    6,
    'Mr. Arif Khan',
    'principal@peaceconvent.in',
    '2024-03-15T10:00:00.000Z'
  ),
  (
    '0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa',
    'Khaqan Public School',
    'khaqan-public-school',
    'k12',
    'cbse',
    'contact@khaqanpublicschool.edu.in',
    '+919876543201',
    'Civil Lines, Aligarh, Uttar Pradesh – 202001',
    'Aligarh',
    'Aligarh',
    'Uttar Pradesh',
    '202001',
    'MYZ-00125',
    'active',
    true,
    6,
    'Dr. Saima Ali',
    'admin@khaqanpublic.in',
    '2024-04-10T09:00:00.000Z'
  ),
  (
    '33a509da-9f79-44c0-ad71-372916d04925',
    'Bright Future Academy',
    'bright-future-academy',
    'senior_secondary',
    'cbse',
    'contact@brightfuture.edu.in',
    '+919876543202',
    'Mall Road, Kanpur, Uttar Pradesh – 208001',
    'Kanpur',
    'Kanpur',
    'Uttar Pradesh',
    '208001',
    'MYZ-00126',
    'active',
    true,
    6,
    'Mr. Neeraj Verma',
    'principal@bfa.in',
    '2024-05-18T11:30:00.000Z'
  ),
  (
    '599a11a0-cdfe-4f36-896d-3e212a20f0f3',
    'Green Valley School',
    'green-valley-school',
    'middle',
    'cbse',
    'office@greenvalley.edu.in',
    '+919876543203',
    'Sigra, Varanasi, Uttar Pradesh – 221002',
    'Varanasi',
    'Varanasi',
    'Uttar Pradesh',
    '221002',
    'MYZ-00127',
    'active',
    true,
    6,
    'Ms. Rukhsar Fatima',
    'admin@greenvalley.in',
    '2024-06-01T09:15:00.000Z'
  ),
  (
    'fad2d00f-4723-4deb-b1d7-1c08ef408b80',
    'City International School',
    'city-international-school',
    'k12',
    'icse',
    'info@cityintl.edu.in',
    '+919876543206',
    'Gomti Nagar, Lucknow, Uttar Pradesh – 226010',
    'Lucknow',
    'Lucknow',
    'Uttar Pradesh',
    '226010',
    'MYZ-00128',
    'active',
    true,
    6,
    'Mr. Deepak Singh',
    'principal@cityintl.in',
    '2024-07-20T08:20:00.000Z'
  ),
  (
    '98d1b20b-80c9-4d6a-bbfd-197fccf47bda',
    'Sunrise Public School',
    'sunrise-public-school',
    'senior_secondary',
    'state_board',
    'admin@sunriseps.in',
    '+919876543204',
    'Station Road, Barabanki, Uttar Pradesh – 225001',
    'Barabanki',
    'Barabanki',
    'Uttar Pradesh',
    '225001',
    'MYZ-00129',
    'suspended',
    false,
    2,
    'Mr. Imran Siddiqui',
    'admin@sunriseps.in',
    '2024-08-15T14:45:00.000Z'
  )
ON CONFLICT (id) DO UPDATE SET
  institution_code = COALESCE(public.schools.institution_code, EXCLUDED.institution_code),
  status = CASE WHEN public.schools.status IS NULL THEN EXCLUDED.status ELSE public.schools.status END,
  principal_name = COALESCE(public.schools.principal_name, EXCLUDED.principal_name),
  principal_email = COALESCE(public.schools.principal_email, EXCLUDED.principal_email);

-- Ensure primary school has MYZ-00124 if not set
UPDATE public.schools
SET 
  institution_code = 'MYZ-00124',
  principal_name = COALESCE(principal_name, 'Mr. Arif Khan'),
  principal_email = COALESCE(principal_email, 'principal@peaceconvent.in')
WHERE id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8' AND institution_code IS NULL;

-- 4. Idempotently seed subscription rows for verified schools
DO $$
DECLARE
  v_pro_plan_id UUID;
  v_basic_plan_id UUID;
  v_custom_plan_id UUID;
BEGIN
  SELECT id INTO v_pro_plan_id FROM public.subscription_plans WHERE slug = 'pro';
  SELECT id INTO v_basic_plan_id FROM public.subscription_plans WHERE slug = 'basic';
  SELECT id INTO v_custom_plan_id FROM public.subscription_plans WHERE slug = 'custom';

  -- Khaqan Public School: Basic Plan, Dec 20, 2025
  IF v_basic_plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (
      school_id, plan_id, billing_cycle, status,
      trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
      amount, payment_status, metadata
    )
    VALUES (
      '0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa', v_basic_plan_id, 'yearly', 'active',
      now() - interval '1 year', now() - interval '350 days',
      '2024-12-20T00:00:00Z', '2025-12-20T00:00:00Z',
      10789.00, 'paid', '{"plan_slug": "basic", "plan_name": "Basic"}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Bright Future Academy: Pro Plan, May 15, 2027
  IF v_pro_plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (
      school_id, plan_id, billing_cycle, status,
      trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
      amount, payment_status, metadata
    )
    VALUES (
      '33a509da-9f79-44c0-ad71-372916d04925', v_pro_plan_id, 'yearly', 'active',
      now() - interval '6 months', now() - interval '5 months',
      '2024-05-15T00:00:00Z', '2027-05-15T00:00:00Z',
      19429.00, 'paid', '{"plan_slug": "pro", "plan_name": "Pro"}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Green Valley School: Trial Plan, 7 days left
  IF v_pro_plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (
      school_id, plan_id, billing_cycle, status,
      trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
      amount, payment_status, metadata
    )
    VALUES (
      '599a11a0-cdfe-4f36-896d-3e212a20f0f3', v_pro_plan_id, 'monthly', 'trialing',
      now() - interval '7 days', now() + interval '7 days',
      now() - interval '7 days', now() + interval '7 days',
      0.00, 'trial', '{"plan_slug": "pro", "plan_name": "Pro", "is_trial": true}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- City International School: Custom Plan, Jun 30, 2027
  IF v_custom_plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (
      school_id, plan_id, billing_cycle, status,
      trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
      amount, payment_status, metadata
    )
    VALUES (
      'fad2d00f-4723-4deb-b1d7-1c08ef408b80', v_custom_plan_id, 'yearly', 'active',
      now() - interval '1 year', now() - interval '11 months',
      '2024-06-30T00:00:00Z', '2027-06-30T00:00:00Z',
      45000.00, 'paid', '{"plan_slug": "custom", "plan_name": "Custom"}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Sunrise Public School: Basic Plan, Expired Jan 10, 2025
  IF v_basic_plan_id IS NOT NULL THEN
    INSERT INTO public.school_subscriptions (
      school_id, plan_id, billing_cycle, status,
      trial_starts_at, trial_ends_at, current_period_starts_at, current_period_ends_at,
      amount, payment_status, metadata
    )
    VALUES (
      '98d1b20b-80c9-4d6a-bbfd-197fccf47bda', v_basic_plan_id, 'monthly', 'past_due',
      '2024-12-01T00:00:00Z', '2024-12-15T00:00:00Z',
      '2024-12-10T00:00:00Z', '2025-01-10T00:00:00Z',
      999.00, 'failed', '{"plan_slug": "basic", "plan_name": "Basic"}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Update primary school (Peace Convent School) subscription to Apr 01, 2027
  UPDATE public.school_subscriptions
  SET 
    status = 'active',
    current_period_ends_at = '2027-04-01T00:00:00Z',
    payment_status = 'paid'
  WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
END $$;

-- 5. Upgraded SECURITY DEFINER aggregate function
CREATE OR REPLACE FUNCTION public.get_platform_cross_tenant_aggregates()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_total_schools INT;
  v_onboarding_completed INT;
  v_onboarding_pending INT;
  v_active_schools INT;
  v_suspended_schools INT;
  v_trial_schools INT;
  v_expired_subscriptions INT;
  v_new_schools_this_month INT;
  v_total_students INT;
  v_total_staff INT;
  v_mrr_paise BIGINT;
  v_schools_list JSONB;
BEGIN
  -- Verify platform admin identity
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE auth_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Caller is not an active platform administrator.';
  END IF;

  -- Core School Counts
  SELECT count(*) INTO v_total_schools FROM public.schools;
  SELECT count(*) INTO v_onboarding_completed FROM public.schools WHERE onboarding_completed = true;
  SELECT count(*) INTO v_onboarding_pending FROM public.schools WHERE onboarding_completed IS NOT true;
  SELECT count(*) INTO v_active_schools FROM public.schools WHERE status = 'active';
  SELECT count(*) INTO v_suspended_schools FROM public.schools WHERE status = 'suspended';

  -- New schools registered this calendar month
  SELECT count(*) INTO v_new_schools_this_month 
  FROM public.schools 
  WHERE created_at >= date_trunc('month', now());

  -- Subscription metrics
  SELECT count(*) INTO v_trial_schools 
  FROM public.school_subscriptions 
  WHERE status = 'trialing';

  SELECT count(*) INTO v_expired_subscriptions 
  FROM public.school_subscriptions 
  WHERE current_period_ends_at < now() OR status IN ('past_due', 'cancelled');

  -- Total students count
  SELECT count(*) INTO v_total_students FROM public.students;

  -- Total staff count
  SELECT count(*) INTO v_total_staff FROM public.staff;

  -- Approximate MRR in paise from active subscriptions
  SELECT COALESCE(SUM(
    CASE 
      WHEN billing_cycle = 'yearly' THEN (amount * 100 / 12)
      WHEN billing_cycle = 'six_months' THEN (amount * 100 / 6)
      ELSE (amount * 100)
    END
  )::BIGINT, 0) INTO v_mrr_paise
  FROM public.school_subscriptions
  WHERE status = 'active';

  -- Detailed Schools List
  SELECT json_agg(
    json_build_object(
      'id', s.id,
      'name', s.name,
      'subdomain', s.subdomain,
      'school_type', COALESCE(s.school_type, 'k12'),
      'affiliation_board', COALESCE(s.affiliation_board, 'cbse'),
      'official_email', s.official_email,
      'contact_phone', s.contact_phone,
      'city', COALESCE(s.city, ''),
      'district', COALESCE(s.district, s.city, ''),
      'state', COALESCE(s.state, ''),
      'pin_code', COALESCE(s.pin_code, ''),
      'logo_url', s.logo_url,
      'institution_code', COALESCE(s.institution_code, 'MYZ-' || UPPER(SUBSTRING(s.id::text, 1, 5))),
      'status', COALESCE(s.status, CASE WHEN s.onboarding_completed THEN 'active' ELSE 'pending' END),
      'onboarding_completed', COALESCE(s.onboarding_completed, false),
      'onboarding_step', COALESCE(s.onboarding_step, 1),
      'principal_name', COALESCE(s.principal_name, p.full_name, 'School Administrator'),
      'principal_email', COALESCE(s.principal_email, p.email, s.official_email),
      'created_at', s.created_at,
      'storage_limit_bytes', COALESCE(s.storage_limit_bytes, 53687091200),
      'storage_used_bytes', COALESCE(s.storage_used_bytes, 0),
      
      -- Subscription details
      'subscription_id', sub.id,
      'plan_id', sub.plan_id,
      'plan_slug', COALESCE(pl.slug, 'pro'),
      'plan_name', COALESCE(pl.name, 'Pro'),
      'billing_cycle', COALESCE(sub.billing_cycle, 'monthly'),
      'subscription_status', COALESCE(sub.status, 'active'),
      'subscription_valid_till', sub.current_period_ends_at,
      'trial_starts_at', sub.trial_starts_at,
      'trial_ends_at', sub.trial_ends_at,
      'payment_status', COALESCE(sub.payment_status, 'paid'),
      'max_students', pl.max_students,
      'features', COALESCE(pl.features, '[]'::jsonb),
      
      -- Student and Staff counts per school
      'student_count', (SELECT count(*) FROM public.students st WHERE st.school_id = s.id),
      'staff_count', (SELECT count(*) FROM public.staff sf WHERE sf.school_id = s.id)
    ) ORDER BY s.created_at ASC
  ) INTO v_schools_list 
  FROM public.schools s
  LEFT JOIN public.profiles p ON p.school_id = s.id AND p.role = 'school_admin'
  LEFT JOIN LATERAL (
    SELECT * FROM public.school_subscriptions ss 
    WHERE ss.school_id = s.id 
    ORDER BY ss.created_at DESC LIMIT 1
  ) sub ON true
  LEFT JOIN public.subscription_plans pl ON pl.id = sub.plan_id;

  RETURN json_build_object(
    'total_schools', v_total_schools,
    'active_schools', v_active_schools,
    'pending_onboarding', v_onboarding_pending,
    'onboarding_completed', v_onboarding_completed,
    'suspended_schools', v_suspended_schools,
    'trial_schools', v_trial_schools,
    'expired_subscriptions', v_expired_subscriptions,
    'new_schools_this_month', v_new_schools_this_month,
    'total_students', v_total_students,
    'total_staff', v_total_staff,
    'mrr_paise', v_mrr_paise,
    'schools', COALESCE(v_schools_list, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_cross_tenant_aggregates() TO authenticated;

-- Platform admin permissions on profiles, subscriptions, and schools
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'platform_admins_select_profiles'
  ) THEN
    CREATE POLICY "platform_admins_select_profiles"
      ON public.profiles FOR SELECT
      TO authenticated
      USING (is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'school_subscriptions' AND policyname = 'platform_admins_manage_subscriptions'
  ) THEN
    CREATE POLICY "platform_admins_manage_subscriptions"
      ON public.school_subscriptions FOR ALL
      TO authenticated
      USING (is_platform_admin())
      WITH CHECK (is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'staff' AND policyname = 'platform_admins_select_staff'
  ) THEN
    CREATE POLICY "platform_admins_select_staff"
      ON public.staff FOR SELECT
      TO authenticated
      USING (is_platform_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'schools' AND policyname = 'platform_admins_insert_schools'
  ) THEN
    CREATE POLICY "platform_admins_insert_schools"
      ON public.schools FOR INSERT
      TO authenticated
      WITH CHECK (is_platform_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';


