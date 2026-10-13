-- Migration: 20261013020000_school_assets_storage.sql
-- Description: Provision school-assets storage bucket and configure RLS policies for public assets

-- 1. Ensure school-assets bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

-- 2. Storage RLS Policies for school-assets
DROP POLICY IF EXISTS "Public Read school-assets" ON storage.objects;
CREATE POLICY "Public Read school-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Authenticated users can upload school-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload school-assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Authenticated users can update school-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update school-assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Authenticated users can delete school-assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete school-assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'school-assets');
