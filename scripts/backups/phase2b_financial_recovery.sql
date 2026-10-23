-- ==============================================================================
-- MyZkool Point-in-Time Financial Recovery Script
-- Source Snapshot: phase2b_financial_backup_pre.json (2026-10-16T13:16:13.512Z)
-- TARGET TENANT: Peace Convent School (b70261ef-37f1-46c8-a148-2c496a9d33a8)
-- ==============================================================================
BEGIN;

-- Step 0: Clean up any Phase 2D repair entries before restoration to avoid orphan adjustments
DELETE FROM public.fee_ledger WHERE note LIKE 'Phase 2D%';

-- 1. Restore student_dues (417 records)
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7c126024-67b1-44e7-b8b7-a19a7a8a8e34', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - May 2026', 240000, 0, 240000, 0, 240000, '2026-05-09', 'pending', NULL, '2026-10-16T04:08:25.752+00:00', '2026-10-16T04:08:25.752+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f3197c0e-1c24-45fa-8b84-0f46c640e0af', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - June 2026', 240000, 0, 240000, 0, 240000, '2026-06-09', 'pending', NULL, '2026-10-16T04:08:26.016+00:00', '2026-10-16T04:08:26.016+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dd1c9540-2c4a-4611-b2a1-ebc7f9b70ae8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - July 2026', 240000, 0, 240000, 0, 240000, '2026-07-09', 'pending', NULL, '2026-10-16T04:08:26.436+00:00', '2026-10-16T04:08:26.436+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0abc2031-9d48-463b-b432-f38756135dcb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '9f504de5-f461-459c-a091-bf12b20256fb', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - August 2026', 240000, 0, 240000, 0, 240000, '2026-08-09', 'pending', NULL, '2026-10-16T04:08:26.707+00:00', '2026-10-16T04:08:26.707+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d9f46ac5-0a65-43c9-adb2-312c25ac26d0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - September 2026', 240000, 0, 240000, 0, 240000, '2026-09-09', 'pending', NULL, '2026-10-16T04:08:27.012+00:00', '2026-10-16T04:08:27.012+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7efc2dfe-e778-4099-bd96-4843da562a0c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - October 2026', 240000, 0, 240000, 0, 240000, '2026-10-09', 'pending', NULL, '2026-10-16T04:08:27.286+00:00', '2026-10-16T04:08:27.286+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ec1caa29-732e-4a1a-9217-0578082a1cad', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - November 2026', 240000, 0, 240000, 0, 240000, '2026-11-09', 'pending', NULL, '2026-10-16T04:08:27.557+00:00', '2026-10-16T04:08:27.557+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9e54ee56-a40c-4c44-a278-a45440d1804c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - December 2026', 240000, 0, 240000, 0, 240000, '2026-12-09', 'pending', NULL, '2026-10-16T04:08:27.808+00:00', '2026-10-16T04:08:27.808+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('924163e9-30d0-4f03-9212-3c3767da8aca', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - January 2027', 240000, 0, 240000, 0, 240000, '2027-01-09', 'pending', NULL, '2026-10-16T04:08:28.067+00:00', '2026-10-16T04:08:28.067+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('90d21b8c-46de-4ac3-8b7e-e22488efefc2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - February 2027', 240000, 0, 240000, 0, 240000, '2027-02-09', 'pending', NULL, '2026-10-16T04:08:28.339+00:00', '2026-10-16T04:08:28.339+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fde010a4-048a-4b03-9ba9-d3c04221bd97', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - March 2027', 240000, 0, 240000, 0, 240000, '2027-03-09', 'pending', NULL, '2026-10-16T04:08:28.625+00:00', '2026-10-16T04:08:28.626+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('948e5433-8729-4e39-9851-983ecbdb24d7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - April 2026', 120000, 0, 120000, 0, 120000, '2026-04-09', 'pending', NULL, '2026-10-16T04:08:31.368+00:00', '2026-10-16T04:08:31.368+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7a7a7d57-12c4-493b-9a0d-803209c3924d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - May 2026', 240000, 0, 240000, 0, 240000, '2026-05-09', 'pending', NULL, '2026-10-16T04:08:31.638+00:00', '2026-10-16T04:08:31.638+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('37d1fd89-4700-4183-87ad-86ddec7c1e3c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - June 2026', 240000, 0, 240000, 0, 240000, '2026-06-09', 'pending', NULL, '2026-10-16T04:08:31.906+00:00', '2026-10-16T04:08:31.906+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dc3c073a-3d9a-4741-81a6-70d255b7f62a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - July 2026', 240000, 0, 240000, 0, 240000, '2026-07-09', 'pending', NULL, '2026-10-16T04:08:32.198+00:00', '2026-10-16T04:08:32.198+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7fce04f8-b7ef-413e-bdb7-0c19e7a3bd3e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '9f504de5-f461-459c-a091-bf12b20256fb', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - August 2026', 240000, 0, 240000, 0, 240000, '2026-08-09', 'pending', NULL, '2026-10-16T04:08:32.438+00:00', '2026-10-16T04:08:32.438+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('57fea092-2c12-4ca9-983d-1e478f04e383', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - September 2026', 240000, 0, 240000, 0, 240000, '2026-09-09', 'pending', NULL, '2026-10-16T04:08:32.699+00:00', '2026-10-16T04:08:32.699+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c04b3c29-b701-4554-8119-bb2bda2704f3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - October 2026', 240000, 0, 240000, 0, 240000, '2026-10-09', 'pending', NULL, '2026-10-16T04:08:32.986+00:00', '2026-10-16T04:08:32.986+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2af11e2f-f44b-4db1-b3e1-eadd9ad80684', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - November 2026', 240000, 0, 240000, 0, 240000, '2026-11-09', 'pending', NULL, '2026-10-16T04:08:33.255+00:00', '2026-10-16T04:08:33.255+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3d32e35b-9bab-4235-943c-f03eed0b9b78', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - December 2026', 240000, 0, 240000, 0, 240000, '2026-12-09', 'pending', NULL, '2026-10-16T04:08:33.656+00:00', '2026-10-16T04:08:33.656+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6f0fb2fd-1853-458e-a11e-68835b7eee20', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - January 2027', 240000, 0, 240000, 0, 240000, '2027-01-09', 'pending', NULL, '2026-10-16T04:08:33.931+00:00', '2026-10-16T04:08:33.931+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('816e37a0-63af-4e69-91f5-6f245c1878d1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - February 2027', 240000, 0, 240000, 0, 240000, '2027-02-09', 'pending', NULL, '2026-10-16T04:08:34.218+00:00', '2026-10-16T04:08:34.218+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7765bf80-1363-4989-a090-637440ed6a6d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', '5b36eac7-1222-4c98-b2a3-7a79e42ad383', 'Transport Fee - March 2027', 240000, 0, 240000, 0, 240000, '2027-03-09', 'pending', NULL, '2026-10-16T04:08:34.501+00:00', '2026-10-16T04:08:34.501+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f2f84b4d-9079-4351-bc04-f7adf58491d9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - April 2026', 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T04:11:04.395+00:00', '2026-10-16T04:11:04.395+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('87a92696-b181-4973-8190-687121c668e9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - May 2026', 200000, 0, 200000, 0, 200000, '2026-05-09', 'pending', NULL, '2026-10-16T04:11:04.65+00:00', '2026-10-16T04:11:04.65+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7370bedd-4a77-43b6-8742-dfea387f5856', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - June 2026', 200000, 0, 200000, 0, 200000, '2026-06-09', 'pending', NULL, '2026-10-16T04:11:04.908+00:00', '2026-10-16T04:11:04.908+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d238ca30-f850-4de1-a001-1eda48d8a0bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - July 2026', 200000, 0, 200000, 0, 200000, '2026-07-09', 'pending', NULL, '2026-10-16T04:11:05.17+00:00', '2026-10-16T04:11:05.17+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d842a5c6-af3e-465c-a4fb-8a786cf1ea87', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '9f504de5-f461-459c-a091-bf12b20256fb', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - August 2026', 200000, 0, 200000, 0, 200000, '2026-08-09', 'pending', NULL, '2026-10-16T04:11:05.436+00:00', '2026-10-16T04:11:05.436+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1750f227-ba28-4d4b-8376-8703917834c8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - September 2026', 200000, 0, 200000, 0, 200000, '2026-09-09', 'pending', NULL, '2026-10-16T04:11:05.705+00:00', '2026-10-16T04:11:05.705+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3d353dc7-8ac8-418d-8189-5c298df5bed7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - October 2026', 200000, 0, 200000, 0, 200000, '2026-10-09', 'pending', NULL, '2026-10-16T04:11:05.962+00:00', '2026-10-16T04:11:05.962+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('628ab4b1-fb3d-47a3-b79f-23ee0ae8d587', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - November 2026', 200000, 0, 200000, 0, 200000, '2026-11-09', 'pending', NULL, '2026-10-16T04:11:06.215+00:00', '2026-10-16T04:11:06.215+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4c12e882-b550-43b9-b453-5e6bcca6a95e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - October 2026', 200000, 0, 200000, 0, 200000, '2026-10-09', 'pending', NULL, '2026-10-16T04:11:11.504+00:00', '2026-10-16T04:11:11.504+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('adc13410-9522-421b-9206-22008bab241e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - December 2026', 200000, 0, 200000, 0, 200000, '2026-12-09', 'pending', NULL, '2026-10-16T04:11:06.475+00:00', '2026-10-16T04:11:06.475+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f1395a17-2d94-48ae-8854-0aec670fc84b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - April 2026', 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T04:11:09.953+00:00', '2026-10-16T04:11:09.953+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('45a88651-5daa-4eb9-a2e4-c126b834ec1c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - November 2026', 200000, 0, 200000, 0, 200000, '2026-11-09', 'pending', NULL, '2026-10-16T04:11:11.768+00:00', '2026-10-16T04:11:11.768+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('47f39a56-52e2-4a00-9450-569c508b85d1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - January 2027', 200000, 0, 200000, 0, 200000, '2027-01-09', 'pending', NULL, '2026-10-16T04:11:06.727+00:00', '2026-10-16T04:11:06.727+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f4d9a9ac-4c4a-4755-897f-4c5929b49a96', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - May 2026', 200000, 0, 200000, 0, 200000, '2026-05-09', 'pending', NULL, '2026-10-16T04:11:10.213+00:00', '2026-10-16T04:11:10.213+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2a5b6ead-d2c6-4da6-8afa-13de7819f9c2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - December 2026', 200000, 0, 200000, 0, 200000, '2026-12-09', 'pending', NULL, '2026-10-16T04:11:12.025+00:00', '2026-10-16T04:11:12.025+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('617c599a-28bb-4deb-b885-bb217a504ba8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - February 2027', 200000, 0, 200000, 0, 200000, '2027-02-09', 'pending', NULL, '2026-10-16T04:11:06.981+00:00', '2026-10-16T04:11:06.981+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4c475d77-f39e-4b7b-824f-81acd9a229e1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - June 2026', 200000, 0, 200000, 0, 200000, '2026-06-09', 'pending', NULL, '2026-10-16T04:11:10.474+00:00', '2026-10-16T04:11:10.474+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4c50b24c-3d28-4b6f-a2a2-8df19c96712d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - January 2027', 200000, 0, 200000, 0, 200000, '2027-01-09', 'pending', NULL, '2026-10-16T04:11:12.285+00:00', '2026-10-16T04:11:12.285+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('69af07e2-e384-4015-90b3-c2935b2dc3b5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', '228e31d4-21f4-412c-9221-6b3492276e99', 'Transport Fee - March 2027', 200000, 0, 200000, 0, 200000, '2027-03-09', 'pending', NULL, '2026-10-16T04:11:07.257+00:00', '2026-10-16T04:11:07.257+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('aed04fb7-c138-486b-8beb-738e7eef58eb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - July 2026', 200000, 0, 200000, 0, 200000, '2026-07-09', 'pending', NULL, '2026-10-16T04:11:10.723+00:00', '2026-10-16T04:11:10.723+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('150824a3-a078-46d7-9860-f9933690d41d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - February 2027', 200000, 0, 200000, 0, 200000, '2027-02-09', 'pending', NULL, '2026-10-16T04:11:12.544+00:00', '2026-10-16T04:11:12.544+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a06a2b4b-288d-45ca-8f73-517415066884', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '9f504de5-f461-459c-a091-bf12b20256fb', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - August 2026', 200000, 0, 200000, 0, 200000, '2026-08-09', 'pending', NULL, '2026-10-16T04:11:10.992+00:00', '2026-10-16T04:11:10.992+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('afcc57b3-4381-41b1-ad93-7b1a10eeb8bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - March 2027', 200000, 0, 200000, 0, 200000, '2027-03-09', 'pending', NULL, '2026-10-16T04:11:12.798+00:00', '2026-10-16T04:11:12.798+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('720e6c8b-0d0f-4175-8560-b70718e5a0b8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'transport', 'e3568f0d-3177-4172-9474-4595991220d8', 'Transport Fee - September 2026', 200000, 0, 200000, 0, 200000, '2026-09-09', 'pending', NULL, '2026-10-16T04:11:11.252+00:00', '2026-10-16T04:11:11.252+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('eea7a3d1-dd14-4b20-8bd7-4cc65a45d525', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:33.529+00:00', '2026-10-16T04:48:33.529+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('93a374f4-fb4b-4c55-b2b0-481b07e27a7e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:33.816+00:00', '2026-10-16T04:48:33.816+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a4716e31-1899-4c93-bde4-bdbca92a95ec', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:34.058+00:00', '2026-10-16T04:48:34.058+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8c4dd8e5-fed3-4668-b249-3d96abe904b9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:34.349+00:00', '2026-10-16T04:48:34.349+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('80514d9d-efea-4f31-8db1-c04d8f62fc77', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:34.611+00:00', '2026-10-16T04:48:34.611+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b89d8e32-32a8-4202-8d57-290604e219fa', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', '2185b41e-3a3e-43b0-a087-15d3e8cb4cec', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:34.858+00:00', '2026-10-16T04:48:34.858+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8bc14dff-c138-40b3-b74a-9ee352505763', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:37.812+00:00', '2026-10-16T04:48:37.812+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d1790b6e-67e0-4041-829a-874d85542371', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:38.066+00:00', '2026-10-16T04:48:38.066+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('01d55f7d-0ce7-4593-9d91-49ec19df95dd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:38.338+00:00', '2026-10-16T04:48:38.338+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('09327627-e49c-482d-ba6c-5da94a86bc52', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:38.593+00:00', '2026-10-16T04:48:38.593+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('55f6c3ea-e675-4625-b3b3-934eacc118b5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:38.859+00:00', '2026-10-16T04:48:38.859+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('edcc565a-4a75-490e-af13-900f0f1686f3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', 'f0ced34b-d9d6-444a-82d9-58023b86d6d9', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:39.116+00:00', '2026-10-16T04:48:39.116+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f6798d92-ea7c-41a1-916e-0845e16198e6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:41.685+00:00', '2026-10-16T04:48:41.685+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c58e9d77-df3b-4a45-bdaf-13e7b8c6338b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:41.952+00:00', '2026-10-16T04:48:41.952+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a6b0cd9c-ec89-4166-9569-40236bd698a1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:42.225+00:00', '2026-10-16T04:48:42.225+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6a24fee9-3911-4832-a5ee-2501b9674474', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:42.489+00:00', '2026-10-16T04:48:42.489+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('75d101ed-293d-43e3-b44c-6127227e5ecd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:42.732+00:00', '2026-10-16T04:48:42.732+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d281ea16-281d-4f5c-b7cd-19003056d3a7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', 'f086c193-603f-4a98-8f2a-4dab549619ef', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:42.969+00:00', '2026-10-16T04:48:42.969+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4941ff6c-ab7d-4b0c-ac1b-f7eb2585162d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:45.504+00:00', '2026-10-16T04:48:45.504+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('679f6e19-f505-4047-b57c-de60cb8c7dde', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:45.735+00:00', '2026-10-16T04:48:45.735+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f8b449b2-f7f7-47b5-939b-5f18969e836c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:45.975+00:00', '2026-10-16T04:48:45.975+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6946a434-c7ad-4e5a-944c-f1ef70716e0f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:46.222+00:00', '2026-10-16T04:48:46.222+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d30d773b-6811-41e4-9451-82eeca248f83', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:46.45+00:00', '2026-10-16T04:48:46.45+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0c974e0a-bae0-4f7d-811e-41b354514df7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:46.688+00:00', '2026-10-16T04:48:46.688+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d31796b4-6fec-4023-9d3e-28e45186fc74', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:49.278+00:00', '2026-10-16T04:48:49.278+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f84b151c-f9de-4942-ab78-547232a55b00', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:49.54+00:00', '2026-10-16T04:48:49.54+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1e8fa744-2437-4a8c-abf6-32b4e62aa809', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:49.79+00:00', '2026-10-16T04:48:49.79+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d1a85ac7-0430-496f-acfa-7e06592f99d5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:50.029+00:00', '2026-10-16T04:48:50.029+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('66ad0fe1-2e80-4e71-bea5-26bc50e5ae3f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:50.286+00:00', '2026-10-16T04:48:50.286+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8429a659-e94f-4139-8c66-59dfbb133504', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', 'e6e560d2-bfca-4ad6-be61-2e003fa106cb', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:50.531+00:00', '2026-10-16T04:48:50.531+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('63a118f6-9144-4709-8919-56177604c329', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - October 2026', 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T04:48:53.014+00:00', '2026-10-16T04:48:53.014+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('54009d28-e2af-4bea-907e-e2035acce21d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - November 2026', 160000, 0, 160000, 0, 160000, '2026-11-09', 'pending', NULL, '2026-10-16T04:48:53.274+00:00', '2026-10-16T04:48:53.274+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e538fd2a-5837-4f82-950e-550771236612', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - December 2026', 160000, 0, 160000, 0, 160000, '2026-12-09', 'pending', NULL, '2026-10-16T04:48:53.513+00:00', '2026-10-16T04:48:53.513+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b61cbcb9-426e-4b09-86cd-328242e9a818', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - January 2027', 160000, 0, 160000, 0, 160000, '2027-01-09', 'pending', NULL, '2026-10-16T04:48:53.749+00:00', '2026-10-16T04:48:53.749+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8de75750-9c36-43b9-9c56-697ace6632ae', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - February 2027', 160000, 0, 160000, 0, 160000, '2027-02-09', 'pending', NULL, '2026-10-16T04:48:53.992+00:00', '2026-10-16T04:48:53.992+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2f6b95ff-8f1c-4d05-adef-aeebe998a925', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'transport', '9906569e-afd6-467d-b546-81d10aba6e07', 'Transport Fee - March 2027', 160000, 0, 160000, 0, 160000, '2027-03-09', 'pending', NULL, '2026-10-16T04:48:54.239+00:00', '2026-10-16T04:48:54.239+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1d048b1c-2f60-4040-8222-86c060963d4b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'transport', '3abedae5-6d58-4adc-8769-93346cd8d1d4', 'Transport Fee - April 2026', 120000, 0, 120000, 0, 120000, '2026-04-09', 'pending', NULL, '2026-10-16T04:08:25.39+00:00', '2026-10-16T11:14:27.313833+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9099fa9d-1d11-403f-bead-6cc568586fa4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cb98dffb-3b12-42f9-abff-558fac03f6ed', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fe540e86-ab67-4c8c-985d-77a07d4b3294', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1b1c6e4d-ba6e-49d8-b08d-fbea0a74f43c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a34a39a7-9eb6-4d68-b324-aca16f5cec83', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d6996fae-60ec-4652-93b8-db73275ca468', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('199bdece-9e75-4abc-8c98-b2a960272869', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('19ba160f-b38b-48b1-9536-6a73dd80cfc4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f40c5bfd-1aa6-4be9-a23d-92b150d104d7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5157d218-9cbd-437b-bf1b-3236ba499090', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ac20013a-7f37-439a-87d5-03c99c4e63d0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9b40bba2-318e-4c48-87fc-aefd4fef8f16', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('59025f55-a763-4629-8cd8-6a8014f0a09a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 200000, 200000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('32bc1b7f-a4af-480c-a1e2-75cfb02df8c1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9294d3cc-4fb9-498d-a5db-bc8e9edd5201', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5206074c-fd3a-47ab-82fa-d4ba03350044', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e5ca3048-70e2-498e-b8f1-90b11b2039da', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('19526502-7a64-4625-bb1a-abe4ffc912d8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('95273d20-feb3-4d10-b28f-ccc26991d1bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '106da630-38b8-406e-b6d2-9256fa75fe16', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', 'b455b583-70f0-4d2b-bf89-a11aee84c36f', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bdce0086-8ef9-4a29-8ace-f38eae42941b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8c49c10d-ac19-4561-a521-90218b79a76c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('67b963f8-a591-4b8d-ab00-c18572b7cb80', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-05-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5b75cb1f-ceb6-4a72-b922-44a784f61e20', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-06-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('48fad12c-07df-4c57-b551-e212b7e46ffb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7001c4f9-370e-4d04-ae3a-67ea6428f9c6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-08-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('221c0f06-d646-45cc-b529-422f8ec44f2e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-09-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dbff6e8a-3e50-4ee1-9680-237953b8d117', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('570a7fb5-ebb4-4fc9-926a-dd2b79a0f762', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-11-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fa5bdcef-630c-46e7-833b-a56b4d9e8408', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2026-12-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ac069295-cf66-4902-b88d-877cbb72a1f5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e661ec19-b8b5-41b3-9654-03d66d7d1b69', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2027-02-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7d9e0704-a707-41de-a5e5-d095ea084863', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 200000, 0, 200000, 0, 200000, '2027-03-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('31296dad-afda-41d9-b250-c0b04e751911', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fb0ce17c-aaf4-498e-ad2a-f783763114e5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7fe9f162-aaaa-42bb-8a5e-bd1cdc03abc0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e1d89833-5b91-4ce8-822e-ba09a446cb4a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e42d0b82-1eb7-4719-bf27-db28fe5592de', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('71f7e851-e46a-42a1-ad5c-4edce002800c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '541e48b7-b712-4ecc-9030-5d64cd9effb6', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '851d2a5d-fa1e-41cd-8733-3ee2d504f243', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a937f87f-b25c-4675-a607-0d5784b3685b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c19f6883-3d99-4628-9f92-1ff6b44d5d06', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c31c1e40-c360-4609-97d2-a65a5629fa14', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cf4159ff-bc74-4bfa-990c-a17f1dcfe547', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c8211d53-aa21-428f-9d85-066c02966c54', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('802e8edd-057d-497a-91b1-28eb04dab15d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d75d683e-fe2d-49b8-adbf-3931541aa0fe', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('20f5ef9f-0ef9-4ed4-8bc2-37d85e8b2487', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a35dacba-a65f-4e30-ae42-42246dbc1ba9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d481a485-dbcc-4c4e-81ce-c74a6da23dcc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1fde25b8-8556-4897-9a4b-07c05b2b7c44', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5ee5dcc8-b391-46f5-9205-ea1ca6607371', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8174ee3d-ee64-47d3-a517-672c4fbf486e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 200000, 200000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0cf34cde-0c4d-490a-b3a0-6e0d6be69436', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('79098957-cada-4780-812f-7edfab1a4dbc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('58c6a81d-8647-4c5f-8a19-83452e634086', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a9f2a808-1cfd-4ae3-aff9-28413e6e040d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cf2a0287-94d4-4c8c-be20-12292d1eaada', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8269e1ad-a89d-4ffc-bdf7-98e17ea512b2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '91ce7f65-d029-4f8f-ab84-24a11c6dfff7', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1163d007-4df2-45c8-9a1d-fa2e5280114e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ed61aef6-7ed5-404b-a140-a0698f942a41', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-05-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('70a5fe1d-74c1-4869-a96b-48373502aa2b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-06-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e06b633e-8bf2-41d1-ba64-b3f45b5e155a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ac093eb2-b153-4ebe-8339-34329d1d9351', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '9f504de5-f461-459c-a091-bf12b20256fb', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-08-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ceb18229-db97-4306-9628-cb7171e448da', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6ff3b20c-5cf2-4f74-a2d2-7721455a192a', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'transport', 'c4fd5117-b459-4630-b48f-4674aa81d5e6', NULL, 80000, 0, 80000, 0, 80000, '2026-09-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a91ddc76-ff8e-4be4-99b6-c4b0f7563c67', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('51cdc302-a0ca-4fe2-a757-5e5814281530', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dea3bb9b-302f-457c-a0be-282dbe2d8d03', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1ff02aa3-e1c4-4af5-aa37-61756682a937', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('09efa23e-f615-44cb-8324-a8f1777f6117', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c810bd17-953f-4e51-b29c-88cb68e87c11', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('27ddd068-cb99-4202-853c-fc57ebfc88b7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b48b1f32-0e1d-4b09-8acf-8505e015e6de', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('70d1cd81-c661-4f0e-87ba-997861a954aa', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('83a980b5-6183-48c7-8115-ede64af142e0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d9273a1f-6613-4c4c-acc9-d0b51c69f0b3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8b79e6cb-7425-4dd3-9a17-7b8995aa8a21', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a53550b6-81ad-488c-8fd9-526279cdb75b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 200000, 200000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1dc5a3ba-9e8a-4f82-bfc5-e4664f717f12', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fe01fe8d-b089-4973-a5f6-c70fc141d6e4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8f5c0629-dd27-4e5a-960f-7ad85f073317', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a3b27eda-405c-4a43-b3c7-41e02ceb0aac', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('68ff9f4f-583a-470b-94c6-2837515a7bf0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8c2ab414-8073-473d-bc6c-2dba89a6ce14', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '77e63981-7325-47a9-a075-81c1c8efa5e2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '37d9456f-15f4-46e9-aea5-a22a89ea4641', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fea0ac83-8c4b-402f-87ca-39dcd902ffd4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('593ec5bf-8329-45db-a45b-c29633792c35', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3df6ebbc-e9f9-4ace-b1e0-3230be477144', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('86534e8a-5bed-4cfb-a505-79608c62f920', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6bf92daf-2534-4cc3-93fb-e909afd0d213', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('df06c6ed-ad11-48e7-b9f6-ceaa1e889d31', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7db2bb72-d510-4aba-b0f7-c16e5b0e90db', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0136f276-1fef-4d0c-b7f4-fe6d604899ad', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3f4b5b2c-f43a-4fc6-8380-fd3980ae4309', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('442707cf-025b-45da-9bcf-c887b57a9ee9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ce279c25-be89-4953-8d7a-5c31aba481a7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8fd0348a-08f0-4c20-b26d-005f3bd2d933', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ea05e11d-cd74-47ee-a84a-42f810a0f401', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 200000, 200000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f48af265-256e-4194-837c-b6592eaafeed', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8727d5fe-e1ee-466c-975c-083941e765d8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bfeb32c7-158c-495d-80fb-7b2812bcb018', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('119a0fb5-a5af-4435-a92d-2002d6624532', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('267e70a4-430c-46d5-8b7d-b3ea78d317a6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8373e685-4dcc-4c57-bdb5-f8a5c8d57934', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'adc3d8b8-22b9-42e0-94a7-0a66ae233631', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '24ffe9e5-943d-4115-a420-701c3c2c29fd', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('010d2d56-1dee-44e7-99f4-906a34a9c88c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1da127ba-f9d7-49c8-8f63-48a3c076837f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('186347d3-1d69-4418-b7f9-5705a47eb186', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('08290837-0b12-47f0-97a6-081949a3ccf8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c1896fe4-d189-497e-98cb-8a56ebfb2e87', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a72b6c36-b004-4b3d-8d41-a05eb24dbeba', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1a2cc41e-e1f9-4c70-a26e-8b25cd7a77ea', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ea15f2c8-70fb-4e25-bcf3-71885092e6bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dfa63bac-0733-47b7-9dec-b0ec08d5fcff', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('926807ba-ac7d-4edc-9ea6-a10044b3a806', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('700a467e-36ae-41ae-9205-d85fcee73f3d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6305b9b6-6149-4f03-b241-107d52d42c44', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e7d366d2-027c-4254-a888-907771ea56ef', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 200000, 200000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ae2f32ad-8854-45a4-b37b-90e57b1586f1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fc2c0aba-792b-4d98-96e0-5cf82359a53d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9ad5e436-df3b-443a-8aeb-fb19c1f6998a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 80000, 0, 80000, 0, 80000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('92c5b83d-8602-4306-8f3a-348946f0829a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 80000, 0, 80000, 0, 80000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b4462682-4c29-4329-9ac1-fe12218cffb8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 80000, 0, 80000, 0, 80000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e3f253f1-9f00-4ef3-8c14-d97bd34e5520', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f486b9dc-9a3a-4043-b24d-1fd68ab70df8', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '089410b1-fc34-4c64-8813-a95cdde66b84', NULL, 80000, 0, 80000, 0, 80000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:35.797393+00:00', '2026-10-16T11:14:35.797393+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('34b24fe1-1046-4fa8-b373-58b4272bd6b2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cf86b784-1b56-473d-9e77-1b0d8212c082', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d70ad3e9-a728-4c9b-a2c7-a67595378e38', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e34bdf6d-9d72-459f-9ce6-35adc386301b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ac5de2c2-95d5-4b31-b128-cfca1a7690b2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b6912309-ddf8-4bd2-817f-067c34d17154', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c5d133fe-c9e0-4c1a-a1eb-c47f9b69eb1d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8beee7b6-cbdb-4913-8e33-8231555b2acf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5378a6ad-c409-4c93-8e8b-6ca11f49c698', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c859077a-d9a2-43e4-b3c6-2dcf5c3dd65e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e585cf72-e2ee-4b28-89dd-c3a43ba26e1f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cb6e6b21-350e-4f8c-9b2a-7b6d8a9c5af3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('19c1a3a6-c1c6-4128-857d-38ad23f081c0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3d7d0bf9-68c5-4815-afff-8dcd99e023c7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a611aadf-2058-48f1-9d7d-daebf7473b01', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('82882f42-1097-409f-9eda-c076062a8056', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cfb4ae2d-f501-4022-ad5b-76154843aa51', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d70798ce-56df-4f02-8a20-f1823034e4da', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('12ecfea5-58cc-4c56-9be2-f9c00896222b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '4a73acfb-8dd0-4456-bd8a-f2069669e597', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('61a9af98-f8a6-4c29-86cf-0a5b6f127547', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3c3c5864-2998-4a97-bb63-8f06f9399563', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('eef2ee1e-cf30-4e19-8367-dc747c4a5f93', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-05-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6c39708e-5740-42ca-a925-0c2c64a7612e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-06-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('46fce736-2aca-4b5b-b01d-08fcab7f9559', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0fd96912-f0a3-4fb9-8e8f-ad6fa28d7efc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-08-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('85cc5130-f8cd-49c7-9cc9-122c7c82fa62', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-09-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7e5a4df6-4202-4cea-9bb2-494ce0aed7d4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('fec423e2-e080-4a20-9859-38dc1b7f547e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-11-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('320b6a47-fe46-4f3f-99b7-864821597382', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2026-12-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a20d72db-eb3f-4f5d-b274-86c09fa5b686', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b4c71539-3212-4fe3-9da6-be7d5c89df43', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2027-02-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b5f8af6c-f479-4df7-a792-326bb3dcf5b2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 120000, 0, 120000, 0, 120000, '2027-03-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('429b4f8f-c5ac-4b13-a0ec-99ed8efb1ccf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f025a416-0a92-43bb-a0c0-2c87a0096d4d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('84f55043-397d-45ea-8f0f-a3e50bf130d1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('198bdf0e-d256-424c-a0b0-a32946f7948c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dd78388f-bf04-49f2-96e0-449b7d7591fd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('59b1f3f2-686a-4fc5-b3f6-a9237b7d0b52', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '3179d3d4-9ee0-4b76-932a-9acea1ea8a66', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '66b842e6-ab3f-493c-93a6-c2df9ab6aab3', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f16ca35c-6972-4555-87fd-4cd2bd770e26', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('860f59e5-f7ef-4989-8865-3d4a4546f166', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('db1b7518-3c23-42cf-a9b9-da52621d8bad', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('01b965e7-d4a4-4c33-b606-6875d4c59e55', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4804df75-9dd3-458b-9495-ef03b24b5117', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ec9ab5d7-fe9d-4df0-8574-70861fdf116a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f67bacd8-c53a-4082-bcf3-e777238c40a6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b25f858c-1db5-42ee-b46e-0ff2ec909875', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2b1330e4-b152-43e0-829e-856341a46ab3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4b11dfc0-4125-493f-b397-8a3e77125c19', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('62bc45c1-c62d-4f5b-a4d9-08dd83e9dabb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c0aefbe9-5c0d-497b-8f14-792eb7518f6c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('84bfbd93-9b91-4aab-8be7-80c9a3441449', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('50753ab4-ab8a-4bb0-8ac2-4ffa8391d77d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a5a465d3-609b-44f5-9b00-82ae587d6ffd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('46befb10-2fd9-4c43-a717-82643c7d7d34', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dce8d5ed-9927-44b6-83f3-2b851705ce68', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6b03144e-1bad-41b9-95bc-95084a4fa144', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('aadef2d8-04ef-4976-9ec5-8c0fc74bf6a9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '51778142-5e9f-43b6-89b0-e8a1db660dee', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '5c1d8337-73dd-4fab-bea3-4955083f2fc7', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dbb3f993-341d-42b8-b7f0-ee821e4490d3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('595d983e-4bea-42d6-b1d9-5183a85c122d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a52898d4-ebe4-4454-ae0e-d8d157e4ffea', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2d19b996-6ff3-4277-8f96-fbb4e578cceb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4cb31f27-a1f3-4ab5-ad87-e347bbaaf6a2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8cb1f6c1-37fc-40a7-a0b5-7893f316b100', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8a9a54d9-39af-460e-b2b4-07fff0e40a99', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('52eee5cd-1988-45b5-8632-6919a9088084', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('11c6807e-6dff-43eb-a7cd-e4e4e3752586', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1de691a0-252c-4187-b033-6b4ee140d947', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('48f4dd99-2a57-4c45-8161-a6b8322a2ee5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e7da4f5e-7c73-4198-ac30-8ec879584cf3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4eca8822-c728-4ea2-922a-9523e88b01f0', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8210255c-7cea-466c-9c97-ec857db7c94d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e1a0dd64-6b6e-41da-bc10-1a7c70f894bd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c5443b38-fed5-4edd-9db4-b878f7349cad', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5c974958-b3f5-4428-835b-bda126e45091', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('239432c6-64bc-4435-9ed2-294becda0daf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7aecf721-4364-4eb9-bc9a-ca9e3b368dce', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '90ad7329-3012-4878-a0da-7c6db7b355c0', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('84f43b15-b5a0-4cf0-b415-b722201f5618', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('871e7c17-0d4b-4bcc-a55b-f19bd85f8ca7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c92e5083-0132-4206-a008-17afd3a244d1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('75e6a076-5bd3-4fe0-8ebd-84e0b1c60c7e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('212c5ec7-9f04-4e20-ab21-dbc7163b16cb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8bef02e3-435c-4dcc-96ed-e0b88aec81a6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('66db0f76-cbc5-469f-8d2a-547de04b179f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8dd8862a-852e-43ca-bf9d-d4689633d31c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f2afaecb-bde6-419e-822a-728cba3212a6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('47c1c1d0-7dc1-4050-87f1-1d9cce80bbe2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('40c42762-10af-4fae-a915-4799f2eb7f39', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4f51a736-0219-4caf-aaa8-b1a02d4576bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('faeda7ae-5fb8-4e15-8dd8-72c88596bf93', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bfdf0c6f-d646-43e2-998e-ad2323aed087', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c4417664-c62a-4443-9e1e-a630489054bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d8ca94fe-86a3-4c3f-b859-9204548bad6e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2d419d38-2ea6-414d-abde-810a9afe6fb7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('98477836-3cef-477d-9e2f-11e014ebc018', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('81ccaae7-f873-4ad3-8847-47885b34e217', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '41932fd4-4442-447a-ae61-cf621696ac56', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('76245d0e-26e8-4789-961d-f7eed7a91ab8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ef0ad2f9-e080-4c37-8f1c-72ecdd7c85bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1df04385-8d58-424b-9633-f4dd54f88088', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dd0f3bb6-fa3e-4bca-9392-e6b95eecb96d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ea6c6afb-665b-428a-9107-26fcb16cf7a3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('63d6fddc-ec6a-4690-b204-a685f205b1d5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ce61813b-bf5e-4a9a-ad3e-768c8bfc26ab', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8ed4e58a-b679-4cce-ab4e-c00485fc9162', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7ce65897-c06e-429b-82e6-03db79ad4bbe', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d6cd8a89-9e71-443d-a9fe-6a728a404690', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('74e98d6d-dc3d-414c-b73a-1f999104ff4c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('100cab13-bff4-454c-9078-6ab6873c1d65', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('37e90ba1-c620-447a-b79f-147e64881ff7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('85409dc8-cc35-42f7-9e2a-8db6a02951e9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7e31cc2e-966b-42e7-974b-986866ffb867', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('29b9aac2-3d04-4045-97d7-0b86f39c83b2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5d8e6cff-9e16-49ef-adb2-59680eb52484', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c3c9812f-67e0-40a4-bd77-8bfe51377bdd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('00497909-69bf-4fb2-900e-e73178793c9f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '9436fef1-cb5e-4d36-8b4c-2a8baea23d65', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '89409038-49e1-4a44-8961-c0dcfe8bb068', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('11f84276-78a5-49a2-a330-b88c3f6f8e44', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd280529e-aa85-43c9-b4bd-31356243ab9d', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 100000, 0, 100000, 0, 100000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('793b5bd1-9103-4828-905e-e29034791335', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('04558d9f-d517-49cb-8e9b-ce8dafacfb2e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '999d59ff-fa9d-4514-bdea-cd4225b493d8', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-05-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4ccd2850-b898-4b7f-8eda-d3ce38304989', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '1fa19aa2-db93-49a3-a1ed-769fd4a49a01', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-06-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3e69fcb8-6bab-4505-ace2-d5e51cb801ba', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-07-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b7b30f11-e1d1-478e-a227-a94e1a5df00e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '9f504de5-f461-459c-a091-bf12b20256fb', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-08-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('aa4024e0-aa03-45df-98b3-36e3f5711f38', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '5ddccaca-0e7b-40cb-aedf-2153f0faeaa1', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-09-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8a865403-66fc-43a0-b403-c9ee9c7b0bcc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-10-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0791c7ae-1147-4be2-bef9-76166378840c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'ff89adc9-11c9-4897-b28b-55a0a3e306eb', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-11-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('4bcd642b-ea1e-4ebc-baa0-724b1b9e57a1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'f61ede9e-9fb0-447b-a9ee-074887334b1f', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2026-12-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d57353a3-933f-41da-8f10-db42fbd7416e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2027-01-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('236ac7fa-a6ce-470d-832e-6bf9e2918dfe', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', 'e56142b6-9345-45f7-9b23-e057c1ded856', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2027-02-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('49622988-d05b-4ead-a59d-f5e535deae9b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3ebf394d-1ad2-47e0-b5c3-dfebef4010f2', '6c969d90-24b0-42b7-a3f4-1e86d28b1708', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 120000, 120000, 0, 0, 0, '2027-03-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e10c14bc-bb96-47f1-8176-31ff32149e29', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '94d7928b-7f75-4d43-a177-412bb7e47038', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 100000, 100000, 0, 0, 0, '2026-04-09', 'waived', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('807c319d-8e24-479d-a73d-dcd8948e99ab', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '395e1aa4-e0fa-4248-bfab-68962a758fa6', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 500000, 0, 500000, 0, 500000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a32a22a0-02af-4788-9fc7-53913e245e0a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'f66c1234-2fe3-4f9c-801b-7f486ec8dc82', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 150000, 0, 150000, 0, 150000, '2026-04-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f89ef5f3-1023-4a05-9dd5-11176b40356b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'e37fa0ac-a4da-47c6-8631-2281f1fe1a94', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 150000, 0, 150000, 0, 150000, '2026-07-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bd620451-2c2a-4da5-ba6a-9c60e3b9c3fa', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', '4564d5ff-a7bb-4f32-ab2a-9dd9d47dea0b', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 150000, 0, 150000, 0, 150000, '2026-10-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cf983e3f-c28a-4299-9cc9-d67a278b9940', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8080a5a9-7d53-47e6-a5ef-df4333348c7c', 'cdc71567-4c58-4591-97a9-1d40607d6100', 'structure', '5afe396c-67b1-4591-80cc-60acf8b663f0', NULL, 150000, 0, 150000, 0, 150000, '2027-01-09', 'pending', NULL, '2026-10-16T11:14:57.54161+00:00', '2026-10-16T11:14:57.54161+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('75d1465c-b8e8-4b1d-8104-045d39eed7a1', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '71385f8e-6509-466e-be27-cfc48c778d58', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('435cea9a-1eba-4111-b6dc-00cbd62d7e17', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('10f905d0-b030-4c5c-9af7-20d6a0fe0500', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '90e4f099-e348-4d70-9847-c15e671e0497', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-05-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f7427960-9741-4e14-a0f3-16d6fe7ed9ce', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '20d33302-6ceb-4f86-bbeb-2c06cbb4edec', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-06-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bd5f39af-1216-4a38-971a-50eefe22b437', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5625ac2c-403b-472d-a61d-aecb61fa8030', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'd753d8d5-bc05-42c9-96ad-c2477ad725a1', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-08-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ebcc8c88-bb4b-42bc-bb21-200fd5aa714b', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '9466609e-6b8f-41da-832f-2fb433a81ecf', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-09-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5406b717-dd4f-4fc3-a085-7206a0d247b7', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a906f886-2ebb-4679-aaed-7cd8349c0c72', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '8fdc246f-b7a9-420d-bd48-112f00611e14', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-11-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3b908c1b-6021-40ac-8baa-024597df338d', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e3c80523-5b6e-48a3-9b1e-e0dbcc3159f3', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2027-12-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b66a08e4-2d70-4267-8a4b-e8c08b59be74', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ce25999b-c19d-4675-b99c-426697d7e46e', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e13bf777-b163-4a3b-befb-737eec2ffe59', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2028-02-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('156038a0-9b32-4d0a-ad71-4941b2e6e1b5', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '3d5eee83-8052-45c9-9ddc-90c9b7f38f17', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 80000, 0, 80000, 0, 80000, '2028-03-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2e842ae9-20bd-4cd7-8fb4-1f0af22888e5', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '8b14fb11-dafc-4c9c-a4f5-37afcdf4082a', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 150000, 0, 150000, 0, 150000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('dfdb10cc-2742-41b3-bfb8-04b311940838', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '83df44db-bd67-4f78-8791-6003c7a3f4ea', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 200000, 0, 200000, 0, 200000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('685b3666-8b13-4bab-a6eb-9742f83d111c', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 120000, 0, 120000, 0, 120000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c55915a2-d303-4dee-a8d1-44b9c464c1ed', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 120000, 0, 120000, 0, 120000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('86ac3869-5510-4f89-9bc5-a546b40068fb', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 120000, 0, 120000, 0, 120000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('e87bab92-2283-49a3-931b-71d9c16f025c', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 120000, 0, 120000, 0, 120000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f368d857-e038-4552-a236-ee8373f095f0', '33a509da-9f79-44c0-ad71-372916d04925', '515a46a5-1104-490a-8036-c8eb73878695', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a300202a-ea22-445b-b8ac-8d28176e6c6b', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f6dc5c6a-f5b5-4048-a04a-7c2301875392', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d68ad136-00b3-4fdf-9434-f6f777cbacae', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '71385f8e-6509-466e-be27-cfc48c778d58', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('7e3579fb-8ac4-4376-ad67-491f23be76f2', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('996ea676-2f4c-4f01-b8ce-d082eb794779', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '90e4f099-e348-4d70-9847-c15e671e0497', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-05-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f94d56c1-9cd8-4b9b-bbac-7111bac2b588', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '20d33302-6ceb-4f86-bbeb-2c06cbb4edec', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-06-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b6fcf140-141e-4547-87c8-a5eec0a7bd5c', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('660dbc93-7c36-45ca-b038-31bf08be6024', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'd753d8d5-bc05-42c9-96ad-c2477ad725a1', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-08-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('48b93a2b-69d0-4beb-be09-231a587c29bc', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '9466609e-6b8f-41da-832f-2fb433a81ecf', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-09-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5d4a37ac-49b2-47a7-9e9c-ea9112dddaaa', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1b4308c3-82e3-4c51-a035-8e98474b4e12', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '8fdc246f-b7a9-420d-bd48-112f00611e14', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-11-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1eb4e30c-d9e2-4a6d-8396-5e9531c9b744', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e3c80523-5b6e-48a3-9b1e-e0dbcc3159f3', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2027-12-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3f9379e7-b679-45de-b31b-7c5f9f3c41c8', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('31744fee-8658-4322-b3c6-dc9d438036d5', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e13bf777-b163-4a3b-befb-737eec2ffe59', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2028-02-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c7bf6b00-694d-4693-a995-2b5830a4c2fc', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '3d5eee83-8052-45c9-9ddc-90c9b7f38f17', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 80000, 0, 80000, 0, 80000, '2028-03-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5ddb1c9b-7670-4d57-80f2-8c8c650cc6d2', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '8b14fb11-dafc-4c9c-a4f5-37afcdf4082a', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 150000, 0, 150000, 0, 150000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('70974190-eb30-4af7-b968-316265e84f39', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '83df44db-bd67-4f78-8791-6003c7a3f4ea', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 200000, 0, 200000, 0, 200000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b0041c8d-1f34-4587-aa8d-d2a2bd681a5f', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 120000, 0, 120000, 0, 120000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b9490e30-6359-483c-8d40-239543188152', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 120000, 0, 120000, 0, 120000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('8ae36e00-9fea-45c2-9ef6-cad9c10c058f', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 120000, 0, 120000, 0, 120000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('1b6401b1-b54a-4458-8d24-e43a3d71d931', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 120000, 0, 120000, 0, 120000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('40f9ec43-5c6c-4f8c-8826-5853065235a0', '33a509da-9f79-44c0-ad71-372916d04925', '7c77c693-4d99-4528-b4c7-b9cdc809b464', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a300202a-ea22-445b-b8ac-8d28176e6c6b', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '49c0c090-7919-486b-b743-61ab476127ca', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('9e0f939d-f544-4393-a888-def727d218e1', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '71385f8e-6509-466e-be27-cfc48c778d58', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('15891853-d50b-4868-ae43-9ccb91a20460', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('d57d2162-c2a4-4e45-a542-aa85a8cd489f', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '90e4f099-e348-4d70-9847-c15e671e0497', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-05-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('324fb83a-8ed6-46ff-a36b-146cf3df56ac', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '20d33302-6ceb-4f86-bbeb-2c06cbb4edec', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-06-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ecff0eb3-4c59-472f-8cbe-a9bc19b1f0f2', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('a83ffc77-90bc-4de0-aa33-a84a4431f7b2', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'd753d8d5-bc05-42c9-96ad-c2477ad725a1', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-08-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('12fb6949-8fef-46e3-a455-1b515e1f3f04', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '9466609e-6b8f-41da-832f-2fb433a81ecf', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-09-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cd5a5ae4-e80a-46d0-a7c6-b04a1a7763ed', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('51365fb7-815e-4ada-aa73-00409511d09f', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '8fdc246f-b7a9-420d-bd48-112f00611e14', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-11-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c45dc801-17e0-4211-b342-db03d8157aab', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e3c80523-5b6e-48a3-9b1e-e0dbcc3159f3', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2027-12-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('967d35d1-2d52-4f71-9361-8aca7f6513f0', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('aa5d2095-41e5-43f7-83c2-dcd0c25103f6', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e13bf777-b163-4a3b-befb-737eec2ffe59', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2028-02-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('aa1c3a93-99f6-4392-98f7-19543b36ab5b', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '3d5eee83-8052-45c9-9ddc-90c9b7f38f17', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 80000, 0, 80000, 0, 80000, '2028-03-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('046e620c-4512-4309-bcfb-8c862f9fee65', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '8b14fb11-dafc-4c9c-a4f5-37afcdf4082a', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 150000, 0, 150000, 0, 150000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b853a20d-7ba5-4e56-9007-09fa5d6cd635', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '83df44db-bd67-4f78-8791-6003c7a3f4ea', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 200000, 0, 200000, 0, 200000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('188a7eaa-12d1-4560-8080-2e48c7df2287', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 120000, 0, 120000, 0, 120000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('40f1432f-3164-46a9-95aa-4a204eb45b55', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 120000, 0, 120000, 0, 120000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('c5c53698-aba9-4d90-9062-741a9f08b0e8', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 120000, 0, 120000, 0, 120000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f389d579-5b6e-493c-865a-96ee5bf27d1a', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 120000, 0, 120000, 0, 120000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('db1d0cc6-d47b-4cad-ab35-c3a82671a789', '33a509da-9f79-44c0-ad71-372916d04925', '9d32361e-fabd-49da-af2d-9670e999340f', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a300202a-ea22-445b-b8ac-8d28176e6c6b', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', 'f312e2b7-8076-40ec-899f-c84d2c941447', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('ee184023-d19a-4df8-8c9d-1c57ed4b36a1', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '71385f8e-6509-466e-be27-cfc48c778d58', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('0d68e43f-edd3-407c-81bb-4d27559b9f66', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5f3c1cc4-82f7-4037-a05d-caa90ba47bb7', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '90e4f099-e348-4d70-9847-c15e671e0497', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-05-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('6a670250-7368-4f42-9ffa-8f642a4deb87', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '20d33302-6ceb-4f86-bbeb-2c06cbb4edec', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-06-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('421e5f0b-cc85-4307-8a01-c78c799d20e2', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('2f2e63e4-ca0d-4b2e-8cd2-d5e6074f7984', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'd753d8d5-bc05-42c9-96ad-c2477ad725a1', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-08-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('bc5e40fc-937b-43dc-b746-31bea0dc6e5d', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '9466609e-6b8f-41da-832f-2fb433a81ecf', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-09-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('3122aa58-9970-42c9-9677-549035e860f5', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('07a679de-14f0-45d4-8dc8-f7db53bf5a18', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '8fdc246f-b7a9-420d-bd48-112f00611e14', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-11-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('5807c2bd-c7ea-4ca1-8627-69c18c66a8f1', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e3c80523-5b6e-48a3-9b1e-e0dbcc3159f3', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2027-12-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('310c6b9e-b398-4e22-88e5-ff3c4633b49b', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('65025bab-71a9-4d31-aba3-6ec544abea97', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', 'e13bf777-b163-4a3b-befb-737eec2ffe59', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2028-02-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cd98f20b-90b5-4827-8b30-d29186f9935a', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a60b71a6-edb8-4185-8204-d713cfaf7764', '3d5eee83-8052-45c9-9ddc-90c9b7f38f17', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 80000, 0, 80000, 0, 80000, '2028-03-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('34bd976d-5536-4adb-82c9-bcfb154ffb1f', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '8b14fb11-dafc-4c9c-a4f5-37afcdf4082a', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 150000, 0, 150000, 0, 150000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('da146406-20d1-4efd-b7ac-cba0ca9a9092', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '83df44db-bd67-4f78-8791-6003c7a3f4ea', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 200000, 0, 200000, 0, 200000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('f68f39ba-7e23-41cf-94e1-7d16ed02a9d1', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 120000, 0, 120000, 0, 120000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('b8db5a5c-b3cd-41a2-82f4-24a5314553cb', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '91e9c533-ad43-4d1d-96db-2099f9c45a3e', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 120000, 0, 120000, 0, 120000, '2027-07-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('25173c8b-73ac-4f13-a11c-5e5244611328', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', '0eaa3999-d9ad-4790-be3f-ea665c47e234', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 120000, 0, 120000, 0, 120000, '2027-10-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('de69c122-e1a0-4085-9224-594281fd509f', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', '3e346725-adc7-41ee-9669-24e858b903eb', 'fb31d9f6-6b6e-4faf-bc8a-2a15861ce89d', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 120000, 0, 120000, 0, 120000, '2028-01-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;
INSERT INTO public.student_dues (id, school_id, student_id, academic_year_id, fee_head_id, term_id, source, source_ref, description, gross_paise, concession_paise, net_paise, paid_paise, balance_paise, due_date, status, invoice_no, created_at, updated_at)
VALUES ('cfe50e92-825e-42d7-a083-f7a26a09abc4', '33a509da-9f79-44c0-ad71-372916d04925', 'ff94c25a-6f53-4ab4-abde-eb7bda83a128', '875c291a-ac9b-4893-8be0-2e28752ba5e4', 'a300202a-ea22-445b-b8ac-8d28176e6c6b', '1c83b68c-9edf-4c8c-a531-0f9182028789', 'structure', '3bc7989c-f052-4687-931a-c7c1b9616701', NULL, 100000, 0, 100000, 0, 100000, '2027-04-10', 'pending', NULL, '2026-10-16T11:20:41.014525+00:00', '2026-10-16T11:20:41.014525+00:00')
ON CONFLICT (id) DO UPDATE SET 
  gross_paise = EXCLUDED.gross_paise,
  concession_paise = EXCLUDED.concession_paise,
  net_paise = EXCLUDED.net_paise,
  paid_paise = EXCLUDED.paid_paise,
  balance_paise = EXCLUDED.balance_paise,
  status = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- 2. Restore fee_ledger (87 records)
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('4d565cdf-0a68-41ab-90be-124477677eee', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '1d048b1c-2f60-4040-8222-86c060963d4b', NULL, 'due_created', 120000, 'Due created: Transport Fee April 2026', NULL, '2026-10-16T04:08:25.584+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('73a16790-24e6-4f37-b72a-1eb948d4f0b3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7c126024-67b1-44e7-b8b7-a19a7a8a8e34', NULL, 'due_created', 240000, 'Due created: Transport Fee May 2026', NULL, '2026-10-16T04:08:25.879+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('3ffc4f55-20ad-4afa-b26a-409088b642d4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f3197c0e-1c24-45fa-8b84-0f46c640e0af', NULL, 'due_created', 240000, 'Due created: Transport Fee June 2026', NULL, '2026-10-16T04:08:26.165+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('618d3726-a67f-4e2b-a638-4aa7067628cb', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'dd1c9540-2c4a-4611-b2a1-ebc7f9b70ae8', NULL, 'due_created', 240000, 'Due created: Transport Fee July 2026', NULL, '2026-10-16T04:08:26.577+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('efe8c450-994c-4f12-b468-e4b981c42eda', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '0abc2031-9d48-463b-b432-f38756135dcb', NULL, 'due_created', 240000, 'Due created: Transport Fee August 2026', NULL, '2026-10-16T04:08:26.884+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('1e11baad-191c-4023-a71d-3f31219e8531', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd9f46ac5-0a65-43c9-adb2-312c25ac26d0', NULL, 'due_created', 240000, 'Due created: Transport Fee September 2026', NULL, '2026-10-16T04:08:27.142+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('cd716a19-01dd-4881-9658-d863ce5c0275', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7efc2dfe-e778-4099-bd96-4843da562a0c', NULL, 'due_created', 240000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:08:27.419+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('60cdf4e8-8fbc-415e-b8d6-4d1ed82f1386', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'ec1caa29-732e-4a1a-9217-0578082a1cad', NULL, 'due_created', 240000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:08:27.682+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('03e7ea3c-bfd6-4405-84b8-29a898e3d102', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '9e54ee56-a40c-4c44-a278-a45440d1804c', NULL, 'due_created', 240000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:08:27.941+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('8acd5dd2-c267-49a8-8659-b753cd9853e1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '924163e9-30d0-4f03-9212-3c3767da8aca', NULL, 'due_created', 240000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:08:28.194+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('e17f3b7d-e4db-4d53-b691-2f263bd2e5a2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '90d21b8c-46de-4ac3-8b7e-e22488efefc2', NULL, 'due_created', 240000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:08:28.482+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('857d3a61-06c0-4fd9-bc01-f081ef8137c1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'fde010a4-048a-4b03-9ba9-d3c04221bd97', NULL, 'due_created', 240000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:08:28.755+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('08978c81-0112-4fd4-a24d-4bfe63a7a259', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '948e5433-8729-4e39-9851-983ecbdb24d7', NULL, 'due_created', 120000, 'Due created: Transport Fee April 2026', NULL, '2026-10-16T04:08:31.501+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('b3b3f345-dd34-4e5e-95d4-c0ac4b36099b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7a7a7d57-12c4-493b-9a0d-803209c3924d', NULL, 'due_created', 240000, 'Due created: Transport Fee May 2026', NULL, '2026-10-16T04:08:31.773+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('ae30de3c-1da4-489d-8163-1c4ee2ac0136', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '37d1fd89-4700-4183-87ad-86ddec7c1e3c', NULL, 'due_created', 240000, 'Due created: Transport Fee June 2026', NULL, '2026-10-16T04:08:32.071+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('85e4e7e0-1c9d-404b-bd74-43362719c36b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'dc3c073a-3d9a-4741-81a6-70d255b7f62a', NULL, 'due_created', 240000, 'Due created: Transport Fee July 2026', NULL, '2026-10-16T04:08:32.316+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('9d90d616-e24c-4e97-a00c-628e3740c5c7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7fce04f8-b7ef-413e-bdb7-0c19e7a3bd3e', NULL, 'due_created', 240000, 'Due created: Transport Fee August 2026', NULL, '2026-10-16T04:08:32.565+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('b53aab1b-cb86-4847-8d69-f6d95b24e079', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '57fea092-2c12-4ca9-983d-1e478f04e383', NULL, 'due_created', 240000, 'Due created: Transport Fee September 2026', NULL, '2026-10-16T04:08:32.838+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('d6eca5a4-0ba0-4f82-962e-0ec98268230d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'c04b3c29-b701-4554-8119-bb2bda2704f3', NULL, 'due_created', 240000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:08:33.129+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('2c4cd18e-3fe0-4aa1-94f4-e0ec79cfddd5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '2af11e2f-f44b-4db1-b3e1-eadd9ad80684', NULL, 'due_created', 240000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:08:33.539+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('9a8f37bb-6d3a-4695-9bc1-67c9d590215b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3d32e35b-9bab-4235-943c-f03eed0b9b78', NULL, 'due_created', 240000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:08:33.802+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('f27a57e7-2846-4501-8bf8-a3569f489ca2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6f0fb2fd-1853-458e-a11e-68835b7eee20', NULL, 'due_created', 240000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:08:34.077+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('5096457c-0d6e-4382-9d6e-35bc0dc887bf', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '816e37a0-63af-4e69-91f5-6f245c1878d1', NULL, 'due_created', 240000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:08:34.359+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('95e4493e-8069-4691-8470-83e953c777c1', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '117a3b8c-497c-4b42-9f26-6e9de07821fa', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7765bf80-1363-4989-a090-637440ed6a6d', NULL, 'due_created', 240000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:08:34.637+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('07d777c5-9597-4f29-900d-e5bd4cac40c5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f2f84b4d-9079-4351-bc04-f7adf58491d9', NULL, 'due_created', 100000, 'Due created: Transport Fee April 2026', NULL, '2026-10-16T04:11:04.518+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('2fa073b1-c473-4736-a2b3-c7307f4522cc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '87a92696-b181-4973-8190-687121c668e9', NULL, 'due_created', 200000, 'Due created: Transport Fee May 2026', NULL, '2026-10-16T04:11:04.78+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('dd82af95-7493-49cc-ac16-2fa8fb59264b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '7370bedd-4a77-43b6-8742-dfea387f5856', NULL, 'due_created', 200000, 'Due created: Transport Fee June 2026', NULL, '2026-10-16T04:11:05.048+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('c49e375c-203a-4d8c-8e69-33142a18775f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd238ca30-f850-4de1-a001-1eda48d8a0bf', NULL, 'due_created', 200000, 'Due created: Transport Fee July 2026', NULL, '2026-10-16T04:11:05.304+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('5bf52e6f-dc69-4808-8c06-bd43e9025187', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd842a5c6-af3e-465c-a4fb-8a786cf1ea87', NULL, 'due_created', 200000, 'Due created: Transport Fee August 2026', NULL, '2026-10-16T04:11:05.573+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('e2eb1b4f-66e3-4ae1-b588-9e16892401a3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '1750f227-ba28-4d4b-8376-8703917834c8', NULL, 'due_created', 200000, 'Due created: Transport Fee September 2026', NULL, '2026-10-16T04:11:05.828+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('90b8c748-9fc3-46da-bb63-0a1ff02e9648', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '3d353dc7-8ac8-418d-8189-5c298df5bed7', NULL, 'due_created', 200000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:11:06.092+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('d082c9a8-b0fd-4e3a-8049-57f309c916a4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '628ab4b1-fb3d-47a3-b79f-23ee0ae8d587', NULL, 'due_created', 200000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:11:06.348+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('cd8d5238-f84e-4619-8177-5a63ba8769c9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'adc13410-9522-421b-9206-22008bab241e', NULL, 'due_created', 200000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:11:06.605+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('38eee708-e55c-4333-89f9-e84ccc837fd4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '47f39a56-52e2-4a00-9450-569c508b85d1', NULL, 'due_created', 200000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:11:06.861+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('84f0d196-422d-4866-9dd0-dbb32e4c6e6e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '617c599a-28bb-4deb-b885-bb217a504ba8', NULL, 'due_created', 200000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:11:07.119+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('e55125e1-e49b-4a90-9351-ca9bfbca557e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '69af07e2-e384-4015-90b3-c2935b2dc3b5', NULL, 'due_created', 200000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:11:07.39+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('86e8249a-0d6e-420c-ad08-d88091bbaa38', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f1395a17-2d94-48ae-8854-0aec670fc84b', NULL, 'due_created', 100000, 'Due created: Transport Fee April 2026', NULL, '2026-10-16T04:11:10.083+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('f568d312-857a-4585-8367-d78623b28d49', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f4d9a9ac-4c4a-4755-897f-4c5929b49a96', NULL, 'due_created', 200000, 'Due created: Transport Fee May 2026', NULL, '2026-10-16T04:11:10.34+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('6ae3da76-152b-435c-8e79-6b227774ba8e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '4c475d77-f39e-4b7b-824f-81acd9a229e1', NULL, 'due_created', 200000, 'Due created: Transport Fee June 2026', NULL, '2026-10-16T04:11:10.591+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('791be8ce-2d32-4cba-9f7c-e8ef99cd8519', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'aed04fb7-c138-486b-8beb-738e7eef58eb', NULL, 'due_created', 200000, 'Due created: Transport Fee July 2026', NULL, '2026-10-16T04:11:10.859+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('926fe26d-699e-4f35-83c0-6ed1508ecb9e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'a06a2b4b-288d-45ca-8f73-517415066884', NULL, 'due_created', 200000, 'Due created: Transport Fee August 2026', NULL, '2026-10-16T04:11:11.115+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('90301f2d-6447-417b-9fb4-abd702f2a5f6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '720e6c8b-0d0f-4175-8560-b70718e5a0b8', NULL, 'due_created', 200000, 'Due created: Transport Fee September 2026', NULL, '2026-10-16T04:11:11.388+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('b5fe82fc-f110-4535-a7cd-f146913464dc', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '4c12e882-b550-43b9-b453-5e6bcca6a95e', NULL, 'due_created', 200000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:11:11.639+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('a272c6f7-c381-45b1-b29f-3c74f64a34e5', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '45a88651-5daa-4eb9-a2e4-c126b834ec1c', NULL, 'due_created', 200000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:11:11.899+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('d2e2f5a0-75bf-4412-b286-3e28072cc635', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '2a5b6ead-d2c6-4da6-8afa-13de7819f9c2', NULL, 'due_created', 200000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:11:12.149+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('dfee0802-a375-4390-b33a-038fb8559eec', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '4c50b24c-3d28-4b6f-a2a2-8df19c96712d', NULL, 'due_created', 200000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:11:12.403+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('ee05f65e-ffde-4095-831d-6432bc93d740', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '150824a3-a078-46d7-9860-f9933690d41d', NULL, 'due_created', 200000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:11:12.677+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('f1d57cae-8372-4cd2-80b1-6f0134d3cc6e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'eb8498df-ee80-44b7-a01e-681ab9d6eb41', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'afcc57b3-4381-41b1-ad93-7b1a10eeb8bf', NULL, 'due_created', 200000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:11:12.921+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('125aa03c-95e1-4436-9b4b-5e596be78414', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'eea7a3d1-dd14-4b20-8bd7-4cc65a45d525', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:33.675+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('096c36c1-bada-42f7-8d30-33f5139e58bd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '93a374f4-fb4b-4c55-b2b0-481b07e27a7e', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:33.937+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('eeb42208-e1c1-48ff-aef4-6931a8c80b94', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'a4716e31-1899-4c93-bde4-bdbca92a95ec', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:34.206+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('facf8a8f-81b6-4dae-bb83-f593cb759ef2', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8c4dd8e5-fed3-4668-b249-3d96abe904b9', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:34.473+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('36f87468-cefc-4760-b8d8-8fe3fb9bcef6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '80514d9d-efea-4f31-8db1-c04d8f62fc77', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:34.741+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('79811944-c5cb-4172-bb82-619be519d057', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '748597b9-1f32-4692-81be-d78f29aced4a', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'b89d8e32-32a8-4202-8d57-290604e219fa', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:34.988+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('ca4faa81-dd80-4726-b577-a6786b1ef7c7', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8bc14dff-c138-40b3-b74a-9ee352505763', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:37.946+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('72f59a10-1eb2-41d3-ac9b-73f4260a2314', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd1790b6e-67e0-4041-829a-874d85542371', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:38.202+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('3d3ee250-bfe1-4160-92cb-b8c1c318e45a', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '01d55f7d-0ce7-4593-9d91-49ec19df95dd', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:38.458+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('3e3084c9-d390-4c02-9b9f-ef1a4898e305', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '09327627-e49c-482d-ba6c-5da94a86bc52', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:38.733+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('43e2d3c4-a1f9-4eff-acee-38695d69fadd', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '55f6c3ea-e675-4625-b3b3-934eacc118b5', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:38.985+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('a96c7ea4-8248-4160-b4d0-2a08353ca26e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '0b0ae931-b69c-4071-ba49-b5402792d765', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'edcc565a-4a75-490e-af13-900f0f1686f3', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:39.238+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('85d55cea-6b16-4c66-b2da-2cee10f93d0b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f6798d92-ea7c-41a1-916e-0845e16198e6', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:41.826+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('101abed1-3dda-49a4-928c-42bfba54a626', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'c58e9d77-df3b-4a45-bdaf-13e7b8c6338b', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:42.072+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('c7611fd5-0ece-42b8-8f88-add9f293f11c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'a6b0cd9c-ec89-4166-9569-40236bd698a1', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:42.366+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('e0eaba61-089d-4460-93e6-1d6f824a5722', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6a24fee9-3911-4832-a5ee-2501b9674474', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:42.613+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('12857a76-8df3-470b-9725-b98c3eb86fa4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '75d101ed-293d-43e3-b44c-6127227e5ecd', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:42.854+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('1f43acc7-943f-4dfe-83b2-ee5f5b837b98', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '313ebbb4-f6d2-4771-abc2-b95de861628b', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd281ea16-281d-4f5c-b7cd-19003056d3a7', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:43.092+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('5e6a9190-1399-421d-8cec-a0e87390806f', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '4941ff6c-ab7d-4b0c-ac1b-f7eb2585162d', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:45.631+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('3fd99ab3-26df-4c51-bf11-bc9c46913dd3', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '679f6e19-f505-4047-b57c-de60cb8c7dde', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:45.855+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('db3e4a89-4f9b-4c43-ab69-c09d8e3458b4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f8b449b2-f7f7-47b5-939b-5f18969e836c', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:46.093+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('9b4b838e-b9fa-4249-8bae-3814d4f276ae', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '6946a434-c7ad-4e5a-944c-f1ef70716e0f', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:46.334+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('aab569dd-6f46-4c7f-b3aa-42fdee2560a4', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd30d773b-6811-41e4-9451-82eeca248f83', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:46.575+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('6f5333b6-b447-452c-aef2-56fba16734a6', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '74e2b05a-1e91-460b-b9bf-f61544d56182', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '0c974e0a-bae0-4f7d-811e-41b354514df7', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:46.849+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('65edf3e3-e809-42a5-9227-c9af0c49c931', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd31796b4-6fec-4023-9d3e-28e45186fc74', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:49.404+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('95d05b73-2a4a-48e9-8bca-5c57ec4b51a8', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'f84b151c-f9de-4942-ab78-547232a55b00', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:49.671+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('a7efc317-a4da-4d85-8f51-7fecbf5061b9', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '1e8fa744-2437-4a8c-abf6-32b4e62aa809', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:49.912+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('b0d986a4-4ef1-4ee8-8dfb-36280d80ad2d', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'd1a85ac7-0430-496f-acfa-7e06592f99d5', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:50.155+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('e215015e-7709-42c3-b493-41299d3c3491', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '66ad0fe1-2e80-4e71-bea5-26bc50e5ae3f', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:50.406+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('b3adc4a2-524e-47bd-81c9-5d417263e282', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', 'f7bc91ff-d1c9-478f-9f23-ea76195e86e4', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8429a659-e94f-4139-8c66-59dfbb133504', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:50.649+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('5c2dcffe-3bd4-429b-a7a3-841806f1288b', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '63a118f6-9144-4709-8919-56177604c329', NULL, 'due_created', 80000, 'Due created: Transport Fee October 2026', NULL, '2026-10-16T04:48:53.141+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('97206c42-61d0-4891-a8bf-6185e599d254', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '54009d28-e2af-4bea-907e-e2035acce21d', NULL, 'due_created', 160000, 'Due created: Transport Fee November 2026', NULL, '2026-10-16T04:48:53.396+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('c3c57dd9-eee4-443f-b0b8-20e2b31e4f93', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'e538fd2a-5837-4f82-950e-550771236612', NULL, 'due_created', 160000, 'Due created: Transport Fee December 2026', NULL, '2026-10-16T04:48:53.628+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('26160f57-b9e5-4570-8391-be294b82388c', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', 'b61cbcb9-426e-4b09-86cd-328242e9a818', NULL, 'due_created', 160000, 'Due created: Transport Fee January 2027', NULL, '2026-10-16T04:48:53.874+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('438a205f-6e69-4c2f-8bfd-281cebc432db', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '8de75750-9c36-43b9-9c56-697ace6632ae', NULL, 'due_created', 160000, 'Due created: Transport Fee February 2027', NULL, '2026-10-16T04:48:54.115+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('cb7045f0-1334-4694-968d-6cf995825771', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '7ae15102-4f59-44a3-a2dc-936d4f292767', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '2f6b95ff-8f1c-4d05-adef-aeebe998a925', NULL, 'due_created', 160000, 'Due created: Transport Fee March 2027', NULL, '2026-10-16T04:48:54.358+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('8f3cbbdb-d274-4cad-a88d-120d4f365799', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '92c37a0e-c82b-41d1-9f55-49b1e0937bd2', 'a0171c28-e12c-4485-ac27-e0b010607e1f', NULL, 'f14ed1ce-632a-4b70-8dff-49c5028d9088', 'payment', -100000, 'Advance credit MZ/2026–2027/000002', '62f0436b-8e83-46ca-8716-7814f8699a09', '2026-10-16T10:56:02.838495+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('c9b4fb3d-eb5e-43e5-836a-96c383c16a04', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '1d048b1c-2f60-4040-8222-86c060963d4b', '6210e425-fe0b-4e3a-9baa-f27f874e0a5b', 'payment', -50000, 'Payment via MZ/2026–2027/000003', NULL, '2026-10-16T11:14:02.42908+00:00')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.fee_ledger (id, school_id, student_id, academic_year_id, due_id, receipt_id, entry_type, amount_paise, note, created_by, created_at)
VALUES ('66c9a750-b565-4c56-ab46-8ac7fcec481e', 'b70261ef-37f1-46c8-a148-2c496a9d33a8', '899e02ab-d52b-4990-853c-62bbb7960563', 'a0171c28-e12c-4485-ac27-e0b010607e1f', '1d048b1c-2f60-4040-8222-86c060963d4b', '6210e425-fe0b-4e3a-9baa-f27f874e0a5b', 'reversal', 50000, 'Reversal of MZ/2026–2027/000003: Automated test verification cancellation', NULL, '2026-10-16T11:14:27.313833+00:00')
ON CONFLICT (id) DO NOTHING;

-- 3. Verification Assertions for Restored State
DO $$
DECLARE
    v_dues_count int;
    v_ledger_count int;
BEGIN
    SELECT count(*) INTO v_dues_count FROM public.student_dues WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
    IF v_dues_count != 337 THEN
        RAISE EXCEPTION 'Recovery validation failed: expected 337 dues, found %', v_dues_count;
    END IF;

    SELECT count(*) INTO v_ledger_count FROM public.fee_ledger WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
    IF v_ledger_count != 87 THEN
        RAISE EXCEPTION 'Recovery validation failed: expected 87 ledger records, found %', v_ledger_count;
    END IF;

    RAISE NOTICE 'RECOVERY VALIDATION PASSED: 337 dues and 87 ledger rows restored exactly.';
END $$;

COMMIT;