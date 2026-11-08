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

async function runLoginVerification() {
  console.log("=== MyZkool Login Page Production Verification ===");
  const chromePath = await findChromePath();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-zkool-login-verify-"));

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=9444",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  await sleep(2500);

  const newTabRes = await fetch("http://localhost:9444/json/new?about:blank", { method: "PUT" });
  const tabData = await newTabRes.json();
  const cdp = new CDPClient();
  await cdp.connect(tabData.webSocketDebuggerUrl);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Network.enable");

  console.log("\n--- Navigating to http://localhost:3000/login ---");
  await cdp.send("Page.navigate", { url: "http://localhost:3000/login" });
  await sleep(3000);

  // 1. Title and Metadata Check
  const pageTitle = await cdp.evaluate("document.title");
  const metaDesc = await cdp.evaluate("document.querySelector('meta[name=\"description\"]')?.getAttribute('content')");
  const canonicalUrl = await cdp.evaluate("document.querySelector('link[rel=\"canonical\"]')?.getAttribute('href')");
  const ogTitle = await cdp.evaluate("document.querySelector('meta[property=\"og:title\"]')?.getAttribute('content')");

  console.log(`Document Title: "${pageTitle}"`);
  console.log(`Meta Description: "${metaDesc}"`);
  console.log(`Canonical URL: "${canonicalUrl}"`);

  // 2. Keyword Presence Verification
  const pageText = await cdp.evaluate("document.body.innerText");
  const keywords = [
    "School Management Software",
    "School ERP in India",
    "Online School Management System",
    "School Administration Software",
  ];

  console.log("\n--- Keyword Presence Check ---");
  for (const kw of keywords) {
    const inTitleOrMeta = (pageTitle && pageTitle.includes(kw)) || (metaDesc && metaDesc.includes(kw));
    const inBody = pageText && pageText.toLowerCase().includes(kw.toLowerCase());
    console.log(`  Keyword "${kw}": ${inTitleOrMeta || inBody ? "FOUND (Verified)" : "NOT FOUND"}`);
  }

  // 3. Punctuation Audit: Ensure zero em dashes (—), en dashes (–), or hyphens as punctuation ( - )
  console.log("\n--- Punctuation & Dash Audit ---");
  const hasEmDash = pageTitle.includes("—") || (metaDesc && metaDesc.includes("—")) || (pageText && pageText.includes("—"));
  const hasEnDash = pageTitle.includes("–") || (metaDesc && metaDesc.includes("–")) || (pageText && pageText.includes("–"));
  const hasSentenceHyphen = /\s+-\s+/.test(pageText || "");

  console.log(`  Em Dash (—) present: ${hasEmDash ? "FAIL (Em dash found!)" : "PASS (0 found)"}`);
  console.log(`  En Dash (–) present: ${hasEnDash ? "FAIL (En dash found!)" : "PASS (0 found)"}`);
  console.log(`  Sentence Hyphen ( - ) present: ${hasSentenceHyphen ? "FAIL (Hyphen found!)" : "PASS (0 found)"}`);

  // 4. Heading Hierarchy & Semantic HTML
  console.log("\n--- Heading Hierarchy & Semantic HTML ---");
  const headings = await cdp.evaluate(`
    Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
      tag: h.tagName.toLowerCase(),
      text: h.innerText.trim()
    }))
  `);
  console.log("  Headings discovered in DOM:", JSON.stringify(headings, null, 2));

  const hasForm = await cdp.evaluate(`Boolean(document.querySelector('form[aria-label]'))`);
  const hasLabels = await cdp.evaluate(`
    Boolean(document.querySelector('label[for="login-email-username"]') && document.querySelector('label[for="login-password"]'))
  `);
  const hasSubmitBtn = await cdp.evaluate(`Boolean(document.querySelector('button[type="submit"]'))`);

  console.log(`  Accessible form[aria-label]: ${hasForm ? "PASS" : "FAIL"}`);
  console.log(`  Accessible labels linked by htmlFor: ${hasLabels ? "PASS" : "FAIL"}`);
  console.log(`  Submit button present: ${hasSubmitBtn ? "PASS" : "FAIL"}`);

  // 5. JSON-LD Structured Data
  console.log("\n--- Schema.org Structured Data ---");
  const jsonLd = await cdp.evaluate(`
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(el => {
      try {
        return JSON.parse(el.textContent || "{}");
      } catch (e) {
        return { parseError: e.message };
      }
    })
  `);
  console.log(`  Structured data scripts found: ${jsonLd.length}`);
  for (let i = 0; i < jsonLd.length; i++) {
    console.log(`  Schema #${i + 1}:`, jsonLd[i]["@type"] || jsonLd[i]["@graph"]?.map((g: any) => g["@type"]).join(", "));
  }

  // 6. Interactive State: Forgot Password Toggle & Back to Sign In
  console.log("\n--- Interactive View Mode Testing ---");
  await cdp.evaluate(`
    (document.querySelector('#forgot-password-link') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Forgot'))).click()
  `);
  await sleep(600);

  const isForgotView = await cdp.evaluate(`
    document.body.innerText.includes("Reset Your Password") || document.body.innerText.includes("Send Password Reset Link")
  `);
  console.log(`  Switched to Forgot Password view: ${isForgotView ? "PASS" : "FAIL"}`);

  await cdp.evaluate(`
    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes("Return to Sign In"))?.click()
  `);
  await sleep(600);

  const isBackToLogin = await cdp.evaluate(`
    document.body.innerText.includes("Welcome Back") && Boolean(document.querySelector('#login-email-username'))
  `);
  console.log(`  Returned to Standard Sign In view: ${isBackToLogin ? "PASS" : "FAIL"}`);

  // 7. Password Visibility Toggle Test
  console.log("\n--- Password Visibility Toggle Testing ---");
  const initialType = await cdp.evaluate(`document.querySelector('#login-password')?.type`);
  await cdp.evaluate(`document.querySelector('button[aria-label*="password" i]')?.click()`);
  await sleep(200);
  const toggledType = await cdp.evaluate(`document.querySelector('#login-password')?.type`);
  console.log(`  Password input type changed from "${initialType}" to "${toggledType}": ${initialType === "password" && toggledType === "text" ? "PASS" : "FAIL"}`);

  // 8. Mobile Responsiveness (360x780)
  console.log("\n--- Mobile Responsiveness (360x780) ---");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 780,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(800);

  const mobileOverflow = await cdp.evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
  console.log(`  Mobile Horizontal Overflow: ${mobileOverflow ? "FAIL (Horizontal scroll detected)" : "PASS (Zero horizontal overflow)"}`);

  // 9. Console Errors Check
  console.log(`\nBrowser Console Errors: ${cdp.errors.length}`);
  if (cdp.errors.length > 0) {
    console.log("Errors:", cdp.errors);
  }

  await cdp.close();
  chromeProc.kill();
  try {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  } catch (e) {}

  console.log("\n=== Login Verification Finished Successfully ===");
}

runLoginVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
