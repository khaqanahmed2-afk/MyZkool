# MyZkool Dependency Audit & Classification

**Audit Target**: `package.json` & Node Modules Dependency Tree  
**Execution Date**: November 2026  
**Status**: Optimized & Reclassified  

---

## 1. Production Dependencies (`dependencies`)

The application maintains a lean production dependency footprint consisting of **10 packages**, all with validated, mission-critical runtime responsibilities:

| Package | Version | Layer | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **`@google/genai`** | `^2.4.0` | Server | Google GenAI SDK powering Gemini 2.5 Flash for the conversational advisor and multimodal OCR |
| **`@supabase/supabase-js`** | `^2.116.0` | Client/Server | Official Supabase client for database operations, authentication, and real-time events |
| **`dotenv`** | `^17.2.3` | Server | Loads environment configuration into `process.env` during server startup |
| **`express`** | `^4.21.2` | Server | HTTP application framework handling REST endpoints and Vite middleware |
| **`leaflet`** | `^1.9.4` | Client | Interactive mapping engine powering route design, bus stops, and fleet logistics |
| **`lucide-react`** | `^0.546.0` | Client | Comprehensive SVG iconography system across admin, portal, and public views |
| **`razorpay`** | `^2.9.8` | Server | Razorpay Node.js SDK for subscription payments and parent fee collection |
| **`react`** | `^19.0.1` | Client | Core component runtime library |
| **`react-dom`** | `^19.0.1` | Client | DOM rendering engine for React 19 |
| **`react-router-dom`** | `^7.18.3` | Client | Client-side routing engine with nested route support and data navigators |
| **`zod`** | `^4.6.5` | Shared | Universal runtime schema validation and contract type generation |

---

## 2. Reclassified Dependencies

The following packages were previously listed under `dependencies` but represent build-time bundler plugins rather than runtime server/client dependencies. They have been migrated to `devDependencies`:

* **`@tailwindcss/vite`** (`^4.1.14`): Vite compilation plugin for Tailwind CSS v4. Bundles styling during the build process; never executed at server runtime.
* **`@vitejs/plugin-react`** (`^5.0.4`): Vite compilation plugin enabling React Fast Refresh and JSX transformation.

---

## 3. Development Dependencies (`devDependencies`)

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`@types/express`** | `^4.17.21` | Type definitions for Express HTTP request and response objects |
| **`@types/leaflet`** | `^1.9.22` | Type definitions for Leaflet maps, markers, and polygon layers |
| **`@types/node`** | `^22.14.0` | Type definitions for Node.js standard runtime APIs |
| **`esbuild`** | `^0.25.0` | Ultra-fast bundler for compiling `server.ts` into `dist/server.cjs` |
| **`sharp`** | `^0.35.5` | High-performance image processing engine used by `scripts/optimize-images.cjs` |
| **`tailwindcss`** | `^4.1.14` | Tailwind CSS v4 engine |
| **`tsx`** | `^4.21.0` | TypeScript Node executor for running dev servers and automated test suites |
| **`typescript`** | `~5.8.2` | TypeScript compiler for static type analysis (`tsc --noEmit`) |
| **`vite`** | `^6.2.3` | Next-generation frontend build tool and development server |

---

## 4. Test Runner Optimization

* Added `scripts/run_all_tests.mjs` providing native cross-platform execution of all 76 test suites via `node scripts/run_all_tests.mjs`, removing external Python dependencies on developer machines while keeping `scripts/run_all_tests.py` available for legacy environments.

