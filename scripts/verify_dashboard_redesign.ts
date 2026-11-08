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
        } else if (msg.method === "Runtime.consoleAPICalled") {
          const args = msg.params.args.map((a: any) =>
            a.value !== undefined ? a.value : a.description ? a.description : JSON.stringify(a)
          );
          this.logs.push({ type: msg.params.type, args });
          if (msg.params.type === "error") {
            this.errors.push(args.join(" "));
          }
        }
      } catch (err) {
        console.error("CDP parse error:", err);
      }
    });
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

  async setViewport(width: number, height: number, isMobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: isMobile ? 2 : 1,
      mobile: isMobile,
    });
  }

  async screenshot(filePath: string) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const data = res?.result?.data || res?.data;
    if (data) {
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      console.log(`  [Screenshot saved]: ${filePath}`);
    }
  }

  close() {
    try {
      this.ws.close();
    } catch {}
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

async function run() {
  console.log("================================================================");
  console.log(" VERIFYING MYZKOOL ADMIN DASHBOARD REDESIGN & LOWER SECTION");
  console.log("================================================================");

  const chromePath = await findChromePath();
  const port = 9555;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-dashboard-verify-"));

  const chromeProc = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900",
  ]);

  try {
    let targets: any[] = [];
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        targets = await res.json();
        if (targets.length > 0) break;
      } catch {}
    }

    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const cdp = new CDPClient();
    await cdp.connect(pageTarget.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");

    console.log("Navigating to login page...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(2500);

    // Fill login form
    console.log("Logging into Admin dashboard...");
    await cdp.evaluate(`
      (() => {
        const emailInput = document.querySelector('#login-email-username');
        const passInput = document.querySelector('#login-password');
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(emailInput, 'myzkool.official@gmail.com');
        setVal(passInput, 'R@shid12');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      })()
    `);

    // Wait for redirect to /admin
    let onAdmin = false;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const pathname = await cdp.evaluate("window.location.pathname");
      if (pathname === "/admin" || pathname === "/admin/") {
        onAdmin = true;
        break;
      }
    }
    console.log("Reached /admin:", onAdmin);
    await sleep(2500); // Allow dashboard stats & widgets to mount

    // 1. Check Removal of Admissions Overview and Pending Tasks
    console.log("\n--- SECTION 1: VERIFY REMOVAL OF UNNECESSARY SECTIONS ---");
    const hasAdmissionsOverview = await cdp.evaluate(
      `Boolean(document.body.innerText.includes("Admissions Overview") || document.querySelector('[data-widget="admissions-overview"]'))`
    );
    const hasPendingTasks = await cdp.evaluate(
      `Boolean(document.body.innerText.includes("Pending Tasks & Approvals") || document.body.innerText.includes("Pending Tasks"))`
    );
    console.log("Admissions Overview present:", hasAdmissionsOverview ? "FAIL (Found)" : "PASS (Completely Removed)");
    console.log("Pending Tasks & Approvals present:", hasPendingTasks ? "FAIL (Found)" : "PASS (Completely Removed)");

    // 2. Check Quick Actions
    console.log("\n--- SECTION 2: VERIFY QUICK ACTIONS REDESIGN ---");
    const quickActionsData = await cdp.evaluate(`
      (() => {
        const qaHeading = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes("Quick Actions"));
        if (!qaHeading) return { found: false };
        const container = qaHeading.closest('.rounded-2xl');
        const links = Array.from(container.querySelectorAll('a')).map(a => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href')
        }));
        return { found: true, count: links.length, actions: links };
      })()
    `);
    console.log("Quick Actions found:", quickActionsData.found);
    console.log("Action count:", quickActionsData.count);
    const expectedActions = [
      "Add Student",
      "Mark Attendance",
      "Collect Fee",
      "Generate Invoice",
      "Assign Transport",
      "Send Notification",
      "Create Examination",
      "View Reports",
    ];
    for (const exp of expectedActions) {
      const match = quickActionsData.actions?.find((a: any) => a.text.includes(exp));
      console.log(`  Action "${exp}": ${match ? `PASS (${match.href})` : "FAIL (Not found)"}`);
    }

    // 3. Check Explore Modules
    console.log("\n--- SECTION 3: VERIFY EXPLORE MODULES REDESIGN ---");
    const exploreModulesData = await cdp.evaluate(`
      (() => {
        const emHeading = Array.from(document.querySelectorAll('h2')).find(h => h.innerText.includes("Explore Modules"));
        if (!emHeading) return { found: false };
        const container = emHeading.closest('.rounded-2xl');
        const customizeBtn = container.querySelector('button');
        const links = Array.from(container.querySelectorAll('a')).map(a => {
          const h3 = a.querySelector('h3')?.innerText.trim();
          const p = a.querySelector('p')?.innerText.trim();
          return {
            title: h3,
            desc: p,
            href: a.getAttribute('href')
          };
        });
        return {
          found: true,
          count: links.length,
          hasCustomize: Boolean(customizeBtn && customizeBtn.innerText.includes("Customize")),
          modules: links
        };
      })()
    `);
    console.log("Explore Modules found:", exploreModulesData.found);
    console.log("Module count:", exploreModulesData.count);
    console.log("Customize button aligned in header:", exploreModulesData.hasCustomize ? "PASS" : "FAIL");

    const expectedModules = [
      { name: "Student Management", desc: "Admissions and student records" },
      { name: "Fee Management", desc: "Collections, invoices and dues" },
      { name: "Transport Management", desc: "Routes, vehicles and stops" },
      { name: "Academics", desc: "Classes, subjects and timetables" },
      { name: "Examinations", desc: "Exams, marks and results" },
      { name: "Staff & HR", desc: "Staff records and payroll" },
      { name: "Communication", desc: "Notices and parent updates" },
      { name: "Library Management", desc: "Books and library records" },
      { name: "Inventory Management", desc: "Assets and stock management" },
    ];

    for (const em of expectedModules) {
      const match = exploreModulesData.modules?.find((m: any) => m.title === em.name);
      const descMatch = match && match.desc === em.desc;
      console.log(`  Module "${em.name}": ${match ? "PASS" : "FAIL"} | Description "${em.desc}": ${descMatch ? "PASS" : "FAIL"}`);
    }

    // 4. Responsive Viewports & Screenshots
    console.log("\n--- SECTION 4: RESPONSIVE VIEWPORT TESTING ---");
    const viewports = [
      { name: "1440px_desktop", width: 1440, height: 900, isMobile: false },
      { name: "1280px_laptop", width: 1280, height: 800, isMobile: false },
      { name: "1024px_tablet_landscape", width: 1024, height: 768, isMobile: false },
      { name: "768px_tablet", width: 768, height: 1024, isMobile: false },
      { name: "375px_mobile", width: 375, height: 812, isMobile: true },
    ];

    for (const vp of viewports) {
      await cdp.setViewport(vp.width, vp.height, vp.isMobile);
      await sleep(1000);
      const overflow = await cdp.evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
      console.log(`  Viewport ${vp.name} (${vp.width}x${vp.height}): Horizontal Overflow: ${overflow ? "FAIL" : "PASS (Clean fit)"}`);
      await cdp.screenshot(path.join("scripts", `dashboard_redesign_${vp.name}.png`));
    }

    // 5. Check Console Errors
    console.log("\n--- SECTION 5: BROWSER CONSOLE ERRORS ---");
    console.log(`Total errors captured: ${cdp.errors.length}`);
    if (cdp.errors.length > 0) {
      console.log("Errors:", cdp.errors);
    } else {
      console.log("PASS: Zero browser console errors!");
    }

    cdp.close();
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

run().catch(console.error);
