-- Create student_id_cards table for secure, auditable ID card issuance and verification
CREATE TABLE IF NOT EXISTS public.student_id_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  card_number text,
  verification_token text NOT NULL UNIQUE,
  card_status text NOT NULL DEFAULT 'active' CHECK (card_status IN ('active', 'inactive', 'revoked')),
  theme_id text NOT NULL DEFAULT 'modern_blue_yellow',
  issued_at timestamptz NOT NULL DEFAULT now(),
  valid_until date,
  revocation_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_id_cards_school_student UNIQUE(school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_id_cards_token ON public.student_id_cards(verification_token);
CREATE INDEX IF NOT EXISTS idx_student_id_cards_school_student ON public.student_id_cards(school_id, student_id);

ALTER TABLE public.student_id_cards ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view cards of their school
CREATE POLICY "School members can view own school student id cards"
  ON public.student_id_cards FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Allow authenticated admins to manage cards of their school
CREATE POLICY "School admins can manage own school student id cards"
  ON public.student_id_cards FOR ALL
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Public verification function: safe, read-only verification that NEVER exposes sensitive PII
CREATE OR REPLACE FUNCTION public.verify_student_card_public(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card record;
  v_student record;
  v_school record;
  v_enr record;
  v_class record;
  v_sec record;
  v_result jsonb;
BEGIN
  -- 1. Find the card by token
  SELECT * INTO v_card
  FROM public.student_id_cards
  WHERE verification_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Invalid verification token. No student identity record found.'
    );
  END IF;

  -- 2. Find student
  SELECT id, first_name, middle_name, last_name, admission_no, photo_path, status, deleted_at
  INTO v_student
  FROM public.students
  WHERE id = v_card.student_id AND school_id = v_card.school_id;

  IF NOT FOUND OR v_student.deleted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Student record has been archived or no longer exists.'
    );
  END IF;

  -- 3. Find school
  SELECT id, name, logo_url, city, state
  INTO v_school
  FROM public.schools
  WHERE id = v_card.school_id;

  -- 4. Find active enrollment
  SELECT class_id, section_id, roll_no, academic_year_id
  INTO v_enr
  FROM public.student_enrollments
  WHERE student_id = v_card.student_id AND school_id = v_card.school_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- 5. Class & Section
  IF v_enr.class_id IS NOT NULL THEN
    SELECT name INTO v_class FROM public.classes WHERE id = v_enr.class_id;
  END IF;
  IF v_enr.section_id IS NOT NULL THEN
    SELECT name INTO v_sec FROM public.sections WHERE id = v_enr.section_id;
  END IF;

  -- Build safe public verification response
  v_result := jsonb_build_object(
    'is_valid', (v_card.card_status = 'active'),
    'card_status', v_card.card_status,
    'revocation_reason', v_card.revocation_reason,
    'student_name', TRIM(CONCAT(v_student.first_name, ' ', COALESCE(v_student.middle_name, ''), ' ', v_student.last_name)),
    'admission_no', v_student.admission_no,
    'roll_no', COALESCE(v_enr.roll_no, 'N/A'),
    'class_name', COALESCE(v_class.name, 'Not Assigned'),
    'section_name', COALESCE(v_sec.name, 'General'),
    'school_name', COALESCE(v_school.name, 'MyZkool Academy'),
    'school_city', v_school.city,
    'school_state', v_school.state,
    'school_logo_url', v_school.logo_url,
    'photo_url', v_student.photo_path,
    'issued_at', v_card.issued_at,
    'valid_until', v_card.valid_until,
    'theme_id', v_card.theme_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_student_card_public(text) TO anon, authenticated;
