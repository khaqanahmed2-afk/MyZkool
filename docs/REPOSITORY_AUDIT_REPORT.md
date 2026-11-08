# MyZkool Repository Audit Report

**Date**: November 2026 | **Auditor**: Senior Architect & Code Quality Auditor  
**Repository Path**: `D:/Users/KhaqanLife/Desktop/myzkool`  
**Git Branch**: `main` | **Target Architecture**: Single-tenant isolated school operations, multi-tenant DB with RLS  
**Environment**: Node.js v22.14, TypeScript 5.8.2, React 19.0.1, Vite 6.2.3, Tailwind CSS v4, Supabase (PostgreSQL 15+)  

---

## 1. Executive Summary

MyZkool is an integrated multi-tenant School ERP and Website Builder platform engineered for private K-12 educational institutions across India. The application manages the end-to-end institutional lifecycle including online and in-person student admissions, class and academic session management, fine-grained fee structures with multi-term dues generation, fee collections with offline cash/cheque/UPI and online Razorpay integration, student transfer certificate (TC) tracking, and GPS-enabled transport logistics with stop-wise billing slabs.

This comprehensive repository audit covered all 266 source files, configuration assets, 55 SQL migration scripts, 76 automated test suites, and third-party dependencies to eliminate dead code, optimize static assets, align dependency classifications, and establish formal architectural documentation.

---

## 2. Codebase Breakdown & Technology Stack

| Layer | Technologies / Libraries | Responsibilities |
| :--- | :--- | :--- |
| **Frontend SPA** | React 19.0.1, React Router v7.18.3, Tailwind CSS v4 | Client-side reactive interface, administrative portal, parent portal, public website |
| **Component System** | Lucide React v0.546.0, custom UI dialogs | Accessible design system, theme-aware admin components, receipt/invoice print engines |
| **Backend API** | Express 4.21.2, esbuild 0.25.0 | Server-side endpoints, AI advisory services, Razorpay order/webhook processing, SSR dev middleware |
| **Database & Auth** | Supabase JS v2.116.0, PostgreSQL | Multi-tenant relational schema, Row Level Security (RLS), atomic RPC stored procedures, auth tokens |
| **AI & Document Intelligence** | Google GenAI SDK (`@google/genai` v2.4.0) | Contextual school advisory (Gemini 2.5 Flash), multimodal document extraction & OCR, text-to-speech |
| **Payments** | Razorpay SDK v2.9.8 | Subscription management, online parent fee collection, HMAC-SHA256 webhook reconciliation |
| **Logistics & Maps** | Leaflet v1.9.4 | Route builder, bus stop sequencing, GPS tracking visualizations |
| **Shared Contracts** | Zod v4.6.5 (`packages/shared`) | Universal runtime schema validation and TypeScript contract definitions |

---

## 3. Verified Dead Code Eliminated

The following orphaned page components were thoroughly audited and removed from the active codebase:

1. **`src/pages/admin/fees/ReceiptsPage.tsx`** (443 lines):
   * **Verification**: In `src/routes/AppRoutes.tsx`, route `/admin/fees/receipts` is explicitly redirected to `/admin/fees/collections`. All thermal receipt generation, A5 printing, receipt history, and cancellation logic were consolidated into `FeeCollectionsPage.tsx`. Zero inbound imports existed.
   * **Impact**: Eliminated 443 lines of dead code.

2. **`src/pages/admin/fees/DefaultersPage.tsx`** (458 lines):
   * **Verification**: In `src/routes/AppRoutes.tsx`, route `/admin/fees/defaulters` was wired to render `DuesRemindersPage`. `DefaultersPage.tsx` was completely unreferenced throughout the project.
   * **Impact**: Eliminated 458 lines of dead code.

3. **`src/pages/admin/fees/DuesGenerationPage.tsx`** (250 lines):
   * **Verification**: Routes `/admin/fees/dues`, `/admin/fees/invoices`, and `/admin/fees/assign` render `InvoicesPage`. `DuesGenerationPage.tsx` retained obsolete `localStorage` mocks that bypassed Supabase entirely and was never rendered in the routing table.
   * **Impact**: Eliminated 250 lines of dead code.

**Total Dead Code Eliminated**: **1,151 lines**.

---

## 4. Redundant Documentation & Binary Blobs Eliminated

1. **`docs/MyZkool - PRD, TRD, ...docx`** (43 KB):
   * Binary Microsoft Word specification file converted into canonical Markdown. Removed to keep repository lean.
2. **`docs/SPEC_FROM_DOCX.md`** (88 KB):
   * Unformatted raw XML/text extraction dump generated during initial spec parsing. Revalidated against canonical formatted `docs/spec.md`. Removed to prevent duplication.
3. **`.aistudio/artifacts/brain/.../.tempmediaStorage/*.png`** (3.25 MB):
   * Abandoned temporary screenshot blobs from prior design sessions. Removed to reduce git clone payload.

**Total Redundant Storage Eliminated**: **~3.5 MB**.

---

## 5. Critical Preservation & Safety Verifications

During the audit, every deletion candidate was revalidated against false positives:

* **`src/pages/admin/students/AdminTableHeader.tsx`**:
  * *Revalidation*: Imported directly on line 19 of `src/pages/admin/students/StudentPromotionPipeline.tsx` and rendered at line 280.
  * *Decision*: **PRESERVED**. Deletion would have broken student academic year promotions.
* **`src/pages/admin/students/StudentPageHeader.tsx`**:
  * *Revalidation*: Imported in `StudentTCRegister.tsx` (line 11) and `StudentPromotionPipeline.tsx` (line 18).
  * *Decision*: **PRESERVED**.
* **`docs/spec.md`**:
  * *Revalidation*: Canonical specification file referenced directly by CLI tooling (`scripts/spec.sh`).
  * *Decision*: **PRESERVED**.
* **Database Migrations & Financial Recovery Scripts**:
  * All 55 migration files in `supabase/migrations/` and all snapshot state baselines in `scripts/backups/` and `supabase/scripts/` were preserved intact. No production database data was touched.

---

## 6. Static Asset Optimization (WebP Conversion)

Landing page mockups and founder portraits were verified and repointed to pre-optimized WebP assets in `public/`:

| Asset | Original Format | Original Size | WebP Size | Reduction |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Laptop Mockup** | `/hero-laptop.png` | 1,625 KB | 118 KB | **-92.7%** |
| **Parent Mobile Mockup** | `/myzkoolp.png` | 1,401 KB | 121 KB | **-91.3%** |
| **Khaqan Ahmad Photo** | `/Khaqan Ahmad.jpg` | 120 KB | 62 KB | **-48.3%** |
| **Ahiri Naskar Photo** | `/Ahiri Naskar.png` | 272 KB | 12 KB | **-95.2%** |
| **Aqsa Ibrahim Photo** | `/Aqsa Ibrahim.jpg` | 21 KB | 11 KB | **-47.6%** |

**Net Initial Load Bandwidth Savings**: **~2.85 MB** (over 90% reduction on media assets).

