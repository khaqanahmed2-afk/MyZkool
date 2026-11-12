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
      this.ws.error = reject;
    });

    this.ws.on("message", (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          this.callbacks.get(msg.id)!(msg);
          this.callbacks.delete(msg.id);
        }
      } catch (err) {}
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

async function captureInspectorScreenshots() {
  const port = 9226;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_insp_" + Date.now());
  const screenshotsDir = path.join(process.cwd(), "docs", "assets", "screenshots");

  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    "--headless=new",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "about:blank",
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

    const target = targets.find((t) => t.type === "page") || targets[0];
    const client = new CDPClient();
    await client.connect(target.webSocketDebuggerUrl);

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("DOM.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Login
    await client.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(2000);
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
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    })()`);

    await sleep(3500);

    // Navigate to ID Cards
    await client.send("Page.navigate", { url: "http://localhost:3000/admin/students/id-cards" });

    // Wait until loading is done
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const isLoaded = await client.evaluate(`!document.body.innerText.includes('Loading student ID cards') && document.body.innerText.includes('Saanvi')`);
      if (isLoaded) break;
    }

    await sleep(1000);

    // 1. Inspector: Modern Blue & Yellow Theme (Front)
    console.log("Saving studio_inspector_modern_front.png...");
    const scFront = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_inspector_modern_front.png"), Buffer.from(scFront.data, "base64"));
    fs.writeFileSync(path.join(screenshotsDir, "studio_inspector_modern_theme.png"), Buffer.from(scFront.data, "base64"));

    // 2. Click "Back" tab to inspect Back of card
    console.log("Switching to Back side...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const backBtn = btns.find(b => b.textContent && b.textContent.trim() === 'Back');
      if (backBtn) backBtn.click();
    })()`);
    await sleep(800);

    console.log("Saving studio_inspector_modern_back.png...");
    const scBack = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_inspector_modern_back.png"), Buffer.from(scBack.data, "base64"));

    // 3. Click "Side-by-Side" view
    console.log("Switching to Side-by-Side view...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const bothBtn = btns.find(b => b.textContent && b.textContent.includes('Side-by-Side'));
      if (bothBtn) bothBtn.click();
    })()`);
    await sleep(800);

    console.log("Saving studio_side_by_side_modern.png...");
    const scSide = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_side_by_side_modern.png"), Buffer.from(scSide.data, "base64"));

    // 4. Switch to Theme 02: Minimal Blue & White in Customizer Panel
    console.log("Switching to Minimal Blue & White...");
    await client.evaluate(`(() => {
      const items = Array.from(document.querySelectorAll('div'));
      const minCard = items.find(el => el.textContent && el.textContent.includes('Minimal Blue & White'));
      if (minCard) minCard.click();
    })()`);
    await sleep(1000);

    console.log("Saving studio_minimal_side_by_side.png...");
    const scMinSide = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "studio_minimal_side_by_side.png"), Buffer.from(scMinSide.data, "base64"));
    fs.writeFileSync(path.join(screenshotsDir, "studio_minimal_theme.png"), Buffer.from(scMinSide.data, "base64"));

    client.close();
    console.log("Inspector screenshots successfully refreshed!");
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

captureInspectorScreenshots();
