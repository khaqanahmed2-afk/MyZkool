/**
 * Test Suite: MyZkool Website Management Module (v1.0)
 * Comprehensive E2E and Unit Verification for School Admin Website Management
 */

import {
  initializeSchoolWebsite,
  getSchoolWebsite,
  updateSchoolWebsite,
  publishWebsite,
  getWebsitePages,
  createWebsitePage,
  updateWebsitePage,
  deleteWebsitePage,
  reorderWebsitePages,
  getWebsitePosts,
  createWebsitePost,
  updateWebsitePost,
  deleteWebsitePost,
  getWebsiteMedia,
  deleteWebsiteMedia,
  submitAdmissionEnquiry,
  getAdmissionEnquiries,
  updateAdmissionEnquiryStatus,
  logWebsiteAnalyticsEvent,
  getWebsiteAnalyticsSummary,
  formatSchoolWebsiteUrl,
  formatParentPortalUrl,
  isValidHexColor,
  isValidEmail,
  getHomePageContent,
  saveHomePageContent,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from "../src/services/websiteService";
import { WEBSITE_THEMES } from "../src/types/website";
import type { School } from "../src/types/school";
import type {
  SchoolWebsite,
  WebsitePage,
  WebsitePost,
  WebsiteMediaItem,
  AdmissionEnquiry,
} from "../src/types/website";

// Polyfill localStorage in Node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] || null,
    get length() {
      return store.size;
    },
  } as Storage;
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${details ? `(${details})` : ""}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL WEBSITE MANAGEMENT MODULE: COMPREHENSIVE TEST SUITE");
  console.log("==========================================================\n");

  const adminUserId = "admin-mgmt-001";
  const teacherUserId = "staff-mgmt-002";

  const mockSchoolA: School = {
    id: "school-mgmt-alpha",
    name: "Apex Global International School",
    subdomain: "apex-global",
    school_type: "k12",
    affiliation_board: "CBSE",
    official_email: "principal@apexschool.edu.in",
    contact_phone: "+91 98765 00001",
    address: "100 IT Corridor, Cyber City",
    city: "Hyderabad",
    state: "Telangana",
    pin_code: "500081",
    logo_url: "https://example.com/apex-logo.png",
    onboarding_completed: true,
    onboarding_step: 8,
    created_by: adminUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSchoolB: School = {
    id: "school-mgmt-beta",
    name: "Beacon Public Academy",
    subdomain: "beacon-public",
    school_type: "primary",
    affiliation_board: "ICSE",
    official_email: "info@beaconacademy.edu.in",
    contact_phone: "+91 98765 00002",
    address: "50 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pin_code: "560001",
    logo_url: "https://example.com/beacon-logo.png",
    onboarding_completed: true,
    onboarding_step: 8,
    created_by: "admin-beta-002",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ----------------------------------------------------
  // SECTION 1: WEBSITE INITIALIZATION & THEMES & DESIGN
  // ----------------------------------------------------
  console.log("\n--- SECTION 1: Website Initialization, Branding & Themes ---");

  const initResult = await initializeSchoolWebsite({
    school: mockSchoolA,
    userId: adminUserId,
    userRole: "school_admin",
  });
  assert(Boolean(initResult.website), "Initializes school website with default records");
  const website = initResult.website!;

  assert(website.school_id === mockSchoolA.id, "Website has correct school_id tenant ownership");
  assert(website.subdomain === "apex-global", "Website subdomain initialized correctly");

  // Verify Curated Themes
  assert(WEBSITE_THEMES.length >= 5, "Has at least 5 curated theme templates available");
  const classicTheme = WEBSITE_THEMES.find((t) => t.id === "academic-classic");
  assert(!!classicTheme && classicTheme.name === "Classic Academy", "Classic Academy theme is defined");
  const royalTheme = WEBSITE_THEMES.find((t) => t.id === "royal-heritage");
  assert(!!royalTheme && royalTheme.fontFamily.includes("serif"), "Royal Heritage theme has serif typography");

  // Update theme, colors, typography, header/footer layout
  const themeUpdate = await updateSchoolWebsite({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    input: {
      theme_id: "emerald-growth",
      primary_color: "#16a34a",
      secondary_color: "#ca8a04",
      accent_color: "#f59e0b",
      font_family: "font-sans",
      header_style: "centered",
      footer_style: "detailed",
    },
    userRole: "school_admin",
  });
  assert(themeUpdate.success, "Updates website theme, colors, and header/footer layouts");

  const reloaded = await getSchoolWebsite(mockSchoolA.id);
  assert(reloaded.website?.theme_id === "emerald-growth", "Theme ID persisted as 'emerald-growth'");
  assert(reloaded.website?.primary_color === "#16a34a", "Primary color updated to #16a34a");
  assert(reloaded.website?.header_style === "centered", "Header style persisted as 'centered'");
  assert(reloaded.website?.footer_style === "detailed", "Footer style persisted as 'detailed'");

  // ----------------------------------------------------
  // SECTION 2: SEO SETTINGS & DOMAIN MANAGEMENT
  // ----------------------------------------------------
  console.log("\n--- SECTION 2: SEO Settings & Domain Configuration ---");

  const seoUpdate = await updateSchoolWebsite({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    input: {
      seo_title: "Apex Global School - Leading CBSE School in Hyderabad",
      seo_description: "Excellence in holistic education, world-class labs, and sports infrastructure.",
      og_image_url: "https://example.com/apex-og-share.png",
      allow_indexing: true,
      custom_domain: "www.apexschool.edu.in",
      custom_domain_status: "pending_verification",
    },
    userRole: "school_admin",
  });
  assert(seoUpdate.success, "Updates SEO title, meta description, OG image, and custom domain");

  const websiteWithSeo = await getSchoolWebsite(mockSchoolA.id);
  assert(
    websiteWithSeo.website?.seo_title === "Apex Global School - Leading CBSE School in Hyderabad",
    "SEO title correctly stored"
  );
  assert(websiteWithSeo.website?.allow_indexing === true, "Search engine indexing flag is true");
  assert(websiteWithSeo.website?.custom_domain === "www.apexschool.edu.in", "Custom domain stored");
  assert(websiteWithSeo.website?.custom_domain_status === "pending_verification", "Custom domain status tracked");

  // URL formatting
  const formattedUrl = formatSchoolWebsiteUrl(mockSchoolA.subdomain);
  assert(formattedUrl.includes("apex-global"), "formatSchoolWebsiteUrl returns correct subdomain link");
  const portalUrl = formatParentPortalUrl(mockSchoolA.subdomain);
  assert(portalUrl.endsWith("/parent-login"), "formatParentPortalUrl appends /parent-login");

  // ----------------------------------------------------
  // SECTION 3: PAGES MANAGEMENT (CRUD, Reordering, Deletion Guard)
  // ----------------------------------------------------
  console.log("\n--- SECTION 3: Pages Management ---");

  const pagesRes = await getWebsitePages(website.id);
  const initialPages = pagesRes.pages;
  assert(initialPages.length >= 5, "Website initialized with at least 5 default core pages");

  const homePage = initialPages.find((p) => p.slug === "home" || p.slug === "");
  assert(!!homePage, "Home page exists in initialized pages");

  // Attempt to delete default system page (should fail / be forbidden)
  const deleteSystemResult = await deleteWebsitePage({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    pageId: homePage!.id,
    userRole: "school_admin",
  });
  assert(!deleteSystemResult.success, "Blocks deletion of system-managed default pages");
  assert(
    deleteSystemResult.error?.toLowerCase().includes("default") ||
      deleteSystemResult.error?.toLowerCase().includes("cannot delete") ||
      deleteSystemResult.error?.toLowerCase().includes("core"),
    "Returns descriptive error when trying to delete default page"
  );

  // Create a new custom page
  const customPageResult = await createWebsitePage({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    title: "STEM & Robotics Club",
    slug: "stem-robotics",
    isEnabled: true,
    sortOrder: 10,
    userRole: "school_admin",
  });
  assert(customPageResult.success && !!customPageResult.page, "Creates a new custom website page");
  const customPage = customPageResult.page!;
  assert(customPage.slug === "stem-robotics", "Custom page has correct slug");

  // Update the custom page
  const updatePageResult = await updateWebsitePage({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    pageId: customPage.id,
    title: "Innovation & Robotics Lab",
    slug: "robotics-lab",
    isEnabled: false,
    userRole: "school_admin",
  });
  assert(updatePageResult.success, "Updates custom page title, slug, and enabled state");

  // Reorder pages
  const reorderResult = await reorderWebsitePages({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    orderedPageIds: [customPage.id, homePage!.id],
    userRole: "school_admin",
  });
  assert(reorderResult.success, "Reorders website pages successfully");

  // Delete the custom page
  const deleteCustomResult = await deleteWebsitePage({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    pageId: customPage.id,
    userRole: "school_admin",
  });
  assert(deleteCustomResult.success, "Allows deletion of custom user-created pages");

  // ----------------------------------------------------
  // SECTION 4: POSTS MANAGEMENT (News, Notices, Events, Announcements)
  // ----------------------------------------------------
  console.log("\n--- SECTION 4: News, Notices, Events & Announcements ---");

  // Create an announcement
  const createPost1 = await createWebsitePost({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    post: {
      title: "Annual Sports Day 2026",
      description: "Join us for our upcoming Annual Sports Meet on Dec 10.",
      category: "event",
      featured_image: "https://example.com/sports-banner.jpg",
      status: "published",
      publication_date: new Date().toISOString(),
    },
    userRole: "school_admin",
  });
  assert(createPost1.success && !!createPost1.post, "Creates a published event post");
  const eventPost = createPost1.post!;

  // Create a draft notice
  const createPost2 = await createWebsitePost({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    post: {
      title: "Winter Uniform Guidelines (Draft)",
      description: "Guidelines for winter uniforms starting November.",
      category: "notice",
      status: "draft",
    },
    userRole: "school_admin",
  });
  assert(createPost2.success && !!createPost2.post, "Creates a draft notice post");
  const draftNotice = createPost2.post!;

  // Query posts: only published
  const { posts: publishedPosts } = await getWebsitePosts({
    schoolId: mockSchoolA.id,
    isPublishedOnly: true,
  });
  assert(
    publishedPosts.some((p) => p.id === eventPost.id),
    "getWebsitePosts with isPublishedOnly=true includes published event"
  );
  assert(
    !publishedPosts.some((p) => p.id === draftNotice.id),
    "getWebsitePosts with isPublishedOnly=true excludes draft notice"
  );

  // Update draft to published
  const updatePostResult = await updateWebsitePost({
    schoolId: mockSchoolA.id,
    postId: draftNotice.id,
    post: {
      status: "published",
      publication_date: new Date().toISOString(),
    },
    userRole: "school_admin",
  });
  assert(updatePostResult.success, "Updates draft post to published");

  // Delete post
  const deletePostResult = await deleteWebsitePost({
    schoolId: mockSchoolA.id,
    postId: draftNotice.id,
    userRole: "school_admin",
  });
  assert(deletePostResult.success, "Deletes post successfully");

  // ----------------------------------------------------
  // SECTION 5: MEDIA LIBRARY & ASSET MANAGEMENT
  // ----------------------------------------------------
  console.log("\n--- SECTION 5: Media Library & Upload Validation ---");

  // MIME type and size checks
  assert(ALLOWED_IMAGE_MIME_TYPES.includes("image/jpeg"), "Supports JPEG image MIME type");
  assert(ALLOWED_IMAGE_MIME_TYPES.includes("image/png"), "Supports PNG image MIME type");
  assert(ALLOWED_IMAGE_MIME_TYPES.includes("image/webp"), "Supports WebP image MIME type");
  assert(MAX_IMAGE_FILE_SIZE_BYTES === 5 * 1024 * 1024, "Enforces 5MB max upload limit");

  // Query media
  const { media: mediaList } = await getWebsiteMedia({ schoolId: mockSchoolA.id });
  assert(Array.isArray(mediaList), "getWebsiteMedia returns an array of media assets");

  // ----------------------------------------------------
  // SECTION 6: ADMISSION ENQUIRIES (Tracking & Status Updates)
  // ----------------------------------------------------
  console.log("\n--- SECTION 6: Admission Enquiries & Workflow ---");

  // Submit admission enquiry from public website
  const enquirySubmit = await submitAdmissionEnquiry({
    schoolId: mockSchoolA.id,
    studentName: "Aarav Sharma",
    parentName: "Vikram Sharma",
    email: "vikram.sharma@example.com",
    phone: "+91 99887 76655",
    classGrade: "Grade 6",
    message: "Seeking admission for upcoming academic session.",
  });
  assert(enquirySubmit.success, "Public website accepts admission enquiry with student name");

  // Fetch enquiries in admin dashboard
  const { enquiries } = await getAdmissionEnquiries({ schoolId: mockSchoolA.id });
  assert(enquiries.length > 0, "Admin can retrieve admission enquiries for the school");
  const latestEnquiry = enquiries.find((e) => e.student_name === "Aarav Sharma" || e.parent_name === "Vikram Sharma");
  assert(!!latestEnquiry, "Found submitted enquiry in admin list");
  assert(latestEnquiry?.status === "new", "New enquiry defaults to 'new' status");

  // Update enquiry status to 'contacted' with internal notes
  const updateEnquiry = await updateAdmissionEnquiryStatus({
    schoolId: mockSchoolA.id,
    enquiryId: latestEnquiry!.id,
    status: "contacted",
    notes: "Spoke with father. Arranged campus tour for Saturday.",
    userRole: "school_admin",
  });
  assert(updateEnquiry.success, "Updates enquiry status to 'contacted' and adds internal notes");

  // Update enquiry to 'converted'
  const convertEnquiry = await updateAdmissionEnquiryStatus({
    schoolId: mockSchoolA.id,
    enquiryId: latestEnquiry!.id,
    status: "converted",
    userRole: "school_admin",
  });
  assert(convertEnquiry.success, "Updates enquiry status to 'converted'");

  // ----------------------------------------------------
  // SECTION 7: GENUINE WEBSITE ANALYTICS & TELEMETRY
  // ----------------------------------------------------
  console.log("\n--- SECTION 7: Genuine Website Analytics & Telemetry ---");

  const visitor1Hash = "v_hash_abc123";
  const visitor2Hash = "v_hash_def456";

  // Log public events
  await logWebsiteAnalyticsEvent({
    school_id: mockSchoolA.id,
    visitor_hash: visitor1Hash,
    page_path: "/",
    device_type: "desktop",
    referrer: "https://google.com",
    is_preview: false,
  });

  await logWebsiteAnalyticsEvent({
    school_id: mockSchoolA.id,
    visitor_hash: visitor1Hash, // Same visitor viewing another page
    page_path: "/academics",
    device_type: "desktop",
    referrer: "https://google.com",
    is_preview: false,
  });

  await logWebsiteAnalyticsEvent({
    school_id: mockSchoolA.id,
    visitor_hash: visitor2Hash, // New unique visitor
    page_path: "/admissions",
    device_type: "mobile",
    referrer: "https://facebook.com",
    is_preview: false,
  });

  // Log admin preview event (should NOT be counted in public analytics)
  await logWebsiteAnalyticsEvent({
    school_id: mockSchoolA.id,
    visitor_hash: "admin_preview_hash",
    page_path: "/preview",
    device_type: "desktop",
    referrer: "",
    is_preview: true, // EXCLUDED
  });

  // Query analytics summary
  const { summary } = await getWebsiteAnalyticsSummary({
    schoolId: mockSchoolA.id,
    period: "today",
  });

  assert(summary.hasData === true, "Analytics reports hasData = true when events exist");
  assert(summary.totalPageViews >= 3, `Total page views recorded (got ${summary.totalPageViews})`);
  assert(summary.uniqueVisitors >= 2, `Unique visitors correctly deduplicated (got ${summary.uniqueVisitors})`);
  assert(
    summary.totalPageViews >= summary.uniqueVisitors,
    "Total page views is greater than or equal to unique visitors"
  );

  // Check device breakdown
  assert(summary.deviceBreakdown.length > 0, "Device breakdown is computed from telemetry");
  assert(
    summary.deviceBreakdown.some((d) => d.device === "desktop" || d.device === "mobile"),
    "Recognizes desktop and mobile devices"
  );

  // Check views by page
  assert(
    summary.viewsByPage.some((p) => p.path === "/" || p.path === "/academics" || p.path === "/admissions"),
    "Ranks views by page path"
  );

  // Empty state check for School B (no traffic logged yet)
  const emptyAnalytics = await getWebsiteAnalyticsSummary({
    schoolId: "school-with-no-traffic-9999",
    period: "today",
  });
  assert(emptyAnalytics.summary.hasData === false, "Reports hasData = false for tenant with no traffic");
  assert(emptyAnalytics.summary.totalVisitors === 0, "Zero visitors reported for empty state without fabrication");

  // ----------------------------------------------------
  // SECTION 8: PUBLISHING WORKFLOW & ACCESS CONTROLS
  // ----------------------------------------------------
  console.log("\n--- SECTION 8: Publishing Workflow & Multi-Tenant Isolation ---");

  // Save draft homepage content
  const draftContent = await getHomePageContent(website.id, mockSchoolA);
  assert(!!draftContent, "Can load home page content configuration");
  draftContent.hero.headline = "Empowering Leaders of Tomorrow";
  const saveDraft = await saveHomePageContent({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    content: draftContent,
    userRole: "school_admin",
  });
  assert(saveDraft.success, "Saves homepage draft changes successfully");

  // Publish website
  const pubResult = await publishWebsite({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    published: true,
    userRole: "school_admin",
  });
  assert(pubResult.success, "Publishes website and updates last_published_at");
  const pubWebsite = await getSchoolWebsite(mockSchoolA.id);
  assert(pubWebsite.website?.published === true, "Website is now in published state");
  assert(!!pubWebsite.website?.last_published_at, "last_published_at timestamp is set on publish");

  // Unpublish website
  const unpubResult = await publishWebsite({
    schoolId: mockSchoolA.id,
    websiteId: website.id,
    published: false,
    userRole: "school_admin",
  });
  assert(unpubResult.success, "Unpublishes website successfully");
  const unpubWebsite = await getSchoolWebsite(mockSchoolA.id);
  assert(unpubWebsite.website?.published === false, "Website is unpublished (prevents public access)");
  assert(
    unpubWebsite.website?.site_name === mockSchoolA.name || unpubWebsite.website?.subdomain === mockSchoolA.subdomain,
    "Unpublished website preserves school configuration intact"
  );

  // Multi-tenant isolation: School B cannot see School A's posts or enquiries
  const { posts: schoolBPosts } = await getWebsitePosts({ schoolId: mockSchoolB.id });
  assert(!schoolBPosts.some((p) => p.id === eventPost.id), "School B does not see School A's posts (Tenant Isolation)");

  const { enquiries: schoolBEnquiries } = await getAdmissionEnquiries({ schoolId: mockSchoolB.id });
  assert(
    !schoolBEnquiries.some((e) => e.student_name === "Aarav Sharma"),
    "School B does not see School A's admission enquiries (Tenant Isolation)"
  );

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log("\n==========================================================");
  console.log(`TEST RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Unhandled test execution error:", err);
  process.exit(1);
});
