-- Migration: 024_school_subscription_payments.sql
-- Description: Stores Razorpay orders and verified transactions for School ERP subscriptions.
-- Ensures strict multi-tenant isolation, idempotency, and integer paise monetary precision.

CREATE TABLE IF NOT EXISTS public.school_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id UUID,
  plan_slug TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'six_months', 'yearly')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise >= 100),
  gst_paise BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT NOT NULL UNIQUE,
  gateway_payment_id TEXT UNIQUE,
  gateway_signature TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorised', 'captured', 'failed')),
  subscription_id UUID REFERENCES public.school_subscriptions(id) ON DELETE SET NULL,
  receipt TEXT NOT NULL,
  notes JSONB DEFAULT '{}'::jsonb,
  error_description TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance and lookup indices
CREATE INDEX IF NOT EXISTS idx_school_sub_payments_school 
  ON public.school_subscription_payments(school_id);

CREATE INDEX IF NOT EXISTS idx_school_sub_payments_order 
  ON public.school_subscription_payments(gateway_order_id);

CREATE INDEX IF NOT EXISTS idx_school_sub_payments_status 
  ON public.school_subscription_payments(school_id, status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.school_subscription_payments ENABLE ROW LEVEL SECURITY;

-- Select Policy: School Admins and owners can view their school's subscription payments
DROP POLICY IF EXISTS "School Admins can view own subscription payments" ON public.school_subscription_payments;
CREATE POLICY "School Admins can view own subscription payments"
  ON public.school_subscription_payments FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Insert/Update Policy: Server-side or authenticated school admins
DROP POLICY IF EXISTS "School Admins can insert subscription payments" ON public.school_subscription_payments;
CREATE POLICY "School Admins can insert subscription payments"
  ON public.school_subscription_payments FOR ALL TO authenticated
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
