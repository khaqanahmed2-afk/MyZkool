-- Migration: 20261106110000_support_tickets.sql
-- Description: Platform Support Tickets, Helpdesk Conversations & Internal Notes
-- Forward-only, idempotent, and non-destructive.

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  creator_email TEXT NOT NULL,
  creator_phone TEXT,
  
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fees', 'students', 'transport', 'website', 'login', 'billing', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_school', 'resolved', 'closed')),
  
  assigned_to UUID REFERENCES public.platform_admins(id) ON DELETE SET NULL,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_school ON public.support_tickets(school_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);

-- 2. Create support_ticket_messages table
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('school_user', 'platform_admin', 'system')),
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_ticket_messages(ticket_id, created_at ASC);

-- 3. Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trigger_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_platform_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Platform Admins can view and manage all tickets
DROP POLICY IF EXISTS "Platform Admins can manage all support_tickets" ON public.support_tickets;
CREATE POLICY "Platform Admins can manage all support_tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- School Admins can view their own school's tickets
DROP POLICY IF EXISTS "School Admins can view own support_tickets" ON public.support_tickets;
CREATE POLICY "School Admins can view own support_tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- School Admins can insert tickets for their own school
DROP POLICY IF EXISTS "School Admins can create support_tickets" ON public.support_tickets;
CREATE POLICY "School Admins can create support_tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

-- Platform Admins can see all messages (including internal notes)
DROP POLICY IF EXISTS "Platform Admins can manage support_ticket_messages" ON public.support_ticket_messages;
CREATE POLICY "Platform Admins can manage support_ticket_messages"
  ON public.support_ticket_messages FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- School Admins can view non-internal messages for their tickets
DROP POLICY IF EXISTS "Schools can view public messages" ON public.support_ticket_messages;
CREATE POLICY "Schools can view public messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    is_internal_note = false AND
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE school_id IN (
        SELECT id FROM public.schools WHERE created_by = auth.uid()
        UNION
        SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
      )
    )
  );

