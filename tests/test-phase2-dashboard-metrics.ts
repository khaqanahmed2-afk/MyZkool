/**
 * Automated Verification Suite: Phase 2 — Master Admin Shell & Dashboard Metrics
 */

import { getPlatformDashboardMetrics } from "../src/services/masterAdminDashboardService";
import { masterAdminDashboardRouter } from "../src/routes/api/masterAdminDashboardRoutes";
import { registerMockPlatformAdmin, clearMockPlatformAdmins } from "../src/middleware/masterAdminAuth";
import type { PlatformAdmin } from "../src/types/masterAdmin";

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

// Mock Express response helper
function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

async function runPhase2Tests() {
  console.log("\n==========================================================");
  console.log("PHASE 2: MASTER ADMIN DASHBOARD & METRICS TEST SUITE");
  console.log("==========================================================\n");

  clearMockPlatformAdmins();

  const superAdminUser: PlatformAdmin = {
    id: "admin-super-01",
    auth_id: "auth-uuid-super",
    email: "super@myzkool.com",
    full_name: "Khaqan Ahmad",
    role_id: "role-super",
    role: {
      id: "role-super",
      slug: "super_admin",
      name: "Super Admin",
      description: "Full platform authority",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["*"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  registerMockPlatformAdmin(superAdminUser);

  // ─── Test Group 1: Service Metrics Aggregation ────────────────────────────
  console.log("Group 1: Dashboard Metrics Service Output");

  const metrics = await getPlatformDashboardMetrics("30d");

  assert(Boolean(metrics), "getPlatformDashboardMetrics returns non-null payload");
  assert(metrics.kpis.totalSchools.count >= 1, "Total schools count is positive integer");
  assert(metrics.kpis.totalStudents.count >= 1, "Total students aggregate count is positive integer");
  assert(metrics.kpis.totalRevenuePaise >= 100000, "Revenue in paise is greater than zero");
  assert(metrics.kpis.totalRevenueFormatted.includes("₹"), "Revenue is formatted in INR currency");

  // ─── Test Group 2: Chart Data Series Integrity ────────────────────────────
  console.log("\nGroup 2: Visual Chart Series Data");

  assert(metrics.schoolRegistrations.timeline.length >= 4, "School registrations timeline has multiple data points");
  assert(metrics.subscriptionRevenue.monthly.length === 6, "Subscription revenue trend has 6 monthly intervals");

  const totalDist =
    metrics.planDistribution.pro.percentage +
    metrics.planDistribution.basic.percentage +
    metrics.planDistribution.custom.percentage +
    metrics.planDistribution.trial.percentage;
  assert(totalDist >= 99 && totalDist <= 101, "Plan distribution percentages sum to ~100%");

  // ─── Test Group 3: System Health Indicators ───────────────────────────────
  console.log("\nGroup 3: System Health Probes");

  assert(metrics.systemHealth.overall === "operational", "Overall system health is operational");
  assert(metrics.systemHealth.uptimePercent > 99.0, "Uptime percentage exceeds 99%");
  assert(metrics.systemHealth.avgResponseMs > 0, "Average API latency is tracked in milliseconds");
  assert(metrics.systemHealth.services.webApp.status === "operational", "Web App service is operational");
  assert(metrics.systemHealth.services.database.status === "operational", "Database service is operational");
  assert(metrics.systemHealth.services.storage.status === "operational", "Storage service is operational");
  assert(metrics.systemHealth.services.backgroundJobs.status === "operational", "Background Jobs service is operational");
  assert(metrics.systemHealth.services.apiIntegrations.status === "operational", "API Integrations service is operational");

  // ─── Test Group 4: Activities and Attention Summary ───────────────────────
  console.log("\nGroup 4: Activities and Action Items");

  assert(metrics.recentActivities.length >= 3, "Recent platform activities contains event stream");
  assert(metrics.pendingAttention.expiringSubscriptionsCount >= 0, "Expiring subscriptions count is tracked");
  assert(metrics.pendingAttention.failedPaymentsCount >= 0, "Failed payments count is tracked");
  assert(metrics.pendingAttention.openSupportTicketsCount >= 0, "Open support tickets count is tracked");
  assert(metrics.keyInsights.pendingPaymentsSchoolCount > 0, "Pending payments school count is calculated");

  console.log("\n==========================================================");
  console.log(`PHASE 2 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

