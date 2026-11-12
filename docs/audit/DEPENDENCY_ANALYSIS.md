# Dependency & Compatibility Analysis

> **Phase 2 — Deep File Classification & Dependency Investigation**  
> **Audited Date:** 2026-11-11

---

## 1. Package Dependencies Review (`package.json`)

### 1.1 Runtime Dependencies
| Package | Version | Import Count in `src/` | Purpose & Status |
|---|---|---|---|
| `react` | `^19.0.1` | Ubiquitous | Core UI framework. Fully compatible. |
| `react-dom` | `^19.0.1` | Bootstrapping (`main.tsx`) | React DOM rendering. |
| `react-router-dom` | `^7.18.3` | Core routing (`App.tsx`, `AppRoutes.tsx`) | SPA routing, lazy-loaded route chunks. |
| `express` | `^4.21.2` | Core backend (`server.ts`) | HTTP server, Master Admin APIs, Transport routes, proxy. |
| `@supabase/supabase-js` | `^2.116.0` | Ubiquitous across services | Database client, Auth, RLS enforcement. |
| `lucide-react` | `^0.546.0` | 80+ components | Icon library. Modular imports verified. |
| `leaflet` | `^1.9.4` | Transport routes (`RouteBuilderPage.tsx`) | Route map visualization and stop plotting. |
| `razorpay` | `^2.9.8` | `server.ts`, `razorpayRoutes.ts` | Backend payment capture and signature verification. |
| `@google/genai` | `^2.4.0` | `server.ts`, `AiSchoolAdvisor.tsx` | Generative AI School Advisor widget. |
| `zod` | `^4.6.5` | Validation schemas | Runtime input validation. |
| `dotenv` | `^17.2.3` | `server.ts` | Environment variable loader. |

### 1.2 Development Dependencies
| Package | Version | Purpose |
|---|---|---|
| `vite` | `^6.2.3` | Build tool and dev server |
| `@vitejs/plugin-react` | `^5.0.4` | Vite React plugin with Fast Refresh |
| `@tailwindcss/vite` | `^4.1.14` | Tailwind CSS v4 native Vite integration |
| `tailwindcss` | `^4.1.14` | Utility CSS compiler |
| `typescript` | `~5.8.2` | Static type checker |
| `tsx` | `^4.21.0` | Zero-config TypeScript execution for dev and test runners |
| `esbuild` | `^0.25.0` | Bundles `server.ts` into `dist/server.cjs` for production |
| `sharp` | `^0.35.5` | Image optimization script (`scripts/optimize-images.cjs`) |
| `@types/*` | Various | TypeScript type definitions |

---

## 2. Special Investigation: Zod Version Mismatch

### 2.1 The Finding
- Root `package.json` specifies: `"zod": "^4.6.5"`
- `packages/shared/package.json` specifies: `"zod": "^3.24.2"`

### 2.2 Import Analysis
- Searching `src/` and `server.ts` for `@shared` or `@myzkool/shared`:
  - `tsconfig.json` contains path mapping:
    ```json
    "@shared": ["./packages/shared/src/index.ts"],
    "@shared/*": ["./packages/shared/src/*"]
    ```
  - `vite.config.ts` contains alias:
    ```typescript
    '@shared': path.resolve(__dirname, './packages/shared/src')
    ```
  - **Empirical check:** `git grep "@shared"` reveals zero imports in active application source code (`src/` or `server.ts`).
  - Active source code files import schemas directly from local types/schemas (`src/types/*.ts`).

### 2.3 Impact & Resolution
- Because `packages/shared` is not directly imported in the build pipeline (`npm run build`), the version discrepancy does not cause runtime crashes or build failures today.
- **Action Plan:** Synchronize `packages/shared/package.json` dependency to match the root `zod: "^4.6.5"` or mark the package as a dedicated modular workspace to prevent future breakage when imported.

---

## 3. Package Scripts & CI Workflow Audit

### 3.1 `package.json` Scripts
| Script | Command | Purpose | Verified Working? |
|---|---|---|---|
| `dev` | `tsx server.ts` | Launches dev server with Vite HMR | Yes |
| `build` | `vite build && esbuild server.ts ...` | Compiles client SPA to `dist/` and server to `dist/server.cjs` | Yes |
| `start` | `node dist/server.cjs` | Starts production bundled Express server | Yes |
| `preview` | `vite preview` | Previews built client | Yes |
| `lint` | `tsc --noEmit` | Strict TypeScript typecheck | **PASS** (Zero errors) |
| `test` | `node scripts/run_all_tests.mjs` | Executes 86 test files in `tests/` | Yes |
| `test:py` | `python scripts/run_all_tests.py` | Python test runner for CI | Yes |
| `optimize-images` | `node scripts/optimize-images.cjs` | WebP image conversion | Yes |

### 3.2 CI Pipeline (`.github/workflows/ci.yml`)
1. Installs Node.js 22 & Python 3.12
2. Runs `npm ci`
3. Runs `npm run lint` (`tsc --noEmit`)
4. Runs `python scripts/run_all_tests.py`
5. Runs `npm run build`

All steps in the CI pipeline are verified to correspond directly to existing project scripts.
