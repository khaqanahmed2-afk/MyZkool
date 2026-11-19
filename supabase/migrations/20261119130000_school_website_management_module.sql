-- Migration: 20261119130000_school_website_management_module.sql
-- Description: Website management module schema: posts, media, analytics, enquiries enhancement, SEO & themes

-- 1. Extend school_websites with design, SEO, and domain fields
ALTER TABLE public.school_websites
  ADD COLUMN IF NOT EXISTS theme_id TEXT NOT NULL DEFAULT 'academic-classic',
  ADD COLUMN IF NOT EXISTS header_style TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS footer_style TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS font_family TEXT NOT NULL DEFAULT 'Inter, sans-serif',
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS allow_indexing BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT NOT NULL DEFAULT 'unconfigured',
  ADD COLUMN IF NOT EXISTS last_published_at TIMESTAMPTZ;

-- 2. Extend admission_enquiries with student_name and internal_notes
ALTER TABLE public.admission_enquiries
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Enable update on admission_enquiries for school admins
DROP POLICY IF EXISTS "School members can update admission enquiries" ON public.admission_enquiries;
CREATE POLICY "School members can update admission enquiries"
  ON public.admission_enquiries FOR UPDATE TO authenticated
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

-- 3. Create website_media table
CREATE TABLE IF NOT EXISTS public.website_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.school_websites(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_media_school_id ON public.website_media(school_id, created_at DESC);

ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can view website media" ON public.website_media;
CREATE POLICY "School members can view website media"
  ON public.website_media FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "School admins can manage website media" ON public.website_media;
CREATE POLICY "School admins can manage website media"
  ON public.website_media FOR ALL TO authenticated
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

-- 4. Create website_posts table (News, Notices, Events, Announcements)
CREATE TABLE IF NOT EXISTS public.website_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.school_websites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'announcement',
  featured_image TEXT,
  event_date TIMESTAMPTZ,
  publication_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_published BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_posts_school_id ON public.website_posts(school_id, publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_website_posts_published ON public.website_posts(is_published, publication_date);

DROP TRIGGER IF EXISTS trigger_website_posts_updated_at ON public.website_posts;
CREATE TRIGGER trigger_website_posts_updated_at
  BEFORE UPDATE ON public.website_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.website_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published website posts" ON public.website_posts;
CREATE POLICY "Public can view published website posts"
  ON public.website_posts FOR SELECT
  USING (
    is_published = true AND publication_date <= now()
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

DROP POLICY IF EXISTS "School admins can manage website posts" ON public.website_posts;
CREATE POLICY "School admins can manage website posts"
  ON public.website_posts FOR ALL TO authenticated
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

-- 5. Create website_analytics_events table
CREATE TABLE IF NOT EXISTS public.website_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.school_websites(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL DEFAULT '/',
  visitor_hash TEXT NOT NULL,
  referrer TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  browser TEXT,
  is_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_school_created ON public.website_analytics_events(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_path ON public.website_analytics_events(school_id, page_path);

ALTER TABLE public.website_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert website analytics events" ON public.website_analytics_events;
CREATE POLICY "Anyone can insert website analytics events"
  ON public.website_analytics_events FOR INSERT
  WITH CHECK (school_id IS NOT NULL);

DROP POLICY IF EXISTS "School members can view website analytics" ON public.website_analytics_events;
CREATE POLICY "School members can view website analytics"
  ON public.website_analytics_events FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT id FROM public.schools WHERE created_by = auth.uid()
      UNION
      SELECT school_id FROM public.profiles WHERE auth_id = auth.uid()
    )
  );
