import { spawn } from "child_process";
import path from "path";
import os from "os";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  private ws!: any;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();
  public consoleMessages: Array<{ type: string; text: string }> = [];

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
          const text = msg.params.args.map((a: any) => a.value || a.description || "").join(" ");
          this.consoleMessages.push({ type: msg.params.type, text });
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

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function testConsoleWarnings() {
  console.log("=== CHECKING BROWSER CONSOLE FOR SUPABASE DEPRECATION WARNINGS ===");

  const port = 9226;
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_warn_check_" + Date.now());

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
    await cdp.send("Runtime.enable");

    // Navigate to login page where Supabase client initializes
    console.log("Navigating to http://localhost:3000/login ...");
    await cdp.send("Page.navigate", { url: "http://localhost:3000/login" });
    await sleep(3000);

    const lockWarnings = cdp.consoleMessages.filter(
      (m) => m.text.includes('The "lock" option is deprecated') || m.text.includes("GoTrueClient")
    );

    console.log(`Captured ${cdp.consoleMessages.length} console messages in total.`);
    if (lockWarnings.length > 0) {
      console.error("✖ FAILS: Found Supabase 'lock' deprecation warning in console:");
      lockWarnings.forEach((w) => console.error("   ->", w.text));
      cdp.close();
      chromeProcess.kill();
      process.exit(1);
    } else {
      console.log("✔ PASS: Zero 'lock' option deprecation warnings detected!");
      cdp.close();
      chromeProcess.kill();
      process.exit(0);
    }
  } catch (err) {
    console.error("Error during test:", err);
    chromeProcess.kill();
    process.exit(1);
  }
}

testConsoleWarnings();

