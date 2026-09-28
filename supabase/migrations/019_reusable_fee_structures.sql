-- Migration: 019_reusable_fee_structures.sql
-- Enables reusable fee structures applicable to multiple classes, all classes, specific sections, or student overrides.
-- Adds frequency, proration, and metadata support to fee_structure_items.

-- 1. Make class_id nullable on fee_structures to allow multi-class and all-class structures
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'fee_structures' 
      AND column_name = 'class_id' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.fee_structures ALTER COLUMN class_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Add target_type and target arrays to fee_structures
ALTER TABLE public.fee_structures 
  ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'specific_classes' 
    CHECK (target_type IN ('all_classes', 'specific_classes', 'specific_sections', 'specific_students')),
  ADD COLUMN IF NOT EXISTS class_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS section_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS student_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Add frequency, amount, and proration columns to fee_structure_items
ALTER TABLE public.fee_structure_items
  ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'quarterly', 'half_yearly', 'yearly', 'one_time', 'custom')),
  ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS proration_rule TEXT NOT NULL DEFAULT 'full'
    CHECK (proration_rule IN ('full', 'prorated', 'none')),
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS amount_paise BIGINT DEFAULT 0;

-- 4. Create GIN indexes for fast array containment searches
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_ids 
  ON public.fee_structures USING GIN (class_ids);

CREATE INDEX IF NOT EXISTS idx_fee_structures_section_ids 
  ON public.fee_structures USING GIN (section_ids);

CREATE INDEX IF NOT EXISTS idx_fee_structures_student_ids 
  ON public.fee_structures USING GIN (student_ids);

CREATE INDEX IF NOT EXISTS idx_fee_structures_target_type 
  ON public.fee_structures (school_id, academic_year_id, target_type, status);
