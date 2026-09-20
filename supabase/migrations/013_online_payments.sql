-- ============================================================================
-- Migration 013: Online Payments (Phase 5)
-- Gateway integration, online payment orders, webhook idempotency, parent pay tokens
-- ============================================================================

-- ─── 1. school_gateway_credentials ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.school_gateway_credentials (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id                UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  gateway                  TEXT NOT NULL DEFAULT 'razorpay' CHECK (gateway IN ('razorpay', 'mock', 'payu', 'cashfree')),
  key_id                   TEXT NOT NULL,
  key_secret_enc           TEXT NOT NULL,
  webhook_secret_enc       TEXT NOT NULL,
  who_bears_charges        TEXT NOT NULL DEFAULT 'school' CHECK (who_bears_charges IN ('school', 'parent')),
  convenience_fee_percent  NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_school_gateway UNIQUE (school_id, gateway)
);

CREATE INDEX IF NOT EXISTS idx_school_gateway_credentials_school ON public.school_gateway_credentials(school_id);

-- ─── 2. online_payment_orders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.online_payment_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id              UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id              UUID REFERENCES public.parents(id) ON DELETE SET NULL,
  student_ids            UUID[] NOT NULL,
  due_ids                UUID[] NOT NULL,
  amount_paise           BIGINT NOT NULL CHECK (amount_paise > 0),
  convenience_fee_paise  BIGINT NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL DEFAULT 'INR',
  gateway                TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id       TEXT NOT NULL,
  gateway_payment_id     TEXT,
  gateway_signature      TEXT,
  status                 TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorised', 'captured', 'failed', 'expired')),
  payment_group_id       UUID,
  receipt_ids            UUID[] DEFAULT '{}',
  advance_credit_ids     UUID[] DEFAULT '{}',
  payer_phone            TEXT,
  payer_email            TEXT,
  error_code             TEXT,
  error_description      TEXT,
  expires_at             TIMESTAMPTZ NOT NULL,
  captured_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_gateway_order UNIQUE (gateway, gateway_order_id)
);

CREATE INDEX IF NOT EXISTS idx_online_payment_orders_school ON public.online_payment_orders(school_id);
CREATE INDEX IF NOT EXISTS idx_online_payment_orders_status ON public.online_payment_orders(school_id, status);
CREATE INDEX IF NOT EXISTS idx_online_payment_orders_expires ON public.online_payment_orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_online_payment_orders_gateway_order ON public.online_payment_orders(gateway_order_id);

-- ─── 3. gateway_webhook_events ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gateway_webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  gateway       TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  processed     BOOLEAN NOT NULL DEFAULT false,
  processed_at  TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_gateway_event UNIQUE (gateway, event_id)
);

CREATE INDEX IF NOT EXISTS idx_gateway_webhook_events_school ON public.gateway_webhook_events(school_id);
CREATE INDEX IF NOT EXISTS idx_gateway_webhook_events_lookup ON public.gateway_webhook_events(gateway, event_id);

-- ─── 4. parent_pay_tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_pay_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  parent_id   UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_pay_tokens_lookup ON public.parent_pay_tokens(token);
CREATE INDEX IF NOT EXISTS idx_parent_pay_tokens_school_parent ON public.parent_pay_tokens(school_id, parent_id);

-- ─── 5. parent_pay_sessions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parent_pay_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id            UUID NOT NULL REFERENCES public.parent_pay_tokens(id) ON DELETE CASCADE,
  otp_code            TEXT NOT NULL,
  attempts            INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 3,
  otp_expires_at      TIMESTAMPTZ NOT NULL,
  verified            BOOLEAN NOT NULL DEFAULT false,
  session_token       TEXT UNIQUE,
  session_expires_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_pay_sessions_token_id ON public.parent_pay_sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_parent_pay_sessions_session_token ON public.parent_pay_sessions(session_token);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE public.school_gateway_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_pay_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_pay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_gateway_credentials_school" ON public.school_gateway_credentials
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "online_payment_orders_school" ON public.online_payment_orders
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "gateway_webhook_events_school" ON public.gateway_webhook_events
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "parent_pay_tokens_school" ON public.parent_pay_tokens
  FOR ALL USING (school_id = current_school_id());

CREATE POLICY "parent_pay_sessions_school" ON public.parent_pay_sessions
  FOR ALL USING (token_id IN (SELECT id FROM public.parent_pay_tokens WHERE school_id = current_school_id()));

