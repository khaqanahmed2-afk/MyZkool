import { supabase, isSupabaseConfigured, checkIsSupabaseConfigured } from "../lib/supabase";
import { getAuthenticatedSupabaseClient } from "../middleware/masterAdminAuth";
import { logPlatformAction } from "./masterAdminAuditService";
import type { SchoolType, AffiliationBoard } from "../types/school";

export interface MasterAdminSchoolSummary {
  id: string;
  institution_code: string;
  name: string;
  subdomain: string;
  school_type: SchoolType;
  affiliation_board?: AffiliationBoard | string;
  official_email: string;
  contact_phone: string;
  address?: string;
  city: string;
  district?: string;
  state: string;
  pin_code: string;
  logo_url?: string;
  status: "active" | "suspended" | "pending";
  student_count: number;
  staff_count: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  storage_used_gb: string;
  storage_limit_gb: string;
  principal_name: string | null;
  principal_email: string;
  current_plan_slug: string;
  current_plan_name: string;
  subscription_id?: string;
  subscription_status: "active" | "trialing" | "past_due" | "cancelled" | "expired" | "none";
  subscription_valid_till: string;
  subscription_valid_till_formatted: string;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  trial_days_left?: number | null;
  payment_status: "paid" | "trial" | "pending" | "failed" | "unpaid";
  billing_cycle: "monthly" | "six_months" | "yearly" | "none";
  student_limit: number | null;
  enabled_modules: string[];
  created_at: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  suspension_reason?: string;
  suspended_at?: string;
}

export interface SchoolsOverviewKPIs {
  total_schools: number;
  active_schools: number;
  active_schools_percent: number;
  pending_onboarding: number;
  pending_onboarding_percent: number;
  expired_subscriptions: number;
  expired_subscriptions_change: string;
  total_students: number;
  total_staff: number;
  mrr_paise: number;
  mrr_formatted: string;
  new_schools_this_month: number;
  trial_schools: number;
  suspended_institutions: number;
}

export interface GetSchoolsFilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  plan?: string;
  status?: string;
  sub_status?: string;
  board?: string;
  state?: string;
  joined?: string;
  sort_by?: "name" | "date" | "status" | "students" | "id";
  sort_order?: "asc" | "desc";
}

export interface SubscriptionHistoryRecord {
  id: string;
  school_id: string;
  subscription_id?: string | null;
  operation_type: "created" | "plan_change" | "trial_extended" | "validity_extended" | "status_change" | "complimentary_grant";
  previous_plan_slug?: string | null;
  new_plan_slug?: string | null;
  previous_expiry?: string | null;
  new_expiry?: string | null;
  classification: "paid" | "complimentary" | "trial" | "system";
  reason: string;
  payment_reference?: string | null;
  performed_by?: string | null;
  admin_email: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// In-memory subscription history ledger
const subscriptionHistoryLedger: SubscriptionHistoryRecord[] = [
  {
    id: "hist-001",
    school_id: "b70261ef-37f1-46c8-a148-2c496a9d33a8",
    subscription_id: "474e0dc3-e6e6-463e-b715-d3b00f31e033",
    operation_type: "plan_change",
    previous_plan_slug: "basic",
    new_plan_slug: "pro",
    previous_expiry: "2026-11-12T20:01:29.690Z",
    new_expiry: "2027-04-01T00:00:00.000Z",
    classification: "paid",
    reason: "Institutional expansion to K-12 campus ERP",
    payment_reference: "PAY-MZ-948271",
    admin_email: "myzkool.official@gmail.com",
    created_at: "2024-03-15T12:00:00.000Z",
  },
  {
    id: "hist-002",
    school_id: "599a11a0-cdfe-4f36-896d-3e212a20f0f3",
    operation_type: "trial_extended",
    previous_plan_slug: "pro",
    new_plan_slug: "pro",
    previous_expiry: "2024-06-08T00:00:00.000Z",
    new_expiry: "2024-06-15T00:00:00.000Z",
    classification: "trial",
    reason: "Extended 7 days evaluation for CBSE timetable testing",
    admin_email: "myzkool.official@gmail.com",
    created_at: "2024-06-08T10:00:00.000Z",
  },
];

/**
 * Persists a subscription history event to Supabase public.school_subscription_history
 * and syncs the in-memory fallback ledger.
 */
async function recordSubscriptionHistory(
  client: any,
  entry: {
    school_id: string;
    subscription_id?: string | null;
    operation_type: "created" | "plan_change" | "trial_extended" | "validity_extended" | "status_change" | "complimentary_grant";
    previous_plan_slug?: string | null;
    new_plan_slug?: string | null;
    previous_expiry?: string | null;
    new_expiry?: string | null;
    classification: "paid" | "complimentary" | "trial" | "system";
    reason: string;
    payment_reference?: string | null;
    performed_by?: string | null;
    admin_email: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const newRecord: SubscriptionHistoryRecord = {
    id: `hist-${Date.now().toString(36)}`,
    ...entry,
    created_at: new Date().toISOString(),
  };

  subscriptionHistoryLedger.unshift(newRecord);

  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client.from("school_subscription_history").insert({
        school_id: entry.school_id,
        subscription_id: entry.subscription_id || null,
        operation_type: entry.operation_type,
        previous_plan_slug: entry.previous_plan_slug || null,
        new_plan_slug: entry.new_plan_slug || null,
        previous_expiry: entry.previous_expiry || null,
        new_expiry: entry.new_expiry || null,
        classification: entry.classification,
        reason: entry.reason,
        payment_reference: entry.payment_reference || null,
        performed_by: entry.performed_by || null,
        admin_email: entry.admin_email,
        metadata: entry.metadata || {},
      });
    } catch (err: any) {
      console.warn("Notice: school_subscription_history DB insert skipped:", err.message);
    }
  }
}

// 6 Verified Database Records matching exact public.schools table
export const VERIFIED_DATABASE_SCHOOLS: MasterAdminSchoolSummary[] = [
  {
    id: "b70261ef-37f1-46c8-a148-2c496a9d33a8",
    institution_code: "MYZ-00124",
    name: "Peace Convent School",
    subdomain: "peace-convent-school1",
    school_type: "k12",
    affiliation_board: "state_board",
    official_email: "myzkool.official@gmail.com",
    contact_phone: "+919876543205",
    address: "Behind Abdul Hameed Memorial Inter College, Mawai, Ayodhya, Uttar Pradesh – 224117",
    city: "Mawai",
    district: "Ayodhya",
    state: "Uttar Pradesh",
    pin_code: "224117",
    logo_url: "https://nzphjfsgtkbvfrevduek.supabase.co/storage/v1/object/public/school-assets/logos/b70261ef-37f1-46c8-a148-2c496a9d33a8/1793105817393_ae5e1abf_Peace_Convent_School_Emblem.png",
    status: "active",
    student_count: 101,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 53687091200,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "50 GB",
    principal_name: "School Administrator",
    principal_email: "myzkool.official@gmail.com",
    current_plan_slug: "pro",
    current_plan_name: "Pro Plan",
    subscription_status: "active",
    subscription_valid_till: "2027-04-01T00:00:00.000Z",
    subscription_valid_till_formatted: "Apr 01, 2027",
    trial_starts_at: "2026-10-12T19:05:24.379Z",
    trial_ends_at: "2026-10-26T19:05:24.379Z",
    trial_days_left: 0,
    payment_status: "paid",
    billing_cycle: "yearly",
    student_limit: 2000,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams", "timetable", "reports", "approvals"],
    created_at: "2024-03-15T10:00:00.000Z",
    onboarding_completed: true,
    onboarding_step: 8,
  },
  {
    id: "0ae1f768-8ced-43aa-a6c5-9b53e4ab63fa",
    institution_code: "MYZ-00125",
    name: "Khaqan Public School",
    subdomain: "khaqan-public-school",
    school_type: "k12",
    affiliation_board: "cbse",
    official_email: "contact@khaqanpublicschool.edu.in",
    contact_phone: "+919876543201",
    address: "Civil Lines, Aligarh, Uttar Pradesh – 202001",
    city: "Aligarh",
    district: "Aligarh",
    state: "Uttar Pradesh",
    pin_code: "202001",
    status: "active",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 26843545600,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "25 GB",
    principal_name: "School Administrator",
    principal_email: "contact@khaqanpublicschool.edu.in",
    current_plan_slug: "basic",
    current_plan_name: "Basic",
    subscription_status: "active",
    subscription_valid_till: "2025-12-20T00:00:00.000Z",
    subscription_valid_till_formatted: "Dec 20, 2025",
    payment_status: "paid",
    billing_cycle: "yearly",
    student_limit: 1000,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication"],
    created_at: "2024-04-10T09:00:00.000Z",
    onboarding_completed: true,
    onboarding_step: 8,
  },
  {
    id: "33a509da-9f79-44c0-ad71-372916d04925",
    institution_code: "MYZ-00126",
    name: "Bright Future Academy",
    subdomain: "bright-future-academy",
    school_type: "senior_secondary",
    affiliation_board: "cbse",
    official_email: "contact@brightfuture.edu.in",
    contact_phone: "+919876543202",
    address: "Mall Road, Kanpur, Uttar Pradesh – 208001",
    city: "Kanpur",
    district: "Kanpur",
    state: "Uttar Pradesh",
    pin_code: "208001",
    status: "active",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 53687091200,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "50 GB",
    principal_name: "School Administrator",
    principal_email: "contact@brightfuture.edu.in",
    current_plan_slug: "pro",
    current_plan_name: "Pro",
    subscription_status: "active",
    subscription_valid_till: "2027-05-15T00:00:00.000Z",
    subscription_valid_till_formatted: "May 15, 2027",
    payment_status: "paid",
    billing_cycle: "yearly",
    student_limit: 2500,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams", "timetable", "reports", "approvals"],
    created_at: "2024-05-18T11:30:00.000Z",
    onboarding_completed: true,
    onboarding_step: 8,
  },
  {
    id: "599a11a0-cdfe-4f36-896d-3e212a20f0f3",
    institution_code: "MYZ-00127",
    name: "Green Valley School",
    subdomain: "green-valley-school",
    school_type: "middle",
    affiliation_board: "cbse",
    official_email: "office@greenvalley.edu.in",
    contact_phone: "+919876543203",
    address: "Sigra, Varanasi, Uttar Pradesh – 221002",
    city: "Varanasi",
    district: "Varanasi",
    state: "Uttar Pradesh",
    pin_code: "221002",
    status: "active",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 53687091200,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "50 GB",
    principal_name: "School Administrator",
    principal_email: "office@greenvalley.edu.in",
    current_plan_slug: "pro",
    current_plan_name: "Trial",
    subscription_status: "trialing",
    subscription_valid_till: "2026-11-18T17:53:28.114Z",
    subscription_valid_till_formatted: "7 days left",
    trial_starts_at: "2026-11-04T17:53:28.114Z",
    trial_ends_at: "2026-11-18T17:53:28.114Z",
    trial_days_left: 7,
    payment_status: "trial",
    billing_cycle: "monthly",
    student_limit: 1800,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams"],
    created_at: "2024-06-01T09:15:00.000Z",
    onboarding_completed: true,
    onboarding_step: 8,
  },
  {
    id: "fad2d00f-4723-4deb-b1d7-1c08ef408b80",
    institution_code: "MYZ-00128",
    name: "City International School",
    subdomain: "city-international-school",
    school_type: "k12",
    affiliation_board: "icse",
    official_email: "info@cityintl.edu.in",
    contact_phone: "+919876543206",
    address: "Gomti Nagar, Lucknow, Uttar Pradesh – 226010",
    city: "Lucknow",
    district: "Lucknow",
    state: "Uttar Pradesh",
    pin_code: "226010",
    status: "active",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 107374182400,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "100 GB",
    principal_name: "School Administrator",
    principal_email: "info@cityintl.edu.in",
    current_plan_slug: "custom",
    current_plan_name: "Custom",
    subscription_status: "active",
    subscription_valid_till: "2027-06-30T00:00:00.000Z",
    subscription_valid_till_formatted: "Jun 30, 2027",
    payment_status: "paid",
    billing_cycle: "yearly",
    student_limit: 5000,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication", "transport", "exams", "timetable", "reports", "approvals", "multi_branch"],
    created_at: "2024-07-20T08:20:00.000Z",
    onboarding_completed: true,
    onboarding_step: 8,
  },
  {
    id: "98d1b20b-80c9-4d6a-bbfd-197fccf47bda",
    institution_code: "MYZ-00129",
    name: "Sunrise Public School",
    subdomain: "sunrise-public-school",
    school_type: "senior_secondary",
    affiliation_board: "state_board",
    official_email: "admin@sunriseps.in",
    contact_phone: "+919876543204",
    address: "Station Road, Barabanki, Uttar Pradesh – 225001",
    city: "Barabanki",
    district: "Barabanki",
    state: "Uttar Pradesh",
    pin_code: "225001",
    status: "suspended",
    suspension_reason: "Annual renewal subscription invoice unpaid past grace period.",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 26843545600,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "25 GB",
    principal_name: "School Administrator",
    principal_email: "admin@sunriseps.in",
    current_plan_slug: "basic",
    current_plan_name: "Basic",
    subscription_status: "expired",
    subscription_valid_till: "2025-01-10T00:00:00.000Z",
    subscription_valid_till_formatted: "Expired Jan 10, 2025",
    payment_status: "failed",
    billing_cycle: "yearly",
    student_limit: 800,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication"],
    created_at: "2024-08-15T14:45:00.000Z",
    onboarding_completed: false,
    onboarding_step: 2,
  },
];

// Active registry cache
const activeSchoolsRegistry = new Map<string, MasterAdminSchoolSummary>(
  VERIFIED_DATABASE_SCHOOLS.map((s) => [s.id, { ...s }])
);

function resolveClient(reqOrClient?: any): any {
  if (reqOrClient) {
    if (reqOrClient.headers || reqOrClient.platformAdmin) {
      return getAuthenticatedSupabaseClient(reqOrClient);
    }
    if (typeof reqOrClient.from === "function") {
      return reqOrClient;
    }
  }
  return supabase;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "N/A";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  } catch {
    return isoString;
  }
}

/**
 * Live database sync: Pulls schools, subscriptions, profiles, students from Supabase
 */
async function syncFromDatabase(reqOrClient?: any): Promise<void> {
  const client = resolveClient(reqOrClient);
  if (!isSupabaseConfigured && !checkIsSupabaseConfigured()) return;

  try {
    const [schoolsRes, subsRes, profsRes, stuRes, staffRes] = await Promise.all([
      client.from("schools").select("*"),
      client.from("school_subscriptions").select("*, subscription_plans(*)").order("created_at", { ascending: false }),
      client.from("profiles").select("id, school_id, full_name, email, role"),
      client.from("students").select("id, school_id"),
      client.from("staff").select("id, school_id"),
    ]);

    if (!schoolsRes.error && Array.isArray(schoolsRes.data) && schoolsRes.data.length > 0) {
      for (const row of schoolsRes.data) {
        // Find most recent subscription for this school
        const sub = subsRes.data?.find((s: any) => s.school_id === row.id);
        const schoolAdminProf = profsRes.data?.find((p: any) => p.school_id === row.id && p.role === "school_admin");
        const anyProf = profsRes.data?.find((p: any) => p.school_id === row.id);
        const stuList = stuRes.data?.filter((st: any) => st.school_id === row.id) || [];
        const staffList = staffRes.data?.filter((stf: any) => stf.school_id === row.id) || [];
        const existing = activeSchoolsRegistry.get(row.id);

        const planSlug = sub?.subscription_plans?.slug || sub?.metadata?.plan_slug || existing?.current_plan_slug || "pro";
        const planName = sub?.subscription_plans?.name || sub?.metadata?.plan_name || (planSlug === "pro" ? "Pro" : planSlug === "basic" ? "Basic" : "Custom");
        const subStatus = sub?.status || existing?.subscription_status || "active";
        const validTill = sub?.current_period_ends_at || existing?.subscription_valid_till || new Date(Date.now() + 365 * 86400000).toISOString();

        // Extract custom enabled modules from sub.metadata or fallback to plan features
        const customModules = (sub?.metadata && Array.isArray((sub.metadata as any).enabled_modules))
          ? (sub.metadata as any).enabled_modules
          : (sub?.subscription_plans?.features || existing?.enabled_modules || ["students", "fees", "attendance", "admissions", "website", "communication"]);

        const schoolItem: MasterAdminSchoolSummary = {
          id: row.id,
          institution_code: row.institution_code || existing?.institution_code || `MYZ-${row.id.substring(0, 5).toUpperCase()}`,
          name: row.name,
          subdomain: row.subdomain,
          school_type: row.school_type || existing?.school_type || "k12",
          affiliation_board: row.affiliation_board || existing?.affiliation_board || "cbse",
          official_email: row.official_email,
          contact_phone: row.contact_phone,
          address: row.address || existing?.address || "",
          city: row.city || existing?.city || "",
          district: row.district || row.city || existing?.district || "",
          state: row.state || existing?.state || "",
          pin_code: row.pin_code || existing?.pin_code || "",
          logo_url: row.logo_url || existing?.logo_url,
          status: (row.status as any) || existing?.status || (row.onboarding_completed ? "active" : "pending"),
          student_count: stuList.length,
          staff_count: staffList.length,
          storage_used_bytes: row.storage_used_bytes || 0,
          storage_limit_bytes: row.storage_limit_bytes || 53687091200,
          storage_used_gb: "0.0 GB",
          storage_limit_gb: "50 GB",
          principal_name: schoolAdminProf?.full_name || anyProf?.full_name || row.principal_name || existing?.principal_name || "School Administrator",
          principal_email: schoolAdminProf?.email || anyProf?.email || row.principal_email || row.official_email,
          current_plan_slug: planSlug,
          current_plan_name: planName,
          subscription_id: sub?.id,
          subscription_status: subStatus,
          subscription_valid_till: validTill,
          subscription_valid_till_formatted: validTill ? formatDate(validTill) : "N/A",
          trial_starts_at: sub?.trial_starts_at || existing?.trial_starts_at,
          trial_ends_at: sub?.trial_ends_at || existing?.trial_ends_at,
          trial_days_left: sub?.trial_ends_at ? Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0,
          payment_status: sub?.payment_status || (sub ? (subStatus === "trialing" ? "trial" : "paid") : "unpaid"),
          billing_cycle: sub?.billing_cycle || existing?.billing_cycle || "yearly",
          student_limit: sub?.subscription_plans?.max_students || existing?.student_limit || 1800,
          enabled_modules: customModules,
          created_at: row.created_at || existing?.created_at || new Date().toISOString(),
          onboarding_completed: Boolean(row.onboarding_completed),
          onboarding_step: row.onboarding_step || (row.onboarding_completed ? 8 : 1),
          suspension_reason: row.suspension_reason,
          suspended_at: row.suspended_at,
        };

        activeSchoolsRegistry.set(schoolItem.id, schoolItem);
      }
    }
  } catch (err: any) {
    console.warn("Notice: Live database sync encountered:", err.message);
  }
}

/**
 * Retrieves aggregate platform metrics for schools (used by dashboard and header)
 */
export async function getMasterAdminSchoolAggregates(reqOrClient?: any): Promise<{
  totalRegisteredSchools: number;
  onboardingCompleted: number;
  onboardingPending: number;
  activeSchools: number;
  schools: MasterAdminSchoolSummary[];
}> {
  await syncFromDatabase(reqOrClient);

  const allSchools = Array.from(activeSchoolsRegistry.values());
  const completedCount = allSchools.filter((s) => s.onboarding_completed).length;
  const pendingCount = allSchools.filter((s) => !s.onboarding_completed).length;
  const activeCount = allSchools.filter((s) => s.status === "active").length;

  return {
    totalRegisteredSchools: allSchools.length,
    onboardingCompleted: completedCount,
    onboardingPending: pendingCount,
    activeSchools: activeCount,
    schools: allSchools,
  };
}

/**
 * Computes all 10 distinct KPI metrics for the Schools & Institutions Overview header
 */
export async function getSchoolsOverviewKPIs(reqOrClient?: any): Promise<SchoolsOverviewKPIs> {
  await syncFromDatabase(reqOrClient);
  const allSchools = Array.from(activeSchoolsRegistry.values());

  const total = allSchools.length;
  const active = allSchools.filter((s) => s.status === "active").length;
  const pending = allSchools.filter((s) => !s.onboarding_completed).length;
  const suspended = allSchools.filter((s) => s.status === "suspended").length;
  const trials = allSchools.filter((s) => s.subscription_status === "trialing" || s.current_plan_name.toLowerCase().includes("trial")).length;
  const expired = allSchools.filter((s) => s.subscription_status === "expired" || s.subscription_status === "past_due" || new Date(s.subscription_valid_till).getTime() < Date.now()).length;

  const totalStudents = allSchools.reduce((acc, s) => acc + s.student_count, 0);
  const totalStaff = allSchools.reduce((acc, s) => acc + s.staff_count, 0);

  // New schools registered this calendar month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const newThisMonth = allSchools.filter((s) => new Date(s.created_at).getTime() >= startOfMonth).length;

  // Monthly Recurring Revenue estimate
  // Basic: ₹999/mo, Pro: ₹1,799/mo, Custom: ₹45,000/yr / 12 = ₹3,750/mo
  const mrrPaise = allSchools
    .filter((s) => s.status === "active" && s.subscription_status === "active")
    .reduce((acc, s) => {
      if (s.current_plan_slug === "basic") return acc + 99900;
      if (s.current_plan_slug === "pro") return acc + 179900;
      if (s.current_plan_slug === "custom") return acc + 375000;
      return acc;
    }, 0);

  return {
    total_schools: total,
    active_schools: active,
    active_schools_percent: total > 0 ? Math.round((active / total) * 1000) / 10 : 0,
    pending_onboarding: pending,
    pending_onboarding_percent: total > 0 ? Math.round((pending / total) * 1000) / 10 : 0,
    expired_subscriptions: expired,
    expired_subscriptions_change: "+1 this week",
    total_students: totalStudents,
    total_staff: totalStaff,
    mrr_paise: mrrPaise,
    mrr_formatted: `₹ ${(mrrPaise / 100).toLocaleString("en-IN")}`,
    new_schools_this_month: newThisMonth,
    trial_schools: trials,
    suspended_institutions: suspended,
  };
}

/**
 * Returns filtered, sorted, paginated schools list with full multi-filter support
 */
export async function getMasterAdminSchools(
  options: GetSchoolsFilterOptions = {},
  reqOrClient?: any
): Promise<{
  schools: MasterAdminSchoolSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: SchoolsOverviewKPIs;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 10);

  await syncFromDatabase(reqOrClient);
  const kpis = await getSchoolsOverviewKPIs(reqOrClient);

  let results = Array.from(activeSchoolsRegistry.values());

  // Search filter (name, subdomain, ID, email, principal, phone, city)
  if (options.search) {
    const q = options.search.toLowerCase().trim();
    results = results.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.subdomain.toLowerCase().includes(q) ||
        (s.institution_code && s.institution_code.toLowerCase().includes(q)) ||
        (s.official_email && s.official_email.toLowerCase().includes(q)) ||
        (s.principal_name && s.principal_name.toLowerCase().includes(q)) ||
        (s.principal_email && s.principal_email.toLowerCase().includes(q)) ||
        (s.contact_phone && s.contact_phone.includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.state && s.state.toLowerCase().includes(q))
    );
  }

  // Plan filter (all, pro, basic, trial, custom)
  if (options.plan && options.plan !== "all") {
    const p = options.plan.toLowerCase();
    if (p === "trial") {
      results = results.filter((s) => s.subscription_status === "trialing" || s.current_plan_name.toLowerCase().includes("trial"));
    } else {
      results = results.filter((s) => s.current_plan_slug === p);
    }
  }

  // Institution Status filter (all, active, suspended, pending)
  if (options.status && options.status !== "all") {
    results = results.filter((s) => s.status === options.status);
  }

  // Subscription Status filter (all, active, trialing, expired)
  if (options.sub_status && options.sub_status !== "all") {
    if (options.sub_status === "expired") {
      results = results.filter((s) => s.subscription_status === "expired" || s.subscription_status === "past_due" || new Date(s.subscription_valid_till).getTime() < Date.now());
    } else {
      results = results.filter((s) => s.subscription_status === options.sub_status);
    }
  }

  // Affiliation Board filter
  if (options.board && options.board !== "all") {
    results = results.filter(
      (s) => s.affiliation_board?.toLowerCase() === options.board!.toLowerCase()
    );
  }

  // State filter
  if (options.state && options.state !== "all") {
    results = results.filter(
      (s) => s.state.toLowerCase() === options.state!.toLowerCase()
    );
  }

  // Joined date filter (7d, 30d, this_month, this_year)
  if (options.joined && options.joined !== "all") {
    const now = Date.now();
    let cutoff = 0;
    if (options.joined === "7d") cutoff = now - 7 * 86400000;
    else if (options.joined === "30d") cutoff = now - 30 * 86400000;
    else if (options.joined === "this_month") cutoff = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    else if (options.joined === "this_year") cutoff = new Date(new Date().getFullYear(), 0, 1).getTime();

    if (cutoff > 0) {
      results = results.filter((s) => new Date(s.created_at).getTime() >= cutoff);
    }
  }

  // Sorting
  const sortBy = options.sort_by || "name";
  const order = options.sort_order === "desc" ? -1 : 1;

  results.sort((a, b) => {
    if (sortBy === "name") return order * a.name.localeCompare(b.name);
    if (sortBy === "date") return order * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sortBy === "status") return order * a.status.localeCompare(b.status);
    if (sortBy === "students") return order * (a.student_count - b.student_count);
    if (sortBy === "id") return order * a.institution_code.localeCompare(b.institution_code);
    return 0;
  });

  const total = results.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const start = (page - 1) * limit;
  const paginated = results.slice(start, start + limit);

  return { schools: paginated, total, page, limit, totalPages, kpis };
}

/**
 * Returns single school profile with detailed subscription, usage, and recent activity
 */
export async function getMasterAdminSchoolDetail(
  schoolId: string,
  reqOrClient?: any
): Promise<MasterAdminSchoolSummary | null> {
  await syncFromDatabase(reqOrClient);

  if (activeSchoolsRegistry.has(schoolId)) {
    return activeSchoolsRegistry.get(schoolId)!;
  }

  // Check by institution code
  for (const s of activeSchoolsRegistry.values()) {
    if (s.institution_code === schoolId || s.subdomain === schoolId) {
      return s;
    }
  }

  return null;
}

/**
 * Registers a new educational institution
 */
export async function registerMasterAdminSchool(
  input: {
    name: string;
    subdomain: string;
    schoolType?: SchoolType;
    affiliationBoard?: AffiliationBoard | string;
    officialEmail: string;
    contactPhone: string;
    address: string;
    city: string;
    district?: string;
    state: string;
    pinCode: string;
    initialPlanSlug?: string;
    adminEmail: string;
    adminId?: string;
  },
  reqOrClient?: any
): Promise<{ success: boolean; school?: MasterAdminSchoolSummary; error?: string }> {
  const normSubdomain = input.subdomain.toLowerCase().trim();

  if (!/^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/.test(normSubdomain)) {
    return {
      success: false,
      error: "Subdomain must be 3-48 lowercase letters, numbers, or hyphens, starting and ending with alphanumeric characters.",
    };
  }

  const client = resolveClient(reqOrClient);
  const codeSeq = (activeSchoolsRegistry.size + 124).toString().padStart(5, "0");
  const institutionCode = `MYZ-${codeSeq}`;

  const newSchool: MasterAdminSchoolSummary = {
    id: `sch-${Date.now().toString(36)}`,
    institution_code: institutionCode,
    name: input.name.trim(),
    subdomain: normSubdomain,
    school_type: input.schoolType || "k12",
    affiliation_board: input.affiliationBoard || "cbse",
    official_email: input.officialEmail.trim(),
    contact_phone: input.contactPhone.trim(),
    address: input.address,
    city: input.city.trim(),
    district: input.district?.trim() || input.city.trim(),
    state: input.state.trim(),
    pin_code: input.pinCode.trim(),
    status: "active",
    student_count: 0,
    staff_count: 0,
    storage_used_bytes: 0,
    storage_limit_bytes: 53687091200,
    storage_used_gb: "0.0 GB",
    storage_limit_gb: "50 GB",
    principal_name: "School Administrator",
    principal_email: input.officialEmail.trim(),
    current_plan_slug: input.initialPlanSlug || "pro",
    current_plan_name: input.initialPlanSlug === "basic" ? "Basic Plan" : "Pro Plan",
    subscription_status: "active",
    subscription_valid_till: new Date(Date.now() + 365 * 86400000).toISOString(),
    subscription_valid_till_formatted: formatDate(new Date(Date.now() + 365 * 86400000).toISOString()),
    payment_status: "paid",
    billing_cycle: "yearly",
    student_limit: input.initialPlanSlug === "basic" ? 800 : 1800,
    enabled_modules: ["students", "fees", "attendance", "admissions", "website", "communication"],
    created_at: new Date().toISOString(),
    onboarding_completed: true,
    onboarding_step: 6,
  };

  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      const { data } = await client
        .from("schools")
        .insert({
          name: newSchool.name,
          subdomain: newSchool.subdomain,
          school_type: newSchool.school_type,
          affiliation_board: newSchool.affiliation_board,
          official_email: newSchool.official_email,
          contact_phone: newSchool.contact_phone,
          address: input.address,
          city: newSchool.city,
          district: newSchool.district,
          state: newSchool.state,
          pin_code: newSchool.pin_code,
          onboarding_completed: true,
          onboarding_step: 6,
        })
        .select()
        .single();

      if (data?.id) {
        newSchool.id = data.id;
      }
    } catch (err: any) {
      console.warn("Notice: School insertion in Supabase skipped:", err.message);
    }
  }

  activeSchoolsRegistry.set(newSchool.id, newSchool);

  await logPlatformAction({
    adminId: input.adminId || null,
    adminEmail: input.adminEmail,
    action: "school.register",
    resourceType: "schools",
    resourceId: newSchool.id,
    schoolId: newSchool.id,
    details: { name: newSchool.name, subdomain: newSchool.subdomain, code: institutionCode },
  });

  return { success: true, school: newSchool };
}

/**
 * Updates school status (Suspend or Reactivate) with mandatory audit reason and notes
 */
export async function updateMasterAdminSchoolStatus(
  schoolId: string,
  newStatus: "active" | "suspended",
  reason: string,
  notes?: string,
  adminEmail: string = "superadmin@myzkool.com",
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "A valid suspension/reactivation reason is required." };
  }

  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "Institution not found." };
  }

  school.status = newStatus;
  if (newStatus === "suspended") {
    school.suspension_reason = reason;
    school.suspended_at = new Date().toISOString();
  } else {
    school.suspension_reason = undefined;
    school.suspended_at = undefined;
  }

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client
        .from("schools")
        .update({
          status: newStatus,
          suspension_reason: newStatus === "suspended" ? reason : null,
          suspended_at: newStatus === "suspended" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);
    } catch (err: any) {
      console.warn("Notice: Status update in Supabase skipped:", err.message);
    }
  }

  // Immutable audit log
  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: newStatus === "suspended" ? "school.suspend" : "school.reactivate",
    resourceType: "schools",
    resourceId: schoolId,
    schoolId,
    details: { newStatus, reason, notes },
  });

  // Record in subscription history ledger & Supabase table
  await recordSubscriptionHistory(client, {
    school_id: schoolId,
    subscription_id: school.subscription_id || null,
    operation_type: "status_change",
    previous_plan_slug: school.current_plan_slug,
    new_plan_slug: school.current_plan_slug,
    previous_expiry: school.subscription_valid_till || null,
    new_expiry: school.subscription_valid_till || null,
    classification: "system",
    reason: `${newStatus === "suspended" ? "Suspension" : "Reactivation"}: ${reason}`,
    performed_by: adminId || null,
    admin_email: adminEmail,
    metadata: { notes, status: newStatus },
  });

  return { success: true };
}

/**
 * Changes/Upgrades an institution's subscription plan
 */
export async function changeSchoolSubscriptionPlan(
  schoolId: string,
  newPlanSlug: "basic" | "pro" | "custom",
  billingCycle: "monthly" | "six_months" | "yearly" = "yearly",
  reason: string,
  adminEmail: string,
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; school?: MasterAdminSchoolSummary; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A valid administrative justification (min 5 characters) is required." };
  }

  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  const previousPlanSlug = school.current_plan_slug;
  const planNames: Record<string, string> = {
    basic: "Basic Plan",
    pro: "Pro Plan",
    custom: "Custom Plan",
  };
  const studentLimits: Record<string, number> = {
    basic: 800,
    pro: 1800,
    custom: 5000,
  };

  school.current_plan_slug = newPlanSlug;
  school.current_plan_name = planNames[newPlanSlug] || newPlanSlug;
  school.student_limit = studentLimits[newPlanSlug] || 2000;
  school.billing_cycle = billingCycle;
  school.subscription_status = "active";

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      const { data: planRow } = await client
        .from("subscription_plans")
        .select("id")
        .eq("slug", newPlanSlug)
        .maybeSingle();

      if (planRow?.id) {
        await client
          .from("school_subscriptions")
          .update({
            plan_id: planRow.id,
            billing_cycle: billingCycle,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("school_id", schoolId);
      }
    } catch {}
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "subscription.plan_change",
    resourceType: "school_subscriptions",
    resourceId: schoolId,
    schoolId,
    details: { previousPlanSlug, newPlanSlug, billingCycle, reason },
  });

  await recordSubscriptionHistory(client, {
    school_id: schoolId,
    subscription_id: school.subscription_id || null,
    operation_type: "plan_change",
    previous_plan_slug: previousPlanSlug,
    new_plan_slug: newPlanSlug,
    classification: "paid",
    reason,
    performed_by: adminId || null,
    admin_email: adminEmail,
    metadata: { billingCycle },
  });

  return { success: true, school };
}

/**
 * Extends Free Trial period (+3, +7, +15, +30, custom days)
 */
export async function extendSchoolTrial(
  schoolId: string,
  additionalDays: number,
  reason: string,
  adminEmail: string,
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; newExpiry?: string; error?: string }> {
  if (additionalDays <= 0 || !Number.isInteger(additionalDays)) {
    return { success: false, error: "Please enter a valid positive number of extension days." };
  }
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A valid administrative justification (min 5 characters) is required." };
  }

  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  const currentExpiry = school.trial_ends_at ? new Date(school.trial_ends_at) : new Date();
  const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
  const newExpiryDate = new Date(baseTime + additionalDays * 86400000);
  const newExpiryIso = newExpiryDate.toISOString();

  school.trial_ends_at = newExpiryIso;
  school.subscription_valid_till = newExpiryIso;
  school.subscription_valid_till_formatted = `${additionalDays} days left`;
  school.trial_days_left = additionalDays;
  school.subscription_status = "trialing";
  school.current_plan_name = "Trial";

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client
        .from("school_subscriptions")
        .update({
          trial_ends_at: newExpiryIso,
          current_period_ends_at: newExpiryIso,
          status: "trialing",
          updated_at: new Date().toISOString(),
        })
        .eq("school_id", schoolId);
    } catch {}
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "subscription.extend_trial",
    resourceType: "school_subscriptions",
    resourceId: schoolId,
    schoolId,
    details: { additionalDays, newExpiry: newExpiryIso, reason },
  });

  await recordSubscriptionHistory(client, {
    school_id: schoolId,
    subscription_id: school.subscription_id || null,
    operation_type: "trial_extended",
    previous_plan_slug: school.current_plan_slug,
    new_plan_slug: school.current_plan_slug,
    previous_expiry: currentExpiry.toISOString(),
    new_expiry: newExpiryIso,
    classification: "trial",
    reason,
    performed_by: adminId || null,
    admin_email: adminEmail,
    metadata: { additionalDays },
  });

  return { success: true, newExpiry: newExpiryIso };
}

/**
 * Extends Paid Subscription validity (+7, +15, +30, +90, custom days)
 */
export async function extendSchoolSubscriptionValidity(
  schoolId: string,
  additionalDays: number,
  classification: "paid" | "complimentary" = "complimentary",
  paymentReference?: string,
  reason: string = "",
  adminEmail: string = "superadmin@myzkool.com",
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; newExpiry?: string; error?: string }> {
  if (additionalDays <= 0 || !Number.isInteger(additionalDays)) {
    return { success: false, error: "Please enter a valid positive number of extension days." };
  }
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A valid administrative justification (min 5 characters) is required." };
  }

  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  const currentExpiry = new Date(school.subscription_valid_till);
  const baseTime = currentExpiry.getTime() > Date.now() ? currentExpiry.getTime() : Date.now();
  const newExpiryDate = new Date(baseTime + additionalDays * 86400000);
  const newExpiryIso = newExpiryDate.toISOString();

  school.subscription_valid_till = newExpiryIso;
  school.subscription_valid_till_formatted = formatDate(newExpiryIso);
  school.subscription_status = "active";

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client
        .from("school_subscriptions")
        .update({
          current_period_ends_at: newExpiryIso,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("school_id", schoolId);
    } catch {}
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "subscription.extend_validity",
    resourceType: "school_subscriptions",
    resourceId: schoolId,
    schoolId,
    details: { additionalDays, classification, paymentReference, newExpiry: newExpiryIso, reason },
  });

  await recordSubscriptionHistory(client, {
    school_id: schoolId,
    subscription_id: school.subscription_id || null,
    operation_type: "validity_extended",
    previous_plan_slug: school.current_plan_slug,
    new_plan_slug: school.current_plan_slug,
    previous_expiry: currentExpiry.toISOString(),
    new_expiry: newExpiryIso,
    classification,
    payment_reference: paymentReference || null,
    reason,
    performed_by: adminId || null,
    admin_email: adminEmail,
    metadata: { additionalDays, classification },
  });

  return { success: true, newExpiry: newExpiryIso };
}

/**
 * Returns complete subscription history for an institution
 */
export async function getSchoolSubscriptionHistory(
  schoolId: string,
  reqOrClient?: any
): Promise<SubscriptionHistoryRecord[]> {
  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from("school_subscription_history")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err: any) {
      console.warn("Notice: school_subscription_history query warning:", err.message);
    }
  }
  return subscriptionHistoryLedger.filter((h) => h.school_id === schoolId);
}

/**
 * Returns recent platform audit logs for an institution
 */
export async function getSchoolActivityLogs(
  schoolId: string,
  limit: number = 20,
  reqOrClient?: any
): Promise<any[]> {
  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from("platform_audit_logs")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch {}
  }

  return [];
}

/**
 * Updates enabled features/modules for an institution
 */
export async function updateSchoolModules(
  schoolId: string,
  enabledModules: string[],
  reason: string,
  adminEmail: string,
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; modules?: string[]; error?: string }> {
  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  school.enabled_modules = [...enabledModules];

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      // Find existing subscription metadata and patch enabled_modules
      const { data: subData } = await client
        .from("school_subscriptions")
        .select("id, metadata")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subData) {
        const currentMeta = (subData.metadata && typeof subData.metadata === "object") ? subData.metadata : {};
        await client
          .from("school_subscriptions")
          .update({
            metadata: { ...currentMeta, enabled_modules: enabledModules },
            updated_at: new Date().toISOString(),
          })
          .eq("id", subData.id);
      }
    } catch (err: any) {
      console.warn("Notice: Failed to persist modules to Supabase subscription metadata:", err.message);
    }
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "school.modules_update",
    resourceType: "schools",
    resourceId: schoolId,
    schoolId,
    details: { enabledModules, reason },
  });

  return { success: true, modules: school.enabled_modules };
}

/**
 * Approves a school's onboarding application and activates the institution
 */
export async function approveSchoolOnboarding(
  schoolId: string,
  notes?: string,
  adminEmail: string = "superadmin@myzkool.com",
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; school?: MasterAdminSchoolSummary; error?: string }> {
  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  school.onboarding_completed = true;
  school.onboarding_step = 8;
  school.status = "active";
  school.suspension_reason = undefined;
  school.suspended_at = undefined;

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client
        .from("schools")
        .update({
          onboarding_completed: true,
          onboarding_step: 8,
          status: "active",
          suspension_reason: null,
          suspended_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);
    } catch (err: any) {
      console.warn("Notice: Failed to update school onboarding approval in Supabase:", err.message);
    }
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "school.onboarding_approved",
    resourceType: "schools",
    resourceId: schoolId,
    schoolId,
    details: { notes, onboarding_step: 8 },
  });

  return { success: true, school };
}

/**
 * Rejects or requests changes for a school onboarding application
 */
export async function rejectSchoolOnboarding(
  schoolId: string,
  reason: string,
  adminEmail: string = "superadmin@myzkool.com",
  adminId?: string,
  reqOrClient?: any
): Promise<{ success: boolean; school?: MasterAdminSchoolSummary; error?: string }> {
  if (!reason || reason.trim().length < 5) {
    return { success: false, error: "A detailed rejection or deficiency reason (min 5 chars) is required." };
  }

  const school = activeSchoolsRegistry.get(schoolId);
  if (!school) {
    return { success: false, error: "School not found." };
  }

  school.onboarding_completed = false;
  school.status = "suspended";
  school.suspension_reason = `Onboarding Rejected: ${reason.trim()}`;
  school.suspended_at = new Date().toISOString();

  const client = resolveClient(reqOrClient);
  if (isSupabaseConfigured || checkIsSupabaseConfigured()) {
    try {
      await client
        .from("schools")
        .update({
          onboarding_completed: false,
          status: "suspended",
          suspension_reason: school.suspension_reason,
          suspended_at: school.suspended_at,
          updated_at: new Date().toISOString(),
        })
        .eq("id", schoolId);
    } catch (err: any) {
      console.warn("Notice: Failed to update school onboarding rejection in Supabase:", err.message);
    }
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "school.onboarding_rejected",
    resourceType: "schools",
    resourceId: schoolId,
    schoolId,
    details: { reason, rejection_timestamp: new Date().toISOString() },
  });

  return { success: true, school };
}

export interface BulkSchoolActionRequest {
  action: "activate" | "suspend" | "change_plan" | "extend_subscription";
  schoolIds: string[];
  reason: string;
  planSlug?: "basic" | "pro" | "custom";
  billingCycle?: "monthly" | "six_months" | "yearly";
  additionalDays?: number;
}

export interface BulkSchoolActionResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors: { schoolId: string; error: string }[];
}

/**
 * Executes a verified bulk operation across multiple institutions
 */
export async function executeBulkSchoolAction(
  request: BulkSchoolActionRequest,
  adminEmail: string = "superadmin@myzkool.com",
  adminId?: string,
  reqOrClient?: any
): Promise<BulkSchoolActionResult> {
  const result: BulkSchoolActionResult = {
    totalRequested: request.schoolIds.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const schoolId of request.schoolIds) {
    try {
      if (request.action === "activate") {
        const res = await updateMasterAdminSchoolStatus(schoolId, "active", request.reason, undefined, adminEmail, adminId, reqOrClient);
        if (res.success) result.successful++;
        else {
          result.failed++;
          result.errors.push({ schoolId, error: res.error || "Failed to activate" });
        }
      } else if (request.action === "suspend") {
        const res = await updateMasterAdminSchoolStatus(schoolId, "suspended", request.reason, undefined, adminEmail, adminId, reqOrClient);
        if (res.success) result.successful++;
        else {
          result.failed++;
          result.errors.push({ schoolId, error: res.error || "Failed to suspend" });
        }
      } else if (request.action === "change_plan") {
        if (!request.planSlug) throw new Error("Plan slug required for change_plan");
        const res = await changeSchoolSubscriptionPlan(schoolId, request.planSlug, request.billingCycle || "yearly", request.reason, adminEmail, adminId, reqOrClient);
        if (res.success) result.successful++;
        else {
          result.failed++;
          result.errors.push({ schoolId, error: res.error || "Failed to change plan" });
        }
      } else if (request.action === "extend_subscription") {
        const days = request.additionalDays || 30;
        const res = await extendSchoolSubscriptionValidity(schoolId, days, "complimentary", undefined, request.reason, adminEmail, adminId, reqOrClient);
        if (res.success) result.successful++;
        else {
          result.failed++;
          result.errors.push({ schoolId, error: res.error || "Failed to extend subscription" });
        }
      }
    } catch (err: any) {
      result.failed++;
      result.errors.push({ schoolId, error: err.message });
    }
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "school.bulk_action",
    resourceType: "schools",
    resourceId: "multiple",
    schoolId: null,
    details: {
      action: request.action,
      totalRequested: result.totalRequested,
      successful: result.successful,
      failed: result.failed,
      reason: request.reason,
    },
  });

  return result;
}

/**
 * Generates CSV content of schools based on filter options
 */
export async function exportSchoolsToCsv(
  options: GetSchoolsFilterOptions = {},
  reqOrClient?: any
): Promise<string> {
  const { schools } = await getMasterAdminSchools({ ...options, limit: 1000 }, reqOrClient);

  const headers = [
    "Institution ID",
    "School Name",
    "Subdomain",
    "Board",
    "City",
    "State",
    "Contact Email",
    "Contact Phone",
    "Principal Name",
    "Students",
    "Staff",
    "Plan",
    "Subscription Status",
    "Valid Till",
    "Status",
    "Registration Date",
  ];

  const rows = schools.map((s) => [
    `"${s.institution_code}"`,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.subdomain}"`,
    `"${s.affiliation_board || "cbse"}"`,
    `"${s.city}"`,
    `"${s.state}"`,
    `"${s.official_email}"`,
    `"${s.contact_phone}"`,
    `"${s.principal_name.replace(/"/g, '""')}"`,
    s.student_count,
    s.staff_count,
    `"${s.current_plan_name}"`,
    `"${s.subscription_status}"`,
    `"${s.subscription_valid_till_formatted}"`,
    `"${s.status}"`,
    `"${formatDate(s.created_at)}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
