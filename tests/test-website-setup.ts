/**
 * Test Suite: MyZkool Step 8 (Website Setup / School Website Initialization)
 * Onboarding Step 6 of 8 - Route: /onboarding/website
 */

import {
  initializeSchoolWebsite,
  getSchoolWebsite,
  updateSchoolWebsite,
  getWebsitePages,
  createWebsitePage,
  reorderWebsitePages,
  toggleWebsitePage,
  publishWebsite,
  saveWebsiteSetupProgress,
  formatSchoolWebsiteUrl,
  formatParentPortalUrl,
  isValidHexColor,
  isValidEmail,
  normalizePageSlug,
  WEBSITE_CACHE_KEY_PREFIX,
  WEBSITE_PAGES_CACHE_KEY_PREFIX,
} from "../src/services/websiteService";
import type { School } from "../src/types/school";
import type { SchoolWebsite, WebsitePage } from "../src/types/website";

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
  console.log("MYZKOOL STEP 8: WEBSITE SETUP & INITIALIZATION TEST SUITE");
  console.log("==========================================================\n");

  const adminUserId1 = "user-admin-001";
  const teacherUserId = "user-teacher-001";

  // Mock School Tenants
  const mockSchool1: School = {
    id: "school-tenant-001",
    name: "Greenwood International Academy",
    subdomain: "greenwood-academy",
    school_type: "k12",
    affiliation_board: "CBSE",
    official_email: "principal@greenwood.edu.in",
    contact_phone: "+91 98765 43210",
    address: "42 Knowledge Park, MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pin_code: "560001",
    logo_url: "https://example.com/greenwood-logo.png",
    onboarding_completed: false,
    onboarding_step: 6,
    created_by: adminUserId1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSchool2: School = {
    id: "school-tenant-002",
    name: "St. Xavier's Convent High School",
    subdomain: "st-xaviers-pune",
    school_type: "secondary",
    affiliation_board: "ICSE",
    official_email: "office@stxavierspune.ac.in",
    contact_phone: "+91 91234 56789",
    address: "10 Camp Road",
    city: "Pune",
    state: "Maharashtra",
    pin_code: "411001",
    logo_url: null,
    onboarding_completed: false,
    onboarding_step: 6,
    created_by: "user-admin-002",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // -----------------------------------------------------------------
  // 1. URL Helpers & Validation Utilities
  // -----------------------------------------------------------------
  console.log("1. URL Helpers & Field Validation Utilities:");
  assert(
    formatSchoolWebsiteUrl("greenwood-academy") === "https://greenwood-academy.myzkool.com",
    "Formats school website public domain properly"
  );
  assert(
    formatParentPortalUrl("greenwood-academy") ===
      "https://greenwood-academy.myzkool.com/parent-login",
    "Formats tenant-scoped parent portal login URL"
  );
  assert(isValidHexColor("#2158E0"), "Validates 6-digit hex color #2158E0");
  assert(isValidHexColor("#fff"), "Validates 3-digit hex color #fff");
  assert(!isValidHexColor("invalid-color"), "Rejects invalid non-hex string");
  assert(!isValidHexColor("#12345"), "Rejects incomplete 5-digit hex string");
  assert(isValidEmail("admissions@school.edu.in"), "Validates standard email address");
  assert(!isValidEmail("not-an-email"), "Rejects invalid email format");
  assert(
    normalizePageSlug("Campus Facilities & Sports") === "campus-facilities-sports",
    "Normalizes human page titles to URL slugs"
  );

  // -----------------------------------------------------------------
  // 2. School Website Initialization & Idempotency
  // -----------------------------------------------------------------
  console.log("\n2. School Website Initialization & Idempotency:");
  const initResult1 = await initializeSchoolWebsite({
    school: mockSchool1,
    userId: adminUserId1,
    userRole: "school_admin",
  });

  assert(Boolean(initResult1.website), "Initializes school website successfully");
  assert(initResult1.isNew === true, "Flags new initial creation on first run");
  assert(
    initResult1.website?.school_id === mockSchool1.id,
    "Associates website strictly with school_id"
  );
  assert(
    initResult1.website?.site_name === mockSchool1.name,
    "Prefills website display name from school profile"
  );
  assert(
    initResult1.website?.subdomain === mockSchool1.subdomain,
    "Reuses exact school subdomain"
  );
  assert(
    initResult1.website?.contact_email === mockSchool1.official_email,
    "Prefills public contact email from school profile"
  );
  assert(
    initResult1.website?.contact_phone === mockSchool1.contact_phone,
    "Prefills public contact phone from school profile"
  );
  assert(
    initResult1.website?.address === mockSchool1.address,
    "Prefills street address from school profile"
  );
  assert(
    initResult1.website?.city === mockSchool1.city,
    "Prefills city from school profile"
  );
  assert(
    initResult1.website?.state === mockSchool1.state,
    "Prefills state from school profile"
  );
  assert(
    initResult1.website?.postal_code === mockSchool1.pin_code,
    "Prefills postal code from school profile"
  );
  assert(
    initResult1.website?.published === false,
    "Website starts in unpublished draft mode by default"
  );
  assert(
    initResult1.website?.admission_enabled === true,
    "Online admissions lead capture enabled by default"
  );
  assert(
    initResult1.website?.parent_portal_enabled === true,
    "Parent portal entry point enabled by default"
  );

  // Idempotency: re-running initialization returns the existing record without duplicate
  const secondInit = await initializeSchoolWebsite({
    school: mockSchool1,
    userId: adminUserId1,
    userRole: "school_admin",
  });

  assert(secondInit.isNew === false, "Idempotent: returns existing website on subsequent runs");
  assert(
    secondInit.website?.id === initResult1.website?.id,
    "Preserves same website UUID across calls"
  );

  // -----------------------------------------------------------------
  // 3. Default 5 Website Pages Initialization
  // -----------------------------------------------------------------
  console.log("\n3. Default Website Pages Structure:");
  const pages = initResult1.pages;
  assert(pages.length === 5, "Initializes exactly 5 default navigation pages");

  const homePage = pages.find((p) => p.slug === "home");
  const aboutPage = pages.find((p) => p.slug === "about");
  const academicsPage = pages.find((p) => p.slug === "academics");
  const admissionsPage = pages.find((p) => p.slug === "admissions");
  const contactPage = pages.find((p) => p.slug === "contact");

  assert(Boolean(homePage), "Contains default 'home' page");
  assert(Boolean(aboutPage), "Contains default 'about' page");
  assert(Boolean(academicsPage), "Contains default 'academics' page");
  assert(Boolean(admissionsPage), "Contains default 'admissions' page");
  assert(Boolean(contactPage), "Contains default 'contact' page");

  assert(homePage?.sort_order === 1, "Home page is assigned sort_order 1");
  assert(aboutPage?.sort_order === 2, "About page is assigned sort_order 2");
  assert(academicsPage?.sort_order === 3, "Academics page is assigned sort_order 3");
  assert(admissionsPage?.sort_order === 4, "Admissions page is assigned sort_order 4");
  assert(contactPage?.sort_order === 5, "Contact page is assigned sort_order 5");

  assert(homePage?.is_enabled === true, "Home page is enabled");
  assert(
    pages.every((p) => p.school_id === mockSchool1.id),
    "All created pages are scoped to school_id"
  );
  assert(
    pages.every((p) => p.website_id === initResult1.website?.id),
    "All created pages link to the school website_id"
  );

  // -----------------------------------------------------------------
  // 4. Update Website Settings & Branding
  // -----------------------------------------------------------------
  console.log("\n4. Update Website Settings & Branding:");
  const websiteId1 = initResult1.website!.id;

  const updateRes1 = await updateSchoolWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    input: {
      site_name: "Greenwood Global Academy",
      tagline: "Inspiring Leadership & Moral Poise",
      primary_color: "#0D8259", // Forest emerald
      secondary_color: "#132A1C",
      accent_color: "#F59E0B",
      about_text: "Updated school vision and principal message for 2026.",
    },
    userRole: "school_admin",
  });

  assert(updateRes1.success, "Updates website settings successfully");
  assert(
    updateRes1.website?.site_name === "Greenwood Global Academy",
    "Persists updated website display name"
  );
  assert(
    updateRes1.website?.primary_color === "#0D8259",
    "Persists updated primary brand color"
  );
  assert(
    updateRes1.website?.secondary_color === "#132A1C",
    "Persists updated secondary brand color"
  );
  assert(
    updateRes1.website?.accent_color === "#F59E0B",
    "Persists updated accent brand color"
  );

  // Verification via getSchoolWebsite
  const fetchedWebsite = await getSchoolWebsite(mockSchool1.id);
  assert(
    fetchedWebsite.website?.site_name === "Greenwood Global Academy",
    "getSchoolWebsite fetches updated persisted data"
  );

  // Validation failures
  const emptyNameRes = await updateSchoolWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    input: { site_name: "   " },
    userRole: "school_admin",
  });
  assert(!emptyNameRes.success, "Rejects empty site display name");

  const invalidColorRes = await updateSchoolWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    input: { primary_color: "not-a-color" },
    userRole: "school_admin",
  });
  assert(!invalidColorRes.success, "Rejects invalid primary color hex");

  const invalidEmailRes = await updateSchoolWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    input: { contact_email: "invalid-email" },
    userRole: "school_admin",
  });
  assert(!invalidEmailRes.success, "Rejects malformed contact email");

  // -----------------------------------------------------------------
  // 5. Page Operations: Add Custom, Duplicate Slug Prevention, Toggle & Reorder
  // -----------------------------------------------------------------
  console.log("\n5. Page Operations & Ordering:");

  // Add Custom Page
  const addPageRes = await createWebsitePage({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    slug: "facilities",
    title: "Campus Facilities",
    pageType: "custom",
    userRole: "school_admin",
  });

  assert(addPageRes.success && Boolean(addPageRes.page), "Creates custom navigation page");
  assert(addPageRes.page?.slug === "facilities", "Assigns correct slug 'facilities'");

  // Duplicate Slug Prevention
  const dupSlugRes = await createWebsitePage({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    slug: "facilities",
    title: "Another Facilities Page",
    pageType: "custom",
    userRole: "school_admin",
  });
  assert(!dupSlugRes.success, "Blocks creating page with duplicate slug in same website");

  // Toggle Page Enabled/Disabled
  const toggleRes = await toggleWebsitePage({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    pageId: admissionsPage!.id,
    isEnabled: false,
    userRole: "school_admin",
  });
  assert(toggleRes.success, "Successfully disables Admissions page");

  // Prevent disabling Home page
  const disableHomeRes = await toggleWebsitePage({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    pageId: homePage!.id,
    isEnabled: false,
    userRole: "school_admin",
  });
  assert(!disableHomeRes.success, "Guards against disabling Home landing page");

  // Page Reordering
  const { pages: currentPages } = await getWebsitePages(websiteId1);
  assert(currentPages.length === 6, "Total pages now equals 6 (5 default + 1 custom)");

  // Move About to First position (swap with Home)
  const reorderedIds = [
    aboutPage!.id,
    homePage!.id,
    academicsPage!.id,
    admissionsPage!.id,
    contactPage!.id,
    addPageRes.page!.id,
  ];

  const reorderRes = await reorderWebsitePages({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    orderedPageIds: reorderedIds,
    userRole: "school_admin",
  });

  assert(reorderRes.success, "Reorders pages successfully");
  const reorderedAbout = reorderRes.pages?.find((p) => p.id === aboutPage!.id);
  const reorderedHome = reorderRes.pages?.find((p) => p.id === homePage!.id);
  assert(reorderedAbout?.sort_order === 1, "About page is now sort_order 1");
  assert(reorderedHome?.sort_order === 2, "Home page is now sort_order 2");

  // -----------------------------------------------------------------
  // 6. Publication State Toggle
  // -----------------------------------------------------------------
  console.log("\n6. Website Publication State:");
  const publishRes = await publishWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    published: true,
    userRole: "school_admin",
  });

  assert(publishRes.success, "Publishes school website");
  assert(publishRes.website?.published === true, "Website record reflects published = true");

  const unpublishRes = await publishWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    published: false,
    userRole: "school_admin",
  });
  assert(unpublishRes.success, "Unpublishes school website back to draft mode");
  assert(unpublishRes.website?.published === false, "Website record reflects published = false");

  // -----------------------------------------------------------------
  // 7. Role-Based Access Control
  // -----------------------------------------------------------------
  console.log("\n7. Role-Based Access Control:");
  const teacherUpdateRes = await updateSchoolWebsite({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    input: { site_name: "Teacher Modified Name" },
    userRole: "teacher",
  });
  assert(!teacherUpdateRes.success, "Rejects teacher attempt to update school website");

  const parentCreatePageRes = await createWebsitePage({
    schoolId: mockSchool1.id,
    websiteId: websiteId1,
    slug: "parent-page",
    title: "Parent Page",
    userRole: "parent",
  });
  assert(!parentCreatePageRes.success, "Rejects parent attempt to create website page");

  // -----------------------------------------------------------------
  // 8. Strict Multi-Tenant Isolation
  // -----------------------------------------------------------------
  console.log("\n8. Strict Multi-Tenant Isolation:");
  const initResult2 = await initializeSchoolWebsite({
    school: mockSchool2,
    userId: "user-admin-002",
    userRole: "school_admin",
  });

  assert(Boolean(initResult2.website), "Initializes website for School 2");
  assert(
    initResult2.website?.school_id === mockSchool2.id,
    "School 2 website belongs strictly to Tenant 2"
  );
  assert(
    initResult2.website?.id !== initResult1.website?.id,
    "School 1 and School 2 have distinct website IDs"
  );
  assert(
    initResult2.website?.site_name === mockSchool2.name,
    "School 2 retains independent site name"
  );
  assert(
    initResult1.website?.site_name !== initResult2.website?.site_name,
    "Tenant identities remain isolated"
  );

  const pages2 = initResult2.pages;
  assert(
    pages2.every((p) => p.school_id === mockSchool2.id),
    "School 2 pages are strictly scoped to Tenant 2"
  );

  // -----------------------------------------------------------------
  // 9. Onboarding Progression & Non-Regression (Step 6 -> Step 7)
  // -----------------------------------------------------------------
  console.log("\n9. Onboarding Progression & Non-Regression:");

  // Set mock school onboarding_step to 6 in localStorage
  const schoolKey1 = `myzkool_school_profile_${adminUserId1}`;
  localStorage.setItem(schoolKey1, JSON.stringify(mockSchool1));

  const progressRes1 = await saveWebsiteSetupProgress({
    schoolId: mockSchool1.id,
    userId: adminUserId1,
  });

  assert(progressRes1.success, "Saves website setup onboarding progress");

  const cachedSchoolAfter = JSON.parse(localStorage.getItem(schoolKey1) || "{}");
  assert(
    cachedSchoolAfter.onboarding_step === 7,
    "Advances school onboarding_step from 6 to 7 (Staff Setup)"
  );

  // Non-regression: If school was already at Step 8 (e.g. returning to edit website settings),
  // onboarding_step must NOT decrease
  const mockSchoolStep8 = { ...mockSchool1, onboarding_step: 8 };
  localStorage.setItem(schoolKey1, JSON.stringify(mockSchoolStep8));

  await saveWebsiteSetupProgress({
    schoolId: mockSchool1.id,
    userId: adminUserId1,
  });

  const cachedSchoolNonReg = JSON.parse(localStorage.getItem(schoolKey1) || "{}");
  assert(
    cachedSchoolNonReg.onboarding_step === 8,
    "Non-regression: Step 8 does not decrease when re-saving Website Setup"
  );

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
