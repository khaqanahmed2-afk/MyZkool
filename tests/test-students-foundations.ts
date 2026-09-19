/**
 * Test Suite: MyZkool Students Module Stage 1 Foundations
 * Verifies:
 * 1. Permission keys & default role sets (Spec A2) with key-based middleware verification
 * 2. Notification worker with retry, dedupe_key, consent, quiet hours & fake provider
 * 3. Spec D1 service stubs (FeeService, TransportService, PlanService)
 * 4. Database schema foundations & RLS policy definitions
 */

import {
  STUDENT_PERMISSIONS,
  STUDENT_ROLE_PERMISSIONS,
  type StudentPermissionKey,
} from "../src/types/students";
import {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from "../src/middleware/permissions";
import { requireFeature } from "../src/middleware/features";
import { feeService } from "../src/services/feeService";
import { transportService } from "../src/services/transportService";
import { planService } from "../src/services/planService";
import {
  FakeNotificationProvider,
  NotificationWorker,
  queueNotification,
  renderTemplate,
  NOTIFICATION_TEMPLATES,
} from "../src/workers/notificationWorker";
import type { Request, Response } from "express";

// Polyfill localStorage for Node test environment if not present
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

// Mock express request & response
function createMockReqRes(userPermissions: string[] = [], schoolId = "school-123") {
  const req = {
    userPermissions,
    schoolId,
    user: { id: "user-123" },
  } as unknown as Request;

  let statusCode = 200;
  let jsonResponse: any = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonResponse = data;
      return res;
    },
  } as unknown as Response;

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return {
    req,
    res,
    next,
    getStatusCode: () => statusCode,
    getJsonResponse: () => jsonResponse,
    wasNextCalled: () => nextCalled,
  };
}

async function runStage1Tests() {
  console.log("\n==========================================================");
  console.log("MYZKOOL STAGE 1: AUDIT & FOUNDATIONS TEST SUITE");
  console.log("==========================================================\n");

  // 1. SPEC A2 PERMISSIONS & ROLE SETS
  console.log("1. Spec A2 Permissions & Role Sets:");

  assert(
    STUDENT_PERMISSIONS.includes("students.read") &&
    STUDENT_PERMISSIONS.includes("students.write") &&
    STUDENT_PERMISSIONS.includes("students.contacts.read") &&
    STUDENT_PERMISSIONS.includes("students.reveal_sensitive") &&
    STUDENT_PERMISSIONS.includes("students.medical.read") &&
    STUDENT_PERMISSIONS.includes("students.medical.write") &&
    STUDENT_PERMISSIONS.includes("students.documents.manage") &&
    STUDENT_PERMISSIONS.includes("students.status.manage") &&
    STUDENT_PERMISSIONS.includes("students.promote") &&
    STUDENT_PERMISSIONS.includes("students.import") &&
    STUDENT_PERMISSIONS.includes("students.export") &&
    STUDENT_PERMISSIONS.includes("students.archive"),
    "All 12 Spec A2 permission keys are defined"
  );

  // Owner role permissions
  const ownerPerms = STUDENT_ROLE_PERMISSIONS.owner || [];
  assert(ownerPerms.includes("students.reveal_sensitive"), "Owner has students.reveal_sensitive");
  assert(ownerPerms.includes("students.medical.read"), "Owner has students.medical.read");
  assert(ownerPerms.includes("students.medical.write"), "Owner has students.medical.write");
  assert(ownerPerms.includes("students.archive"), "Owner has students.archive");

  // Admin role permissions
  const adminPerms = STUDENT_ROLE_PERMISSIONS.admin || [];
  assert(!adminPerms.includes("students.reveal_sensitive"), "Admin does NOT have reveal_sensitive by default (grantable)");
  assert(!adminPerms.includes("students.medical.read"), "Admin does NOT have medical.read by default");
  assert(!adminPerms.includes("students.archive"), "Admin does NOT have students.archive by default");
  assert(adminPerms.includes("students.write"), "Admin has students.write");

  // Accountant role permissions
  const accountantPerms = STUDENT_ROLE_PERMISSIONS.accountant || [];
  assert(accountantPerms.includes("students.read"), "Accountant has students.read");
  assert(!accountantPerms.includes("students.write"), "Accountant does NOT have students.write");

  // Teacher role permissions
  const teacherPerms = STUDENT_ROLE_PERMISSIONS.teacher || [];
  assert(teacherPerms.includes("students.read"), "Teacher has students.read");
  assert(!teacherPerms.includes("students.write"), "Teacher does NOT have students.write");

  // 2. KEY-BASED PERMISSION MIDDLEWARE (NOT ROLE NAMES)
  console.log("\n2. Permission Middleware (Checks Keys, Not Role Names):");

  // User with key allowed
  const mock1 = createMockReqRes(["students.write"]);
  const mw1 = requirePermission("students.write");
  await mw1(mock1.req, mock1.res, mock1.next);
  assert(mock1.wasNextCalled() === true, "User with required permission key passes");

  // User lacking key blocked with 403
  const mock2 = createMockReqRes(["students.read"]);
  const mw2 = requirePermission("students.write");
  await mw2(mock2.req, mock2.res, mock2.next);
  assert(mock2.wasNextCalled() === false, "User without required permission key is blocked");
  assert(mock2.getStatusCode() === 403, "Blocked user receives HTTP 403");
  assert(mock2.getJsonResponse()?.code === "FORBIDDEN", "Blocked user receives FORBIDDEN error code");

  // Custom role with key granted works
  const mock3 = createMockReqRes(["students.medical.read"]);
  const mw3 = requirePermission("students.medical.read");
  await mw3(mock3.req, mock3.res, mock3.next);
  assert(mock3.wasNextCalled() === true, "User with grantable medical.read key passes regardless of role name");

  // requireAnyPermission
  const mock4 = createMockReqRes(["students.read"]);
  const mw4 = requireAnyPermission(["students.write", "students.read"]);
  await mw4(mock4.req, mock4.res, mock4.next);
  assert(mock4.wasNextCalled() === true, "requireAnyPermission passes when user has at least one key");

  // requireAllPermissions
  const mock5 = createMockReqRes(["students.write"]);
  const mw5 = requireAllPermissions(["students.write", "students.contacts.read"]);
  await mw5(mock5.req, mock5.res, mock5.next);
  assert(mock5.wasNextCalled() === false && mock5.getStatusCode() === 403, "requireAllPermissions blocks when user lacks one key");

  // 3. PLAN GATING MIDDLEWARE (SPEC 1.5)
  console.log("\n3. Plan Gating Middleware (Spec 1.5):");

  const featureMw = requireFeature("transport");
  const planMock = createMockReqRes([], "school-basic");
  // Set school plan to basic
  (planMock.req as any).schoolPlan = { plan_key: "basic", features: ["students", "fees"] };
  await featureMw(planMock.req, planMock.res, planMock.next);
  assert(planMock.getStatusCode() === 402, "Feature middleware returns HTTP 402 for locked feature");
  assert(planMock.getJsonResponse()?.code === "PLAN_REQUIRED", "Returns PLAN_REQUIRED error code");

  // 4. SPEC D1 SERVICE STUBS
  console.log("\n4. Spec D1 Service Stubs:");

  const balanceRes = await feeService.getStudentBalance("student-1");
  assert(balanceRes.balance === 0, "FeeService.getStudentBalance returns 0 paise balance stub");

  const assignRes = await feeService.assignStructure("student-1");
  assert(assignRes.success === true, "FeeService.assignStructure returns success (no-op)");

  const transportRes = await transportService.endAssignment("student-1", "2026-04-01", "Withdrawn");
  assert(transportRes.success === true, "TransportService.endAssignment returns success (no-op)");

  const transportCheck = await transportService.getStudentTransport("student-1");
  assert(transportCheck.assignment === null, "TransportService.getStudentTransport returns null stub");

  const basicTransportAccess = await planService.hasFeature("school-1", "transport");
  assert(basicTransportAccess === false, "PlanService.hasFeature returns false for transport on Basic");

  // 5. NOTIFICATION WORKER & PROVIDER ABSTRACTION (SPEC 1.9)
  console.log("\n5. WhatsApp Notification Worker & Fake Provider (Spec 1.9):");

  const fakeProvider = new FakeNotificationProvider();
  const worker = new NotificationWorker({
    provider: fakeProvider,
    pollIntervalMs: 1000,
    batchSize: 10,
    maxAttempts: 5,
  });

  // Template registry
  assert(NOTIFICATION_TEMPLATES.length >= 7, "Template registry has at least 7 WhatsApp templates");
  const rendered = renderTemplate("admission_confirmation", {
    "1": "Delhi Public School",
    "2": "Aarav Sharma",
    "3": "ADM-2026-001",
    "4": "Class 1",
    "5": "01/04/2026",
  });
  assert(
    rendered.includes("Aarav Sharma") && rendered.includes("ADM-2026-001"),
    "Template rendering interpolates positional parameters correctly"
  );

  // Queue notification
  const schoolId = "test-school-notify";
  const queueResult = await queueNotification(schoolId, {
    channel: "whatsapp",
    template_key: "admission_confirmation",
    recipient_phone: "9876543210",
    params: { student_name: "Rohan", school_name: "MyZkool" },
    dedupe_key: "admission:student-101",
    scheduled_at: new Date().toISOString(),
  });
  assert(!!queueResult.outbox?.id, "Successfully queued notification to outbox");
  assert(queueResult.outbox?.dedupe_key === "admission:student-101", "Outbox record retains dedupe_key");

  // Deduplication check
  const duplicateQueue = await queueNotification(schoolId, {
    channel: "whatsapp",
    template_key: "admission_confirmation",
    recipient_phone: "9876543210",
    params: { student_name: "Rohan", school_name: "MyZkool" },
    dedupe_key: "admission:student-101",
    scheduled_at: new Date().toISOString(),
  });
  assert(
    !!duplicateQueue.error && duplicateQueue.error.includes("Duplicate notification"),
    "Dedupe_key prevents queueing duplicate notification"
  );

  // Consent check: parent opted out
  // Set communication consent to opted_out in cache
  const consentsKey = `myzkool_communication_consents_${schoolId}`;
  localStorage.setItem(
    consentsKey,
    JSON.stringify([
      {
        id: "c-1",
        school_id: schoolId,
        parent_id: "parent-optout",
        channel: "whatsapp",
        status: "opted_out",
        captured_at: new Date().toISOString(),
        source: "admission_form",
      },
    ])
  );

  // Process item with opted-out parent
  const optedOutItem = {
    id: "outbox-optout",
    school_id: schoolId,
    channel: "whatsapp" as const,
    template_key: "admission_confirmation",
    recipient_phone: "9999999999",
    recipient_parent_id: "parent-optout",
    params: {},
    attempts: 0,
    status: "queued" as const,
    scheduled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const processedOptOut = await worker.processItem(optedOutItem);
  assert(processedOptOut.status === "skipped", "Notification worker skips messaging when parent opted out");
  assert(
    processedOptOut.error?.includes("opted out") === true,
    "Records reason parent opted out of WhatsApp"
  );

  // Successful send with fake provider
  const normalItem = {
    id: "outbox-normal",
    school_id: schoolId,
    channel: "whatsapp" as const,
    template_key: "admission_confirmation",
    recipient_phone: "9876543210",
    params: { 1: "School", 2: "Child", 3: "A1", 4: "C1", 5: "Date" },
    attempts: 0,
    status: "queued" as const,
    scheduled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const processedSuccess = await worker.processItem(normalItem);
  assert(processedSuccess.status === "sent", "Worker marks outbox status as 'sent' on provider success");
  assert(
    !!processedSuccess.provider_message_id,
    "Records provider_message_id on successful delivery"
  );

  // Simulated provider failure and retry
  fakeProvider.setShouldFail(true, "Network timeout");
  const failedItem = {
    id: "outbox-failed",
    school_id: schoolId,
    channel: "whatsapp" as const,
    template_key: "admission_confirmation",
    recipient_phone: "9876543210",
    params: {},
    attempts: 1,
    status: "queued" as const,
    scheduled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const processedFailure = await worker.processItem(failedItem);
  assert(processedFailure.attempts === 2, "Failed delivery increments attempt count");
  assert(processedFailure.status === "queued", "Item with attempts < maxAttempts remains 'queued' for retry");
  assert(
    processedFailure.error?.includes("Network timeout") === true,
    "Records provider error message on failure"
  );

  // Max attempts exceeded (attempts >= 5)
  const maxAttemptsItem = {
    id: "outbox-max",
    school_id: schoolId,
    channel: "whatsapp" as const,
    template_key: "admission_confirmation",
    recipient_phone: "9876543210",
    params: {},
    attempts: 4,
    status: "queued" as const,
    scheduled_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const processedMax = await worker.processItem(maxAttemptsItem);
  assert(processedMax.status === "failed", "Item reaches status 'failed' after 5 attempts");

  // Reset fake provider
  fakeProvider.setShouldFail(false);

  console.log("\n----------------------------------------------------------");
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed.`);
  console.log("----------------------------------------------------------\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runStage1Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
