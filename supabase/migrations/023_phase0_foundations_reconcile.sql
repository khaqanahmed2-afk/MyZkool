-- Migration: 023_phase0_foundations_reconcile.sql
-- Description: Reconcile schema with SPEC 5.1, 5.2, 5.7, 8.1
-- Forward-only data-preserving migration

-- 1. Ensure columns on schools match SPEC 5.1
alter table schools add column if not exists onboarding_step smallint not null default 1;
alter table schools add column if not exists strength_band text;
alter table schools add column if not exists board text;
alter table schools add column if not exists medium text;

-- 2. SPEC 5.1 Platform and Tenancy Tables
-- Profiles table enhancements
create table if not exists profiles (
  user_id uuid primary key,
  full_name text not null,
  mobile text not null unique,
  email text,
  last_login_at timestamptz,
  locked_until timestamptz
);
alter table profiles add column if not exists locked_until timestamptz;
alter table profiles add column if not exists last_login_at timestamptz;

-- School members table
create table if not exists school_members (
  school_id uuid references schools(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner','admin','accountant','teacher','driver')),
  extra_permissions text[] not null default '{}',
  active boolean not null default true,
  primary key (school_id, user_id)
);

-- Plans table
create table if not exists plans (
  code text primary key,
  name text not null,
  price_paise int not null check (price_paise >= 0),
  student_cap int not null check (student_cap > 0)
);

-- Plan features table
create table if not exists plan_features (
  plan text references plans(code) on delete cascade,
  feature text not null,
  limit_value int,
  primary key (plan, feature)
);

-- Subscriptions table
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  plan text not null references plans(code),
  state text not null check (state in ('trial','active','grace','read_only','cancelled')),
  billing_months smallint check (billing_months in (1,6,12)),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- Integrations table
create table if not exists integrations (
  school_id uuid references schools(id) on delete cascade,
  provider text check (provider in ('google_drive','razorpay')),
  config_encrypted bytea not null,
  status text not null default 'connected',
  connected_at timestamptz default now(),
  primary key (school_id, provider)
);

-- OTP Requests table
create table if not exists otp_requests (
  id uuid primary key default gen_random_uuid(),
  mobile text not null,
  purpose text not null,
  code_hash text not null,
  attempts smallint default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  ip inet,
  created_at timestamptz not null default now()
);
create index if not exists idx_otp_requests_mobile on otp_requests(mobile, expires_at desc);

-- Consents table
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  subject_type text,
  subject_id uuid,
  purpose text,
  notice_version text,
  given_at timestamptz default now(),
  given_by uuid
);

-- Device tokens table
create table if not exists device_tokens (
  user_id uuid not null,
  token text not null,
  platform text,
  last_seen timestamptz,
  primary key (user_id, token)
);

-- Notifications table
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  user_id uuid,
  kind text,
  title text,
  body text,
  data jsonb,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_school on notifications(school_id, created_at desc);
create index if not exists idx_notifications_user on notifications(user_id, read_at);

-- Jobs table with status & run_at index
create table if not exists jobs (
  id bigint generated always as identity primary key,
  kind text not null,
  payload jsonb,
  run_at timestamptz default now(),
  status text default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  attempts smallint default 0,
  last_error text
);
create index if not exists idx_jobs_status_run_at on jobs (status, run_at);

-- 3. Seed plans and plan_features per SPEC 4.5 & 5.1
insert into plans (code, name, price_paise, student_cap)
values
  ('basic', 'Basic', 99900, 800),
  ('pro', 'Pro', 179900, 1800)
on conflict (code) do update set
  name = excluded.name,
  price_paise = excluded.price_paise,
  student_cap = excluded.student_cap;

insert into plan_features (plan, feature, limit_value)
values
  ('basic', 'students', 800),
  ('basic', 'fees', 1),
  ('basic', 'website_pages', 8),
  ('basic', 'website_storage_mb', 200),
  ('pro', 'students', 1800),
  ('pro', 'fees', 1),
  ('pro', 'website_pages', 20),
  ('pro', 'website_storage_mb', 1000),
  ('pro', 'transport', 1)
on conflict (plan, feature) do update set
  limit_value = excluded.limit_value;

-- 4. Key Functions (SPEC 5.7)
create or replace function my_school_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select school_id from school_members
  where user_id = auth.uid() and active = true
  union
  -- preserve compatibility if school_id set on profiles or session
  select (auth.jwt() -> 'app_metadata' ->> 'school_id')::uuid
  where (auth.jwt() -> 'app_metadata' ->> 'school_id') is not null
$$;

create or replace function has_feature(p_school uuid, p_feature text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from subscriptions s
    join plan_features f on f.plan = s.plan
    where s.school_id = p_school
      and s.state in ('trial','active','grace')
      and f.feature = p_feature
  ) or exists (
    -- backwards compatibility with school_plans
    select 1 from school_plans sp
    where sp.school_id = p_school
      and (sp.features ? p_feature or (sp.plan_key = 'pro' and p_feature = 'transport'))
  );
$$;

-- 5. RLS on new tenant tables
alter table subscriptions enable row level security;
drop policy if exists tenant_read_subscriptions on subscriptions;
create policy tenant_read_subscriptions on subscriptions
  for select using (school_id in (select my_school_ids()));
drop policy if exists tenant_write_subscriptions on subscriptions;
create policy tenant_write_subscriptions on subscriptions
  for all using (school_id in (select my_school_ids()))
  with check (school_id in (select my_school_ids()));

alter table integrations enable row level security;
drop policy if exists tenant_read_integrations on integrations;
create policy tenant_read_integrations on integrations
  for select using (school_id in (select my_school_ids()));
drop policy if exists tenant_write_integrations on integrations;
create policy tenant_write_integrations on integrations
  for all using (school_id in (select my_school_ids()))
  with check (school_id in (select my_school_ids()));

alter table consents enable row level security;
drop policy if exists tenant_read_consents on consents;
create policy tenant_read_consents on consents
  for select using (school_id in (select my_school_ids()));
drop policy if exists tenant_write_consents on consents;
create policy tenant_write_consents on consents
  for all using (school_id in (select my_school_ids()))
  with check (school_id in (select my_school_ids()));

alter table notifications enable row level security;
drop policy if exists tenant_read_notifications on notifications;
create policy tenant_read_notifications on notifications
  for select using (school_id in (select my_school_ids()));
drop policy if exists tenant_write_notifications on notifications;
create policy tenant_write_notifications on notifications
  for all using (school_id in (select my_school_ids()))
  with check (school_id in (select my_school_ids()));

alter table school_members enable row level security;
drop policy if exists tenant_read_school_members on school_members;
create policy tenant_read_school_members on school_members
  for select using (school_id in (select my_school_ids()));
drop policy if exists tenant_write_school_members on school_members;
create policy tenant_write_school_members on school_members
  for all using (school_id in (select my_school_ids()))
  with check (school_id in (select my_school_ids()));
