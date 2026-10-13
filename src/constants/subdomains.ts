/**
 * Reserved subdomain list for multi-tenant isolation.
 */
export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'admin',
  'api',
  'mail',
  'support',
  'static',
  'assets',
  'cdn',
  'staging',
  'dev',
  'demo',
  'myzkool',
  'my-zkool',
  'portal',
  'parent',
  'parents',
  'student',
  'students',
  'teacher',
  'teachers',
  'test',
  'status',
  'billing',
  'account',
  'dashboard',
  'root',
  'superadmin',
  'secure',
  'help',
  'docs',
  'login',
  'register',
  'signup',
  'verify',
  'auth',
  'erp',
  'pay',
  'payment',
] as const;

export type ReservedSubdomain = (typeof RESERVED_SUBDOMAINS)[number];

const RESERVED_SET = new Set<string>(RESERVED_SUBDOMAINS.map((s) => s.toLowerCase()));

/**
 * Validates whether a candidate subdomain string is reserved by the platform.
 */
export function isReservedSubdomain(subdomain: string | null | undefined): boolean {
  if (!subdomain) return true;
  const clean = subdomain.toLowerCase().trim();
  if (RESERVED_SET.has(clean)) return true;
  // Also treat variants of myzkool / my-zkool as reserved platform addresses
  if (clean === "myzkool" || clean === "my-zkool" || clean.startsWith("myzkool-") || clean.startsWith("my-zkool-")) {
    return true;
  }
  return false;
}

