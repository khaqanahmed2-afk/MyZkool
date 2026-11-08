/**
 * test-phase7-8-settings-monitoring-audit.ts
 * Automated Verification for Phase 7 (Communications & Global Settings)
 * and Phase 8 (Monitoring, Health & Security Audit Logs)
 */

import {
  getMasterAdminAnnouncements,
  createMasterAdminAnnouncement,
  deleteMasterAdminAnnouncement,
  getMasterAdminSettings,
  updateMasterAdminSetting,
  getMasterAdminFeatureFlags,
  updateMasterAdminFeatureFlag,
} from "../src/services/masterAdminSettingsService";
import { getPlatformSystemHealth } from "../src/services/masterAdminMonitoringService";
import { getPlatformAuditLogs } from "../src/services/masterAdminAuditService";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${testName}`);
  } else {
    failed++;
    const msg = `  \x1b[31m✖\x1b[0m ${testName}${detail ? ` — ${detail}` : ""}`;
    console.log(msg);
    errors.push(msg);
  }
}

async function run() {
  console.log("\n=======================================================");
  console.log("   PHASES 7 & 8: COMMUNICATIONS, SETTINGS & AUDIT");
  console.log("=======================================================\n");

  const adminUser = {
    id: "admin-super-01",
    email: "khaqan@myzkool.com",
    name: "Khaqan Ahmad",
  };

  // --- 1. Announcements Management ---
  console.log("--- 1. Platform Announcements & Audience Targeting ---");
  const initialAnnouncements = await getMasterAdminAnnouncements();
  assert(Array.isArray(initialAnnouncements), "getMasterAdminAnnouncements returns array");
  assert(initialAnnouncements.length >= 2, "Default seeded announcements found", `Count: ${initialAnnouncements.length}`);

  const createdBroadcast = await createMasterAdminAnnouncement(
    {
      title: "Automated Fee Receipts 2.0 Launch",
      content: "All schools can now issue GST compliant PDF receipts on WhatsApp.",
      type: "feature_update",
      target_audience: "all",
      is_published: true,
    },
    adminUser
  );
  assert(createdBroadcast.id.startsWith("ann-"), "Announcement created with valid ID");
  assert(createdBroadcast.title.includes("Fee Receipts 2.0"), "Announcement title matches payload");
  assert(createdBroadcast.published_by_name === "Khaqan Ahmad", "Publisher attribution recorded");

  // Verify list contains the new announcement
  const updatedList = await getMasterAdminAnnouncements();
  assert(
    updatedList.some((a) => a.id === createdBroadcast.id),
    "New broadcast appears in announcements directory"
  );

  // Delete announcement
  const deleteSuccess = await deleteMasterAdminAnnouncement(createdBroadcast.id, adminUser);
  assert(deleteSuccess === true, "Announcement successfully removed");

  const listAfterDelete = await getMasterAdminAnnouncements();
  assert(
    !listAfterDelete.some((a) => a.id === createdBroadcast.id),
    "Deleted broadcast is no longer returned in list"
  );

  // --- 2. Global Platform Settings ---
  console.log("\n--- 2. Global Platform Settings ---");
  const allSettings = await getMasterAdminSettings();
  assert(Array.isArray(allSettings), "getMasterAdminSettings returns settings array");
  assert(allSettings.length >= 4, "Platform core settings seeded (branding, maintenance, email, whatsapp, razorpay)");

  // Filter settings by category
  const brandingSettings = await getMasterAdminSettings("branding");
  assert(brandingSettings.length === 1, "Category filter 'branding' returns 1 entry");
  assert(brandingSettings[0].key === "branding.platform", "Branding key correctly identified");

  // Update setting
  const updatedSetting = await updateMasterAdminSetting(
    "branding.platform",
    { tagline: "India's #1 Integrated School Operating SaaS" },
    adminUser
  );
  assert(updatedSetting !== null, "updateMasterAdminSetting returns updated setting");
  assert(
    (updatedSetting?.value as any)?.tagline === "India's #1 Integrated School Operating SaaS",
    "Setting value updated with new tagline"
  );

  // Non-existent setting
  const nonExistentSetting = await updateMasterAdminSetting("unknown.key", { test: true }, adminUser);
  assert(nonExistentSetting === null, "Updating non-existent setting key returns null");

  // --- 3. Feature Flags & Dynamic Rollout ---
  console.log("\n--- 3. Dynamic Feature Flags ---");
  const featureFlags = await getMasterAdminFeatureFlags();
  assert(Array.isArray(featureFlags), "getMasterAdminFeatureFlags returns flags array");
  assert(featureFlags.length >= 4, "Core feature flags seeded");

  const gpsFlag = featureFlags.find((f) => f.flag_key === "gps_live_fleet_tracking");
  assert(gpsFlag !== undefined, "GPS live tracking flag exists");

  const toggledFlag = await updateMasterAdminFeatureFlag(
    "gps_live_fleet_tracking",
    { is_enabled: false, rollout_percentage: 25 },
    adminUser
  );
  assert(toggledFlag !== null, "updateMasterAdminFeatureFlag returns updated flag");
  assert(toggledFlag?.is_enabled === false, "Feature flag toggled to false");
  assert(toggledFlag?.rollout_percentage === 25, "Rollout percentage updated to 25%");

  // Re-enable flag
  await updateMasterAdminFeatureFlag("gps_live_fleet_tracking", { is_enabled: true, rollout_percentage: 100 }, adminUser);

  // --- 4. System Monitoring & Health Diagnostics ---
  console.log("\n--- 4. Real-time System Monitoring ---");
  const healthMetrics = await getPlatformSystemHealth();
  assert(healthMetrics !== null, "getPlatformSystemHealth returns metrics object");
  assert(
    healthMetrics.overallStatus === "healthy" || healthMetrics.overallStatus === "degraded",
    "Overall health status is healthy or degraded",
    `Status: ${healthMetrics.overallStatus}`
  );
  assert(healthMetrics.uptimePercentage >= 99.0, "Uptime percentage exceeds SLA (99.0%)", `${healthMetrics.uptimePercentage}%`);
  assert(healthMetrics.services.webApplication.status === "operational", "Web application server is operational");
  assert(healthMetrics.services.storageBucket.maxBytes >= 1024 * 1024 * 1024, "Storage bucket max quota properly structured");
  assert(healthMetrics.serverDiagnostics.uptimeSeconds >= 0, "Node.js process uptime retrieved");
  assert(healthMetrics.serverDiagnostics.memoryUsageMB.rss > 0, "Process RSS memory measured");

  // --- 5. Immutable Security Audit Trail ---
  console.log("\n--- 5. Security & Administrative Audit Ledger ---");
  const auditLogs = await getPlatformAuditLogs({ limit: 50 });
  assert(Array.isArray(auditLogs), "Audit logs array retrieved");
  assert(auditLogs.length > 0, "Audit logs contain recorded platform operations");

  // Verify recent announcement action is logged
  const announcementAudit = auditLogs.find((l) => l.action.startsWith("announcement."));
  assert(announcementAudit !== undefined, "Announcement action logged in immutable ledger");

  // Verify settings update is logged
  const settingsAudit = auditLogs.find((l) => l.action === "settings.update");
  assert(settingsAudit !== undefined, "Settings modification logged in immutable ledger");

  // Verify feature flag toggle is logged
  const flagAudit = auditLogs.find((l) => l.action === "feature_flag.update");
  assert(flagAudit !== undefined, "Feature flag toggle logged in immutable ledger");

  console.log("\n=======================================================");
  console.log(`  PHASES 7 & 8 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

