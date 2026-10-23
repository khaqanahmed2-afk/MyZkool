-- ============================================================================
-- Rollback Migration: 20261017230000_transport_billing_hardening_rollback.sql
-- ============================================================================

DROP INDEX IF EXISTS public.unique_transport_due_per_student_term;
DROP INDEX IF EXISTS public.unique_transport_due_per_student_annual;
