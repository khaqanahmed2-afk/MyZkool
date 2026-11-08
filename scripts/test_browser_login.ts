import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  private ws!: WebSocket;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();
  public logs: any[] = [];
  public networkRequests: any[] = [];
  public networkResponses: any[] = [];
  public networkFailures: any[] = [];

  async connect(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
    });

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          this.callbacks.get(msg.id)!(msg);
          this.callbacks.delete(msg.id);
        } else if (msg.method) {
          this.handleEvent(msg.method, msg.params);
        }
      } catch (err) {
        console.error("CDP parse error:", err);
      }
    };
  }

  private handleEvent(method: string, params: any) {
    if (method === "Runtime.consoleAPICalled") {
      const args = params.args.map((a: any) =>
        a.value !== undefined
          ? a.value
          : a.description
          ? a.description
          : JSON.stringify(a)
      );
      this.logs.push({ type: params.type, args });
      console.log(`[Browser Console ${params.type}]:`, ...args);
    } else if (method === "Runtime.exceptionThrown") {
      console.error("[Browser JS EXCEPTION]:", params.exceptionDetails.text, params.exceptionDetails.exception?.description);
      this.logs.push({ type: "exception", details: params.exceptionDetails });
    } else if (method === "Network.requestWillBeSent") {
      this.networkRequests.push({
        id: params.requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
      });
      if (params.request.url.includes("supabase") || params.request.url.includes("/api/")) {
        console.log(`[Network Request] ${params.request.method} ${params.request.url}`);
      }
    } else if (method === "Network.responseReceived") {
      this.networkResponses.push({
        id: params.requestId,
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        headers: params.response.headers,
      });
      if (params.response.url.includes("supabase") || params.response.url.includes("/api/")) {
        console.log(`[Network Response] ${params.response.status} ${params.response.url}`);
      }
    } else if (method === "Network.loadingFailed") {
      this.networkFailures.push(params);
      console.error(`[Network FAILED] ${params.errorText} (${params.type}) on ${params.requestId}`);
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

async function runTest(viewport: { width: number; height: number; isMobile: boolean; label: string; port: number }) {
  console.log(`\n======================================================`);
  console.log(` TESTING LOGIN ON ${viewport.label.toUpperCase()} (${viewport.width}x${viewport.height})`);
  console.log(`======================================================\n`);

  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_" + viewport.label + "_" + Date.now());

  const chromeProcess = spawn(chromePath, [
    `--remote-debugging-port=${viewport.port}`,
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
    // Wait for Chrome remote debugging port
    let targets: any[] = [];
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        const res = await fetch(`http://127.0.0.1:${viewport.port}/json/list`);
        targets = await res.json();
        if (targets.length > 0) break;
      } catch {}
    }

    if (targets.length === 0) {
      throw new Error(`Could not connect to Chrome debugging port ${viewport.port}.`);
    }

    const target =
      targets.find((t) => t.type === "page" && !t.url.startsWith("chrome-extension://")) ||
      targets.find((t) => t.type === "page") ||
      targets[0];

    const wsUrl = target.webSocketDebuggerUrl;
    console.log("Connected to Chrome CDP target:", target.url, wsUrl);

    const client = new CDPClient();
    await client.connect(wsUrl);

    // Enable domains
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("DOM.enable");

    // Set emulation for laptop vs mobile
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.isMobile ? 2 : 1,
      mobile: viewport.isMobile,
    });

    if (viewport.isMobile) {
      await client.send("Network.setUserAgentOverride", {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      });
    }

    console.log("Navigating to http://localhost:3000/login...");
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

    if (!formReady) {
      const pageInfo = await client.evaluate(`({
        url: window.location.href,
        title: document.title,
        body: document.body.innerText.slice(0, 300)
      })`);
      console.error("Page failed to mount form. Current state:", pageInfo);
      return;
    }

    // Fill credentials
    console.log("Filling test credentials (email: myzkool.official@gmail.com, password: ***)...");
    const fillRes = await client.evaluate(`
      (() => {
        const emailInput = document.querySelector('#login-email-username');
        const passInput = document.querySelector('#login-password');
        
        const setReactValue = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setReactValue(emailInput, 'myzkool.official@gmail.com');
        setReactValue(passInput, 'R@shid12');

        return {
          emailSet: emailInput.value,
          passwordLength: passInput.value.length
        };
      })()
    `);
    console.log("Credentials filled:", fillRes);

    await sleep(400);

    // Submit the form
    console.log("Clicking Sign In button...");
    const submitClick = await client.evaluate(`
      (() => {
        const form = document.querySelector('form');
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.click();
          return { clicked: true, text: submitBtn.innerText };
        } else if (form) {
          form.requestSubmit();
          return { formSubmitted: true };
        }
        return { error: 'No submit button or form found' };
      })()
    `);
    console.log("Submit clicked:", submitClick);

    // Wait and observe URL and state changes
    console.log("Observing login transition over 10 seconds...");
    for (let s = 1; s <= 10; s++) {
      await sleep(1000);
      const interim = await client.evaluate(`({
        path: window.location.pathname,
        alert: document.querySelector('[role="alert"]')?.innerText || null
      })`);
      console.log(`[t+${s}s] Path: ${interim?.path}, Alert: ${interim?.alert || 'none'}`);
      if (interim?.path && interim.path.startsWith('/admin')) {
        console.log("SUCCESS: Transitioned to /admin! Waiting for dashboard to render...");
        await sleep(3000);
        break;
      }
    }

    // Final diagnostic inspection
    const finalReport = await client.evaluate(`
      (() => {
        const errorAlert = document.querySelector('[role="alert"]')?.innerText || null;
        const localStorageKeys = Object.keys(localStorage);
        const sbAuthKey = localStorageKeys.find(k => k.includes('auth-token') || k.includes('supabase'));
        const sbAuthVal = sbAuthKey ? JSON.parse(localStorage.getItem(sbAuthKey) || '{}') : null;

        return {
          finalUrl: window.location.href,
          pathname: window.location.pathname,
          errorAlert,
          hasSession: Boolean(sbAuthVal?.access_token),
          userEmail: sbAuthVal?.user?.email || null,
          userId: sbAuthVal?.user?.id || null,
          h1Text: document.querySelector('h1')?.innerText || null,
          pageTitle: document.title,
          bodySnippet: document.body.innerText.slice(0, 400)
        };
      })()
    `);

    console.log("\n--- TEST REPORT FOR " + viewport.label.toUpperCase() + " ---");
    console.log("Diagnostics:", JSON.stringify(finalReport, null, 2));

    client.close();
  } finally {
    chromeProcess.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  await runTest({
    width: 1440,
    height: 900,
    isMobile: false,
    label: "laptop",
    port: 9222,
  });

  await sleep(2000);

  await runTest({
    width: 375,
    height: 812,
    isMobile: true,
    label: "mobile",
    port: 9223,
  });
}

main().catch(console.error);
