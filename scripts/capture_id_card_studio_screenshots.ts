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

  async send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, (res) => {
        if (res.error) reject(res.error);
        else resolve(res.result);
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function captureStudioScreenshots() {
  console.log("======================================================");
  console.log(" CAPTURING ID CARD STUDIO PRODUCTION SCREENSHOTS");
  console.log("======================================================");

  const port = 9225;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_id_studio_" + Date.now());
  const screenshotsDir = path.join(process.cwd(), "docs", "assets", "screenshots");

  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

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
    console.log("Connected to Chrome CDP target:", wsUrl);

    const client = new CDPClient();
    await client.connect(wsUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Login
    console.log("Navigating to http://localhost:3000/login...");
    await client.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(2000);

    console.log("Filling credentials...");
    await client.evaluate(`(() => {
      const emailInput = document.querySelector('#login-email-username');
      const passInput = document.querySelector('#login-password');
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      if (emailInput) setVal(emailInput, 'myzkool.official@gmail.com');
      if (passInput) setVal(passInput, 'R@shid12');
    })()`);

    console.log("Submitting login form...");
    await client.evaluate(`(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()`);

    // Wait for auth session to be set and dashboard to load
    await sleep(4000);

    // 2. Navigate to Student ID Card Studio
    console.log("Navigating to http://localhost:3000/admin/students/id-cards...");
    await client.send("Page.navigate", { url: "http://localhost:3000/admin/students/id-cards" });
    await sleep(3500);

    // Capture Screenshot 1: Studio Inspector - Modern Blue & Yellow Theme
    console.log("Capturing 1. studio_inspector_modern_theme.png...");
    const sc1 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_inspector_modern_theme.png"), Buffer.from(sc1.data, "base64"));

    // Click "Side-by-Side" button in inspector
    console.log("Switching to Side-by-Side view...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bothBtn = btns.find(b => b.textContent && b.textContent.includes('Side-by-Side'));
      if (bothBtn) bothBtn.click();
    })()`);
    await sleep(1000);

    // Capture Screenshot 2: Studio Inspector - Front & Back Side-by-Side
    console.log("Capturing 2. studio_side_by_side_modern.png...");
    const sc2 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_side_by_side_modern.png"), Buffer.from(sc2.data, "base64"));

    // Switch to Minimal Blue & White Theme in Customizer Panel
    console.log("Switching to Minimal Blue & White Theme...");
    await client.evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('div'));
      const minCard = cards.find(c => c.textContent && c.textContent.includes('Minimal Blue & White'));
      if (minCard) minCard.click();
    })()`);
    await sleep(1200);

    // Capture Screenshot 3: Studio Inspector - Minimal Blue & White Theme
    console.log("Capturing 3. studio_minimal_theme.png...");
    const sc3 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_minimal_theme.png"), Buffer.from(sc3.data, "base64"));

    // Switch to Batch Gallery Tab
    console.log("Switching to Batch Gallery Tab...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const batchBtn = btns.find(b => b.textContent && b.textContent.includes('Batch Gallery'));
      if (batchBtn) batchBtn.click();
    })()`);
    await sleep(1500);

    // Capture Screenshot 4: Batch Gallery
    console.log("Capturing 4. studio_batch_gallery.png...");
    const sc4 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_batch_gallery.png"), Buffer.from(sc4.data, "base64"));

    // Switch to A4 Sheet Preview Tab
    console.log("Switching to A4 Sheet Preview Tab...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sheetBtn = btns.find(b => b.textContent && b.textContent.includes('A4 Sheet Preview'));
      if (sheetBtn) sheetBtn.click();
    })()`);
    await sleep(1500);

    // Capture Screenshot 5: A4 Sheet Preview
    console.log("Capturing 5. studio_a4_sheet_preview.png...");
    const sc5 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_a4_sheet_preview.png"), Buffer.from(sc5.data, "base64"));

    // Navigate to Public Verification Portal
    console.log("Navigating to Public Verification Portal...");
    await client.send("Page.navigate", { url: "http://localhost:3000/verify/student/std_adm20260002_liveverify123" });
    await sleep(2500);

    // Capture Screenshot 6: Public Verification Portal
    console.log("Capturing 6. studio_public_verification_page.png...");
    const sc6 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_public_verification_page.png"), Buffer.from(sc6.data, "base64"));

    console.log("All 6 screenshots captured successfully in docs/assets/screenshots/!");
    client.close();
  } catch (err) {
    console.error("Screenshot capture failed:", err);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

captureStudioScreenshots();
