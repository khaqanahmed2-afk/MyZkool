-- Migration: 20261106100000_subscription_invoices.sql
-- Description: Platform SaaS Subscription Invoices, GST Breakdown & Financial Ledger
-- Forward-only, idempotent, and non-destructive.

-- 1. Create subscription_invoices table
CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.school_subscriptions(id) ON DELETE SET NULL,
  plan_slug TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'six_months', 'yearly')),
  
  -- Integer paise monetary precision
  subtotal_paise BIGINT NOT NULL CHECK (subtotal_paise >= 0),
  discount_paise BIGINT NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  taxable_paise BIGINT NOT NULL CHECK (taxable_paise >= 0),
  gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  cgst_paise BIGINT NOT NULL DEFAULT 0,
  sgst_paise BIGINT NOT NULL DEFAULT 0,
  igst_paise BIGINT NOT NULL DEFAULT 0,
  total_paise BIGINT NOT NULL CHECK (total_paise >= 0),
  
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('draft', 'unpaid', 'paid', 'void', 'refunded')),
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('upi', 'card', 'netbanking', 'neft_rtgs', 'manual_cheque', 'trial')),
  payment_id UUID REFERENCES public.school_subscription_payments(id) ON DELETE SET NULL,
  
  billing_school_name TEXT NOT NULL,
  billing_address TEXT NOT NULL,
  billing_state TEXT NOT NULL,
  billing_gstin TEXT,
  hsn_sac_code TEXT NOT NULL DEFAULT '998314', -- IT Software SaaS Service
  pdf_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_sub_invoices_school ON public.subscription_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_status ON public.subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sub_invoices_created ON public.subscription_invoices(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_subscription_invoices_updated_at ON public.subscription_invoices;
CREATE TRIGGER trigger_subscription_invoices_updated_at
  BEFORE UPDATE ON public.subscription_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_updated_at();

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Platform Admins can manage all subscription invoices
DROP POLICY IF EXISTS "Platform Admins can manage subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Platform Admins can manage subscription invoices"
  ON public.subscription_invoices FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- School Admins can view only their own school's subscription invoices
DROP POLICY IF EXISTS "Schools can view own subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Schools can view own subscription invoices"
  ON public.subscription_invoices FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

