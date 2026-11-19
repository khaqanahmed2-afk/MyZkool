-- ============================================================================
-- Migration: 20261119120000_attendance_management.sql
-- Description: Core Attendance Management System schema for MyZkool Admin Panel
-- Covers: attendance_sessions, student_attendance_records, 
--         attendance_corrections_log, attendance_settings, RLS & triggers
-- ============================================================================

-- 1. Attendance Sessions Table (One session per class/section per date)
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    session_name TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'finalized')),
    taken_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_students INTEGER NOT NULL DEFAULT 0 CHECK (total_students >= 0),
    present_count INTEGER NOT NULL DEFAULT 0 CHECK (present_count >= 0),
    absent_count INTEGER NOT NULL DEFAULT 0 CHECK (absent_count >= 0),
    late_count INTEGER NOT NULL DEFAULT 0 CHECK (late_count >= 0),
    leave_count INTEGER NOT NULL DEFAULT 0 CHECK (leave_count >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate attendance sessions for the same class/section/date/session
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_sessions_unique 
ON public.attendance_sessions (
    school_id, 
    academic_year_id, 
    class_id, 
    COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    date, 
    session_name
);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_school_date 
ON public.attendance_sessions (school_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_class_date 
ON public.attendance_sessions (school_id, class_id, date);

-- 2. Student Attendance Records Table (One record per student per date/session)
CREATE TABLE IF NOT EXISTS public.student_attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    session_name TEXT NOT NULL DEFAULT 'daily',
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave')),
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'qr_scan', 'admin_override')),
    remarks TEXT,
    marked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: A student must not have duplicate attendance records for the same attendance session/date
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_attendance_unique 
ON public.student_attendance_records (school_id, student_id, date, session_name);

CREATE INDEX IF NOT EXISTS idx_attendance_records_school_date 
ON public.student_attendance_records (school_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student 
ON public.student_attendance_records (school_id, student_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_session 
ON public.student_attendance_records (session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_class_date 
ON public.student_attendance_records (school_id, class_id, section_id, date);

-- 3. Attendance Corrections Audit Trail Log
CREATE TABLE IF NOT EXISTS public.attendance_corrections_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    attendance_record_id UUID NOT NULL REFERENCES public.student_attendance_records(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_record 
ON public.attendance_corrections_log (attendance_record_id);

CREATE INDEX IF NOT EXISTS idx_attendance_corrections_student 
ON public.attendance_corrections_log (school_id, student_id);

-- 4. Attendance Settings Table (Per school settings)
CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
    default_status TEXT NOT NULL DEFAULT 'present' CHECK (default_status IN ('present', 'absent', 'unmarked')),
    allow_late_marking BOOLEAN NOT NULL DEFAULT true,
    late_cutoff_time TIME DEFAULT '08:30:00',
    require_leave_reason BOOLEAN NOT NULL DEFAULT false,
    prevent_past_edit_days INTEGER NOT NULL DEFAULT 30 CHECK (prevent_past_edit_days >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Updated_at Triggers
DROP TRIGGER IF EXISTS trigger_attendance_sessions_updated_at ON public.attendance_sessions;
CREATE TRIGGER trigger_attendance_sessions_updated_at
    BEFORE UPDATE ON public.attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_student_attendance_records_updated_at ON public.student_attendance_records;
CREATE TRIGGER trigger_student_attendance_records_updated_at
    BEFORE UPDATE ON public.student_attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_attendance_settings_updated_at ON public.attendance_settings;
CREATE TRIGGER trigger_attendance_settings_updated_at
    BEFORE UPDATE ON public.attendance_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Trigger Function to Keep Attendance Session Counts Synchronized
CREATE OR REPLACE FUNCTION public.sync_attendance_session_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_session_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_session_id := OLD.session_id;
    ELSE
        target_session_id := NEW.session_id;
    END IF;

    UPDATE public.attendance_sessions
    SET 
        total_students = (
            SELECT count(*) FROM public.student_attendance_records 
            WHERE session_id = target_session_id
        ),
        present_count = (
            SELECT count(*) FROM public.student_attendance_records 
            WHERE session_id = target_session_id AND status = 'present'
        ),
        absent_count = (
            SELECT count(*) FROM public.student_attendance_records 
            WHERE session_id = target_session_id AND status = 'absent'
        ),
        late_count = (
            SELECT count(*) FROM public.student_attendance_records 
            WHERE session_id = target_session_id AND status = 'late'
        ),
        leave_count = (
            SELECT count(*) FROM public.student_attendance_records 
            WHERE session_id = target_session_id AND status = 'leave'
        ),
        updated_at = now()
    WHERE id = target_session_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_attendance_session_counts ON public.student_attendance_records;
CREATE TRIGGER trigger_sync_attendance_session_counts
    AFTER INSERT OR UPDATE OR DELETE ON public.student_attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_session_counts();

-- 7. QR Attendance RPC Function
CREATE OR REPLACE FUNCTION public.mark_attendance_via_qr(
    p_school_id UUID,
    p_verification_token TEXT,
    p_date DATE,
    p_session_name TEXT DEFAULT 'daily',
    p_status TEXT DEFAULT 'present',
    p_marked_by UUID DEFAULT auth.uid()
)
RETURNS JSONB AS $$
DECLARE
    v_card RECORD;
    v_enrollment RECORD;
    v_session RECORD;
    v_record RECORD;
    v_previous_status TEXT;
    v_is_new BOOLEAN := false;
BEGIN
    -- 1. Validate the QR token from active student_id_cards
    SELECT c.id, c.school_id, c.student_id, c.card_status,
           s.first_name, s.last_name, s.admission_no, s.status as student_status, s.photo_path
    INTO v_card
    FROM public.student_id_cards c
    JOIN public.students s ON s.id = c.student_id
    WHERE c.verification_token = p_verification_token
      AND c.school_id = p_school_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_TOKEN',
            'message', 'Invalid QR code or student card does not belong to this school.'
        );
    END IF;

    IF v_card.card_status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'CARD_INACTIVE',
            'message', 'Student ID card is ' || v_card.card_status || ' and cannot be used for attendance.'
        );
    END IF;

    IF v_card.student_status != 'enrolled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'STUDENT_NOT_ENROLLED',
            'message', 'Student status is ' || v_card.student_status || '. Only actively enrolled students can be marked.'
        );
    END IF;

    -- 2. Resolve active enrollment and class/section for the student
    SELECT se.id as enrollment_id, se.academic_year_id, se.class_id, se.section_id, se.roll_no,
           cl.name as class_name, sc.name as section_name
    INTO v_enrollment
    FROM public.student_enrollments se
    JOIN public.classes cl ON cl.id = se.class_id
    LEFT JOIN public.sections sc ON sc.id = se.section_id
    WHERE se.student_id = v_card.student_id
      AND se.school_id = p_school_id
      AND se.status = 'active'
    ORDER BY se.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NO_ACTIVE_ENROLLMENT',
            'message', 'Student has no active enrollment for attendance recording.'
        );
    END IF;

    -- 3. Find or create the attendance session for this class/section/date
    SELECT id INTO v_session
    FROM public.attendance_sessions
    WHERE school_id = p_school_id
      AND academic_year_id = v_enrollment.academic_year_id
      AND class_id = v_enrollment.class_id
      AND (section_id IS NOT DISTINCT FROM v_enrollment.section_id)
      AND date = p_date
      AND session_name = p_session_name;

    IF NOT FOUND THEN
        INSERT INTO public.attendance_sessions (
            school_id,
            academic_year_id,
            class_id,
            section_id,
            date,
            session_name,
            status,
            taken_by
        ) VALUES (
            p_school_id,
            v_enrollment.academic_year_id,
            v_enrollment.class_id,
            v_enrollment.section_id,
            p_date,
            p_session_name,
            'submitted',
            p_marked_by
        )
        RETURNING id INTO v_session;
    END IF;

    -- 4. Check if record already exists for this student on this date
    SELECT id, status INTO v_record
    FROM public.student_attendance_records
    WHERE school_id = p_school_id
      AND student_id = v_card.student_id
      AND date = p_date
      AND session_name = p_session_name;

    IF FOUND THEN
        v_previous_status := v_record.status;
        IF v_previous_status = p_status THEN
            -- Already scanned and marked with same status
            RETURN jsonb_build_object(
                'success', true,
                'already_recorded', true,
                'student_id', v_card.student_id,
                'student_name', TRIM(v_card.first_name || ' ' || COALESCE(v_card.last_name, '')),
                'admission_no', v_card.admission_no,
                'roll_no', v_enrollment.roll_no,
                'class_name', v_enrollment.class_name,
                'section_name', v_enrollment.section_name,
                'status', p_status,
                'photo_path', v_card.photo_path,
                'message', 'Attendance already recorded for this student today (' || p_status || ').'
            );
        END IF;

        -- Status changed via QR re-scan
        UPDATE public.student_attendance_records
        SET status = p_status,
            source = 'qr_scan',
            marked_by = p_marked_by,
            marked_at = now(),
            updated_at = now()
        WHERE id = v_record.id;

        -- Log correction
        INSERT INTO public.attendance_corrections_log (
            school_id,
            attendance_record_id,
            student_id,
            previous_status,
            new_status,
            reason,
            changed_by
        ) VALUES (
            p_school_id,
            v_record.id,
            v_card.student_id,
            v_previous_status,
            p_status,
            'Updated via QR scan',
            p_marked_by
        );
    ELSE
        -- Insert new record
        v_is_new := true;
        INSERT INTO public.student_attendance_records (
            school_id,
            session_id,
            student_id,
            enrollment_id,
            academic_year_id,
            class_id,
            section_id,
            date,
            session_name,
            status,
            source,
            marked_by,
            marked_at
        ) VALUES (
            p_school_id,
            v_session.id,
            v_card.student_id,
            v_enrollment.enrollment_id,
            v_enrollment.academic_year_id,
            v_enrollment.class_id,
            v_enrollment.section_id,
            p_date,
            p_session_name,
            p_status,
            'qr_scan',
            p_marked_by,
            now()
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_new', v_is_new,
        'already_recorded', false,
        'student_id', v_card.student_id,
        'student_name', TRIM(v_card.first_name || ' ' || COALESCE(v_card.last_name, '')),
        'admission_no', v_card.admission_no,
        'roll_no', v_enrollment.roll_no,
        'class_name', v_enrollment.class_name,
        'section_name', v_enrollment.section_name,
        'status', p_status,
        'photo_path', v_card.photo_path,
        'message', 'Attendance recorded successfully: ' || TRIM(v_card.first_name || ' ' || COALESCE(v_card.last_name, '')) || ' (' || p_status || ').'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Row Level Security (RLS)
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;

-- Policy: attendance_sessions
CREATE POLICY "attendance_sessions_select_policy"
ON public.attendance_sessions FOR SELECT
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_sessions_insert_policy"
ON public.attendance_sessions FOR INSERT
WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_sessions_update_policy"
ON public.attendance_sessions FOR UPDATE
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_sessions_delete_policy"
ON public.attendance_sessions FOR DELETE
USING (school_id IN (SELECT public.school_member_school_ids()));

-- Policy: student_attendance_records
CREATE POLICY "student_attendance_records_select_policy"
ON public.student_attendance_records FOR SELECT
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "student_attendance_records_insert_policy"
ON public.student_attendance_records FOR INSERT
WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "student_attendance_records_update_policy"
ON public.student_attendance_records FOR UPDATE
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "student_attendance_records_delete_policy"
ON public.student_attendance_records FOR DELETE
USING (school_id IN (SELECT public.school_member_school_ids()));

-- Policy: attendance_corrections_log
CREATE POLICY "attendance_corrections_log_select_policy"
ON public.attendance_corrections_log FOR SELECT
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_corrections_log_insert_policy"
ON public.attendance_corrections_log FOR INSERT
WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

-- Policy: attendance_settings
CREATE POLICY "attendance_settings_select_policy"
ON public.attendance_settings FOR SELECT
USING (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_settings_insert_policy"
ON public.attendance_settings FOR INSERT
WITH CHECK (school_id IN (SELECT public.school_member_school_ids()));

CREATE POLICY "attendance_settings_update_policy"
ON public.attendance_settings FOR UPDATE
USING (school_id IN (SELECT public.school_member_school_ids()));

-- Permissions
GRANT ALL ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.student_attendance_records TO authenticated;
GRANT ALL ON public.attendance_corrections_log TO authenticated;
GRANT ALL ON public.attendance_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance_via_qr TO authenticated;
