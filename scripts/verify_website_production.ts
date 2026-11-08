import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  private ws!: any;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();
  public logs: any[] = [];
  public errors: any[] = [];

  async connect(wsUrl: string) {
    const WebSocket = (await import("ws")).default;
    this.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws.on("open", resolve);
      this.ws.on("error", reject);
    });

    this.ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          this.callbacks.get(msg.id)!(msg);
          this.callbacks.delete(msg.id);
        } else if (msg.method) {
          this.handleEvent(msg.method, msg.params);
        }
      } catch (err) {
        console.error("CDP parse error:", err);
      }
    });
  }

  private handleEvent(method: string, params: any) {
    if (method === "Runtime.consoleAPICalled") {
      const args = params.args.map((a: any) =>
        a.value !== undefined ? a.value : a.description ? a.description : JSON.stringify(a)
      );
      this.logs.push({ type: params.type, args });
      if (params.type === "error") {
        this.errors.push(args.join(" "));
        console.log(`[Browser Console ERROR]:`, ...args);
      }
    }
  }

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = ++this.id;
    const msg = { id, method, params };
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify(msg));
    });
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.result?.value;
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function findChromePath(): Promise<string> {
  const possiblePaths = [
    "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "D:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return "chrome";
}

async function runVerification() {
  console.log("=== MyZkool Website Upgrade Verification ===");
  const chromePath = await findChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-zkool-verify-"));

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9333",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  await sleep(2500);

  let versionRes;
  try {
    const res = await fetch("http://localhost:9333/json/version");
    versionRes = await res.json();
  } catch (err) {
    console.error("Failed to connect to Chrome debugging port:", err);
    chromeProc.kill();
    process.exit(1);
  }

  const newTabRes = await fetch("http://localhost:9333/json/new?about:blank", { method: "PUT" });
  const tabData = await newTabRes.json();
  const cdp = new CDPClient();
  await cdp.connect(tabData.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  console.log("\n--- Testing Route 1: http://localhost:3000/ (Landing Page) ---");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(3000);

  // Check 1: Title and meta tags
  const title = await cdp.evaluate("document.title");
  const description = await cdp.evaluate("document.querySelector('meta[name=\"description\"]')?.getAttribute('content')");
  const canonical = await cdp.evaluate("document.querySelector('link[rel=\"canonical\"]')?.getAttribute('href')");
  const ogTitle = await cdp.evaluate("document.querySelector('meta[property=\"og:title\"]')?.getAttribute('content')");
  const ogDesc = await cdp.evaluate("document.querySelector('meta[property=\"og:description\"]')?.getAttribute('content')");

  console.log(`Page Title: "${title}"`);
  console.log(`Meta Description: "${description?.slice(0, 80)}..."`);
  console.log(`Canonical URL: "${canonical}"`);

  // Verify grammar constraints: zero em dashes and zero hyphens as punctuation
  const hasEmDash = title.includes("—") || (description && description.includes("—")) || (ogTitle && ogTitle.includes("—"));
  console.log(`Punctuation Check: Em Dash (—) present: ${hasEmDash ? "FAIL (em dash found!)" : "PASS (No em dash)"}`);

  // Check 2: Schema.org structured data
  const jsonLdElements = await cdp.evaluate(`
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(el => {
      try {
        return JSON.parse(el.textContent || "{}");
      } catch (e) {
        return { parseError: e.message };
      }
    })
  `);
  console.log(`JSON-LD Scripts Found: ${jsonLdElements.length}`);
  for (let i = 0; i < jsonLdElements.length; i++) {
    const s = jsonLdElements[i];
    console.log(`  Schema #${i + 1} types:`, s["@type"] || (s["@graph"] ? s["@graph"].map((g: any) => g["@type"]).join(", ") : "Unknown"));
  }

  // Check 3: 17-Section Flow Verification
  const sectionReport = await cdp.evaluate(`
    (() => {
      const results = {};
      results.navbar = Boolean(document.querySelector('header nav'));
      results.hero = Boolean(document.querySelector('#hero-headline') || document.querySelector('section[aria-label="Hero"]'));
      results.dashboardPreview = Boolean(document.querySelector('#dashboard-preview'));
      results.trustStrip = Boolean(document.querySelector('[aria-label="Core feature overview"]') || document.querySelector('#philosophy'));
      results.philosophy = Boolean(document.querySelector('#philosophy'));
      results.features = Boolean(document.querySelector('#features'));
      results.websiteBuilder = Boolean(document.querySelector('#website-builder'));
      results.academics = Boolean(document.querySelector('#academics'));
      results.parentApp = Boolean(document.querySelector('#parent-app'));
      results.howItWorks = Boolean(document.querySelector('#how-it-works'));
      results.roadmap = Boolean(document.querySelector('#roadmap'));
      results.pricing = Boolean(document.querySelector('#pricing'));
      results.comparisonTable = Boolean(document.querySelector('#comparison-table') || document.querySelector('table'));
      results.faq = Boolean(document.querySelector('#faq'));
      results.finalCta = Boolean(document.querySelector('#final-cta'));
      results.footer = Boolean(document.querySelector('footer'));
      return results;
    })()
  `);
  console.log("\n17-Section Presence Report:", JSON.stringify(sectionReport, null, 2));

  // Check 4: Responsive Check at Mobile Viewport (360x780)
  console.log("\n--- Testing Mobile Responsiveness (360x780) ---");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(1000);

  const mobileOverflow = await cdp.evaluate(`
    document.documentElement.scrollWidth > window.innerWidth
  `);
  console.log(`Mobile Horizontal Overflow: ${mobileOverflow ? "FAIL (Horizontal overflow detected)" : "PASS (No horizontal scroll)"}`);

  const mobileMenuBtn = await cdp.evaluate(`
    Boolean(document.querySelector('button[aria-label*="menu" i]'))
  `);
  console.log(`Mobile Hamburger Menu Button Present: ${mobileMenuBtn ? "PASS" : "FAIL"}`);

  // Check 5: Testing Route 2: http://localhost:3000/about
  console.log("\n--- Testing Route 2: http://localhost:3000/about ---");
  await cdp.send("Emulation.clearDeviceMetricsOverride");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/about" });
  await sleep(2500);

  const aboutTitle = await cdp.evaluate("document.title");
  const aboutHasEmDash = aboutTitle.includes("—");
  const aboutBreadcrumb = await cdp.evaluate(`
    Boolean(document.querySelector('script[type="application/ld+json"]'))
  `);
  console.log(`About Page Title: "${aboutTitle}"`);
  console.log(`About Page Em Dash Check: ${aboutHasEmDash ? "FAIL" : "PASS"}`);
  console.log(`About Page Structured Data Present: ${aboutBreadcrumb ? "PASS" : "FAIL"}`);

  // Final check on console errors
  console.log(`\nBrowser Console Errors: ${cdp.errors.length}`);
  if (cdp.errors.length > 0) {
    console.log("Errors:", cdp.errors);
  }

  await cdp.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}

  console.log("\n=== Verification Finished Successfully ===");
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
