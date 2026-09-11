-- MyZkool Step 5 & 6: Classes, Sections, Subjects & Class-Subject Curriculum Schema
-- Migration: 003_classes_sections_subjects.sql

-- 1. Create classes table
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate class names within the same school & academic year (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_unique_name 
  ON public.classes (school_id, academic_year_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_classes_school_ay 
  ON public.classes (school_id, academic_year_id, sort_order);

-- 2. Create sections table
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate section names within the same class (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_unique_name 
  ON public.sections (school_id, academic_year_id, class_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_sections_class_id 
  ON public.sections (class_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_sections_school_ay 
  ON public.sections (school_id, academic_year_id);

-- 3. Create subjects table (Reusable Subject Library per school & academic year)
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  subject_type TEXT NOT NULL DEFAULT 'core' CHECK (subject_type IN ('core', 'elective', 'activity', 'other')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to prevent duplicate subject names within the same school & academic year (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_unique_name 
  ON public.subjects (school_id, academic_year_id, LOWER(TRIM(name)));

CREATE INDEX IF NOT EXISTS idx_subjects_school_ay 
  ON public.subjects (school_id, academic_year_id, sort_order);

-- 4. Create class_subjects junction table (Class-to-Subject assignments)
CREATE TABLE IF NOT EXISTS public.class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint preventing assigning the same subject to a class multiple times
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_subjects_unique_assignment 
  ON public.class_subjects (school_id, academic_year_id, class_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class 
  ON public.class_subjects (class_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_class_subjects_subject 
  ON public.class_subjects (subject_id);

-- 5. Updated_at triggers for all new tables
DROP TRIGGER IF EXISTS trigger_classes_updated_at ON public.classes;
CREATE TRIGGER trigger_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_sections_updated_at ON public.sections;
CREATE TRIGGER trigger_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_subjects_updated_at ON public.subjects;
CREATE TRIGGER trigger_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_class_subjects_updated_at ON public.class_subjects;
CREATE TRIGGER trigger_class_subjects_updated_at
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for classes
DROP POLICY IF EXISTS "School members can view own school classes" ON public.classes;
CREATE POLICY "School members can view own school classes"
  ON public.classes FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School Admins can modify own school classes" ON public.classes;
CREATE POLICY "School Admins can modify own school classes"
  ON public.classes FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 8. RLS Policies for sections
DROP POLICY IF EXISTS "School members can view own school sections" ON public.sections;
CREATE POLICY "School members can view own school sections"
  ON public.sections FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School Admins can modify own school sections" ON public.sections;
CREATE POLICY "School Admins can modify own school sections"
  ON public.sections FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 9. RLS Policies for subjects
DROP POLICY IF EXISTS "School members can view own school subjects" ON public.subjects;
CREATE POLICY "School members can view own school subjects"
  ON public.subjects FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School Admins can modify own school subjects" ON public.subjects;
CREATE POLICY "School Admins can modify own school subjects"
  ON public.subjects FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );

-- 10. RLS Policies for class_subjects
DROP POLICY IF EXISTS "School members can view own school class_subjects" ON public.class_subjects;
CREATE POLICY "School members can view own school class_subjects"
  ON public.class_subjects FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School Admins can modify own school class_subjects" ON public.class_subjects;
CREATE POLICY "School Admins can modify own school class_subjects"
  ON public.class_subjects FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid() AND role IN ('school_admin', 'super_admin')
    )
  );
