import { getSubdomainFromHost } from "../src/services/websiteService";
import { isReservedSubdomain, RESERVED_SUBDOMAINS } from "../src/constants/subdomains";
import { validateSubdomainFormat, normalizeSubdomain } from "../src/services/schoolService";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

console.log("=== Testing Subdomain Extraction & Platform Host Resolution ===");

// 1. Root Vercel application host
assert(
  getSubdomainFromHost("my-zkool.vercel.app") === null,
  "my-zkool.vercel.app returns null (renders LandingPage, not School Not Found)"
);

// 2. Vercel preview branch hosts
assert(
  getSubdomainFromHost("my-zkool-git-main-khaqan.vercel.app") === null,
  "my-zkool git branch preview returns null"
);

// 3. School tenant hosted under Vercel preview
assert(
  getSubdomainFromHost("greenwood.my-zkool.vercel.app") === "greenwood",
  "greenwood.my-zkool.vercel.app returns 'greenwood'"
);

// 4. Production root domains
assert(
  getSubdomainFromHost("myzkool.in") === null,
  "myzkool.in returns null (LandingPage)"
);
assert(
  getSubdomainFromHost("myzkool.com") === null,
  "myzkool.com returns null (LandingPage)"
);
assert(
  getSubdomainFromHost("www.myzkool.in") === null,
  "www.myzkool.in returns null (LandingPage)"
);
assert(
  getSubdomainFromHost("app.myzkool.in") === null,
  "app.myzkool.in returns null"
);

// 5. Valid school tenant subdomains on production domains
assert(
  getSubdomainFromHost("greenwood.myzkool.in") === "greenwood",
  "greenwood.myzkool.in returns 'greenwood'"
);
assert(
  getSubdomainFromHost("oakridge.myzkool.com") === "oakridge",
  "oakridge.myzkool.com returns 'oakridge'"
);
assert(
  getSubdomainFromHost("dps-delhi.myzkool.in") === "dps-delhi",
  "dps-delhi.myzkool.in returns 'dps-delhi'"
);

// 6. Two-level ccTLD domains (.co.in)
assert(
  getSubdomainFromHost("myzkool.co.in") === null,
  "myzkool.co.in returns null"
);
assert(
  getSubdomainFromHost("greenwood.myzkool.co.in") === "greenwood",
  "greenwood.myzkool.co.in returns 'greenwood'"
);

// 7. Dev / local / container preview domains
assert(
  getSubdomainFromHost("localhost") === null,
  "localhost returns null"
);
assert(
  getSubdomainFromHost("localhost:3000") === null,
  "localhost:3000 returns null"
);
assert(
  getSubdomainFromHost("127.0.0.1") === null,
  "127.0.0.1 returns null"
);
assert(
  getSubdomainFromHost("ais-dev-36k4zaxolo4qzgscioia2z-30059009673.asia-southeast1.run.app") === null,
  "Cloud Run preview host returns null"
);

// 8. Reserved subdomain checks
assert(
  isReservedSubdomain("my-zkool") === true,
  "isReservedSubdomain('my-zkool') is true"
);
assert(
  isReservedSubdomain("myzkool") === true,
  "isReservedSubdomain('myzkool') is true"
);
assert(
  isReservedSubdomain("admin") === true,
  "isReservedSubdomain('admin') is true"
);
assert(
  isReservedSubdomain("greenwood") === false,
  "isReservedSubdomain('greenwood') is false"
);

// 9. Validation of subdomain format
assert(
  validateSubdomainFormat("my-zkool").isValid === false,
  "validateSubdomainFormat('my-zkool') correctly rejects as reserved"
);
assert(
  validateSubdomainFormat("greenwood").isValid === true,
  "validateSubdomainFormat('greenwood') is valid"
);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
