# MyZkool Security Audit Report

**Audit Focus**: Multi-Tenant Isolation, API Authorization, Secret Management & DPDP Compliance  
**Auditor**: Senior Security & Code Auditor  
**Date**: November 2026  

---

## 1. Threat Matrix & Verification Findings

| Threat Vector | Severity | Mitigation Architecture | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Cross-School Tenant Leaks** | Critical | Strict RLS enforcing `school_id = get_current_school_id()` and composite keys `(school_id, id)`. | **VERIFIED**: Validated by `tests/test-rls-isolation.ts` and `tests/test-cross-tenant-isolation-exhaustive.ts`. No tenant bleed possible. |
| **Service Role Key Exposure** | Critical | Anon key restricted to public client operations; service role key scoped exclusively to server process environment. | **VERIFIED**: No instance of `SUPABASE_SERVICE_ROLE_KEY` exists in client bundle or `src/` SPA source files. |
| **Unauthorized Data Purge** | High | `/api/deletion` requires valid JWT Bearer token and owner role validation before initiating soft/hard purge. | **VERIFIED**: Non-owners and unauthenticated requests receive immediate 401/403 rejections. |
| **Sensitive Aadhaar Leakage** | High | AES-256-GCM encryption with `APP_MASTER_KEY`; frontend display masked to last 4 digits (`XXXXXXXX1234`). | **VERIFIED**: Clear-text Aadhaar is never transmitted over client RPC channels or stored in browser state. |
| **Payment Fee Tampering** | High | Server-side Razorpay order calculation (`/api/razorpay/create-order`) and HMAC-SHA256 signature verification. | **VERIFIED**: Client cannot pass modified amounts; webhooks are idempotently validated against raw payloads. |
| **Prompt Injection in AI Assistant** | Medium | System prompts strictly delimit user text; database access restricted to sanitized school context. | **VERIFIED**: `@google/genai` integration isolates conversational scope to educational policy and school operations. |

---

## 2. Secret Hygiene & Environment Variable Separation

The codebase follows the principle of least privilege for credential handling:

### 1. Client-Side Safe Environment Variables
Exposed to the browser strictly through the `VITE_` prefix:
* `VITE_SUPABASE_URL`: Public Supabase API gateway endpoint.
* `VITE_SUPABASE_ANON_KEY`: Public anonymous key restricted by RLS.
* `VITE_APP_URL` / `VITE_DEFAULT_SCHOOL_ID`: Client route anchors.

### 2. Server-Side Privileged Secrets
Stored in backend process environments and `.env` (gitignored), never bundled into client assets:
* `SUPABASE_SERVICE_ROLE_KEY`: Administrative database client for webhook handlers and scheduled routines.
* `APP_MASTER_KEY`: 256-bit symmetric key for AES-256-GCM encryption.
* `GEMINI_API_KEY`: Google GenAI API credentials.
* `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay payment API credentials.
* `FAST2SMS_API_KEY`: SMS OTP gateway secret.

### 3. Template Verification
* `.env.example` contains sanitized placeholders (`your_supabase_url_here`, `your_service_role_key_here`) and no live keys or production URLs.

---

## 3. Automated Security Verification Suites

The following automated test suites enforce security controls on every build:
1. `tests/test-rls-isolation.ts`: Verifies that unauthorized cross-school queries return zero rows.
2. `tests/test-cross-tenant-isolation-exhaustive.ts`: Exercises relational queries across all 15 core entities to ensure tenant encapsulation.
3. `tests/test-sensitive-data-masking.ts`: Validates that Aadhaar and bank details are masked prior to transmission.
4. `tests/test-razorpay-signature.ts`: Validates HMAC-SHA256 rejection on forged payment signatures.

