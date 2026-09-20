-- Migration 009_students_operations.sql
-- Supports bulk import batching, promotion pipeline, transfer certificates, section capacities and parent merges

-- 1. Add import_batch_id to students table
ALTER TABLE public.students 
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_import_batch ON public.students(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- 2. Add promotion_batch_id to student_enrollments
ALTER TABLE public.student_enrollments 
  ADD COLUMN IF NOT EXISTS promotion_batch_id UUID REFERENCES public.promotion_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_promotion_batch ON public.student_enrollments(promotion_batch_id) WHERE promotion_batch_id IS NOT NULL;

-- 3. Enhance sections with capacity and class_teacher_id
ALTER TABLE public.sections 
  ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 40;

ALTER TABLE public.sections 
  ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Enhance student_transfer_certificates with approval status and QR verification code
ALTER TABLE public.student_transfer_certificates 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'approved', 'rejected'));

ALTER TABLE public.student_transfer_certificates 
  ADD COLUMN IF NOT EXISTS qr_verification_code TEXT;

CREATE INDEX IF NOT EXISTS idx_tc_qr_code ON public.student_transfer_certificates(school_id, qr_verification_code) WHERE qr_verification_code IS NOT NULL;

-- 5. Add index on parent phone for fast lookup during bulk import & merge
CREATE INDEX IF NOT EXISTS idx_parents_school_phone ON public.parents(school_id, phone) WHERE deleted_at IS NULL;

