-- MyZkool Step 8: Website Setup / School Website Initialization Schema
-- Migration: 005_website_setup.sql

-- 1. Create school_websites table (Tenant-scoped School Website Configuration)
CREATE TABLE IF NOT EXISTS public.school_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2158E0',
  secondary_color TEXT NOT NULL DEFAULT '#141A2E',
  accent_color TEXT NOT NULL DEFAULT '#10B981',
  subdomain TEXT NOT NULL,
  custom_domain TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  about_text TEXT,
  admission_enabled BOOLEAN NOT NULL DEFAULT true,
  parent_portal_enabled BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_school_website UNIQUE (school_id)
);

-- Unique index on lowercase subdomain
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_websites_subdomain_unique 
  ON public.school_websites (LOWER(subdomain));

CREATE INDEX IF NOT EXISTS idx_school_websites_school_id 
  ON public.school_websites (school_id);

CREATE INDEX IF NOT EXISTS idx_school_websites_published 
  ON public.school_websites (published);

-- 2. Create website_pages table (Data-driven page hierarchy per school website)
CREATE TABLE IF NOT EXISTS public.website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  website_id UUID NOT NULL REFERENCES public.school_websites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'standard',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_website_page_slug UNIQUE (website_id, slug),
  CONSTRAINT valid_page_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$' OR slug = 'home')
);

CREATE INDEX IF NOT EXISTS idx_website_pages_website_sort 
  ON public.website_pages (website_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_website_pages_school_id 
  ON public.website_pages (school_id);

-- 3. Updated_at triggers
DROP TRIGGER IF EXISTS trigger_school_websites_updated_at ON public.school_websites;
CREATE TRIGGER trigger_school_websites_updated_at
  BEFORE UPDATE ON public.school_websites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_website_pages_updated_at ON public.website_pages;
CREATE TRIGGER trigger_website_pages_updated_at
  BEFORE UPDATE ON public.website_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.school_websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for school_websites
-- Public can view published websites; School members can view their own draft/published website
DROP POLICY IF EXISTS "Public and school members can view school website" ON public.school_websites;
CREATE POLICY "Public and school members can view school website"
  ON public.school_websites FOR SELECT
  USING (
    published = true
    OR (
      auth.role() = 'authenticated' AND (
        school_id IN (
          SELECT id FROM public.schools WHERE created_by = auth.uid()
          UNION
          SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
        )
      )
    )
  );

-- Only School Admins and Super Admins can insert/update their school website
DROP POLICY IF EXISTS "School Admins can manage own school website" ON public.school_websites;
CREATE POLICY "School Admins can manage own school website"
  ON public.school_websites FOR ALL TO authenticated
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

-- 6. RLS Policies for website_pages
-- Public can view enabled pages of published websites; School members can view all pages of their school
DROP POLICY IF EXISTS "Public and school members can view website pages" ON public.website_pages;
CREATE POLICY "Public and school members can view website pages"
  ON public.website_pages FOR SELECT
  USING (
    (
      is_enabled = true AND website_id IN (
        SELECT id FROM public.school_websites WHERE published = true
      )
    )
    OR (
      auth.role() = 'authenticated' AND (
        school_id IN (
          SELECT id FROM public.schools WHERE created_by = auth.uid()
          UNION
          SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
        )
      )
    )
  );

-- Only School Admins and Super Admins can insert/update/delete website pages
DROP POLICY IF EXISTS "School Admins can manage website pages" ON public.website_pages;
CREATE POLICY "School Admins can manage website pages"
  ON public.website_pages FOR ALL TO authenticated
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
