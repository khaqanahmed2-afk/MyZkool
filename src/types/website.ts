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
  theme_id?: string;
  header_style?: string;
  footer_style?: string;
  font_family?: string;
  seo_title?: string | null;
  seo_description?: string | null;
  og_image_url?: string | null;
  allow_indexing?: boolean;
  custom_domain_status?: "unconfigured" | "pending_verification" | "active" | "failed" | string;
  last_published_at?: string | null;
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
  theme_id?: string;
  header_style?: string;
  footer_style?: string;
  font_family?: string;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  allow_indexing?: boolean;
  custom_domain_status?: string;
  last_published_at?: string;
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
  {
    name: "Modern Slate & Teal",
    description: "Contemporary, technology-forward focus for progressive academies",
    primary: "#0F766E",
    secondary: "#0F172A",
    accent: "#0284C7",
  },
];

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

/**
 * Social Media Profile Links
 */
export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

/**
 * Hero Banner Section Configuration
 */
export interface HeroSectionConfig {
  headline: string;
  description: string;
  ctaText: string;
  backgroundImageUrl?: string;
}

/**
 * Principal Welcome Section Configuration
 */
export interface PrincipalSectionConfig {
  name: string;
  title: string;
  message: string;
  photoUrl?: string;
}

/**
 * Campus Facility Item
 */
export interface FacilityItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

/**
 * Gallery Image Item
 */
export interface GalleryImageItem {
  id: string;
  imageUrl: string;
  title?: string;
  category?: string;
}

/**
 * Key Statistic / Highlight Item
 */
export interface StatItem {
  id: string;
  label: string;
  value: string;
}

/**
 * Genuine Parent/Student Testimonial Item
 */
export interface TestimonialItem {
  id: string;
  quote: string;
  author: string;
  role: string;
}

/**
 * News / Announcement Item
 */
export interface AnnouncementItem {
  id: string;
  title: string;
  date: string;
  description: string;
}

/**
 * Website Section Keys
 */
export type WebsiteSectionKey =
  | "hero"
  | "about"
  | "academics"
  | "facilities"
  | "gallery"
  | "principal"
  | "stats"
  | "faculty"
  | "news"
  | "testimonials"
  | "admission_cta"
  | "contact_footer";

/**
 * Configurable Section Visibility & Order
 */
export interface WebsiteSectionToggle {
  key: WebsiteSectionKey;
  label: string;
  description: string;
  isEnabled: boolean;
  canDisable?: boolean;
}

/**
 * Complete Home Page Content Payload
 */
export interface HomePageContent {
  hero: HeroSectionConfig;
  principal: PrincipalSectionConfig;
  facilities: FacilityItem[];
  gallery: GalleryImageItem[];
  stats: StatItem[];
  testimonials: TestimonialItem[];
  announcements: AnnouncementItem[];
  socialLinks: SocialLinks;
  sections: WebsiteSectionToggle[];
}

export const DEFAULT_WEBSITE_SECTIONS: WebsiteSectionToggle[] = [
  { key: "hero", label: "Hero Banner & Admissions CTA", description: "Top banner with headline, campus background, and direct enquiry button", isEnabled: true, canDisable: false },
  { key: "about", label: "About the School", description: "School mission, overview, and values", isEnabled: true, canDisable: true },
  { key: "principal", label: "Principal's Welcome Message", description: "Personal note from school leadership with portrait", isEnabled: true, canDisable: true },
  { key: "academics", label: "Academic Programs & Classes", description: "Curriculum boards, grades, and educational pedagogy", isEnabled: true, canDisable: true },
  { key: "facilities", label: "Campus Infrastructure & Facilities", description: "Smart classrooms, library, labs, and sports amenities", isEnabled: true, canDisable: true },
  { key: "gallery", label: "Photo Gallery", description: "Photographs of campus life, annual events, and activities", isEnabled: true, canDisable: true },
  { key: "stats", label: "Key Achievements & Numbers", description: "Student count, years of service, and academic track record", isEnabled: true, canDisable: true },
  { key: "faculty", label: "Faculty & Staff Overview", description: "Qualified educators and faculty dedication", isEnabled: false, canDisable: true },
  { key: "news", label: "Announcements & Notices", description: "Upcoming events, circulars, and latest news", isEnabled: true, canDisable: true },
  { key: "testimonials", label: "Parent & Alumni Testimonials", description: "Genuine quotes from school community members", isEnabled: false, canDisable: true },
  { key: "admission_cta", label: "Admission Enquiry Section", description: "Interactive enquiry trigger for prospective families", isEnabled: true, canDisable: true },
  { key: "contact_footer", label: "Contact Details & Campus Footer", description: "Address, interactive phone/email, map link, and copyright", isEnabled: true, canDisable: false },
];

/**
 * Media Library item
 */
export interface WebsiteMediaItem {
  id: string;
  school_id: string;
  website_id?: string | null;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  category: string;
  created_at: string;
}

/**
 * News, Notices, Events, and Announcements
 */
export type WebsitePostCategory = "news" | "notice" | "event" | "announcement";
export type WebsitePostStatus = "draft" | "published" | "archived";

export interface WebsitePost {
  id: string;
  school_id: string;
  website_id?: string | null;
  title: string;
  description: string;
  category: WebsitePostCategory | string;
  featured_image?: string | null;
  event_date?: string | null;
  publication_date: string;
  is_published: boolean;
  status: WebsitePostStatus | string;
  created_at: string;
  updated_at: string;
}

/**
 * Public website admission enquiry
 */
export type AdmissionEnquiryStatus = "new" | "contacted" | "follow-up" | "converted" | "closed";

export interface AdmissionEnquiry {
  id: string;
  school_id: string;
  student_name?: string | null;
  parent_name: string;
  phone: string;
  email?: string | null;
  class_grade: string;
  message?: string | null;
  status: AdmissionEnquiryStatus | string;
  internal_notes?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * Telemetry & visitor analytics event
 */
export interface WebsiteAnalyticsEvent {
  id?: string;
  school_id: string;
  website_id?: string | null;
  page_path: string;
  visitor_hash: string;
  referrer?: string | null;
  device_type?: "desktop" | "mobile" | "tablet" | string;
  browser?: string | null;
  is_preview?: boolean;
  created_at?: string;
}

/**
 * Aggregated analytics summary
 */
export interface WebsiteAnalyticsSummary {
  totalVisitors: number;
  uniqueVisitors: number;
  totalPageViews: number;
  viewsByPage: Array<{ path: string; title?: string; views: number }>;
  trafficTrends: Array<{ date: string; visitors: number; pageViews: number }>;
  deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  referrers: Array<{ source: string; count: number }>;
  hasData: boolean;
}

/**
 * Theme & design preset template
 */
export interface WebsiteThemeTemplate {
  id: string;
  name: string;
  description: string;
  badge: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerStyle: "standard" | "centered" | "minimal";
  footerStyle: "standard" | "rich" | "compact";
  previewAccent: string;
}

export const WEBSITE_THEMES: WebsiteThemeTemplate[] = [
  {
    id: "academic-classic",
    name: "Classic Academy",
    description: "Traditional CBSE & ICSE scholarly trust, deep navy navigation, and timeless academic typography.",
    badge: "Most Popular",
    primaryColor: "#2158E0",
    secondaryColor: "#141A2E",
    accentColor: "#10B981",
    fontFamily: "Inter, sans-serif",
    headerStyle: "standard",
    footerStyle: "rich",
    previewAccent: "from-blue-600 to-indigo-800",
  },
  {
    id: "emerald-growth",
    name: "Vibrant Emerald",
    description: "Eco-conscious, student growth, leadership, and moral ethics theme with warm golden highlights.",
    badge: "Progressive",
    primaryColor: "#0D8259",
    secondaryColor: "#132A1C",
    accentColor: "#F59E0B",
    fontFamily: "Plus Jakarta Sans, sans-serif",
    headerStyle: "standard",
    footerStyle: "standard",
    previewAccent: "from-emerald-700 to-teal-900",
  },
  {
    id: "royal-heritage",
    name: "Royal Heritage",
    description: "Distinguished convent and heritage institutions emphasizing discipline, prestige, and institutional pride.",
    badge: "Heritage",
    primaryColor: "#991B1B",
    secondaryColor: "#1F1618",
    accentColor: "#D97706",
    fontFamily: "Cinzel, serif",
    headerStyle: "centered",
    footerStyle: "rich",
    previewAccent: "from-rose-900 to-red-950",
  },
  {
    id: "digital-stem",
    name: "Modern STEM & Tech",
    description: "Future-ready digital academy styling with high-contrast violet, clean lines, and cyan accents.",
    badge: "Tech-Focused",
    primaryColor: "#4338CA",
    secondaryColor: "#1E1B4B",
    accentColor: "#06B6D4",
    fontFamily: "Space Grotesk, sans-serif",
    headerStyle: "minimal",
    footerStyle: "compact",
    previewAccent: "from-indigo-700 to-purple-900",
  },
  {
    id: "slate-minimal",
    name: "Contemporary Slate",
    description: "Sleek, minimalist design focusing on campus photography, transparent headers, and crisp modern typography.",
    badge: "Clean & Modern",
    primaryColor: "#0F766E",
    secondaryColor: "#0F172A",
    accentColor: "#0284C7",
    fontFamily: "Outfit, sans-serif",
    headerStyle: "minimal",
    footerStyle: "standard",
    previewAccent: "from-teal-800 to-slate-900",
  },
];
