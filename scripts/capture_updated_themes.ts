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
  const brainDir = "D:\\Users\\KhaqanLife\\.gemini\\antigravity\\brain\\9c269cb7-0b69-4171-b452-eeba9f044ecc";

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
      height: 1400,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Login
    await client.send("Page.navigate", { url: "http://localhost:3000/login" });
    
    // Poll until login form is mounted
    let formReady = false;
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      const isInputPresent = await client.evaluate("Boolean(document.querySelector('#login-email-username'))");
      if (isInputPresent === true) {
        formReady = true;
        break;
      }
    }
    console.log("Login form mounted:", formReady);

    const fillRes = await client.evaluate(`(() => {
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
      return { email: emailInput?.value, pass: passInput?.value?.length };
    })()`);
    console.log("Credentials filled:", fillRes);

    await sleep(400);

    const submitRes = await client.evaluate(`(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText };
      }
      return { clicked: false };
    })()`);
    console.log("Submit clicked:", submitRes);

    // Wait for login transition
    for (let s = 1; s <= 15; s++) {
      await sleep(1000);
      const curPath = await client.evaluate("window.location.pathname");
      console.log(`[t+${s}s] Path: ${curPath}`);
      if (curPath && (curPath.startsWith('/admin') || curPath === '/dashboard')) {
        console.log("SUCCESS: Logged in! Path:", curPath);
        break;
      }
    }

    await sleep(2000);

    // 2. Navigate to ID Cards
    await client.send("Page.navigate", { url: "http://localhost:3000/admin/students/id-cards" });

    // Wait until loading is done
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const isLoaded = await client.evaluate(`!document.body.innerText.includes('Loading student ID cards') && (document.body.innerText.includes('Khaqan') || document.body.innerText.includes('Peace') || document.body.innerText.includes('Saanvi'))`);
      if (isLoaded) break;
    }

    await sleep(1500);

    // 1. Theme 1: Bold Blue & Yellow (Side-by-Side Front & Back)
    console.log("Saving theme1_modern_side_by_side.png...");
    const scTheme1 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme1_modern_side_by_side.png"), Buffer.from(scTheme1.data, "base64"));

    // Capture isolated card preview for Theme 1
    const clip1 = await client.evaluate(`(() => {
      const el = document.getElementById('id-card-preview-viewport');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), scale: 1 };
    })()`);
    if (clip1) {
      console.log("Capturing isolated theme 1 cards clip:", clip1);
      const scClip1 = await client.send("Page.captureScreenshot", { format: "png", clip: clip1 });
      fs.writeFileSync(path.join(screenshotsDir, "theme1_modern_cards_isolated.png"), Buffer.from(scClip1.data, "base64"));
    }

    // 2. Switch to Theme 2: Blue Shades via the Header theme button
    console.log("Clicking Blue Shades theme button...");
    await client.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const minBtn = btns.find(b => b.textContent && (b.textContent.includes('Blue Shades') || b.textContent.includes('Minimal')));
      if (minBtn) minBtn.click();
    })()`);
    await sleep(1200);

    // Capture Theme 2: Blue Shades (Side-by-Side Front & Back)
    console.log("Saving theme2_minimal_side_by_side.png...");
    const scTheme2 = await client.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(screenshotsDir, "theme2_minimal_side_by_side.png"), Buffer.from(scTheme2.data, "base64"));

    // Capture isolated card preview for Theme 2
    const clip2 = await client.evaluate(`(() => {
      const el = document.getElementById('id-card-preview-viewport');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), scale: 1 };
    })()`);
    if (clip2) {
      console.log("Capturing isolated theme 2 cards clip:", clip2);
      const scClip2 = await client.send("Page.captureScreenshot", { format: "png", clip: clip2 });
      fs.writeFileSync(path.join(screenshotsDir, "theme2_minimal_cards_isolated.png"), Buffer.from(scClip2.data, "base64"));
    }

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

    // Copy screenshots to brain artifact directory
    for (const f of [
      "theme1_modern_side_by_side.png",
      "theme1_modern_cards_isolated.png",
      "theme2_minimal_side_by_side.png",
      "theme2_minimal_cards_isolated.png",
      "theme2_batch_gallery.png",
      "theme2_a4_sheet_preview.png",
    ]) {
      const src = path.join(screenshotsDir, f);
      const dst = path.join(brainDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`Copied ${f} to artifact directory`);
      }
    }
  } catch (err) {
    console.error("Capture failed:", err);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

captureUpdatedScreenshots();
