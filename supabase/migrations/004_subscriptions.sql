-- MyZkool Step 7: Subscriptions & Plan Selection Schema
-- Migration: 004_subscriptions.sql

-- 1. Create subscription_plans table (Global Plan Catalog)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_monthly NUMERIC(10, 2),
  price_six_months NUMERIC(10, 2),
  price_yearly NUMERIC(10, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  student_capacity_label TEXT NOT NULL,
  max_students INTEGER,
  max_staff INTEGER,
  trial_days INTEGER NOT NULL DEFAULT 14,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active_sort 
  ON public.subscription_plans (is_active, sort_order);

-- 2. Create school_subscriptions table (Tenant Subscription Instance)
CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'six_months', 'yearly')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'incomplete')),
  trial_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL,
  current_period_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_ends_at TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'INR',
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  gst_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT DEFAULT 'trial' CHECK (payment_method IN ('trial', 'upi', 'card', 'netbanking', 'offline_invoice', 'pending')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('trial', 'pending', 'paid', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for tenant lookups and active status
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school_status 
  ON public.school_subscriptions (school_id, status);

CREATE INDEX IF NOT EXISTS idx_school_subscriptions_created_at 
  ON public.school_subscriptions (created_at DESC);

-- 3. Updated_at triggers
DROP TRIGGER IF EXISTS trigger_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_school_subscriptions_updated_at ON public.school_subscriptions;
CREATE TRIGGER trigger_school_subscriptions_updated_at
  BEFORE UPDATE ON public.school_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for subscription_plans
-- Everyone authenticated can view active subscription plans
DROP POLICY IF EXISTS "Authenticated users can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Authenticated users can view active subscription plans"
  ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active = true);

-- Only Super Admins can insert/update plans
DROP POLICY IF EXISTS "Super Admins can manage subscription plans" ON public.subscription_plans;
CREATE POLICY "Super Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 6. RLS Policies for school_subscriptions
-- School members can view their own school subscriptions
DROP POLICY IF EXISTS "School members can view own school subscriptions" ON public.school_subscriptions;
CREATE POLICY "School members can view own school subscriptions"
  ON public.school_subscriptions FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- School Admins can insert/update their school subscription
DROP POLICY IF EXISTS "School Admins can manage own school subscriptions" ON public.school_subscriptions;
CREATE POLICY "School Admins can manage own school subscriptions"
  ON public.school_subscriptions FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 7. Seed Default Subscription Plans (Idempotent UPSERT)
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
    '[
      "Website Builder & School Subdomain",
      "Admissions Pipeline & Lead Capture",
      "Fee Collection with 1-Click UPI Links",
      "Daily Attendance Register",
      "Direct WhatsApp Parent Alerts",
      "Encrypted Tenant Data Isolation"
    ]'::jsonb,
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
    '[
      "Everything in Basic Plan",
      "CBSE, ICSE & State Board Report Cards",
      "Automated Timetable & Period Scheduler",
      "Staff & Student Digital Registers",
      "School Bus & Transport Tracking",
      "Priority WhatsApp Administrative Support",
      "Data Export & Statutory Audit Reports"
    ]'::jsonb,
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
    '[
      "Everything in Pro Plan",
      "Multi-branch Centralized Management",
      "Dedicated Onboarding & Account Specialist",
      "Custom MIS & Board Compliance Analytics",
      "Dedicated Infrastructure Isolation",
      "24/7 SLA Priority Phone & WhatsApp Escalation"
    ]'::jsonb,
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
