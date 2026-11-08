-- Migration: 20261107000000_platform_cross_tenant_access.sql
-- Description: Platform Administrator Cross-Tenant Aggregates & Policy Integration
-- Enables SaaS control plane visibility across all schools while preserving DPDP isolation.

-- 1. Add Platform Admin SELECT Policy on public.schools
DROP POLICY IF EXISTS "platform_admins_select_schools" ON public.schools;
CREATE POLICY "platform_admins_select_schools"
  ON public.schools FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 2. Add Platform Admin UPDATE Policy on public.schools (for suspension/activation)
DROP POLICY IF EXISTS "platform_admins_update_schools" ON public.schools;
CREATE POLICY "platform_admins_update_schools"
  ON public.schools FOR UPDATE TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- 3. Add Platform Admin SELECT Policy on public.school_subscriptions
DROP POLICY IF EXISTS "platform_admins_select_subscriptions" ON public.school_subscriptions;
CREATE POLICY "platform_admins_select_subscriptions"
  ON public.school_subscriptions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 4. Add Platform Admin SELECT Policy on public.school_subscription_payments
DROP POLICY IF EXISTS "platform_admins_select_payments" ON public.school_subscription_payments;
CREATE POLICY "platform_admins_select_payments"
  ON public.school_subscription_payments FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- 5. Narrowly-scoped SECURITY DEFINER aggregate function for Master Admin Control Plane
-- Validates auth.uid() against active platform_admins before querying cross-tenant tables.
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
  v_total_students INT;
  v_schools_list JSONB;
BEGIN
  -- Strict verification of platform admin identity & active status
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE auth_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. Caller is not an active platform administrator.';
  END IF;

  SELECT count(*) INTO v_total_schools FROM public.schools;
  SELECT count(*) INTO v_onboarding_completed FROM public.schools WHERE onboarding_completed = true;
  SELECT count(*) INTO v_onboarding_pending FROM public.schools WHERE onboarding_completed IS NOT true;
  SELECT count(*) INTO v_active_schools FROM public.schools WHERE onboarding_completed = true;
  
  -- Total students count across all authorized tenants
  SELECT count(*) INTO v_total_students FROM public.students;

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
      'onboarding_completed', COALESCE(s.onboarding_completed, false),
      'onboarding_step', COALESCE(s.onboarding_step, 1),
      'created_at', s.created_at
    ) ORDER BY s.created_at ASC
  ) INTO v_schools_list FROM public.schools s;

  RETURN json_build_object(
    'total_schools', v_total_schools,
    'onboarding_completed', v_onboarding_completed,
    'onboarding_pending', v_onboarding_pending,
    'active_schools', v_active_schools,
    'total_students', v_total_students,
    'schools', COALESCE(v_schools_list, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_cross_tenant_aggregates() TO authenticated;

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

