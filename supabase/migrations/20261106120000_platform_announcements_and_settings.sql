-- ==============================================================================
-- Migration: 20261106120000_platform_announcements_and_settings.sql
-- Description: Platform Announcements, Global Settings, and Feature Flags
-- Module: Communications & Global Settings (Phases 7 & 8)
-- ==============================================================================

-- 1. Create platform_announcements table
CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement' CHECK (type IN ('announcement', 'maintenance', 'critical', 'feature_update', 'billing_reminder')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'pro_plan', 'basic_plan', 'trial', 'specific_schools')),
  target_school_ids UUID[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  published_by_name TEXT,
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_published ON public.platform_announcements(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_type ON public.platform_announcements(type);
CREATE INDEX IF NOT EXISTS idx_platform_announcements_target ON public.platform_announcements(target_audience);

-- 2. Create platform_settings table (Key-Value Platform Configuration)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('branding', 'notifications', 'email', 'whatsapp', 'payment_gateway', 'security', 'maintenance')),
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_category ON public.platform_settings(category);

-- 3. Create platform_feature_flags table (Global & Targeted Rollout Controls)
CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  flag_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INT NOT NULL DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_plans TEXT[] DEFAULT '{}',
  updated_by UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

-- 5. Announcements RLS: Platform admins have full control; school admins can view active, targeted announcements
CREATE POLICY "platform_admins_all_announcements"
ON public.platform_announcements
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "school_users_view_published_announcements"
ON public.platform_announcements
FOR SELECT
TO authenticated
USING (
  is_published = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    target_audience = 'all'
    OR (target_audience = 'specific_schools' AND public.get_current_school_id() = ANY(target_school_ids))
  )
);

-- 6. Settings RLS: Platform admins have full control; unprivileged users cannot view platform credentials
CREATE POLICY "platform_admins_all_settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

-- Public / School user read access only for non-sensitive branding settings
CREATE POLICY "school_users_view_branding_settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (category = 'branding');

-- 7. Feature Flags RLS: Platform admins manage; authenticated users read for capability resolution
CREATE POLICY "platform_admins_all_feature_flags"
ON public.platform_feature_flags
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "school_users_view_feature_flags"
ON public.platform_feature_flags
FOR SELECT
TO authenticated
USING (true);

-- 8. Seed Initial Platform Settings & Feature Flags
INSERT INTO public.platform_settings (key, category, value, description)
VALUES
  ('branding.platform', 'branding', '{"platformName": "MyZkool SaaS", "supportEmail": "support@myzkool.com", "tagline": "Next-Gen Multi-Tenant School Management Platform", "logoUrl": "/logo.svg"}'::jsonb, 'Platform visual identity and public support links.'),
  ('maintenance.mode', 'maintenance', '{"enabled": false, "bannerMessage": "Scheduled platform maintenance in progress. All systems will resume shortly.", "allowedIps": []}'::jsonb, 'Global platform maintenance toggle and emergency maintenance banner.'),
  ('email.smtp', 'email', '{"provider": "SendGrid", "fromAddress": "noreply@myzkool.com", "fromName": "MyZkool Platform Notifications", "dailyQuota": 50000, "status": "connected"}'::jsonb, 'Platform transactional email routing and quota monitoring.'),
  ('whatsapp.gateway', 'whatsapp', '{"provider": "Gupshup", "registeredNumber": "+919876543210", "status": "active", "webhookVerified": true}'::jsonb, 'Enterprise WhatsApp Business Cloud API integration.'),
  ('payment.razorpay', 'payment_gateway', '{"merchantName": "MyZkool EdTech Pvt Ltd", "webhookActive": true, "autoCapture": true, "settlementSchedule": "T+1"}'::jsonb, 'Subscription billing gateway status and auto-reconciliation parameters.')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.platform_feature_flags (flag_key, name, description, is_enabled, rollout_percentage, target_plans)
VALUES
  ('gps_live_fleet_tracking', 'Live GPS Bus Tracking', 'Real-time telemetry and map projection for school transport fleets.', true, 100, ARRAY['pro', 'custom']),
  ('ai_report_card_comments', 'AI Report Card Remarks', 'Automated constructive teacher comments powered by LLM summaries.', true, 50, ARRAY['pro']),
  ('whatsapp_automated_fee_reminders', 'WhatsApp Fee Reminders', 'Automated batch WhatsApp notices sent 3 days before fee due dates.', true, 100, ARRAY['basic', 'pro', 'custom']),
  ('biometric_rfid_gate_sync', 'RFID Biometric Gate Sync', 'Instant turnstile gate synchronization for staff and student arrival.', false, 0, ARRAY['custom'])
ON CONFLICT (flag_key) DO NOTHING;

