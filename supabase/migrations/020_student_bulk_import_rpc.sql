-- Migration: 020_student_bulk_import_rpc.sql
-- Provides atomic gap-free counter management and transactional bulk student import RPC

-- 1. Counter Functions: get_next_counter and reserve_counters
-- Atomic, gap-free, concurrency-safe counter for school-scoped sequences (admission_no, tc_no, etc.)
CREATE OR REPLACE FUNCTION public.get_next_counter(
  p_school_id UUID,
  p_key TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  IF p_school_id IS NULL OR p_key IS NULL THEN
    RAISE EXCEPTION 'school_id and key must not be null';
  END IF;

  INSERT INTO public.counters (school_id, key, next_value, updated_at)
  VALUES (p_school_id, p_key, 2, now())
  ON CONFLICT (school_id, key)
  DO UPDATE SET
    next_value = public.counters.next_value + 1,
    updated_at = now()
  RETURNING public.counters.next_value - 1 INTO v_next;

  RETURN v_next;
END;
$$;

-- Atomic reservation of a block of consecutive numbers
CREATE OR REPLACE FUNCTION public.reserve_counters(
  p_school_id UUID,
  p_key TEXT,
  p_count INTEGER
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start BIGINT;
BEGIN
  IF p_school_id IS NULL OR p_key IS NULL OR p_count IS NULL OR p_count <= 0 THEN
    RAISE EXCEPTION 'Invalid parameters for reserve_counters';
  END IF;

  INSERT INTO public.counters (school_id, key, next_value, updated_at)
  VALUES (p_school_id, p_key, p_count + 1, now())
  ON CONFLICT (school_id, key)
  DO UPDATE SET
    next_value = public.counters.next_value + p_count,
    updated_at = now()
  RETURNING public.counters.next_value - p_count INTO v_start;

  RETURN v_start;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_counter(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_counters(UUID, TEXT, INTEGER) TO authenticated;

-- 2. Transactional Bulk Student Import RPC
-- Executes the entire batch import inside a single atomic Postgres transaction.
-- If any row or constraint fails, the entire batch rolls back automatically.
CREATE OR REPLACE FUNCTION public.commit_student_import_batch(
  p_school_id UUID,
  p_actor_id UUID,
  p_file_name TEXT,
  p_academic_year_id UUID,
  p_rows JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_batch_id UUID;
  v_now TIMESTAMPTZ := now();
  v_today DATE := CURRENT_DATE;
  v_current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Counters
  v_total_rows INTEGER;
  v_needed_counter_count INTEGER := 0;
  v_counter_start BIGINT := 1;
  v_counter_offset BIGINT := 0;
  
  -- Record vars
  v_row JSONB;
  v_student_id UUID;
  v_first_name TEXT;
  v_middle_name TEXT;
  v_last_name TEXT;
  v_dob DATE;
  v_gender TEXT;
  v_category TEXT;
  v_is_rte BOOLEAN;
  v_admission_no TEXT;
  v_sr_no TEXT;
  v_apaar_id TEXT;
  v_admission_date DATE;
  
  -- Class / Section / Enrollment
  v_class_id UUID;
  v_section_id UUID;
  v_roll_no TEXT;
  
  -- Parent
  v_parent_id UUID;
  v_parent_name TEXT;
  v_parent_phone TEXT;
  v_parent_relation TEXT;
  
  -- Address
  v_address_line1 TEXT;
  v_city TEXT;
  v_state TEXT;
  v_pin TEXT;
  
  -- Result tracking
  v_created_student_ids UUID[] := ARRAY[]::UUID[];
  v_row_idx INTEGER := 0;
BEGIN
  -- 1. Authorization check
  v_is_admin := public.is_school_admin(p_school_id);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Current user is not an administrator for this school';
  END IF;

  v_total_rows := jsonb_array_length(p_rows);
  IF v_total_rows IS NULL OR v_total_rows = 0 THEN
    RAISE EXCEPTION 'No student rows provided in import batch';
  END IF;

  -- 2. Count how many rows require auto-generated admission numbers
  FOR v_row_idx IN 0..(v_total_rows - 1) LOOP
    v_row := p_rows->v_row_idx;
    v_admission_no := NULLIF(TRIM(v_row->>'admission_no'), '');
    IF v_admission_no IS NULL THEN
      v_needed_counter_count := v_needed_counter_count + 1;
    END IF;
  END LOOP;

  -- 3. Reserve admission number sequence block in a single atomic call
  IF v_needed_counter_count > 0 THEN
    v_counter_start := public.reserve_counters(p_school_id, 'admission_no', v_needed_counter_count);
  END IF;

  -- 4. Create import_batches record in 'validated' status
  v_batch_id := gen_random_uuid();
  INSERT INTO public.import_batches (
    id,
    school_id,
    created_by,
    file_name,
    total_rows,
    created_rows,
    skipped_rows,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_batch_id,
    p_school_id,
    p_actor_id,
    COALESCE(p_file_name, 'import.csv'),
    v_total_rows,
    0,
    0,
    'validated',
    v_now,
    v_now
  );

  -- 5. Process each student row
  FOR v_row_idx IN 0..(v_total_rows - 1) LOOP
    v_row := p_rows->v_row_idx;
    v_student_id := gen_random_uuid();
    
    -- Extract and sanitize student fields
    v_first_name := TRIM(v_row->>'first_name');
    v_middle_name := NULLIF(TRIM(v_row->>'middle_name'), '');
    v_last_name := TRIM(v_row->>'last_name');
    v_dob := (v_row->>'dob')::DATE;
    v_gender := LOWER(TRIM(COALESCE(v_row->>'gender', 'other')));
    IF v_gender NOT IN ('male', 'female', 'other') THEN
      v_gender := 'other';
    END IF;
    
    v_category := LOWER(TRIM(COALESCE(v_row->>'category', 'general')));
    IF v_category NOT IN ('general', 'obc', 'sc', 'st', 'ews') THEN
      v_category := 'general';
    END IF;
    
    v_is_rte := COALESCE((v_row->>'is_rte')::BOOLEAN, false);
    
    -- Admission Number (Custom or Auto-generated)
    v_admission_no := NULLIF(TRIM(v_row->>'admission_no'), '');
    IF v_admission_no IS NULL THEN
      v_admission_no := 'ADM/' || v_current_year || '/' || LPAD((v_counter_start + v_counter_offset)::TEXT, 4, '0');
      v_counter_offset := v_counter_offset + 1;
    END IF;

    v_sr_no := NULLIF(TRIM(v_row->>'sr_no'), '');
    v_apaar_id := NULLIF(TRIM(v_row->>'apaar_id'), '');
    
    IF v_row->>'admission_date' IS NOT NULL AND TRIM(v_row->>'admission_date') != '' THEN
      v_admission_date := (v_row->>'admission_date')::DATE;
    ELSE
      v_admission_date := v_today;
    END IF;

    -- Class & Section
    v_class_id := NULL;
    IF v_row->>'class_id' IS NOT NULL AND TRIM(v_row->>'class_id') != '' THEN
      v_class_id := (v_row->>'class_id')::UUID;
    END IF;

    v_section_id := NULL;
    IF v_row->>'section_id' IS NOT NULL AND TRIM(v_row->>'section_id') != '' THEN
      v_section_id := (v_row->>'section_id')::UUID;
    END IF;

    v_roll_no := NULLIF(TRIM(v_row->>'roll_no'), '');

    -- Insert student record
    INSERT INTO public.students (
      id,
      school_id,
      admission_no,
      sr_no,
      apaar_id,
      first_name,
      middle_name,
      last_name,
      dob,
      gender,
      nationality,
      category,
      is_rte,
      admission_date,
      admission_type,
      admission_class_id,
      status,
      import_batch_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      v_student_id,
      p_school_id,
      v_admission_no,
      v_sr_no,
      v_apaar_id,
      v_first_name,
      v_middle_name,
      v_last_name,
      v_dob,
      v_gender,
      'Indian',
      v_category,
      v_is_rte,
      v_admission_date,
      'new',
      v_class_id,
      'enrolled',
      v_batch_id,
      p_actor_id,
      p_actor_id,
      v_now,
      v_now
    );

    v_created_student_ids := array_append(v_created_student_ids, v_student_id);

    -- Create Enrollment if class and academic year exist
    IF v_class_id IS NOT NULL AND p_academic_year_id IS NOT NULL THEN
      INSERT INTO public.student_enrollments (
        id,
        school_id,
        student_id,
        academic_year_id,
        class_id,
        section_id,
        roll_no,
        status,
        enrolled_on,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_school_id,
        v_student_id,
        p_academic_year_id,
        v_class_id,
        v_section_id,
        v_roll_no,
        'active',
        v_admission_date,
        v_now,
        v_now
      );
    END IF;

    -- Parent Deduplication & Linking
    v_parent_phone := REGEXP_REPLACE(COALESCE(v_row->>'parent_phone', ''), '\D', '', 'g');
    -- Strip country code +91 / 91 or leading 0
    IF LENGTH(v_parent_phone) = 12 AND v_parent_phone LIKE '91%' THEN
      v_parent_phone := SUBSTRING(v_parent_phone FROM 3);
    ELSIF LENGTH(v_parent_phone) = 11 AND v_parent_phone LIKE '0%' THEN
      v_parent_phone := SUBSTRING(v_parent_phone FROM 2);
    END IF;

    v_parent_name := COALESCE(NULLIF(TRIM(v_row->>'parent_name'), ''), 'Parent');
    v_parent_relation := LOWER(TRIM(COALESCE(v_row->>'parent_relation', 'father')));
    IF v_parent_relation NOT IN ('father', 'mother', 'guardian') THEN
      v_parent_relation := 'father';
    END IF;

    IF v_parent_phone != '' THEN
      -- Find existing parent in this school
      SELECT id INTO v_parent_id
      FROM public.parents
      WHERE school_id = p_school_id AND phone = v_parent_phone
      LIMIT 1;

      IF v_parent_id IS NULL THEN
        -- Create new parent
        v_parent_id := gen_random_uuid();
        INSERT INTO public.parents (
          id,
          school_id,
          full_name,
          phone,
          created_at,
          updated_at
        ) VALUES (
          v_parent_id,
          p_school_id,
          v_parent_name,
          v_parent_phone,
          v_now,
          v_now
        );
      END IF;

      -- Link student to parent
      INSERT INTO public.student_parents (
        id,
        school_id,
        student_id,
        parent_id,
        relation,
        is_primary_contact,
        is_fee_payer,
        is_emergency_contact,
        can_pickup,
        lives_with,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_school_id,
        v_student_id,
        v_parent_id,
        v_parent_relation,
        true,
        true,
        true,
        true,
        true,
        v_now,
        v_now
      );
    END IF;

    -- Address
    v_address_line1 := NULLIF(TRIM(v_row->>'address_line1'), '');
    v_city := COALESCE(NULLIF(TRIM(v_row->>'city'), ''), 'City');
    v_state := COALESCE(NULLIF(TRIM(v_row->>'state'), ''), 'State');
    v_pin := REGEXP_REPLACE(COALESCE(v_row->>'pin', '000000'), '\D', '', 'g');
    IF LENGTH(v_pin) != 6 THEN
      v_pin := '000000';
    END IF;

    IF v_address_line1 IS NOT NULL OR v_city != 'City' THEN
      INSERT INTO public.student_addresses (
        id,
        school_id,
        student_id,
        kind,
        line1,
        city,
        state,
        pin,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        p_school_id,
        v_student_id,
        'current',
        COALESCE(v_address_line1, v_city),
        v_city,
        v_state,
        v_pin,
        v_now,
        v_now
      );
    END IF;

  END LOOP;

  -- 6. Mark batch committed
  UPDATE public.import_batches
  SET
    created_rows = array_length(v_created_student_ids, 1),
    skipped_rows = 0,
    status = 'committed',
    updated_at = now()
  WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'total_rows', v_total_rows,
    'created_rows', array_length(v_created_student_ids, 1),
    'skipped_rows', 0,
    'status', 'committed',
    'created_student_ids', v_created_student_ids
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.commit_student_import_batch(UUID, UUID, TEXT, UUID, JSONB) TO authenticated;
