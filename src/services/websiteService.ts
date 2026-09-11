/**
 * School Website Service & Multi-Tenant Management
 * Onboarding Step 6 of 8 - Route: /onboarding/website
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { School } from "../types/school";
import {
  type SchoolWebsite,
  type WebsitePage,
  type WebsiteSettingsInput,
  DEFAULT_WEBSITE_PAGES,
} from "../types/website";

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
      for (const page of reordered) {
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
    input: { published },
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
}: {
  schoolId: string;
  userId: string;
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

      const currentStep = currentSchool?.onboarding_step || 6;
      const newStep = Math.max(currentStep, 7);

      await supabase
        .from("schools")
        .update({
          onboarding_step: newStep,
          updated_at: timestamp,
        })
        .eq("id", schoolId);

      await supabase
        .from("profiles")
        .update({
          current_onboarding_step: "/onboarding/staff",
          updated_at: timestamp,
        })
        .eq("auth_id", userId);

      await supabase.auth.updateUser({
        data: {
          onboarding_step: newStep,
          current_onboarding_step: "/onboarding/staff",
        },
      });
    } catch (err) {
      console.warn("Supabase onboarding progress update error:", err);
    }
  }

  // Local storage update with non-regression
  try {
    const schoolKey = `myzkool_school_profile_${userId}`;
    const raw = localStorage.getItem(schoolKey);
    if (raw) {
      const cached = JSON.parse(raw);
      cached.onboarding_step = Math.max(cached.onboarding_step || 6, 7);
      localStorage.setItem(schoolKey, JSON.stringify(cached));
    }
  } catch {
    // Non-fatal
  }

  return { success: true };
}
