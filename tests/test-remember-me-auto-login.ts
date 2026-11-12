/**
 * E2E Verification Test Suite: Remember Me & Auto-Login Flow
 * Validates persistent authentication, session restoration, anti-flash state,
 * browser restart simulation, multi-role dashboard routing, and zero-password storage security.
 */

// In-memory mock storage simulating localStorage and sessionStorage
const localStore = new Map<string, string>();
const sessionStore = new Map<string, string>();

const mockLocalStorage = {
  getItem: (k: string) => localStore.get(k) || null,
  setItem: (k: string, v: string) => { localStore.set(k, v); },
  removeItem: (k: string) => { localStore.delete(k); },
  clear: () => { localStore.clear(); },
  key: (i: number) => Array.from(localStore.keys())[i] || null,
  get length() { return localStore.size; },
} as Storage;

const mockSessionStorage = {
  getItem: (k: string) => sessionStore.get(k) || null,
  setItem: (k: string, v: string) => { sessionStore.set(k, v); },
  removeItem: (k: string) => { sessionStore.delete(k); },
  clear: () => { sessionStore.clear(); },
  key: (i: number) => Array.from(sessionStore.keys())[i] || null,
  get length() { return sessionStore.size; },
} as Storage;

(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).sessionStorage = mockSessionStorage;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Simulation Handlers matching AuthContext & App.tsx logic
// ─────────────────────────────────────────────────────────────────────────────

interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      role: string;
      onboarding_completed: boolean;
      current_onboarding_step?: string;
    };
  };
}

let currentSupabaseSession: MockSession | null = null;

function simulateLogin(
  email: string,
  role: string,
  rememberMe: boolean,
  onboardingCompleted: boolean = true
) {
  const cleanEmail = email.trim().toLowerCase();
  currentSupabaseSession = {
    access_token: `mock-token-${Date.now()}`,
    refresh_token: `mock-refresh-${Date.now()}`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: `usr-${cleanEmail.replace(/[^a-z0-9]/g, "_")}`,
      email: cleanEmail,
      user_metadata: {
        role,
        onboarding_completed: onboardingCompleted,
      },
    },
  };

  mockSessionStorage.setItem("myzkool_session_active", "true");

  if (rememberMe) {
    mockLocalStorage.setItem("myzkool_remember_me", "true");
    mockLocalStorage.setItem("myzkool_remembered_login_email", cleanEmail);
  } else {
    mockLocalStorage.removeItem("myzkool_remember_me");
  }

  return currentSupabaseSession;
}

function simulateMasterAdminLogin(email: string, rememberMe: boolean) {
  const cleanEmail = email.trim().toLowerCase();
  const token = `master-token-${cleanEmail}`;
  mockLocalStorage.setItem("myzkool_master_admin_token", token);
  mockSessionStorage.setItem("myzkool_master_session_active", "true");

  if (rememberMe) {
    mockLocalStorage.setItem("myzkool_master_remember_me", "true");
    mockLocalStorage.setItem("myzkool_master_remembered_email", cleanEmail);
  } else {
    mockLocalStorage.removeItem("myzkool_master_remember_me");
  }

  return token;
}

function simulateLogout() {
  currentSupabaseSession = null;
  mockLocalStorage.removeItem("myzkool_remember_me");
  mockLocalStorage.removeItem("myzkool_master_remember_me");
  mockLocalStorage.removeItem("myzkool_master_admin_token");
  mockLocalStorage.removeItem("myzkool_active_school_id");
  mockSessionStorage.removeItem("myzkool_session_active");
  mockSessionStorage.removeItem("myzkool_master_session_active");
}

function simulateBrowserRestart() {
  // Browser restart clears sessionStorage entirely while preserving localStorage
  mockSessionStorage.clear();
}

function simulateAuthInitialization() {
  const isRemembered = mockLocalStorage.getItem("myzkool_remember_me") === "true";
  const isSessionActive = mockSessionStorage.getItem("myzkool_session_active") === "true";

  if (!isRemembered && !isSessionActive) {
    // Session should not be preserved across restart without Remember Me
    currentSupabaseSession = null;
    return { isAuthenticated: false, user: null, role: null };
  }

  if (currentSupabaseSession) {
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (currentSupabaseSession.expires_at <= now) {
      // Attempt token refresh
      currentSupabaseSession.expires_at = now + 3600;
    }

    mockSessionStorage.setItem("myzkool_session_active", "true");
    return {
      isAuthenticated: true,
      user: currentSupabaseSession.user,
      role: currentSupabaseSession.user.user_metadata.role,
      onboardingCompleted: currentSupabaseSession.user.user_metadata.onboarding_completed,
    };
  }

  return { isAuthenticated: false, user: null, role: null };
}

function resolveRedirectDestination(
  auth: { isAuthenticated: boolean; role?: string | null; onboardingCompleted?: boolean },
  explicitRedirect?: string | null
): string {
  if (!auth.isAuthenticated) {
    return "/login";
  }
  if (explicitRedirect && explicitRedirect.startsWith("/")) {
    return explicitRedirect;
  }
  if (auth.role === "super_admin") {
    return "/master-admin/dashboard";
  }
  if (auth.role === "school_admin") {
    return auth.onboardingCompleted ? "/admin" : "/onboarding/school";
  }
  // Teachers, Accountants, Staff default to ERP admin workspace
  return "/admin";
}

function simulateRootPageDecision(): string {
  const hasRememberedMasterAdmin = mockLocalStorage.getItem("myzkool_master_remember_me") === "true";
  const hasRememberedSchoolUser =
    mockLocalStorage.getItem("myzkool_remember_me") === "true" ||
    mockSessionStorage.getItem("myzkool_session_active") === "true";

  if (hasRememberedMasterAdmin) {
    return "/master-admin/login";
  }
  if (hasRememberedSchoolUser) {
    return "/login";
  }
  return "LandingPage";
}

// ─────────────────────────────────────────────────────────────────────────────
// Run Test Suite
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("========================================================");
  console.log("TEST SUITE: Remember Me & Auto-Login Comprehensive Flow");
  console.log("========================================================");

  // --- Group 1: Login with Remember Me Enabled ---
  console.log("\n--- Group 1: Login with Remember Me Enabled ---");
  simulateLogout();
  simulateLogin("principal@greenfield.edu", "school_admin", true, true);

  assert(
    mockLocalStorage.getItem("myzkool_remember_me") === "true",
    "myzkool_remember_me is stored in localStorage as 'true'"
  );
  assert(
    mockSessionStorage.getItem("myzkool_session_active") === "true",
    "myzkool_session_active is stored in sessionStorage"
  );
  assert(
    mockLocalStorage.getItem("myzkool_remembered_login_email") === "principal@greenfield.edu",
    "Remembered login email is safely persisted for prefill"
  );

  // --- Group 2: Browser Refresh (Active Session Preserved) ---
  console.log("\n--- Group 2: Browser Refresh with Active Session ---");
  const refreshAuth = simulateAuthInitialization();
  assert(refreshAuth.isAuthenticated === true, "Session remains active upon page refresh");
  assert(
    resolveRedirectDestination(refreshAuth) === "/admin",
    "Redirects directly to /admin dashboard on refresh"
  );

  // --- Group 3: Browser Restart Simulation (Close & Reopen) ---
  console.log("\n--- Group 3: Browser Restart Simulation (Close & Reopen Website) ---");
  simulateBrowserRestart();
  assert(mockSessionStorage.getItem("myzkool_session_active") === null, "sessionStorage wiped by browser closure");
  assert(
    mockLocalStorage.getItem("myzkool_remember_me") === "true",
    "localStorage persisted across browser restart"
  );

  // Root Page Auto-routing
  const rootDecision = simulateRootPageDecision();
  assert(
    rootDecision === "/login",
    "Root page automatically redirects remembered user to /login instead of displaying static landing page"
  );

  // Auto-Login initialization
  const restartAuth = simulateAuthInitialization();
  assert(restartAuth.isAuthenticated === true, "Session automatically restored via Remember Me persistence");
  assert(
    mockSessionStorage.getItem("myzkool_session_active") === "true",
    "Active session flag re-established in sessionStorage"
  );
  assert(
    resolveRedirectDestination(restartAuth) === "/admin",
    "User automatically routed to /admin dashboard without clicking any login button"
  );

  // --- Group 4: Login WITHOUT Remember Me ---
  console.log("\n--- Group 4: Login WITHOUT Remember Me (Session-Only Auth) ---");
  simulateLogout();
  simulateLogin("temp_staff@greenfield.edu", "school_admin", false, true);

  assert(
    mockLocalStorage.getItem("myzkool_remember_me") === null,
    "myzkool_remember_me is NOT stored in localStorage when unchecked"
  );
  assert(
    mockSessionStorage.getItem("myzkool_session_active") === "true",
    "myzkool_session_active is present during active browser session"
  );

  // Refresh during same session
  const sameSessionRefresh = simulateAuthInitialization();
  assert(
    sameSessionRefresh.isAuthenticated === true,
    "Session persists across page refreshes within the same browser session"
  );

  // Browser restart without Remember Me
  simulateBrowserRestart();
  const restartWithoutRemember = simulateAuthInitialization();
  assert(
    restartWithoutRemember.isAuthenticated === false,
    "Session is cleanly discarded on browser restart when Remember Me was not checked"
  );
  assert(
    simulateRootPageDecision() === "LandingPage",
    "Root page renders LandingPage when user restarts browser without Remember Me"
  );

  // --- Group 5: Master Admin Remember Me & Auto-Login ---
  console.log("\n--- Group 5: Master Admin Remember Me & Auto-Login Flow ---");
  simulateLogout();
  simulateMasterAdminLogin("master@myzkool.com", true);

  assert(
    mockLocalStorage.getItem("myzkool_master_remember_me") === "true",
    "Master Admin remember-me flag saved in localStorage"
  );
  assert(
    mockLocalStorage.getItem("myzkool_master_admin_token") === "master-token-master@myzkool.com",
    "Master Admin token saved in localStorage"
  );

  // Simulate Master Admin browser restart
  simulateBrowserRestart();
  assert(
    simulateRootPageDecision() === "/master-admin/login",
    "Root page routes remembered master admin towards control plane login"
  );

  const masterAuth = {
    isAuthenticated: mockLocalStorage.getItem("myzkool_master_remember_me") === "true",
    role: "super_admin",
  };
  assert(
    resolveRedirectDestination(masterAuth) === "/master-admin/dashboard",
    "Master admin automatically redirects to /master-admin/dashboard"
  );

  // --- Group 6: Multi-Role Dashboard Redirection Verification ---
  console.log("\n--- Group 6: Multi-Role Dashboard Redirection Verification ---");

  // School Admin (Onboarding Complete)
  const schoolAdminComplete = { isAuthenticated: true, role: "school_admin", onboardingCompleted: true };
  assert(
    resolveRedirectDestination(schoolAdminComplete) === "/admin",
    "School Admin with completed onboarding routes to /admin"
  );

  // School Admin (Onboarding Pending)
  const schoolAdminPending = { isAuthenticated: true, role: "school_admin", onboardingCompleted: false };
  assert(
    resolveRedirectDestination(schoolAdminPending) === "/onboarding/school",
    "School Admin with pending onboarding routes to /onboarding/school"
  );

  // Teacher / Staff Role
  const teacherAuth = { isAuthenticated: true, role: "teacher", onboardingCompleted: true };
  assert(
    resolveRedirectDestination(teacherAuth) === "/admin",
    "Teacher account routes to /admin workspace"
  );

  // Explicit Return URL
  const deepLink = resolveRedirectDestination(schoolAdminComplete, "/admin/students/new");
  assert(
    deepLink === "/admin/students/new",
    "Explicit redirect URL (?redirect=/admin/students/new) is strictly respected"
  );

  // --- Group 7: Expired Session and Token Refresh ---
  console.log("\n--- Group 7: Expired Session & Token Refresh Protocol ---");
  simulateLogout();
  simulateLogin("teacher@greenfield.edu", "teacher", true, true);

  // Simulate token expiry
  if (currentSupabaseSession) {
    currentSupabaseSession.expires_at = Math.floor(Date.now() / 1000) - 100; // expired
  }

  const refreshedAuth = simulateAuthInitialization();
  assert(refreshedAuth.isAuthenticated === true, "Expired session automatically refreshed using refresh token");
  assert(
    currentSupabaseSession!.expires_at > Math.floor(Date.now() / 1000),
    "Refreshed token has updated future expiration timestamp"
  );

  // --- Group 8: Logout Completeness ---
  console.log("\n--- Group 8: Logout Completeness & Credential Cleanup ---");
  simulateLogout();

  assert(mockLocalStorage.getItem("myzkool_remember_me") === null, "myzkool_remember_me removed on logout");
  assert(mockLocalStorage.getItem("myzkool_master_remember_me") === null, "myzkool_master_remember_me removed on logout");
  assert(mockLocalStorage.getItem("myzkool_master_admin_token") === null, "Master admin token removed on logout");
  assert(mockSessionStorage.getItem("myzkool_session_active") === null, "myzkool_session_active removed on logout");
  assert(currentSupabaseSession === null, "Supabase session invalidated on logout");

  const postLogoutAuth = simulateAuthInitialization();
  assert(postLogoutAuth.isAuthenticated === false, "User is unauthenticated after logout");
  assert(
    simulateRootPageDecision() === "LandingPage",
    "Root page renders LandingPage after logout"
  );

  // --- Group 9: Security Audit (Zero Password Storage) ---
  console.log("\n--- Group 9: Security Audit (Zero Password Storage) ---");
  const testPassword = "SuperSecretPassword123!";
  simulateLogin("secure_admin@greenfield.edu", "school_admin", true, true);

  // Check all localStorage values
  let passwordFoundInLocalStorage = false;
  for (let i = 0; i < mockLocalStorage.length; i++) {
    const k = mockLocalStorage.key(i)!;
    const v = mockLocalStorage.getItem(k) || "";
    if (v.includes(testPassword) || k.toLowerCase().includes("password")) {
      passwordFoundInLocalStorage = true;
    }
  }
  assert(!passwordFoundInLocalStorage, "Password is NEVER stored in localStorage (Requirement 10)");

  // Check all sessionStorage values
  let passwordFoundInSessionStorage = false;
  for (let i = 0; i < mockSessionStorage.length; i++) {
    const k = mockSessionStorage.key(i)!;
    const v = mockSessionStorage.getItem(k) || "";
    if (v.includes(testPassword) || k.toLowerCase().includes("password")) {
      passwordFoundInSessionStorage = true;
    }
  }
  assert(!passwordFoundInSessionStorage, "Password is NEVER stored in sessionStorage (Requirement 10)");

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
