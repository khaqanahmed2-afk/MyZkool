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

async function captureUpdatedScreenshots() {
  const port = 9228;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_corr_" + Date.now());
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

    // 1. Login
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

    // 2. Navigate to ID Cards
    await client.send("Page.navigate", { url: "http://localhost:3000/admin/students/id-cards" });

    // Wait until loading is done
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const isLoaded = await client.evaluate(`!document.body.innerText.includes('Loading student ID cards') && document.body.innerText.includes('Saanvi')`);
      if (isLoaded) break;
    }

    await sleep(1500);

    // 1. Theme 1: Modern Blue & Yellow (Side-by-Side Front & Back)
    console.log("Saving theme1_modern_side_by_side.png...");
    const scTheme1 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme1_modern_side_by_side.png"), Buffer.from(scTheme1.data, "base64"));

    // 2. Switch to Theme 2: Minimal Blue & White via the Header theme button
    console.log("Clicking Minimal Blue & White theme button...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const minBtn = btns.find(b => b.textContent && b.textContent.includes('Minimal Blue & White'));
      if (minBtn) minBtn.click();
    })()`);
    await sleep(1200);

    // Capture Theme 2: Minimal Blue & White (Side-by-Side Front & Back)
    console.log("Saving theme2_minimal_side_by_side.png...");
    const scTheme2 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme2_minimal_side_by_side.png"), Buffer.from(scTheme2.data, "base64"));

    // 3. Switch to Batch Gallery Tab
    console.log("Switching to Batch Gallery Tab...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const batchBtn = btns.find(b => b.textContent && b.textContent.includes('Batch Gallery'));
      if (batchBtn) batchBtn.click();
    })()`);
    await sleep(1500);

    console.log("Saving theme2_batch_gallery.png...");
    const scBatch = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme2_batch_gallery.png"), Buffer.from(scBatch.data, "base64"));

    // 4. Switch to A4 Sheet Preview Tab
    console.log("Switching to A4 Sheet Preview Tab...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sheetBtn = btns.find(b => b.textContent && b.textContent.includes('A4 Sheet Preview'));
      if (sheetBtn) sheetBtn.click();
    })()`);
    await sleep(1500);

    console.log("Saving theme2_a4_sheet_preview.png...");
    const scSheet = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme2_a4_sheet_preview.png"), Buffer.from(scSheet.data, "base64"));

    client.close();
    console.log("Updated theme screenshots captured successfully!");
  } catch (err) {
    console.error("Capture failed:", err);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

captureUpdatedScreenshots();
