import { spawn } from "child_process";
import path from "path";
import os from "os";
import fs from "fs";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  private ws!: any;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();

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
        }
      } catch (err) {
        console.error("CDP parse error:", err);
      }
    });
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

  async screenshot(filePath: string) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const data = res?.result?.data || res?.data;
    if (data) {
      fs.writeFileSync(filePath, Buffer.from(data, "base64"));
      console.log(`  [Screenshot saved]: ${filePath}`);
    } else {
      console.log("  [Screenshot failed, no data in response]");
    }
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function runResponsiveNavbarTests() {
  console.log("================================================================================");
  console.log(" TESTING MYZKOOL NAVBAR RESPONSIVENESS AT 1440px, 1280px, 1024px, 768px, 375px");
  console.log("================================================================================");

  const port = 9225;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_navbar_snap_" + Date.now());

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
      throw new Error("Could not connect to Chrome debugging target on port " + port);
    }

    const pageTarget = targets.find((t) => t.type === "page") || targets[0];
    const cdp = new CDPClient();
    await cdp.connect(pageTarget.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");

    // Navigate to local website
    await cdp.send("Page.navigate", { url: "http://localhost:3000/" });
    await sleep(2500);

    const testViewports = [
      { name: "1440px", width: 1440, height: 900, mode: "desktop" },
      { name: "1280px", width: 1280, height: 800, mode: "desktop" },
      { name: "1024px", width: 1024, height: 768, mode: "tablet" },
      { name: "768px", width: 768, height: 1024, mode: "tablet" },
      { name: "375px", width: 375, height: 667, mode: "mobile" },
    ];

    let allPassed = true;

    for (const vp of testViewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);

      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mode === "mobile",
      });
      await sleep(500);

      const overflowCheck = await cdp.evaluate(`
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          innerWidth: window.innerWidth,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth
        })
      `);

      console.log(`  Horizontal check: innerWidth=${overflowCheck.innerWidth}, scrollWidth=${overflowCheck.scrollWidth}`);
      if (overflowCheck.hasHorizontalScroll) {
        console.error(`  ✖ FAILS: Horizontal overflow detected!`);
        allPassed = false;
      } else {
        console.log(`  ✔ PASS: No horizontal overflow`);
      }

      const screenshotPath = path.resolve(process.cwd(), `scripts/navbar_${vp.name.replace(/[^a-z0-9]/gi, "_")}.png`);
      await cdp.screenshot(screenshotPath);

      if (vp.mode === "desktop") {
        const desktopLayout = await cdp.evaluate(`
          (() => {
            const logo = document.getElementById("navbar-logo");
            const nav = document.querySelector("header nav[aria-label='Main Navigation']");
            const login = document.getElementById("navbar-login-btn");
            const register = document.getElementById("navbar-register-btn");
            const demo = document.getElementById("navbar-demo-btn");

            if (!logo || !nav || !login || !register || !demo) {
              return { error: "Missing elements" };
            }

            const getBox = (el) => {
              const r = el.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, height: r.height, width: r.width, left: r.left, right: r.right };
            };

            const logoRect = getBox(logo);
            const loginRect = getBox(login);
            const registerRect = getBox(register);
            const demoRect = getBox(demo);

            const navLinks = Array.from(nav.querySelectorAll("a, Link")).map(a => ({
              text: a.innerText.trim(),
              box: getBox(a)
            }));

            const tops = [logoRect.top, loginRect.top, registerRect.top, demoRect.top, ...navLinks.map(l => l.box.top)];
            const bottoms = [logoRect.bottom, loginRect.bottom, registerRect.bottom, demoRect.bottom, ...navLinks.map(l => l.box.bottom)];
            const maxTop = Math.max(...tops);
            const minTop = Math.min(...tops);

            const isSingleLine = (maxTop - minTop) <= 22;

            return {
              isSingleLine,
              maxTop: Math.round(maxTop),
              minTop: Math.round(minTop),
              logoRect,
              loginRect,
              registerRect,
              demoRect,
              linkCount: navLinks.length,
              links: navLinks.map(l => ({ text: l.text, width: Math.round(l.box.width), height: Math.round(l.box.height) }))
            };
          })()
        `);

        if (desktopLayout.error) {
          console.error(`  ✖ FAILS: ${desktopLayout.error}`);
          allPassed = false;
        } else {
          console.log(`  Desktop layout: ${desktopLayout.linkCount} links visible.`);
          console.log(`  Button heights: Login=${Math.round(desktopLayout.loginRect.height)}px, Register=${Math.round(desktopLayout.registerRect.height)}px, Demo=${Math.round(desktopLayout.demoRect.height)}px`);
          console.log(`  Vertical bounds: minTop=${desktopLayout.minTop}px, maxTop=${desktopLayout.maxTop}px (delta=${desktopLayout.maxTop - desktopLayout.minTop}px)`);

          if (desktopLayout.isSingleLine) {
            console.log(`  ✔ PASS: Entire desktop navbar is on a single horizontal line!`);
          } else {
            console.error(`  ✖ FAILS: Desktop navbar elements wrapped onto multiple lines!`);
            allPassed = false;
          }
        }
      } else {
        // Open drawer on tablet/mobile and screenshot
        await cdp.evaluate(`
          document.querySelector("header button[aria-label*='menu']")?.click();
        `);
        await sleep(350);

        const drawerScreenshotPath = path.resolve(process.cwd(), `scripts/navbar_${vp.name.replace(/[^a-z0-9]/gi, "_")}_drawer.png`);
        await cdp.screenshot(drawerScreenshotPath);

        const drawerCheck = await cdp.evaluate(`
          (() => {
            const drawer = document.getElementById("mobile-navigation");
            if (!drawer) return { open: false };
            const links = Array.from(drawer.querySelectorAll("a")).map(a => a.innerText.trim());
            const rect = drawer.getBoundingClientRect();
            return {
              open: true,
              visibleHeight: Math.round(rect.height),
              linkCount: links.length,
              hasRegister: !!document.getElementById("mobile-register-btn"),
              hasLogin: !!document.getElementById("mobile-login-btn"),
              hasDemo: !!document.getElementById("mobile-demo-btn")
            };
          })()
        `);

        console.log(`  Menu drawer opened: ${drawerCheck.open}, height=${drawerCheck.visibleHeight}px, links=${drawerCheck.linkCount}, hasRegister=${drawerCheck.hasRegister}`);
        if (!drawerCheck.open || drawerCheck.linkCount < 8 || !drawerCheck.hasRegister) {
          console.error(`  ✖ FAILS: Mobile/tablet drawer failed to display all navigation items properly`);
          allPassed = false;
        } else {
          console.log(`  ✔ PASS: Mobile/tablet drawer renders all 8 links and CTAs`);
        }

        // Close menu
        await cdp.evaluate(`
          document.querySelector("header button[aria-label*='menu']")?.click();
        `);
        await sleep(250);
      }
    }

    cdp.close();
    chromeProcess.kill();

    if (allPassed) {
      console.log("\n=======================================================");
      console.log(" ALL RESPONSIVE NAVBAR TESTS PASSED ACROSS ALL VIEWPORTS!");
      console.log("=======================================================");
      process.exit(0);
    } else {
      console.error("\n=======================================================");
      console.error(" SOME RESPONSIVE NAVBAR TESTS FAILED!");
      console.error("=======================================================");
      process.exit(1);
    }
  } catch (err) {
    console.error("Error during test:", err);
    chromeProcess.kill();
    process.exit(1);
  }
}

runResponsiveNavbarTests();
