-- Migration: 20261016140000_fix_nursery_fee_structure_data.sql
-- Fixes persisted fee structure data for Nursery (All Sections) and ensures accurate class/section targeting & sync.

DO $$
DECLARE
  v_school_id UUID := 'b70261ef-37f1-46c8-a148-2c496a9d33a8'; -- Peace Convent School
  v_nursery_id UUID := '6864c289-cf57-41bc-b6c4-5932f7b7cbcf'; -- Nursery
  v_structure_id UUID := 'c8b8bfe1-7f61-4270-b100-1071438ec266';
BEGIN
  -- 1. Ensure the Nursery fee structure has the exact saved user name, correct class_id, target_type, and class_ids array
  UPDATE public.fee_structures
  SET 
    name = 'Nursery Fee Structure 2026–2027',
    class_id = v_nursery_id,
    target_type = 'specific_classes',
    class_ids = ARRAY[v_nursery_id],
    section_ids = ARRAY[]::uuid[],
    status = 'active',
    updated_at = NOW()
  WHERE id = v_structure_id AND school_id = v_school_id;

  -- 2. Ensure the class mapping junction table has the corresponding record
  IF EXISTS (SELECT 1 FROM public.fee_structures WHERE id = v_structure_id AND school_id = v_school_id) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.fee_structure_classes 
      WHERE fee_structure_id = v_structure_id AND class_id = v_nursery_id
    ) THEN
      INSERT INTO public.fee_structure_classes (school_id, fee_structure_id, class_id)
      VALUES (v_school_id, v_structure_id, v_nursery_id);
    END IF;
  END IF;

  -- 3. General data hygiene: For any fee structure with class_id populated but missing junction record, backfill it
  INSERT INTO public.fee_structure_classes (school_id, fee_structure_id, class_id)
  SELECT fs.school_id, fs.id, fs.class_id
  FROM public.fee_structures fs
  WHERE fs.class_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.fee_structure_classes fsc
      WHERE fsc.fee_structure_id = fs.id AND fsc.class_id = fs.class_id
    );

END $$;
