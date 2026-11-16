-- Correct ID-card tenancy policies. Profiles are keyed to Supabase Auth by
-- auth_id, not profiles.id; use the established membership helpers instead.
ALTER TABLE public.student_id_cards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_id_cards FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_id_cards TO authenticated;

DROP POLICY IF EXISTS "School members can view own school student id cards" ON public.student_id_cards;
DROP POLICY IF EXISTS "School admins can manage own school student id cards" ON public.student_id_cards;
DROP POLICY IF EXISTS "School members can view student id cards" ON public.student_id_cards;
DROP POLICY IF EXISTS "School admins can insert student id cards" ON public.student_id_cards;
DROP POLICY IF EXISTS "School admins can update student id cards" ON public.student_id_cards;
DROP POLICY IF EXISTS "School admins can delete student id cards" ON public.student_id_cards;

CREATE POLICY "School members can view student id cards"
  ON public.student_id_cards FOR SELECT TO authenticated
  USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "School admins can insert student id cards"
  ON public.student_id_cards FOR INSERT TO authenticated
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

CREATE POLICY "School admins can update student id cards"
  ON public.student_id_cards FOR UPDATE TO authenticated
  USING (school_id IN (SELECT public.school_admin_school_ids()))
  WITH CHECK (school_id IN (SELECT public.school_admin_school_ids()));

CREATE POLICY "School admins can delete student id cards"
  ON public.student_id_cards FOR DELETE TO authenticated
  USING (school_id IN (SELECT public.school_admin_school_ids()));
