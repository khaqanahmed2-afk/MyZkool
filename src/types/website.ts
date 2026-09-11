/**
 * Domain Types for School Website Setup
 * Onboarding Step 6 of 8 - Route: /onboarding/website
 */

export type WebsitePageType =
  | "home"
  | "about"
  | "academics"
  | "admissions"
  | "contact"
  | "custom";

/**
 * Persisted School Website Page configuration
 */
export interface WebsitePage {
  id: string;
  school_id: string;
  website_id: string;
  slug: string;
  title: string;
  page_type: WebsitePageType | string;
  content: Record<string, unknown>;
  is_enabled: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Brand Colors Theme for School Website
 */
export interface WebsiteTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/**
 * Persisted School Website Record
 */
export interface SchoolWebsite {
  id: string;
  school_id: string;
  site_name: string;
  tagline?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  subdomain: string;
  custom_domain?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  about_text?: string | null;
  admission_enabled: boolean;
  parent_portal_enabled: boolean;
  published: boolean;
  created_at?: string;
  updated_at?: string;
  pages?: WebsitePage[];
}

/**
 * Form Input Data for Updating School Website Settings
 */
export interface WebsiteSettingsInput {
  site_name: string;
  tagline?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_domain?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  about_text?: string;
  admission_enabled: boolean;
  parent_portal_enabled: boolean;
  published: boolean;
}

/**
 * State container for the Website Setup page
 */
export interface WebsiteSetupState {
  website: SchoolWebsite | null;
  pages: WebsitePage[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

/**
 * Curated Brand Color Preset for Indian Educational Institutions
 */
export interface WebsiteColorPreset {
  name: string;
  description: string;
  primary: string;
  secondary: string;
  accent: string;
}

export const WEBSITE_COLOR_PRESETS: WebsiteColorPreset[] = [
  {
    name: "Classic Academic Blue",
    description: "Traditional CBSE & ICSE scholarly trust and authority",
    primary: "#2158E0",
    secondary: "#141A2E",
    accent: "#10B981",
  },
  {
    name: "Forest Emerald",
    description: "Vibrant, progressive green representing growth & ethics",
    primary: "#0D8259",
    secondary: "#132A1C",
    accent: "#F59E0B",
  },
  {
    name: "Royal Burgundy",
    description: "Heritage, prestige, and institutional excellence",
    primary: "#991B1B",
    secondary: "#1F1618",
    accent: "#D97706",
  },
  {
    name: "Deep Indigo & Violet",
    description: "Modern, STEM-focused digital academy aesthetic",
    primary: "#4338CA",
    secondary: "#1E1B4B",
    accent: "#06B6D4",
  },
  {
    name: "Maritime Navy & Amber",
    description: "Distinguished leadership, discipline, and maritime poise",
    primary: "#1E3A8A",
    secondary: "#0F172A",
    accent: "#EA580C",
  },
];

/**
 * Standard Default Pages initialized for every new school website
 */
export const DEFAULT_WEBSITE_PAGES: Array<{
  slug: string;
  title: string;
  page_type: WebsitePageType;
  sort_order: number;
  description: string;
}> = [
  {
    slug: "home",
    title: "Home",
    page_type: "home",
    sort_order: 1,
    description: "Hero showcase, principal welcome, highlights, and quick notices",
  },
  {
    slug: "about",
    title: "About Us",
    page_type: "about",
    sort_order: 2,
    description: "Vision, mission, core values, history, and leadership message",
  },
  {
    slug: "academics",
    title: "Academics",
    page_type: "academics",
    sort_order: 3,
    description: "Curriculum board, grade progression, pedagogy, and faculty overview",
  },
  {
    slug: "admissions",
    title: "Admissions",
    page_type: "admissions",
    sort_order: 4,
    description: "Eligibility criteria, fee structure, document list, and online enquiry",
  },
  {
    slug: "contact",
    title: "Contact",
    page_type: "contact",
    sort_order: 5,
    description: "Campus address, interactive map, office hours, and telephone directory",
  },
];
