/**
 * School Website Service & Multi-Tenant Management
 * Onboarding Step 6 of 8 - Route: /onboarding/website
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { updateCachedSchoolOnboardingStep } from "./schoolService";
import type { School } from "../types/school";
import {
  type SchoolWebsite,
  type WebsitePage,
  type WebsiteSettingsInput,
  type HomePageContent,
  type SocialLinks,
  type HeroSectionConfig,
  type PrincipalSectionConfig,
  type FacilityItem,
  type GalleryImageItem,
  type StatItem,
  type TestimonialItem,
  type AnnouncementItem,
  type WebsiteSectionToggle,
  type WebsiteMediaItem,
  type WebsitePost,
  type AdmissionEnquiry,
  type AdmissionEnquiryStatus,
  type WebsiteAnalyticsEvent,
  type WebsiteAnalyticsSummary,
  DEFAULT_WEBSITE_PAGES,
  DEFAULT_WEBSITE_SECTIONS,
} from "../types/website";
import { isReservedSubdomain } from "../constants/subdomains";

export const WEBSITE_CACHE_KEY_PREFIX = "myzkool_website_";
export const WEBSITE_PAGES_CACHE_KEY_PREFIX = "myzkool_website_pages_";

/**
 * Generates a public URL for the school tenant website
 */
export function formatSchoolWebsiteUrl(subdomain: string): string {
  const cleanSubdomain = (subdomain || "").toLowerCase().trim();
  const baseDomain =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_DOMAIN
      ? import.meta.env.VITE_PUBLIC_DOMAIN
      : "myzkool.com";
  return `https://${cleanSubdomain}.${baseDomain}`;
}

/**
 * Generates the tenant-scoped parent portal login URL
 */
export function formatParentPortalUrl(subdomain: string): string {
  return `${formatSchoolWebsiteUrl(subdomain)}/parent-login`;
}

/**
 * Validates a 3 or 6 digit hex color
 */
export function isValidHexColor(color: string): boolean {
  if (!color || typeof color !== "string") return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Normalizes a page title into a URL slug
 */
export function normalizePageSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Fetch the website configuration and pages for a given school
 */
export async function getSchoolWebsite(
  schoolId: string
): Promise<{ website: SchoolWebsite | null; error?: string }> {
  if (!schoolId) {
    return { website: null, error: "school_id is required." };
  }

  // 1. Check Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: websiteData, error: websiteErr } = await supabase
        .from("school_websites")
        .select("*")
        .eq("school_id", schoolId)
        .maybeSingle();

      if (websiteErr) {
        console.warn("Supabase school_websites lookup error:", websiteErr);
      } else if (websiteData) {
        // Fetch child pages
        const { data: pagesData } = await supabase
          .from("website_pages")
          .select("*")
          .eq("website_id", websiteData.id)
          .order("sort_order", { ascending: true });

        const website: SchoolWebsite = {
          ...websiteData,
          pages: (pagesData as WebsitePage[]) || [],
        };

        // Cache locally
        try {
          localStorage.setItem(
            `${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`,
            JSON.stringify(website)
          );
        } catch {
          // Ignore storage quota errors
        }

        return { website };
      }
    } catch (err) {
      console.warn("Supabase connection failure in getSchoolWebsite:", err);
    }
  }

  // 2. Fallback to localStorage
  try {
    const cached = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cached) {
      const parsed: SchoolWebsite = JSON.parse(cached);
      return { website: parsed };
    }
  } catch {
    // Non-fatal
  }

  return { website: null };
}

/**
 * Fetch all pages for a specific website
 */
export async function getWebsitePages(
  websiteId: string
): Promise<{ pages: WebsitePage[]; error?: string }> {
  if (!websiteId) {
    return { pages: [], error: "website_id is required." };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("website_pages")
        .select("*")
        .eq("website_id", websiteId)
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn("Supabase getWebsitePages note:", error);
      } else if (data && data.length > 0) {
        return { pages: data as WebsitePage[] };
      }
    } catch (err) {
      console.warn("Supabase connection error in getWebsitePages:", err);
    }
  }

  // Fallback to cached pages
  try {
    const cached = localStorage.getItem(`${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`);
    if (cached) {
      return { pages: JSON.parse(cached) };
    }
  } catch {
    // Non-fatal
  }

  return { pages: [] };
}

/**
 * Idempotently initializes the school website and default pages.
 * Reuses existing school profile information.
 */
export async function initializeSchoolWebsite({
  school,
  userId,
  userRole = "school_admin",
}: {
  school: School;
  userId?: string;
  userRole?: string;
}): Promise<{
  website: SchoolWebsite | null;
  pages: WebsitePage[];
  isNew: boolean;
  error?: string;
}> {
  if (!school || !school.id) {
    return {
      website: null,
      pages: [],
      isNew: false,
      error: "Valid school object is required for initialization.",
    };
  }

  // Role authorization guard: Teachers, Accountants, Parents cannot configure website
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return {
      website: null,
      pages: [],
      isNew: false,
      error: `Unauthorized: User role '${userRole}' cannot modify school website settings.`,
    };
  }

  // 1. Check if website already exists (Idempotency check)
  const existing = await getSchoolWebsite(school.id);
  if (existing.website) {
    const pages = existing.website.pages || [];
    return {
      website: existing.website,
      pages,
      isNew: false,
    };
  }

  const now = new Date().toISOString();
  const websiteId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `site-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Construct initial website configuration deriving from School Profile
  const initialWebsite: SchoolWebsite = {
    id: websiteId,
    school_id: school.id,
    site_name: school.name || "Our School",
    tagline: "Empowering Students for Academic Excellence & Moral Leadership",
    logo_url: school.logo_url || null,
    favicon_url: null,
    primary_color: "#2158E0",
    secondary_color: "#141A2E",
    accent_color: "#10B981",
    subdomain: school.subdomain,
    custom_domain: null,
    contact_email: school.official_email || null,
    contact_phone: school.contact_phone || null,
    address: school.address || null,
    city: school.city || null,
    state: school.state || null,
    postal_code: school.pin_code || null,
    about_text: `${school.name} is a premier educational institution committed to holistic student development, scholarly inquiry, and character building in a supportive, modern learning environment.`,
    admission_enabled: true,
    parent_portal_enabled: true,
    published: false, // Starts as draft/unpublished
    created_at: now,
    updated_at: now,
  };

  // Construct default 5 pages
  const initialPages: WebsitePage[] = DEFAULT_WEBSITE_PAGES.map((def) => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `page-${def.slug}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    school_id: school.id,
    website_id: websiteId,
    slug: def.slug,
    title: def.title,
    page_type: def.page_type,
    content: {
      description: def.description,
      sections: [],
    },
    is_enabled: true,
    sort_order: def.sort_order,
    created_at: now,
    updated_at: now,
  }));

  initialWebsite.pages = initialPages;

  // 2. Persist to Supabase if configured
  if (isSupabaseConfigured) {
    try {
      // Insert school_website
      const { data: insertedWebsite, error: insertWebErr } = await supabase
        .from("school_websites")
        .upsert(
          {
            id: initialWebsite.id,
            school_id: initialWebsite.school_id,
            site_name: initialWebsite.site_name,
            tagline: initialWebsite.tagline,
            logo_url: initialWebsite.logo_url,
            favicon_url: initialWebsite.favicon_url,
            primary_color: initialWebsite.primary_color,
            secondary_color: initialWebsite.secondary_color,
            accent_color: initialWebsite.accent_color,
            subdomain: initialWebsite.subdomain,
            custom_domain: initialWebsite.custom_domain,
            contact_email: initialWebsite.contact_email,
            contact_phone: initialWebsite.contact_phone,
            address: initialWebsite.address,
            city: initialWebsite.city,
            state: initialWebsite.state,
            postal_code: initialWebsite.postal_code,
            about_text: initialWebsite.about_text,
            admission_enabled: initialWebsite.admission_enabled,
            parent_portal_enabled: initialWebsite.parent_portal_enabled,
            published: initialWebsite.published,
            created_at: now,
            updated_at: now,
          },
          { onConflict: "school_id" }
        )
        .select()
        .single();

      if (insertWebErr) {
        console.warn("Supabase school_websites insert warning:", insertWebErr);
      } else if (insertedWebsite) {
        initialWebsite.id = insertedWebsite.id;
        initialPages.forEach((p) => (p.website_id = insertedWebsite.id));
      }

      // Insert default pages
      const { error: insertPagesErr } = await supabase
        .from("website_pages")
        .upsert(
          initialPages.map((p) => ({
            id: p.id,
            school_id: p.school_id,
            website_id: initialWebsite.id,
            slug: p.slug,
            title: p.title,
            page_type: p.page_type,
            content: p.content,
            is_enabled: p.is_enabled,
            sort_order: p.sort_order,
            created_at: now,
            updated_at: now,
          })),
          { onConflict: "website_id,slug" }
        );

      if (insertPagesErr) {
        console.warn("Supabase website_pages insert warning:", insertPagesErr);
      }
    } catch (err) {
      console.warn("Supabase transaction note in initializeSchoolWebsite:", err);
    }
  }

  // 3. Persist to localStorage
  try {
    localStorage.setItem(
      `${WEBSITE_CACHE_KEY_PREFIX}${school.id}`,
      JSON.stringify(initialWebsite)
    );
    localStorage.setItem(
      `${WEBSITE_PAGES_CACHE_KEY_PREFIX}${initialWebsite.id}`,
      JSON.stringify(initialPages)
    );
  } catch {
    // Non-fatal
  }

  return {
    website: initialWebsite,
    pages: initialPages,
    isNew: true,
  };
}

/**
 * Update school website settings
 */
export async function updateSchoolWebsite({
  schoolId,
  websiteId,
  input,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  input: Partial<WebsiteSettingsInput>;
  userRole?: string;
}): Promise<{ success: boolean; website?: SchoolWebsite; error?: string }> {
  if (!schoolId || !websiteId) {
    return { success: false, error: "schoolId and websiteId are required." };
  }

  // Role authorization guard
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return {
      success: false,
      error: `Unauthorized: Role '${userRole}' cannot update school website settings.`,
    };
  }

  // Validations
  if (input.site_name !== undefined && !input.site_name.trim()) {
    return { success: false, error: "Website display name cannot be empty." };
  }
  if (input.primary_color && !isValidHexColor(input.primary_color)) {
    return { success: false, error: "Primary color must be a valid hex code (e.g. #2158E0)." };
  }
  if (input.secondary_color && !isValidHexColor(input.secondary_color)) {
    return { success: false, error: "Secondary color must be a valid hex code (e.g. #141A2E)." };
  }
  if (input.accent_color && !isValidHexColor(input.accent_color)) {
    return { success: false, error: "Accent color must be a valid hex code (e.g. #10B981)." };
  }
  if (input.contact_email && !isValidEmail(input.contact_email)) {
    return { success: false, error: "Please provide a valid contact email address." };
  }

  const now = new Date().toISOString();

  // Load existing
  const existingRes = await getSchoolWebsite(schoolId);
  if (!existingRes.website) {
    return { success: false, error: "School website record not found." };
  }

  const updatedWebsite: SchoolWebsite = {
    ...existingRes.website,
    ...input,
    updated_at: now,
  };

  // 1. Supabase update
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("school_websites")
        .update({
          site_name: updatedWebsite.site_name,
          tagline: updatedWebsite.tagline,
          logo_url: updatedWebsite.logo_url,
          favicon_url: updatedWebsite.favicon_url,
          primary_color: updatedWebsite.primary_color,
          secondary_color: updatedWebsite.secondary_color,
          accent_color: updatedWebsite.accent_color,
          custom_domain: updatedWebsite.custom_domain,
          contact_email: updatedWebsite.contact_email,
          contact_phone: updatedWebsite.contact_phone,
          address: updatedWebsite.address,
          city: updatedWebsite.city,
          state: updatedWebsite.state,
          postal_code: updatedWebsite.postal_code,
          about_text: updatedWebsite.about_text,
          admission_enabled: updatedWebsite.admission_enabled,
          parent_portal_enabled: updatedWebsite.parent_portal_enabled,
          published: updatedWebsite.published,
          theme_id: updatedWebsite.theme_id,
          header_style: updatedWebsite.header_style,
          footer_style: updatedWebsite.footer_style,
          font_family: updatedWebsite.font_family,
          seo_title: updatedWebsite.seo_title,
          seo_description: updatedWebsite.seo_description,
          og_image_url: updatedWebsite.og_image_url,
          allow_indexing: updatedWebsite.allow_indexing,
          custom_domain_status: updatedWebsite.custom_domain_status,
          last_published_at: updatedWebsite.last_published_at,
          updated_at: now,
        })
        .eq("id", websiteId)
        .eq("school_id", schoolId); // Tenant isolation guard

      if (error) {
        console.warn("Supabase updateSchoolWebsite error:", error);
      }
    } catch (err) {
      console.warn("Supabase connection note in updateSchoolWebsite:", err);
    }
  }

  // 2. Local storage update
  try {
    localStorage.setItem(
      `${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`,
      JSON.stringify(updatedWebsite)
    );
  } catch {
    // Non-fatal
  }

  return { success: true, website: updatedWebsite };
}

/**
 * Add a new page to the school website
 */
export async function createWebsitePage({
  schoolId,
  websiteId,
  slug,
  title,
  pageType = "custom",
  content = {},
  isEnabled = true,
  sortOrder,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  slug: string;
  title: string;
  pageType?: string;
  content?: Record<string, unknown>;
  isEnabled?: boolean;
  sortOrder?: number;
  userRole?: string;
}): Promise<{ success: boolean; page?: WebsitePage; error?: string }> {
  if (!schoolId || !websiteId) {
    return { success: false, error: "schoolId and websiteId are required." };
  }

  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: `Unauthorized: Role '${userRole}' cannot create pages.` };
  }

  const cleanSlug = normalizePageSlug(slug);
  if (!cleanSlug) {
    return { success: false, error: "Valid page slug is required." };
  }

  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return { success: false, error: "Page title is required." };
  }

  // Check duplicate slug in this website
  const { pages: existingPages } = await getWebsitePages(websiteId);
  if (existingPages.some((p) => p.slug.toLowerCase() === cleanSlug.toLowerCase())) {
    return {
      success: false,
      error: `A page with URL slug '/${cleanSlug}' already exists on your website.`,
    };
  }

  const newOrder = sortOrder !== undefined ? sortOrder : existingPages.length + 1;
  const now = new Date().toISOString();

  const newPage: WebsitePage = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `page-${cleanSlug}-${Date.now()}`,
    school_id: schoolId,
    website_id: websiteId,
    slug: cleanSlug,
    title: cleanTitle,
    page_type: pageType,
    content,
    is_enabled: isEnabled,
    sort_order: newOrder,
    created_at: now,
    updated_at: now,
  };

  const updatedPages = [...existingPages, newPage].sort((a, b) => a.sort_order - b.sort_order);

  // Supabase insert
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("website_pages")
        .insert({
          id: newPage.id,
          school_id: schoolId,
          website_id: websiteId,
          slug: newPage.slug,
          title: newPage.title,
          page_type: newPage.page_type,
          content: newPage.content,
          is_enabled: newPage.is_enabled,
          sort_order: newPage.sort_order,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.warn("Supabase createWebsitePage note:", error.message);
      } else if (data) {
        newPage.id = data.id;
      }
    } catch (err) {
      console.warn("Supabase createWebsitePage error:", err);
    }
  }

  // Update local cache
  try {
    localStorage.setItem(
      `${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`,
      JSON.stringify(updatedPages)
    );

    // Also update parent website cache if present
    const cachedWebsite = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cachedWebsite) {
      const parsed = JSON.parse(cachedWebsite);
      parsed.pages = updatedPages;
      localStorage.setItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
    }
  } catch {
    // Non-fatal
  }

  return { success: true, page: newPage };
}

/**
 * Toggle whether a page is active and visible on the website
 */
export async function toggleWebsitePage({
  schoolId,
  websiteId,
  pageId,
  isEnabled,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  pageId: string;
  isEnabled: boolean;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized." };
  }

  const { pages } = await getWebsitePages(websiteId);
  const target = pages.find((p) => p.id === pageId);
  if (!target) {
    return { success: false, error: "Page not found." };
  }

  // Prevent disabling the Home page
  if (target.slug === "home" && !isEnabled) {
    return { success: false, error: "The Home page cannot be disabled as it is your site landing page." };
  }

  target.is_enabled = isEnabled;
  target.updated_at = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("website_pages")
        .update({ is_enabled: isEnabled, updated_at: target.updated_at })
        .eq("id", pageId)
        .eq("school_id", schoolId);
    } catch (err) {
      console.warn("Supabase toggleWebsitePage error:", err);
    }
  }

  try {
    localStorage.setItem(`${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`, JSON.stringify(pages));
    const cachedWebsite = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cachedWebsite) {
      const parsed = JSON.parse(cachedWebsite);
      parsed.pages = pages;
      localStorage.setItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Updates an existing website page's title, slug, content or settings
 */
export async function updateWebsitePage({
  schoolId,
  websiteId,
  pageId,
  title,
  slug,
  content,
  isEnabled,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  pageId: string;
  title?: string;
  slug?: string;
  content?: Record<string, unknown>;
  isEnabled?: boolean;
  userRole?: string;
}): Promise<{ success: boolean; page?: WebsitePage; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  const { pages } = await getWebsitePages(websiteId);
  const target = pages.find((p) => p.id === pageId);
  if (!target) {
    return { success: false, error: "Page not found." };
  }

  if (slug) {
    const cleanSlug = normalizePageSlug(slug);
    if (!cleanSlug) {
      return { success: false, error: "Invalid page slug provided." };
    }
    // Prevent changing slug of Home page
    if (target.slug === "home" && cleanSlug !== "home") {
      return { success: false, error: "The Home page slug cannot be changed." };
    }
    // Check if new slug conflicts with another page
    const conflict = pages.find(
      (p) => p.id !== pageId && p.slug.toLowerCase() === cleanSlug.toLowerCase()
    );
    if (conflict) {
      return { success: false, error: `A page with URL slug '/${cleanSlug}' already exists.` };
    }
    target.slug = cleanSlug;
  }

  if (title !== undefined) {
    if (!title.trim()) {
      return { success: false, error: "Page title cannot be empty." };
    }
    target.title = title.trim();
  }

  if (content !== undefined) {
    target.content = content;
  }

  if (isEnabled !== undefined) {
    if (target.slug === "home" && !isEnabled) {
      return { success: false, error: "The Home page cannot be disabled." };
    }
    target.is_enabled = isEnabled;
  }

  target.updated_at = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("website_pages")
        .update({
          title: target.title,
          slug: target.slug,
          content: target.content,
          is_enabled: target.is_enabled,
          updated_at: target.updated_at,
        })
        .eq("id", pageId)
        .eq("school_id", schoolId);
    } catch (err) {
      console.warn("Supabase updateWebsitePage error:", err);
    }
  }

  try {
    localStorage.setItem(`${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`, JSON.stringify(pages));
    const cachedWebsite = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cachedWebsite) {
      const parsed = JSON.parse(cachedWebsite);
      parsed.pages = pages;
      localStorage.setItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
    }
  } catch {
    // Non-fatal
  }

  return { success: true, page: target };
}

/**
 * Deletes a custom website page.
 * Guards system default pages from deletion.
 */
export async function deleteWebsitePage({
  schoolId,
  websiteId,
  pageId,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  pageId: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  const { pages } = await getWebsitePages(websiteId);
  const target = pages.find((p) => p.id === pageId);
  if (!target) {
    return { success: false, error: "Page not found." };
  }

  const SYSTEM_PAGES = ["home", "about", "academics", "admissions", "contact"];
  if (SYSTEM_PAGES.includes(target.slug.toLowerCase())) {
    return {
      success: false,
      error: `Cannot delete standard system page '${target.title}'. You may disable its visibility instead.`,
    };
  }

  const filteredPages = pages.filter((p) => p.id !== pageId);

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("website_pages")
        .delete()
        .eq("id", pageId)
        .eq("school_id", schoolId);
      if (error) {
        console.warn("Supabase deleteWebsitePage error:", error);
      }
    } catch (err) {
      console.warn("Supabase deleteWebsitePage exception:", err);
    }
  }

  try {
    localStorage.setItem(`${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`, JSON.stringify(filteredPages));
    const cachedWebsite = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cachedWebsite) {
      const parsed = JSON.parse(cachedWebsite);
      parsed.pages = filteredPages;
      localStorage.setItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Reorders website pages based on an ordered array of page IDs
 */
export async function reorderWebsitePages({
  schoolId,
  websiteId,
  orderedPageIds,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  orderedPageIds: string[];
  userRole?: string;
}): Promise<{ success: boolean; pages?: WebsitePage[]; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized." };
  }

  const { pages } = await getWebsitePages(websiteId);
  const now = new Date().toISOString();

  const reordered = orderedPageIds
    .map((id, index) => {
      const found = pages.find((p) => p.id === id);
      if (!found) return null;
      return {
        ...found,
        sort_order: index + 1,
        updated_at: now,
      };
    })
    .filter(Boolean) as WebsitePage[];

  if (isSupabaseConfigured) {
    try {
      for await (const page of reordered) {
        await supabase
          .from("website_pages")
          .update({ sort_order: page.sort_order, updated_at: now })
          .eq("id", page.id)
          .eq("school_id", schoolId);
      }
    } catch (err) {
      console.warn("Supabase reorderWebsitePages error:", err);
    }
  }

  try {
    localStorage.setItem(
      `${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`,
      JSON.stringify(reordered)
    );
    const cachedWebsite = localStorage.getItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`);
    if (cachedWebsite) {
      const parsed = JSON.parse(cachedWebsite);
      parsed.pages = reordered;
      localStorage.setItem(`${WEBSITE_CACHE_KEY_PREFIX}${schoolId}`, JSON.stringify(parsed));
    }
  } catch {
    // Non-fatal
  }

  return { success: true, pages: reordered };
}

/**
 * Toggle website publication status
 */
export async function publishWebsite({
  schoolId,
  websiteId,
  published,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  published: boolean;
  userRole?: string;
}): Promise<{ success: boolean; website?: SchoolWebsite; error?: string }> {
  return updateSchoolWebsite({
    schoolId,
    websiteId,
    input: {
      published,
      ...(published ? { last_published_at: new Date().toISOString() } : {}),
    },
    userRole,
  });
}

/**
 * Advances the school onboarding step to Step 7 (/onboarding/staff)
 * using the non-regression principle (Math.max(currentStep, 7)).
 */
export async function saveWebsiteSetupProgress({
  schoolId,
  userId,
  preserveAdminSession = false,
}: {
  schoolId: string;
  userId: string;
  preserveAdminSession?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !userId) {
    return {
      success: false,
      error: "school_id and user_id are required to update onboarding progress.",
    };
  }

  const timestamp = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { data: currentSchool } = await supabase
        .from("schools")
        .select("onboarding_step")
        .eq("id", schoolId)
        .maybeSingle();

      const currentStep = currentSchool?.onboarding_step || 5;
      const newStep = Math.max(currentStep, 6);

      const schoolUpdate = {
        onboarding_step: newStep,
        updated_at: timestamp,
      };
      await supabase
        .from("schools")
        .update(schoolUpdate)
        .eq("id", schoolId);

      if (!preserveAdminSession) {
        const profileUpdate = {
          current_onboarding_step: "/onboarding/complete",
          updated_at: timestamp,
        };
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("auth_id", userId);

        await supabase.auth.updateUser({
          data: {
            onboarding_step: newStep,
            current_onboarding_step: "/onboarding/complete",
          },
        });
      }
    } catch (err) {
      console.warn("Supabase onboarding progress update error:", err);
    }
  }

  // Local storage update with non-regression
  updateCachedSchoolOnboardingStep(userId, schoolId, 6);

  return { success: true };
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Uploads a school image asset to Supabase Storage (bucket: 'school-assets')
 * with graceful fallback to secure client object URL.
 */
export async function uploadWebsiteAsset({
  schoolId,
  file,
  category = "general",
}: {
  schoolId: string;
  file: File;
  category?: "logo" | "hero" | "principal" | "gallery" | "facilities" | "general" | string;
}): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!schoolId) {
    return { success: false, error: "school_id is required for asset uploads." };
  }
  if (!file) {
    return { success: false, error: "No file was selected for upload." };
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      success: false,
      error: `Invalid file format (${file.type}). Allowed formats: JPG, JPEG, PNG, WebP.`,
    };
  }
  if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      error: `File size (${sizeInMb}MB) exceeds the 5MB maximum limit.`,
    };
  }

  const ext = file.name.split(".").pop() || "png";
  const sanitizedName = file.name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .substring(0, 30);
  const filePath = `${schoolId}/${category}/${Date.now()}_${sanitizedName}.${ext}`;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.storage
        .from("school-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.warn("Supabase storage upload error:", error);
      } else if (data) {
        const { data: publicUrlData } = supabase.storage
          .from("school-assets")
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          const finalUrl = publicUrlData.publicUrl;
          try {
            await supabase.from("website_media").insert({
              school_id: schoolId,
              file_name: file.name,
              file_url: finalUrl,
              file_size: file.size,
              mime_type: file.type,
              category: category,
            });
          } catch (mediaErr) {
            console.warn("website_media insert note:", mediaErr);
          }
          return { success: true, url: finalUrl };
        }
      }
    } catch (err) {
      console.warn("Storage upload exception:", err);
    }
  }

  // Graceful client preview fallback using base64 Data URL to prevent object URL memory leak
  return new Promise<{ success: boolean; url?: string; error?: string }>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      try {
        const key = `myzkool_media_${schoolId}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        existing.unshift({
          id: `media-${Date.now()}`,
          school_id: schoolId,
          file_name: file.name,
          file_url: dataUrl,
          file_size: file.size,
          mime_type: file.type,
          category: category,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {
        // Non-fatal
      }
      resolve({ success: true, url: dataUrl });
    };
    reader.onerror = () => {
      resolve({ success: false, error: "Failed to read image preview." });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Constructs realistic, authentic default content for a school home page
 */
export function getDefaultHomePageContent(school?: Partial<School>): HomePageContent {
  const schoolName = school?.name || "Our School";
  return {
    hero: {
      headline: `Welcome to ${schoolName}`,
      description: `Committed to academic rigor, character development, and future-ready excellence. Empowering every learner to reach their highest potential.`,
      ctaText: "Apply for Admission",
      backgroundImageUrl: "",
    },
    principal: {
      name: "Principal's Desk",
      title: "Principal & Head of School",
      message: `At ${schoolName}, we foster a dynamic culture of curiosity, moral discipline, and intellectual pursuit. We welcome prospective parents to visit our campus and join our growing family.`,
      photoUrl: "",
    },
    facilities: [
      {
        id: "fac-1",
        title: "Digital Smart Classrooms",
        description: "Interactive display boards and multimedia-enabled learning spaces.",
      },
      {
        id: "fac-2",
        title: "Modern Science & Computer Labs",
        description: "Hands-on physics, chemistry, biology, and digital computing facilities.",
      },
      {
        id: "fac-3",
        title: "Central Library & Resource Hub",
        description: "Vast collection of reference volumes, journals, and quiet reading zones.",
      },
      {
        id: "fac-4",
        title: "Sports Grounds & Play Arena",
        description: "Dedicated athletic track, football field, cricket net, and indoor sports hall.",
      },
    ],
    gallery: [],
    stats: [
      { id: "stat-1", label: "Years of Academic Service", value: "20+" },
      { id: "stat-2", label: "Board Exam Success", value: "100%" },
      { id: "stat-3", label: "Student-Teacher Ratio", value: "20:1" },
      { id: "stat-4", label: "Activity Clubs & Sports", value: "15+" },
    ],
    testimonials: [],
    announcements: [
      {
        id: "ann-1",
        title: "Admissions Open for Academic Year",
        date: "Current Session",
        description: "Online applications and campus enquiry registration are now open.",
      },
      {
        id: "ann-2",
        title: "Annual Sports & Cultural Meet",
        date: "Upcoming",
        description: "Annual celebrations featuring student athletics, arts, and science exhibition.",
      },
    ],
    socialLinks: {
      facebook: "",
      twitter: "",
      instagram: "",
      youtube: "",
      linkedin: "",
    },
    sections: [...DEFAULT_WEBSITE_SECTIONS],
  };
}

/**
 * Loads the structured home page content from website_pages (slug: 'home')
 */
export async function getHomePageContent(
  websiteId: string,
  school?: Partial<School>
): Promise<HomePageContent> {
  const defaults = getDefaultHomePageContent(school);
  if (!websiteId) return defaults;

  const { pages } = await getWebsitePages(websiteId);
  const homePage = pages.find((p) => p.slug === "home");

  if (!homePage || !homePage.content || typeof homePage.content !== "object") {
    return defaults;
  }

  const raw = homePage.content as Record<string, unknown>;

  return {
    hero: (raw.hero as HeroSectionConfig) || defaults.hero,
    principal: (raw.principal as PrincipalSectionConfig) || defaults.principal,
    facilities: Array.isArray(raw.facilities) ? (raw.facilities as FacilityItem[]) : defaults.facilities,
    gallery: Array.isArray(raw.gallery) ? (raw.gallery as GalleryImageItem[]) : defaults.gallery,
    stats: Array.isArray(raw.stats) ? (raw.stats as StatItem[]) : defaults.stats,
    testimonials: Array.isArray(raw.testimonials) ? (raw.testimonials as TestimonialItem[]) : defaults.testimonials,
    announcements: Array.isArray(raw.announcements) ? (raw.announcements as AnnouncementItem[]) : defaults.announcements,
    socialLinks: (raw.socialLinks as SocialLinks) || defaults.socialLinks,
    sections: Array.isArray(raw.sections) ? (raw.sections as WebsiteSectionToggle[]) : defaults.sections,
  };
}

/**
 * Saves the structured home page content to website_pages (slug: 'home')
 */
export async function saveHomePageContent({
  schoolId,
  websiteId,
  content,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId: string;
  content: HomePageContent;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!schoolId || !websiteId) {
    return { success: false, error: "schoolId and websiteId are required." };
  }

  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized." };
  }

  const { pages } = await getWebsitePages(websiteId);
  const homePage = pages.find((p) => p.slug === "home");
  const now = new Date().toISOString();

  const contentJson = content as unknown as Record<string, unknown>;

  if (homePage) {
    homePage.content = contentJson;
    homePage.updated_at = now;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from("website_pages")
          .update({
            content: contentJson,
            updated_at: now,
          })
          .eq("id", homePage.id)
          .eq("school_id", schoolId);
      } catch (err) {
        console.warn("Supabase saveHomePageContent error:", err);
      }
    }
  } else {
    // Create home page if missing
    await createWebsitePage({
      schoolId,
      websiteId,
      slug: "home",
      title: "Home",
      pageType: "home",
      content: contentJson,
      isEnabled: true,
      sortOrder: 1,
      userRole,
    });
  }

  // Update local cache
  try {
    localStorage.setItem(
      `${WEBSITE_PAGES_CACHE_KEY_PREFIX}${websiteId}`,
      JSON.stringify(pages)
    );
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Extracts school subdomain from a browser hostname.
 * 
 * Accurately differentiates between:
 * - The main application domain (e.g. my-zkool.vercel.app, myzkool.in, myzkool.com)
 * - School tenant subdomains (e.g. greenwood.myzkool.in, oakridge.myzkool.com, oakridge.my-zkool.vercel.app)
 * - Preview / dev environments (e.g. *.run.app, *.aistudio.dev, localhost)
 */
export function getSubdomainFromHost(hostname: string): string | null {
  if (!hostname) return null;

  // Normalize: lower-case, remove trailing spaces and port
  const host = hostname.toLowerCase().split(":")[0].trim();
  if (!host || host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") {
    return null;
  }

  // Check against optional configured public base domain (e.g. VITE_PUBLIC_DOMAIN)
  const envBaseDomain =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_DOMAIN
      ? import.meta.env.VITE_PUBLIC_DOMAIN.toLowerCase().split(":")[0].trim()
      : null;

  if (envBaseDomain) {
    if (host === envBaseDomain) return null;
    if (host.endsWith("." + envBaseDomain)) {
      const prefix = host.slice(0, -(envBaseDomain.length + 1));
      const candidate = prefix.split(".")[0];
      if (candidate && !isReservedSubdomain(candidate)) {
        return candidate;
      }
      return null;
    }
  }

  // Handle known PaaS / serverless hosting suffixes where the root app is already 3 parts
  // (e.g. "my-zkool.vercel.app", "my-zkool.netlify.app", "my-zkool.pages.dev")
  const multiLevelPlatforms = [
    "vercel.app",
    "netlify.app",
    "pages.dev",
    "onrender.com",
    "github.io",
    "up.railway.app",
  ];

  for (const platform of multiLevelPlatforms) {
    if (host.endsWith("." + platform)) {
      const platformParts = platform.split(".");
      const hostParts = host.split(".");
      // If hostParts length is exactly platformParts.length + 1:
      // (e.g. "my-zkool.vercel.app" -> 1 + 2 = 3 parts)
      // This is the root app deployment on that platform, NOT a school tenant!
      if (hostParts.length <= platformParts.length + 1) {
        return null;
      }
      // If there are more labels (e.g. "greenwood.my-zkool.vercel.app" -> 4 parts):
      const candidate = hostParts[0];
      if (candidate && !isReservedSubdomain(candidate)) {
        return candidate;
      }
      return null;
    }
  }

  // Ignore Cloud Run and AI Studio container preview hosts (e.g. *.run.app, *.aistudio.dev)
  if (
    host.endsWith(".run.app") ||
    host.endsWith(".aistudio.dev") ||
    host.endsWith(".web.app") ||
    host.endsWith(".firebaseapp.com")
  ) {
    return null;
  }

  const parts = host.split(".");

  // Handle common two-level country code domains (e.g. .co.in, .org.in, .ac.in, .edu.in)
  const twoLevelCcTlds = ["co.in", "org.in", "ac.in", "net.in", "edu.in", "gov.in"];
  const lastTwo = parts.slice(-2).join(".");
  if (twoLevelCcTlds.includes(lastTwo)) {
    // e.g. "myzkool.co.in" (3 parts) -> main apex domain
    if (parts.length <= 3) return null;
    // e.g. "greenwood.myzkool.co.in" (4 parts) -> "greenwood"
    const candidate = parts[0];
    if (candidate && !isReservedSubdomain(candidate)) {
      return candidate;
    }
    return null;
  }

  // Standard apex domains (e.g. "myzkool.com", "myzkool.in", "my-zkool.com") -> 2 parts
  if (parts.length <= 2) {
    return null;
  }

  // Multi-tenant subdomain (e.g. "greenwood.myzkool.com", "delhi-academy.staging.school.edu")
  const candidate = parts[0];
  if (candidate && !isReservedSubdomain(candidate)) {
    return candidate;
  }

  return null;
}

/**
 * Submits an authentic admission enquiry to the database
 */
export async function submitAdmissionEnquiry({
  schoolId,
  parentName,
  phone,
  email,
  classGrade,
  message,
  studentName,
}: {
  schoolId: string;
  parentName: string;
  phone: string;
  email?: string;
  classGrade: string;
  message?: string;
  studentName?: string;
}): Promise<{ success: boolean; enquiryId?: string; error?: string }> {
  if (!schoolId) {
    return { success: false, error: "School ID is required." };
  }
  if (!parentName || !parentName.trim()) {
    return { success: false, error: "Parent's full name is required." };
  }
  if (!phone || !phone.trim()) {
    return { success: false, error: "Contact phone number is required." };
  }
  if (!classGrade || !classGrade.trim()) {
    return { success: false, error: "Please select the seeking class / grade." };
  }

  const now = new Date().toISOString();
  const generatedId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `enq-${Date.now()}`;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("admission_enquiries")
        .insert({
          id: generatedId,
          school_id: schoolId,
          student_name: studentName?.trim() || null,
          parent_name: parentName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          class_grade: classGrade.trim(),
          message: message?.trim() || null,
          status: "new",
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.warn("Supabase admission_enquiries insert warning:", error);
        return { success: false, error: error.message };
      }

      return { success: true, enquiryId: data?.id || generatedId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      return { success: false, error: msg };
    }
  }

  // Local storage fallback for offline/test environments
  try {
    const key = `myzkool_enquiries_${schoolId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({
      id: generatedId,
      school_id: schoolId,
      student_name: studentName?.trim() || null,
      parent_name: parentName.trim(),
      phone: phone.trim(),
      email: email?.trim() || null,
      class_grade: classGrade.trim(),
      message: message?.trim() || null,
      status: "new",
      created_at: now,
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    // Non-fatal
  }

  return { success: true, enquiryId: generatedId };
}

/**
 * Fetch admission enquiries for a school with search, status & date filtering
 */
export async function getAdmissionEnquiries({
  schoolId,
  status,
  searchTerm,
  dateRange,
}: {
  schoolId: string;
  status?: string;
  searchTerm?: string;
  dateRange?: { start?: string; end?: string };
}): Promise<{ enquiries: AdmissionEnquiry[]; error?: string }> {
  if (!schoolId) {
    return { enquiries: [], error: "school_id is required." };
  }

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("admission_enquiries")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      if (dateRange?.start) {
        query = query.gte("created_at", dateRange.start);
      }
      if (dateRange?.end) {
        query = query.lte("created_at", dateRange.end);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase getAdmissionEnquiries error:", error);
      } else if (data) {
        let results = data as AdmissionEnquiry[];
        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          results = results.filter(
            (e) =>
              (e.parent_name && e.parent_name.toLowerCase().includes(term)) ||
              (e.student_name && e.student_name.toLowerCase().includes(term)) ||
              (e.phone && e.phone.toLowerCase().includes(term)) ||
              (e.email && e.email.toLowerCase().includes(term)) ||
              (e.class_grade && e.class_grade.toLowerCase().includes(term))
          );
        }
        return { enquiries: results };
      }
    } catch (err) {
      console.warn("Supabase connection error in getAdmissionEnquiries:", err);
    }
  }

  // Local storage fallback
  try {
    const key = `myzkool_enquiries_${schoolId}`;
    let list: AdmissionEnquiry[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (status && status !== "all") {
      list = list.filter((e) => e.status === status);
    }
    if (dateRange?.start) {
      list = list.filter((e) => e.created_at >= dateRange.start!);
    }
    if (dateRange?.end) {
      list = list.filter((e) => e.created_at <= dateRange.end!);
    }
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.parent_name && e.parent_name.toLowerCase().includes(term)) ||
          (e.student_name && e.student_name.toLowerCase().includes(term)) ||
          (e.phone && e.phone.toLowerCase().includes(term)) ||
          (e.email && e.email.toLowerCase().includes(term)) ||
          (e.class_grade && e.class_grade.toLowerCase().includes(term))
      );
    }
    return { enquiries: list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)) };
  } catch {
    return { enquiries: [] };
  }
}

/**
 * Update admission enquiry status and optional internal notes
 */
export async function updateAdmissionEnquiryStatus({
  schoolId,
  enquiryId,
  status,
  notes,
  userRole = "school_admin",
}: {
  schoolId: string;
  enquiryId: string;
  status: AdmissionEnquiryStatus;
  notes?: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
  };
  if (notes !== undefined) {
    updatePayload.internal_notes = notes;
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("admission_enquiries")
        .update(updatePayload)
        .eq("id", enquiryId)
        .eq("school_id", schoolId);

      if (error) {
        console.warn("Supabase updateAdmissionEnquiryStatus error:", error);
      }
    } catch (err) {
      console.warn("Supabase updateAdmissionEnquiryStatus exception:", err);
    }
  }

  // Local storage fallback
  try {
    const key = `myzkool_enquiries_${schoolId}`;
    const list: AdmissionEnquiry[] = JSON.parse(localStorage.getItem(key) || "[]");
    const item = list.find((e) => e.id === enquiryId);
    if (item) {
      item.status = status;
      if (notes !== undefined) item.internal_notes = notes;
      item.updated_at = now;
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Fetch website posts (News, Notices, Events, Announcements)
 */
export async function getWebsitePosts({
  schoolId,
  category,
  isPublishedOnly = false,
}: {
  schoolId: string;
  category?: string;
  isPublishedOnly?: boolean;
}): Promise<{ posts: WebsitePost[]; error?: string }> {
  if (!schoolId) {
    return { posts: [], error: "school_id is required." };
  }

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("website_posts")
        .select("*")
        .eq("school_id", schoolId)
        .order("publication_date", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }
      if (isPublishedOnly) {
        query = query.eq("is_published", true).lte("publication_date", new Date().toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase getWebsitePosts error:", error);
      } else if (data) {
        return { posts: data as WebsitePost[] };
      }
    } catch (err) {
      console.warn("Supabase connection error in getWebsitePosts:", err);
    }
  }

  // Local storage fallback
  try {
    const key = `myzkool_posts_${schoolId}`;
    let list: WebsitePost[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (category && category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    if (isPublishedOnly) {
      const now = new Date().toISOString();
      list = list.filter((p) => p.is_published && p.publication_date <= now);
    }
    return { posts: list };
  } catch {
    return { posts: [] };
  }
}

/**
 * Create a new website post (News, Notice, Event)
 */
export async function createWebsitePost({
  schoolId,
  websiteId,
  post,
  userRole = "school_admin",
}: {
  schoolId: string;
  websiteId?: string;
  post: Partial<WebsitePost>;
  userRole?: string;
}): Promise<{ success: boolean; post?: WebsitePost; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }
  if (!post.title || !post.title.trim()) {
    return { success: false, error: "Post title is required." };
  }

  const now = new Date().toISOString();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `post-${Date.now()}`;
  const isPublished =
    post.is_published !== undefined
      ? Boolean(post.is_published)
      : post.status === "draft"
      ? false
      : true;
  const status = post.status || (isPublished ? "published" : "draft");

  const newPost: WebsitePost = {
    id,
    school_id: schoolId,
    website_id: websiteId || null,
    title: post.title.trim(),
    description: post.description || "",
    category: post.category || "announcement",
    featured_image: post.featured_image || null,
    event_date: post.event_date || null,
    publication_date: post.publication_date || now,
    is_published: isPublished,
    status,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("website_posts")
        .insert(newPost)
        .select()
        .single();
      if (error) {
        console.warn("Supabase createWebsitePost warning:", error);
      } else if (data) {
        newPost.id = data.id;
      }
    } catch (err) {
      console.warn("Supabase createWebsitePost error:", err);
    }
  }

  try {
    const key = `myzkool_posts_${schoolId}`;
    const list: WebsitePost[] = JSON.parse(localStorage.getItem(key) || "[]");
    list.unshift(newPost);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Non-fatal
  }

  return { success: true, post: newPost };
}

/**
 * Update an existing website post
 */
export async function updateWebsitePost({
  schoolId,
  postId,
  post,
  userRole = "school_admin",
}: {
  schoolId: string;
  postId: string;
  post: Partial<WebsitePost>;
  userRole?: string;
}): Promise<{ success: boolean; post?: WebsitePost; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  const now = new Date().toISOString();
  const isPublished =
    post.is_published !== undefined
      ? Boolean(post.is_published)
      : post.status === "draft"
      ? false
      : post.status === "published"
      ? true
      : undefined;

  const updatePayload = {
    ...post,
    ...(isPublished !== undefined ? { is_published: isPublished } : {}),
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("website_posts")
        .update(updatePayload)
        .eq("id", postId)
        .eq("school_id", schoolId);
      if (error) {
        console.warn("Supabase updateWebsitePost error:", error);
      }
    } catch (err) {
      console.warn("Supabase updateWebsitePost exception:", err);
    }
  }

  let updatedRecord: WebsitePost | undefined;
  try {
    const key = `myzkool_posts_${schoolId}`;
    const list: WebsitePost[] = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = list.findIndex((p) => p.id === postId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatePayload };
      updatedRecord = list[idx];
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    // Non-fatal
  }

  return { success: true, post: updatedRecord };
}

/**
 * Delete a website post
 */
export async function deleteWebsitePost({
  schoolId,
  postId,
  userRole = "school_admin",
}: {
  schoolId: string;
  postId: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("website_posts")
        .delete()
        .eq("id", postId)
        .eq("school_id", schoolId);
      if (error) {
        console.warn("Supabase deleteWebsitePost error:", error);
      }
    } catch (err) {
      console.warn("Supabase deleteWebsitePost exception:", err);
    }
  }

  try {
    const key = `myzkool_posts_${schoolId}`;
    const list: WebsitePost[] = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = list.filter((p) => p.id !== postId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Fetch uploaded media assets for a school
 */
export async function getWebsiteMedia({
  schoolId,
  category,
}: {
  schoolId: string;
  category?: string;
}): Promise<{ media: WebsiteMediaItem[]; error?: string }> {
  if (!schoolId) {
    return { media: [], error: "school_id is required." };
  }

  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("website_media")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) {
        console.warn("Supabase getWebsiteMedia error:", error);
      } else if (data) {
        return { media: data as WebsiteMediaItem[] };
      }
    } catch (err) {
      console.warn("Supabase connection error in getWebsiteMedia:", err);
    }
  }

  // Local storage fallback
  try {
    const key = `myzkool_media_${schoolId}`;
    let list: WebsiteMediaItem[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (category && category !== "all") {
      list = list.filter((m) => m.category === category);
    }
    return { media: list };
  } catch {
    return { media: [] };
  }
}

/**
 * Delete a media item from website media
 */
export async function deleteWebsiteMedia({
  schoolId,
  mediaId,
  userRole = "school_admin",
}: {
  schoolId: string;
  mediaId: string;
  userRole?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (userRole && !["school_admin", "super_admin"].includes(userRole)) {
    return { success: false, error: "Unauthorized: Insufficient permissions." };
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("website_media")
        .delete()
        .eq("id", mediaId)
        .eq("school_id", schoolId);
      if (error) {
        console.warn("Supabase deleteWebsiteMedia error:", error);
      }
    } catch (err) {
      console.warn("Supabase deleteWebsiteMedia exception:", err);
    }
  }

  try {
    const key = `myzkool_media_${schoolId}`;
    const list: WebsiteMediaItem[] = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = list.filter((m) => m.id !== mediaId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Logs an authentic visitor analytics event for the school public website.
 * Skips tracking when is_preview is true or if browser doNotTrack is set.
 */
export async function logWebsiteAnalyticsEvent(
  event: WebsiteAnalyticsEvent
): Promise<{ success: boolean }> {
  if (!event.school_id) return { success: false };
  if (event.is_preview) return { success: true }; // Exclude preview traffic per PRD

  const schoolId = event.school_id;
  const now = new Date().toISOString();

  // Basic device category detection
  let detectedDevice = event.device_type || "desktop";
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(ua)) detectedDevice = "tablet";
    else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) detectedDevice = "mobile";
  }

  const payload: WebsiteAnalyticsEvent = {
    school_id: schoolId,
    website_id: event.website_id || null,
    page_path: event.page_path || "/",
    visitor_hash: event.visitor_hash || `v_${Math.random().toString(36).substring(2, 10)}`,
    referrer: event.referrer || (typeof document !== "undefined" ? document.referrer : null) || null,
    device_type: detectedDevice,
    browser: event.browser || (typeof navigator !== "undefined" ? navigator.userAgent.substring(0, 80) : null),
    is_preview: false,
    created_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from("website_analytics_events").insert(payload);
      return { success: true };
    } catch (err) {
      console.warn("Analytics logging exception:", err);
    }
  }

  try {
    const key = `myzkool_analytics_${schoolId}`;
    const list: WebsiteAnalyticsEvent[] = JSON.parse(localStorage.getItem(key) || "[]");
    list.push(payload);
    if (list.length > 500) list.shift(); // Prevent storage overflow
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Non-fatal
  }

  return { success: true };
}

/**
 * Computes authentic website analytics metrics for the requested period.
 * Strictly uses real recorded events and does NOT fabricate metrics.
 */
export async function getWebsiteAnalyticsSummary({
  schoolId,
  period = "7d",
  customStart,
  customEnd,
}: {
  schoolId: string;
  period?: "today" | "7d" | "30d" | "90d" | "custom";
  customStart?: string;
  customEnd?: string;
}): Promise<{ summary: WebsiteAnalyticsSummary; error?: string }> {
  if (!schoolId) {
    return {
      summary: {
        totalVisitors: 0,
        uniqueVisitors: 0,
        totalPageViews: 0,
        viewsByPage: [],
        trafficTrends: [],
        deviceBreakdown: [],
        referrers: [],
        hasData: false,
      },
      error: "school_id is required.",
    };
  }

  // Calculate cutoff timestamp
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  if (period === "today") {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "7d") {
    startDate.setDate(now.getDate() - 7);
  } else if (period === "30d") {
    startDate.setDate(now.getDate() - 30);
  } else if (period === "90d") {
    startDate.setDate(now.getDate() - 90);
  } else if (period === "custom") {
    if (customStart) startDate = new Date(customStart);
    if (customEnd) endDate = new Date(customEnd);
  }

  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  let rawEvents: WebsiteAnalyticsEvent[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("website_analytics_events")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_preview", false)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Supabase analytics query note:", error);
      } else if (data) {
        rawEvents = data as WebsiteAnalyticsEvent[];
      }
    } catch (err) {
      console.warn("Analytics fetch error:", err);
    }
  }

  // Fallback to local storage if Supabase returned nothing or offline
  if (rawEvents.length === 0) {
    try {
      const key = `myzkool_analytics_${schoolId}`;
      const localList: WebsiteAnalyticsEvent[] = JSON.parse(localStorage.getItem(key) || "[]");
      rawEvents = localList.filter(
        (e) => !e.is_preview && e.created_at && e.created_at >= startIso && e.created_at <= endIso
      );
    } catch {
      // Non-fatal
    }
  }

  if (rawEvents.length === 0) {
    return {
      summary: {
        totalVisitors: 0,
        uniqueVisitors: 0,
        totalPageViews: 0,
        viewsByPage: [],
        trafficTrends: [],
        deviceBreakdown: [],
        referrers: [],
        hasData: false,
      },
    };
  }

  const totalPageViews = rawEvents.length;
  const uniqueVisitorHashes = new Set<string>();
  const pageViewMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();
  const dateMap = new Map<string, { visitors: Set<string>; pageViews: number }>();

  for (const ev of rawEvents) {
    if (ev.visitor_hash) uniqueVisitorHashes.add(ev.visitor_hash);

    // Page views
    const path = ev.page_path || "/";
    pageViewMap.set(path, (pageViewMap.get(path) || 0) + 1);

    // Device
    const dev = (ev.device_type || "desktop").toLowerCase();
    deviceMap.set(dev, (deviceMap.get(dev) || 0) + 1);

    // Referrer
    if (ev.referrer) {
      try {
        const urlObj = new URL(ev.referrer);
        const host = urlObj.hostname || "Direct";
        referrerMap.set(host, (referrerMap.get(host) || 0) + 1);
      } catch {
        referrerMap.set(ev.referrer, (referrerMap.get(ev.referrer) || 0) + 1);
      }
    } else {
      referrerMap.set("Direct / None", (referrerMap.get("Direct / None") || 0) + 1);
    }

    // Daily trend
    const dateKey = ev.created_at ? ev.created_at.split("T")[0] : "Today";
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { visitors: new Set(), pageViews: 0 });
    }
    const currentDay = dateMap.get(dateKey)!;
    currentDay.pageViews += 1;
    if (ev.visitor_hash) currentDay.visitors.add(ev.visitor_hash);
  }

  const uniqueVisitors = uniqueVisitorHashes.size;

  const viewsByPage = Array.from(pageViewMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views);

  const trafficTrends = Array.from(dateMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, data]) => ({
      date,
      visitors: data.visitors.size,
      pageViews: data.pageViews,
    }));

  const deviceBreakdown = Array.from(deviceMap.entries()).map(([device, count]) => ({
    device,
    count,
    percentage: Math.round((count / totalPageViews) * 100),
  }));

  const referrers = Array.from(referrerMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary: {
      totalVisitors: uniqueVisitors,
      uniqueVisitors,
      totalPageViews,
      viewsByPage,
      trafficTrends,
      deviceBreakdown,
      referrers,
      hasData: true,
    },
  };
}
