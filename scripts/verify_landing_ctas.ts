import fs from "fs";
import path from "path";

console.log("=== VERIFYING REGISTRATION CTAS ON LANDING PAGE ===");

let passed = true;

// 1. Check Navbar.tsx
const navbarPath = path.resolve(process.cwd(), "src/components/layout/Navbar.tsx");
const navbarContent = fs.readFileSync(navbarPath, "utf-8");

// Desktop Register button
if (navbarContent.includes('id="navbar-register-btn"') && navbarContent.includes('to="/register"')) {
  console.log("✔ Desktop Register School button present in Navbar with link to /register");
} else {
  console.error("✖ Desktop Register School button missing or invalid link in Navbar");
  passed = false;
}

// Mobile Register button
if (navbarContent.includes('id="mobile-register-btn"') && navbarContent.includes('to="/register"')) {
  console.log("✔ Mobile Register School button present in Navbar drawer with link to /register");
} else {
  console.error("✖ Mobile Register School button missing or invalid link in Navbar drawer");
  passed = false;
}

// 2. Check Hero.tsx
const heroPath = path.resolve(process.cwd(), "src/components/sections/Hero.tsx");
const heroContent = fs.readFileSync(heroPath, "utf-8");

if (
  heroContent.includes('id="hero-register-link"') &&
  heroContent.includes('to="/register"') &&
  heroContent.includes("Ready to get started?") &&
  heroContent.includes("Register your school")
) {
  console.log("✔ Hero Register School subtle link present with link to /register");
} else {
  console.error("✖ Hero Register School subtle link missing or invalid");
  passed = false;
}

// 3. Grammar check: Ensure no em dashes or isolated hyphens used as punctuation in newly added code
const forbiddenPunctuation = [/—/, / – /, / - /];
for (const pattern of forbiddenPunctuation) {
  if (pattern.test(navbarContent.slice(navbarContent.indexOf('id="navbar-register-btn"'), navbarContent.indexOf('id="navbar-register-btn"') + 500))) {
    console.error(`✖ Found forbidden punctuation ${pattern} in navbar desktop button`);
    passed = false;
  }
  if (pattern.test(navbarContent.slice(navbarContent.indexOf('id="mobile-register-btn"'), navbarContent.indexOf('id="mobile-register-btn"') + 500))) {
    console.error(`✖ Found forbidden punctuation ${pattern} in navbar mobile button`);
    passed = false;
  }
  if (pattern.test(heroContent.slice(heroContent.indexOf('id="hero-register-link"'), heroContent.indexOf('hero-register-link') + 500))) {
    console.error(`✖ Found forbidden punctuation ${pattern} in hero register link`);
    passed = false;
  }
}

if (passed) {
  console.log("\nALL REGISTRATION CTA CHECKS PASSED!");
  process.exit(0);
} else {
  console.error("\nSOME CHECKS FAILED!");
  process.exit(1);
}

