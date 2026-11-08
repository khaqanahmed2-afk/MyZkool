/**
 * Automated Verification Suite: Phase 1 — Master Admin Auth, RBAC & Security Foundation
 */

import {
  resolvePlatformAdminByAuthId,
  verifyMasterAdminToken,
  requirePlatformRole,
  requirePlatformPermission,
  registerMockPlatformAdmin,
  clearMockPlatformAdmins,
  MasterAdminRequest,
} from "../src/middleware/masterAdminAuth";
import { logPlatformAction, getPlatformAuditLogs } from "../src/services/masterAdminAuditService";
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

async function runPhase1Tests() {
  console.log("\n==========================================================");
  console.log("PHASE 1: MASTER ADMIN AUTH, RBAC & SECURITY FOUNDATION TESTS");
  console.log("==========================================================\n");

  clearMockPlatformAdmins();

  // Test Fixtures
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
      description: "Full authority",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["*"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supportAgentUser: PlatformAdmin = {
    id: "admin-support-01",
    auth_id: "auth-uuid-support",
    email: "support@myzkool.com",
    full_name: "Support Specialist",
    role_id: "role-support",
    role: {
      id: "role-support",
      slug: "support_agent",
      name: "Support Agent",
      description: "Support inquiries and triage",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["dashboard.view", "schools.view", "support.view", "support.manage"],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const inactiveAdminUser: PlatformAdmin = {
    id: "admin-inactive-01",
    auth_id: "auth-uuid-inactive",
    email: "inactive@myzkool.com",
    full_name: "Inactive Admin",
    role_id: "role-support",
    role: {
      id: "role-support",
      slug: "support_agent",
      name: "Support Agent",
      description: "Support inquiries",
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: ["dashboard.view"],
    is_active: false, // DEACTIVATED
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  registerMockPlatformAdmin(superAdminUser);
  registerMockPlatformAdmin(supportAgentUser);
  registerMockPlatformAdmin(inactiveAdminUser);

  // ─── Test Group 1: Token Presence and Validation ──────────────────────────
  console.log("Group 1: Token Verification and Identity Resolution");

  {
    // 1.1 Missing Authorization Header
    const req: any = { headers: {} };
    const res = createMockResponse();
    let nextCalled = false;
    await verifyMasterAdminToken(req, res, () => { nextCalled = true; });

    assert(res.statusCode === 401, "Missing Authorization header returns 401");
    assert(res.body?.code === "UNAUTHENTICATED", "Missing token returns UNAUTHENTICATED error code");
    assert(!nextCalled, "Middleware halts processing without calling next()");
  }

  {
    // 1.2 Malformed Authorization Header (not Bearer)
    const req: any = { headers: { authorization: "Basic xyz123" } };
    const res = createMockResponse();
    await verifyMasterAdminToken(req, res, () => {});
    assert(res.statusCode === 401, "Non-Bearer header returns 401");
  }

  {
    // 1.3 School Admin / Unknown user token (not in platform_admins)
    const req: any = { headers: { authorization: "Bearer test-token-unknown-school-admin" } };
    const res = createMockResponse();
    await verifyMasterAdminToken(req, res, () => {});
    assert(res.statusCode === 403, "School Admin without platform_admin record returns 403");
    assert(res.body?.code === "NOT_PLATFORM_ADMIN", "Error code is NOT_PLATFORM_ADMIN");
  }

  {
    // 1.4 Deactivated Master Admin Account
    const req: any = { headers: { authorization: "Bearer test-token-auth-uuid-inactive:inactive@myzkool.com" } };
    const res = createMockResponse();
    await verifyMasterAdminToken(req, res, () => {});
    assert(res.statusCode === 403, "Deactivated platform admin is denied with 403");
    assert(res.body?.code === "ACCOUNT_DEACTIVATED", "Error code is ACCOUNT_DEACTIVATED");
  }

  {
    // 1.5 Valid Active Super Admin Token
    const req: any = { headers: { authorization: "Bearer test-token-auth-uuid-super:super@myzkool.com" } };
    const res = createMockResponse();
    let nextCalled = false;
    await verifyMasterAdminToken(req, res, () => { nextCalled = true; });
    assert(nextCalled, "Valid active super admin calls next()");
    assert(req.platformAdmin?.email === "super@myzkool.com", "Attaches verified platformAdmin to request");
    assert(req.platformAdmin?.role?.slug === "super_admin", "Resolves correct platform role");
  }

  // ─── Test Group 2: Role-Based Access Control (RBAC) ───────────────────────
  console.log("\nGroup 2: Role-Based Authorization Enforcement");

  {
    // 2.1 Super Admin accessing Super Admin only route
    const req: MasterAdminRequest = { platformAdmin: superAdminUser } as any;
    const res = createMockResponse();
    let nextCalled = false;
    const middleware = requirePlatformRole(["super_admin"]);
    middleware(req, res, () => { nextCalled = true; });
    assert(nextCalled, "Super Admin successfully passes requirePlatformRole(['super_admin'])");
  }

  {
    // 2.2 Support Agent accessing Super Admin only route
    const req: MasterAdminRequest = { platformAdmin: supportAgentUser } as any;
    const res = createMockResponse();
    let nextCalled = false;
    const middleware = requirePlatformRole(["super_admin"]);
    middleware(req, res, () => { nextCalled = true; });
    assert(!nextCalled, "Support Agent is blocked from Super Admin route");
    assert(res.statusCode === 403, "Returns 403 for unauthorized role");
    assert(res.body?.code === "ROLE_UNAUTHORIZED", "Error code is ROLE_UNAUTHORIZED");
  }

  // ─── Test Group 3: Granular Permission Checks ─────────────────────────────
  console.log("\nGroup 3: Granular Permission Verification");

  {
    // 3.1 Support Agent executing permitted action ('support.manage')
    const req: MasterAdminRequest = { platformAdmin: supportAgentUser } as any;
    const res = createMockResponse();
    let nextCalled = false;
    const middleware = requirePlatformPermission("support.manage");
    middleware(req, res, () => { nextCalled = true; });
    assert(nextCalled, "Support Agent allowed on 'support.manage' permission");
  }

  {
    // 3.2 Support Agent attempting billing action ('billing.manage')
    const req: MasterAdminRequest = { platformAdmin: supportAgentUser } as any;
    const res = createMockResponse();
    let nextCalled = false;
    const middleware = requirePlatformPermission("billing.manage");
    middleware(req, res, () => { nextCalled = true; });
    assert(!nextCalled, "Support Agent denied on 'billing.manage'");
    assert(res.statusCode === 403, "Returns 403 for missing permission");
    assert(res.body?.code === "INSUFFICIENT_PERMISSIONS", "Error code is INSUFFICIENT_PERMISSIONS");
  }

  {
    // 3.3 Super Admin wildcard bypasses any granular requirement
    const req: MasterAdminRequest = { platformAdmin: superAdminUser } as any;
    const res = createMockResponse();
    let nextCalled = false;
    const middleware = requirePlatformPermission("security.extreme_action");
    middleware(req, res, () => { nextCalled = true; });
    assert(nextCalled, "Super Admin with '*' wildcard passes any permission check");
  }

  // ─── Test Group 4: Platform Audit Logging Ledger ──────────────────────────
  console.log("\nGroup 4: Immutable Audit Logging Ledger");

  {
    const logged = await logPlatformAction({
      adminId: superAdminUser.id,
      adminEmail: superAdminUser.email,
      action: "school.suspend",
      resourceType: "schools",
      resourceId: "school-123",
      details: { reason: "Payment past due", notifySchool: true },
    });

    assert(Boolean(logged.id), "Audit log generates unique id");
    assert(logged.action === "school.suspend", "Audit log records exact action");
    assert(logged.admin_email === "super@myzkool.com", "Audit log records actor email");
    assert(logged.details.reason === "Payment past due", "Audit log preserves details payload");

    const logs = await getPlatformAuditLogs({ limit: 10, action: "school.suspend" });
    assert(logs.length > 0, "Audit logs can be retrieved by action filter");
    assert(logs[0].resource_id === "school-123", "Retrieved audit log contains target resource ID");
  }

  console.log("\n==========================================================");
  console.log(`PHASE 1 SUMMARY: ${testsPassed} passed, ${testsFailed} failed.`);
  console.log("==========================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

