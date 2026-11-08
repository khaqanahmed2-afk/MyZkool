/**
 * Master Admin Domain Types for MyZkool SaaS Control Plane
 */

export type PlatformRoleSlug =
  | "super_admin"
  | "support_agent"
  | "billing_manager"
  | "auditor";

export interface PlatformRole {
  id: string;
  slug: PlatformRoleSlug;
  name: string;
  description: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformPermission {
  id: string;
  code: string;
  module: string;
  description: string;
  created_at: string;
}

export interface PlatformAdmin {
  id: string;
  auth_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role_id: string;
  role?: PlatformRole;
  permissions?: string[];
  is_active: boolean;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlatformAuditLog {
  id: string;
  admin_id: string | null;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  school_id?: string | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface MasterAdminAuthState {
  admin: PlatformAdmin | null;
  role: PlatformRoleSlug | null;
  permissions: string[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Dashboard KPIs and Visual Contracts (matches reference UI)
export interface DashboardKPIs {
  totalSchools: {
    count: number;
    trendPercent: number;
    isPositive: boolean;
    totalRegisteredSchools: number;
    onboardingCompleted: number;
    onboardingPending: number;
    activeSchools: number;
  };
  totalStudents: { count: number; trendPercent: number; isPositive: boolean };
  totalRevenuePaise: number;
  totalRevenueFormatted: string;
  revenueTrendPercent: number;
  isRevenuePositive: boolean;
  activeSubscriptions: { count: number; trendPercent: number; isPositive: boolean };
}

export interface RegistrationTrendPoint {
  date: string;
  count: number;
}

export interface RevenueMonthlyPoint {
  month: string;
  revenuePaise: number;
  formatted: string;
}

export interface PlanDistributionStats {
  pro: { count: number; percentage: number };
  basic: { count: number; percentage: number };
  custom: { count: number; percentage: number };
  trial: { count: number; percentage: number };
}

export interface SystemServiceHealth {
  status: "operational" | "degraded" | "outage";
  latencyMs?: number;
  lastChecked: string;
}

export interface SystemHealthOverview {
  overall: "operational" | "degraded" | "outage";
  uptimePercent: number;
  avgResponseMs: number;
  services: {
    webApp: SystemServiceHealth;
    database: SystemServiceHealth;
    storage: SystemServiceHealth;
    backgroundJobs: SystemServiceHealth;
    apiIntegrations: SystemServiceHealth;
  };
}

export interface PlatformRecentActivity {
  id: string;
  type: "school_registered" | "subscription_upgraded" | "admin_added" | "ticket_resolved" | "plan_renewed" | "school_suspended";
  title: string;
  detail: string;
  timestamp: string;
  timeAgo: string;
}

export interface PendingAttentionSummary {
  expiringSubscriptionsCount: number;
  failedPaymentsCount: number;
  openSupportTicketsCount: number;
  pendingSchoolApprovalsCount: number;
}

export interface KeyInsightSummary {
  schoolGrowthPercent: number;
  studentGrowthPercent: number;
  pendingPaymentsPaise: number;
  pendingPaymentsFormatted: string;
  pendingPaymentsSchoolCount: number;
  expiringSoonDaysCount: number;
}

export interface DashboardMetricsPayload {
  kpis: DashboardKPIs;
  schoolBreakdown: {
    totalRegisteredSchools: number;
    onboardingCompleted: number;
    onboardingPending: number;
    activeSchools: number;
  };
  schoolRegistrations: { timeline: RegistrationTrendPoint[] };
  subscriptionRevenue: { monthly: RevenueMonthlyPoint[] };
  planDistribution: PlanDistributionStats;
  systemHealth: SystemHealthOverview;
  recentActivities: PlatformRecentActivity[];
  pendingAttention: PendingAttentionSummary;
  keyInsights: KeyInsightSummary;
}

