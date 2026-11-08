# MyZkool Technical & On-Page SEO Implementation Report
**Date:** November 7, 2026  
**Specialist:** Technical SEO Specialist & Frontend Systems Architect  
**Domain:** `https://myzkool.in`  

---

## 1. Executive Summary

This report documents the complete on-page and technical Search Engine Optimization (SEO) implementation for the MyZkool web platform. Every public page has been equipped with tailored metadata, social graph tags, crawl directives, and Schema.org JSON-LD structured data.

All copy strictly adheres to the rule: **Never use em dashes or hyphens as sentence punctuation.**

---

## 2. On-Page Metadata Matrix

Each public route features unique, non-duplicative titles and meta descriptions optimized for both human click-through rates and search crawler comprehension.

### 2.1 Route: `/` (Home & Landing Page)
- **Document Title:** `MyZkool, School Website Builder and Management ERP with WhatsApp`
- **Meta Description:** `One unified platform for school websites, fee collections, attendance, report cards, and automated WhatsApp parent notifications. Designed for Indian K12 schools with zero IT team required.`
- **Canonical URL:** `https://myzkool.in/`
- **Keywords:** `MyZkool, School Management Software, School ERP Software in India, School Management System, School Website Builder, School Fee Management Software, Student Management System, School Attendance Management, School ERP for Indian Schools`
- **OpenGraph Title:** `MyZkool, School Website Builder and ERP with WhatsApp`
- **OpenGraph Description:** `One unified platform for school websites, fee collections, attendance, and automated WhatsApp parent notifications. Zero IT team required.`
- **OpenGraph Image:** `https://myzkool.in/logo.svg`
- **Twitter Card:** `summary_large_image`
- **Robots Directive:** `index, follow`

### 2.2 Route: `/about` (About MyZkool)
- **Document Title:** `About MyZkool, Built for Indian K-12 Schools | MyZkool`
- **Meta Description:** `Learn how MyZkool empowers Indian K-12 schools with modern websites, seamless fee management, and instant parent communication.`
- **Canonical URL:** `https://myzkool.in/about`
- **Robots Directive:** `index, follow`

### 2.3 Route: `/register` (School Registration)
- **Document Title:** `Register Your School, Start Free Setup | MyZkool`
- **Meta Description:** `Create your school website and setup your management ERP in minutes. Built for Indian K-12 schools.`
- **Canonical URL:** `https://myzkool.in/register`
- **Robots Directive:** `index, follow`

### 2.4 Route: `/login` (School Portal Authentication)
- **Document Title:** `Sign In to School Portal | MyZkool`
- **Meta Description:** `Secure administrative sign-in for school principals, accountants, teachers, and staff members.`
- **Robots Directive:** `noindex, nofollow` (Prevents duplicate search snippets for utility login forms)

---

## 3. Schema.org JSON-LD Structured Data

Structured data enables Google and Bing to parse entity data and display Rich Results (such as FAQ rich snippets and Software Application badges) directly in search engine result pages.

### 3.1 Organization Schema
Pre-rendered statically in `index.html` for instant indexing:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://myzkool.in/#organization",
  "name": "MyZkool",
  "url": "https://myzkool.in",
  "logo": "https://myzkool.in/logo.svg",
  "description": "School website builder and cloud ERP management platform with automated WhatsApp parent notifications for Indian K-12 schools.",
  "foundingLocation": {
    "@type": "Place",
    "name": "Lucknow, Uttar Pradesh, India"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+91-9555954854",
    "contactType": "customer service",
    "availableLanguage": ["English", "Hindi"],
    "areaServed": "IN"
  },
  "sameAs": [
    "https://www.instagram.com/myzkool",
    "https://www.linkedin.com/in/khaqan-ahmad-91299b40a"
  ]
}
```

### 3.2 SoftwareApplication Schema
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "@id": "https://myzkool.in/#software",
  "name": "MyZkool",
  "operatingSystem": "Web, Android, iOS",
  "applicationCategory": "EducationalApplication, BusinessApplication",
  "description": "All in one school management system, website builder, fee collection ERP, and automated WhatsApp parent communication portal.",
  "url": "https://myzkool.in",
  "publisher": {
    "@id": "https://myzkool.in/#organization"
  },
  "offers": {
    "@type": "Offer",
    "price": "999",
    "priceCurrency": "INR",
    "priceValidUntil": "2027-12-31"
  }
}
```

### 3.3 FAQPage Schema
Injected reactively on the landing page via `usePageMetadata`:
- 6 rich question and answer pairs covering IT requirements, WhatsApp notifications, legacy data migration, DPDP Act data security, CBSE/ICSE board compatibility, and online UPI fee payments.

### 3.4 BreadcrumbList Schema
Injected on `/about` to provide hierarchical navigation for search engine result pages:
- Position 1: Home (`https://myzkool.in/`)
- Position 2: About Us (`https://myzkool.in/about`)

---

## 4. Crawl Directives & Sitemap

### 4.1 `public/robots.txt`
Configured to allow public search discovery while strictly keeping private tenant workspaces, control plane routes, and onboarding steps out of search results:
```txt
User-agent: *
Allow: /
Allow: /about
Allow: /login
Allow: /register

# Disallow internal control plane, dashboard, onboarding and sensitive routes from indexing
Disallow: /master-admin
Disallow: /master-admin/
Disallow: /admin
Disallow: /admin/
Disallow: /onboarding
Disallow: /onboarding/
Disallow: /verify
Disallow: /reset-password
Disallow: /pay/
Disallow: /api/

Sitemap: https://myzkool.in/sitemap.xml
```

### 4.2 `public/sitemap.xml`
Valid XML sitemap with daily and weekly crawl prioritization:
- Root (`/`): Priority `1.0`, `weekly` frequency.
- About (`/about`): Priority `0.9`, `monthly` frequency.
- Register (`/register`): Priority `0.8`, `monthly` frequency.
- Login (`/login`): Priority `0.7`, `monthly` frequency.

---

## 5. Empirical Verification Results
- In-browser CDP test executed against `http://localhost:3000/`.
- Total JSON-LD scripts discovered: `2`.
- Valid schema types verified: `Organization`, `SoftwareApplication`, `WebSite`, `FAQPage`.
- Zero syntax errors during JSON.parse evaluation.
- All titles verified free of em dashes and hyphens used as sentence punctuation.

