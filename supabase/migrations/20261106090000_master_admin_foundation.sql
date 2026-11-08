-- Migration: 20261106090000_master_admin_foundation.sql
-- Description: Master Admin Identity, RBAC, Platform Audit Logs, and Row Level Security
-- Forward-only, idempotent, and non-destructive.

-- 1. Create platform_roles table
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_roles_slug ON public.platform_roles(slug);

-- 2. Create platform_permissions table
CREATE TABLE IF NOT EXISTS public.platform_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_permissions_code ON public.platform_permissions(code);
CREATE INDEX IF NOT EXISTS idx_platform_permissions_module ON public.platform_permissions(module);

-- 3. Create platform_role_permissions junction table
CREATE TABLE IF NOT EXISTS public.platform_role_permissions (
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.platform_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Create platform_admins table
CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role_id UUID NOT NULL REFERENCES public.platform_roles(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_auth ON public.platform_admins(auth_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON public.platform_admins(role_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON public.platform_admins(is_active);

-- 5. Create platform_audit_logs table (Immutable append-only ledger)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON public.platform_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_admin ON public.platform_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON public.platform_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_school ON public.platform_audit_logs(school_id);

-- 6. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_platform_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_platform_roles_updated_at ON public.platform_roles;
CREATE TRIGGER trigger_platform_roles_updated_at
  BEFORE UPDATE ON public.platform_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_updated_at();

DROP TRIGGER IF EXISTS trigger_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER trigger_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_updated_at();

-- 7. Seed Canonical Platform Roles
INSERT INTO public.platform_roles (slug, name, description, is_system)
VALUES
  ('super_admin', 'Super Admin', 'Full control plane authority across all platform operations and security.', true),
  ('support_agent', 'Support Agent', 'School support triage, ticket resolution, and non-sensitive operational inspection.', true),
  ('billing_manager', 'Billing Manager', 'Subscription plan adjustments, platform invoice generation, and revenue reconciliation.', true),
  ('auditor', 'Read-Only Auditor', 'Compliance auditing and inspection of platform activity and security logs.', true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- 8. Seed Core Platform Permissions
INSERT INTO public.platform_permissions (code, module, description)
VALUES
  ('dashboard.view', 'dashboard', 'Access platform executive dashboard and real-time KPIs.'),
  ('schools.view', 'schools', 'View schools directory and individual institutional profiles.'),
  ('schools.create', 'schools', 'Register and onboard a new educational institution.'),
  ('schools.update', 'schools', 'Modify permitted institutional metadata and contact details.'),
  ('schools.suspend', 'schools', 'Suspend or reactivate school access to the ERP platform.'),
  ('subscriptions.view', 'subscriptions', 'View subscription plan catalog and school subscriptions.'),
  ('subscriptions.manage', 'subscriptions', 'Create and modify plan pricing, quotas, and feature entitlements.'),
  ('subscriptions.override', 'subscriptions', 'Apply custom billing cycles, trials, or quota overrides.'),
  ('billing.view', 'billing', 'View platform revenue, invoices, and payment transactions.'),
  ('billing.manage', 'billing', 'Generate custom invoices and initiate payment adjustments or refunds.'),
  ('users.view', 'users', 'View platform administrators and assigned roles.'),
  ('users.manage', 'users', 'Create, update, or deactivate platform administrator accounts.'),
  ('support.view', 'support', 'View incoming support tickets and status queues.'),
  ('support.manage', 'support', 'Reply to support tickets, set priority, assign agents, and resolve issues.'),
  ('support.internal_notes', 'support', 'View and add private internal notes on support tickets.'),
  ('announcements.publish', 'announcements', 'Publish and target global platform announcements.'),
  ('monitoring.view', 'system', 'View real-time system health, cron statuses, and performance logs.'),
  ('settings.view', 'settings', 'View global platform configuration parameters.'),
  ('settings.manage', 'settings', 'Modify global platform settings and feature flags.'),
  ('audit.view', 'audit', 'Inspect immutable platform security and administrative audit trails.'),
  ('security.manage', 'security', 'Manage security rules, active administrative sessions, and access revocations.')
ON CONFLICT (code) DO NOTHING;

-- 9. Map Permissions to Roles (Idempotent junction population)
DO $$
DECLARE
  v_super_admin_id UUID;
  v_support_id UUID;
  v_billing_id UUID;
  v_auditor_id UUID;
BEGIN
  SELECT id INTO v_super_admin_id FROM public.platform_roles WHERE slug = 'super_admin';
  SELECT id INTO v_support_id FROM public.platform_roles WHERE slug = 'support_agent';
  SELECT id INTO v_billing_id FROM public.platform_roles WHERE slug = 'billing_manager';
  SELECT id INTO v_auditor_id FROM public.platform_roles WHERE slug = 'auditor';

  -- Super Admin: all permissions
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO public.platform_role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, id FROM public.platform_permissions
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Support Agent: dashboard, schools view, support full, announcements publish, monitoring view
  IF v_support_id IS NOT NULL THEN
    INSERT INTO public.platform_role_permissions (role_id, permission_id)
    SELECT v_support_id, id FROM public.platform_permissions
    WHERE code IN (
      'dashboard.view', 'schools.view', 'support.view', 'support.manage',
      'support.internal_notes', 'announcements.publish', 'monitoring.view'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Billing Manager: dashboard, schools view, subscriptions view/manage, billing view/manage
  IF v_billing_id IS NOT NULL THEN
    INSERT INTO public.platform_role_permissions (role_id, permission_id)
    SELECT v_billing_id, id FROM public.platform_permissions
    WHERE code IN (
      'dashboard.view', 'schools.view', 'subscriptions.view',
      'subscriptions.manage', 'subscriptions.override',
      'billing.view', 'billing.manage', 'audit.view'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  -- Auditor: dashboard view, schools view, subscriptions view, billing view, audit view, monitoring view
  IF v_auditor_id IS NOT NULL THEN
    INSERT INTO public.platform_role_permissions (role_id, permission_id)
    SELECT v_auditor_id, id FROM public.platform_permissions
    WHERE code IN (
      'dashboard.view', 'schools.view', 'subscriptions.view',
      'billing.view', 'audit.view', 'monitoring.view'
    )
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;
END $$;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security definer function for platform admin check
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE auth_id = auth.uid() AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Policies for platform_admins: only active platform admins can select
DROP POLICY IF EXISTS "Active platform admins can view platform_admins" ON public.platform_admins;
CREATE POLICY "Active platform admins can view platform_admins"
  ON public.platform_admins FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR auth_id = auth.uid());

-- Policies for platform_roles & permissions: active platform admins can read
DROP POLICY IF EXISTS "Active platform admins can view platform_roles" ON public.platform_roles;
CREATE POLICY "Active platform admins can view platform_roles"
  ON public.platform_roles FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Active platform admins can view platform_permissions" ON public.platform_permissions;
CREATE POLICY "Active platform admins can view platform_permissions"
  ON public.platform_permissions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Active platform admins can view platform_role_permissions" ON public.platform_role_permissions;
CREATE POLICY "Active platform admins can view platform_role_permissions"
  ON public.platform_role_permissions FOR SELECT TO authenticated
  USING (public.is_platform_admin());

-- Policies for platform_audit_logs: active platform admins can read; write handled server-side
DROP POLICY IF EXISTS "Active platform admins can view platform_audit_logs" ON public.platform_audit_logs;
CREATE POLICY "Active platform admins can view platform_audit_logs"
  ON public.platform_audit_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Server or active platform admins can insert platform_audit_logs" ON public.platform_audit_logs;
CREATE POLICY "Server or active platform admins can insert platform_audit_logs"
  ON public.platform_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin());

