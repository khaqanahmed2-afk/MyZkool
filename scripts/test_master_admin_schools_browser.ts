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
      } catch {}
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

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function runSchoolsBrowserTest() {
  console.log("======================================================");
  console.log(" TESTING SCHOOL DIRECTORY IN REAL HEADLESS CHROME");
  console.log("======================================================");

  const port = 9224;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_schools_" + Date.now());

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
      await sleep(500);
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
    await client.send("Network.enable");
    await client.send("DOM.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 1. Sign in via login page
    await client.send("Page.navigate", { url: "http://localhost:3000/master-admin/login" });
    for (let i = 0; i < 30; i++) {
      await sleep(400);
      const ready = await client.evaluate(`Boolean(document.querySelector('input[type="email"]'))`);
      if (ready) break;
    }

    await client.evaluate(`(() => {
      const emailInput = document.querySelector('input[type="email"]');
      const passInput = document.querySelector('input[type="password"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(emailInput, "myzkool.official@gmail.com");
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      setter.call(passInput, "R@shid12");
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('button[type="submit"]')?.click();
    })()`);

    for (let i = 0; i < 10; i++) {
      await sleep(1000);
      const path = await client.evaluate(`window.location.pathname`);
      if (path.includes("/master-admin/dashboard")) break;
    }

    // 2. Navigate to /master-admin/schools
    console.log("Navigating to http://localhost:3000/master-admin/schools...");
    await client.send("Page.navigate", { url: "http://localhost:3000/master-admin/schools" });

    // Wait for table rows to load
    let rowCount = 0;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      rowCount = await client.evaluate(`document.querySelectorAll('tbody tr').length`);
      if (rowCount >= 6) break;
    }

    const schoolTableData = await client.evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => {
        const text = r.innerText.split('\\n');
        return {
          name: text[0] || '',
          subdomain: text[1] || '',
          affiliation: text[2] || '',
          location: text[3] || '',
          status: text[text.length - 2] || '',
          allText: r.innerText.replace(/\\n/g, ' | ')
        };
      });
    })()`);

    console.log("\nRendered Schools in Browser Table (Count: " + schoolTableData.length + "):");
    console.log(JSON.stringify(schoolTableData, null, 2));

    const screenshotRes = await client.send("Page.captureScreenshot", { format: "png" });
    const base64Data = screenshotRes?.result?.data || screenshotRes?.data;
    if (base64Data) {
      const outPath = path.resolve("scripts/master_admin_schools_verified.png");
      fs.writeFileSync(outPath, Buffer.from(base64Data, "base64"));
      console.log(`\nScreenshot saved: ${outPath}`);
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

runSchoolsBrowserTest().catch(console.error);

