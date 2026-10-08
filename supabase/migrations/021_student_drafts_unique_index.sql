-- Migration: 021_student_drafts_unique_index.sql
-- Enforces one active admission draft per user per school and supports upsert operations

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_drafts_school_user 
  ON public.student_drafts(school_id, created_by);
