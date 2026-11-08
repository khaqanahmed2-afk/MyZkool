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
  public networkRequests: any[] = [];
  public networkResponses: any[] = [];

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
      console.log(`[Browser Console ${params.type}]:`, ...args);
    } else if (method === "Network.requestWillBeSent") {
      if (params.request.url.includes("/api/master-admin") || params.request.url.includes("supabase")) {
        console.log(`[Network Request] ${params.request.method} ${params.request.url}`);
      }
    } else if (method === "Network.responseReceived") {
      if (params.response.url.includes("/api/master-admin") || params.response.url.includes("supabase")) {
        console.log(`[Network Response] ${params.response.status} ${params.response.url}`);
      }
    }
  }

  async send(method: string, params: Record<string, any> = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function runMasterAdminBrowserTest() {
  console.log("======================================================");
  console.log(" TESTING MASTER ADMIN LOGIN & DASHBOARD IN BROWSER");
  console.log("======================================================");

  const port = 9223;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_master_admin_" + Date.now());

  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "about:blank",
  ]);

  try {
    let targets: any[] = [];
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        targets = await res.json();
        if (targets.length > 0) break;
      } catch {}
    }

    if (targets.length === 0) {
      throw new Error(`Could not connect to Chrome debugging port ${port}.`);
    }

    const target = targets.find((t) => t.type === "page") || targets[0];
    const wsUrl = target.webSocketDebuggerUrl;
    console.log("Connected to Chrome CDP target:", target.url, wsUrl);

    const client = new CDPClient();
    await client.connect(wsUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("DOM.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Navigate to Master Admin login
    console.log("Navigating to http://localhost:3000/master-admin/login...");
    await client.send("Page.navigate", { url: "http://localhost:3000/master-admin/login" });

    // Poll until login form is mounted
    let formMounted = false;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      formMounted = await client.evaluate(`Boolean(document.querySelector('input[type="email"]') && document.querySelector('input[type="password"]'))`);
      if (formMounted) break;
    }
    console.log("Master Admin login form mounted:", formMounted);

    // 3. Fill credentials using React's native value setter
    console.log("Filling Master Admin credentials...");
    const fillResult = await client.evaluate(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      
      const setReactValue = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      if (emailInput) setReactValue(emailInput, "myzkool.official@gmail.com");
      if (passInput) setReactValue(passInput, "R@shid12");

      return {
        email: emailInput?.value,
        passLength: passInput?.value?.length,
      };
    })()`);
    console.log("Credentials set in React state:", fillResult);

    // 4. Click Sign in
    console.log("Clicking Sign In button...");
    await client.evaluate(`(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()`);

    // 5. Observe transition
    console.log("Observing transition to Master Admin Dashboard...");
    let finalPath = "";
    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      finalPath = await client.evaluate(`window.location.pathname`);
      console.log(`[t+${i + 1}s] Current path: ${finalPath}`);
      if (finalPath.includes("/master-admin/dashboard") || (finalPath.startsWith("/master-admin") && !finalPath.includes("/login"))) {
        break;
      }
    }

    // Allow dashboard to fetch metrics and render
    await sleep(2500);

    // 6. Detailed DOM verification
    const dashboardCheck = await client.evaluate(`(() => {
      const bodyText = document.body.innerText;
      const h1 = document.querySelector('h1')?.textContent?.trim();
      
      return {
        path: window.location.pathname,
        h1,
        checks: {
          hasWelcome: bodyText.includes("Welcome back, Khaqan Ahmad"),
          hasTotalSchools: bodyText.includes("Total Schools"),
          hasTotalStudents: bodyText.includes("Total Students"),
          hasTotalRevenue: bodyText.includes("Total Revenue"),
          hasActiveSubscriptions: bodyText.includes("Active Subscriptions"),
          hasSchoolRegistrations: bodyText.includes("School Registrations"),
          hasSubscriptionRevenue: bodyText.includes("Subscription Revenue"),
          hasSystemHealth: bodyText.includes("System Health"),
          hasRecentActivities: bodyText.includes("Recent Activities"),
          hasSubscriptionOverview: bodyText.includes("Subscription Overview"),
          hasKeyInsights: bodyText.includes("Key Insights"),
          hasQuickActions: bodyText.includes("Quick Actions"),
          hasPendingAttention: bodyText.includes("Pending & Attention"),
          hasRealSchoolMention: bodyText.includes("Peace Convent School"),
        },
        kpiValues: {
          textSnippet: bodyText.slice(0, 1000)
        },
        errorAlert: document.querySelector('.bg-rose-500, .border-rose-200')?.textContent?.trim() || null
      };
    })()`);

    console.log("\n======================================================");
    console.log(" MASTER ADMIN DASHBOARD VERIFICATION REPORT");
    console.log("======================================================");
    console.log(JSON.stringify(dashboardCheck, null, 2));

    // Capture screenshot
    try {
      const screenshotRes = await client.send("Page.captureScreenshot", { format: "png" });
      const base64Data = screenshotRes?.result?.data || screenshotRes?.data;
      if (base64Data) {
        const screenshotPath = path.resolve("scripts/master_admin_dashboard_verified.png");
        fs.writeFileSync(screenshotPath, Buffer.from(base64Data, "base64"));
        console.log(`\nScreenshot saved: ${screenshotPath}`);
      }
    } catch (err: any) {
      console.warn("Screenshot capture note:", err.message);
    }

    client.close();
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runMasterAdminBrowserTest().catch(console.error);
