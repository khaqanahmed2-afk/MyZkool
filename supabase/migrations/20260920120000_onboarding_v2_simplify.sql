-- MyZkool onboarding v2: 8 steps -> 6 steps (Subjects and Staff steps removed)
--
-- New flow: 1 School profile, 2 Academic year, 3 Classes, 4 Plan, 5 Website, 6 Launch
--
-- Safe to re-run. Does NOT drop or alter the subjects / staff tables (the admin
-- panel will still use them). Assumes tables public.schools and (optionally)
-- public.school_websites. Column names are taken from the onboarding UI code;
-- every website change is guarded by an existence check so a mismatch is skipped
-- instead of raising an error.

-- 1. Flow version marker so the step remap below runs exactly once per school.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS onboarding_flow_version smallint;

-- 2. Drop any old CHECK constraint on onboarding_step (for example BETWEEN 1 AND 8).
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.schools'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%onboarding_step%'
  LOOP
    EXECUTE format('ALTER TABLE public.schools DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 3. Remap schools that are mid-onboarding on the old 8-step numbering.
--    onboarding_step means "the step the school is currently on".
--      old 1,2,3,4 -> unchanged (school, academics, classes, then Subjects -> now Plan)
--      old 5 (Plan)     -> 4
--      old 6 (Website)  -> 5
--      old 7 (Staff)    -> 6 (Launch)
--      old 8 (Launch)   -> 6
UPDATE public.schools
SET onboarding_step = CASE
      WHEN onboarding_step IS NULL THEN NULL
      WHEN onboarding_step = 5 THEN 4
      WHEN onboarding_step = 6 THEN 5
      WHEN onboarding_step >= 7 THEN 6
      ELSE onboarding_step
    END,
    onboarding_flow_version = 2
WHERE onboarding_flow_version IS NULL;

ALTER TABLE public.schools ALTER COLUMN onboarding_flow_version SET DEFAULT 2;
ALTER TABLE public.schools ALTER COLUMN onboarding_flow_version SET NOT NULL;

-- 4. New range check (runs after the remap so existing rows already satisfy it).
ALTER TABLE public.schools
  ADD CONSTRAINT schools_onboarding_step_check
  CHECK (onboarding_step BETWEEN 1 AND 6);

-- 5. Website table: the simplified form sends fewer fields, so nothing may
--    require them. Skipped entirely if the table does not exist.
DO $$
DECLARE
  col text;
  rec record;
BEGIN
  IF to_regclass('public.school_websites') IS NULL THEN
    RAISE NOTICE 'public.school_websites not found, skipping website changes';
    RETURN;
  END IF;

  -- Optional text fields must be nullable.
  FOREACH col IN ARRAY ARRAY[
    'tagline', 'about_text', 'logo_url', 'contact_email', 'contact_phone',
    'address', 'city', 'state', 'postal_code'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'school_websites'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.school_websites ALTER COLUMN %I DROP NOT NULL', col
      );
    END IF;
  END LOOP;

  -- Defaults for fields the form no longer sends (only where no default exists).
  FOR rec IN
    SELECT * FROM (VALUES
      ('primary_color',         '''#2158E0'''),
      ('secondary_color',       '''#141A2E'''),
      ('accent_color',          '''#10B981'''),
      ('admission_enabled',     'true'),
      ('parent_portal_enabled', 'true'),
      ('published',             'false')
    ) AS d(col_name, default_expr)
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'school_websites'
        AND column_name = rec.col_name AND column_default IS NULL
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.school_websites ALTER COLUMN %I SET DEFAULT %s',
        rec.col_name, rec.default_expr
      );
    END IF;
  END LOOP;
END $$;

-- 6. Make PostgREST pick up the new column immediately (avoids stale schema cache errors).
NOTIFY pgrst, 'reload schema';

