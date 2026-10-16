-- ============================================================================
-- Migration: Fee Reminder Templates and Enhanced Delivery Tracking
-- Supports customized reminder message templates, variable placeholders,
-- scheduled status lifecycle, and recipient delivery logs.
-- ============================================================================

-- 1. Create fee_reminder_templates table
CREATE TABLE IF NOT EXISTS public.fee_reminder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'general',
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'both')),
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT ARRAY['student_name', 'parent_name', 'class_section', 'amount', 'invoice_no', 'due_date', 'school_name']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fee_reminder_templates_school ON public.fee_reminder_templates(school_id);

-- Enable RLS
ALTER TABLE public.fee_reminder_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fee_reminder_templates_school" ON public.fee_reminder_templates;
CREATE POLICY "fee_reminder_templates_school" ON public.fee_reminder_templates
  FOR ALL USING (school_id = current_school_id());

-- 2. Enhance notification_outbox status check to include 'scheduled' and 'cancelled'
ALTER TABLE public.notification_outbox DROP CONSTRAINT IF EXISTS notification_outbox_status_check;
ALTER TABLE public.notification_outbox ADD CONSTRAINT notification_outbox_status_check
  CHECK (status IN ('scheduled', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'skipped'));

-- Add created_by & template_name if not exist
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS template_name TEXT;

-- 3. Seed default templates for schools that don't have them
INSERT INTO public.fee_reminder_templates (school_id, name, purpose, channel, body, is_active)
SELECT 
  s.id,
  'Payment Reminder (Default)',
  'general',
  'whatsapp',
  'Dear Parent,\nThis is a reminder that a fee balance of ₹{amount} is pending for your child, {student_name} (Class {class_section}).\nInvoice: {invoice_no}\nDue Date: {due_date}\nPlease complete the payment at the earliest. For any assistance, contact the school office.\n- {school_name}',
  true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_reminder_templates frt WHERE frt.school_id = s.id AND frt.name = 'Payment Reminder (Default)'
);

INSERT INTO public.fee_reminder_templates (school_id, name, purpose, channel, body, is_active)
SELECT 
  s.id,
  'Upcoming Fee Due',
  'upcoming',
  'whatsapp',
  'Dear Parent,\nThis is an advance notice that fee invoice {invoice_no} amounting to ₹{amount} for {student_name} (Class {class_section}) will be due on {due_date}.\nPlease plan payment accordingly.\n- {school_name}',
  true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_reminder_templates frt WHERE frt.school_id = s.id AND frt.name = 'Upcoming Fee Due'
);

INSERT INTO public.fee_reminder_templates (school_id, name, purpose, channel, body, is_active)
SELECT 
  s.id,
  'Due Today',
  'due_today',
  'whatsapp',
  'Dear Parent,\nFriendly reminder that the school fee of ₹{amount} for {student_name} (Class {class_section}) is due today ({due_date}).\nInvoice: {invoice_no}\nKindly make the payment today to avoid late fees.\n- {school_name}',
  true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_reminder_templates frt WHERE frt.school_id = s.id AND frt.name = 'Due Today'
);

INSERT INTO public.fee_reminder_templates (school_id, name, purpose, channel, body, is_active)
SELECT 
  s.id,
  'Overdue Fee Notice',
  'overdue',
  'whatsapp',
  'URGENT: Dear Parent, the fee payment of ₹{amount} for {student_name} (Class {class_section}) is overdue since {due_date}.\nInvoice: {invoice_no}\nPlease clear the outstanding dues immediately.\n- {school_name}',
  true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_reminder_templates frt WHERE frt.school_id = s.id AND frt.name = 'Overdue Fee Notice'
);

INSERT INTO public.fee_reminder_templates (school_id, name, purpose, channel, body, is_active)
SELECT 
  s.id,
  'Partial Payment Follow-up',
  'partial',
  'whatsapp',
  'Dear Parent,\nThank you for your recent payment. A remaining balance of ₹{amount} is still outstanding for {student_name} against Invoice {invoice_no}.\nPlease arrange for settlement at your earliest convenience.\n- {school_name}',
  true
FROM public.schools s
WHERE NOT EXISTS (
  SELECT 1 FROM public.fee_reminder_templates frt WHERE frt.school_id = s.id AND frt.name = 'Partial Payment Follow-up'
);
