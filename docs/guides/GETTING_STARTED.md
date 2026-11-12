# Getting Started with MyZkool

> **Quickstart Guide for New Developers**  
> **Platform Version:** 1.6.0  
> **Audited Date:** 2026-11-11

---

## 1. Prerequisites

Before setting up MyZkool locally, ensure your machine has:
- **Node.js:** `v20.x` or `v22.x` (LTS recommended)
- **Package Manager:** `npm` (bundled with Node.js)
- **Python:** `3.10+` (optional, needed only if executing CI test harness via `python scripts/run_all_tests.py`)
- **Git:** Latest version

---

## 2. Quick Installation

```bash
# 1. Clone the repository
git clone <repository_url> myzkool
cd myzkool

# 2. Install all dependencies
npm install

# 3. Configure local environment variables
cp .env.example .env
```

---

## 3. Environment Variables Configuration

Open `.env` in your editor and provide the Supabase project connection values:

```ini
# Supabase Configuration
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key-here"

# Server-Side Master Cryptographic Key (32-byte base64 string for AES-256-GCM)
APP_MASTER_KEY="your-base64-master-encryption-key"

# Public domain for multi-tenant school website routing (default: localhost:3000)
VITE_PUBLIC_DOMAIN="localhost:3000"

# Razorpay Configuration (Test Mode credentials)
RAZORPAY_KEY_ID="rzp_test_xxxxxx"
RAZORPAY_KEY_SECRET="your-secret-key"
VITE_RAZORPAY_KEY_ID="rzp_test_xxxxxx"

# Google Gemini API Key (For AI School Advisor feature)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## 4. Running the Development Server

Start the integrated development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

The application will be live at:
- **School SaaS Landing Page:** `http://localhost:3000`
- **School Admin Portal:** `http://localhost:3000/login`
- **Master Admin Platform Console:** `http://localhost:3000/master-admin/login`

---

## 5. Verification Commands

To verify your environment setup:

```bash
# Run strict TypeScript typechecking
npm run lint

# Run the complete automated test suite (86 test specs)
npm test

# Verify production build compilation
npm run build
```
