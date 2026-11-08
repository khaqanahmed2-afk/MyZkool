import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const chromePath = "D:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const userDataDir = path.join(os.tmpdir(), "temp_chrome_diag_" + Date.now());

  const chromeProcess = spawn(chromePath, [
    "--remote-debugging-port=9222",
    "--headless=new",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ]);

  try {
    let targets: any[] = [];
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const res = await fetch("http://127.0.0.1:9222/json/list");
        targets = await res.json();
        if (targets.length > 0) break;
      } catch {}
    }

    const target = targets[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let id = 0;
    const callbacks = new Map<number, (res: any) => void>();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data.toString());
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)!(msg);
        callbacks.delete(msg.id);
      } else if (msg.method === "Runtime.consoleAPICalled") {
        console.log("[Console " + msg.params.type + "]:", ...msg.params.args.map((a: any) => a.value ?? a.description));
      } else if (msg.method === "Runtime.exceptionThrown") {
        console.error("[Exception]:", msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    };

    const send = (method: string, params: any = {}) => {
      const msgId = ++id;
      return new Promise<any>((resolve) => {
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await send("Page.enable");
    await send("Runtime.enable");

    console.log("Navigating to http://localhost:3000/login...");
    await send("Page.navigate", { url: "http://localhost:3000/login" });

    // Wait 4 seconds for scripts to execute
    await sleep(4000);

    const docHtml = await send("Runtime.evaluate", {
      expression: `JSON.stringify({
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        hasRoot: Boolean(document.getElementById('root')),
        rootHtml: document.getElementById('root')?.innerHTML.slice(0, 500),
        bodyHtml: document.body.innerHTML.slice(0, 500)
      })`,
    });

    console.log("Raw docHtml response:", JSON.stringify(docHtml, null, 2));

    ws.close();
  } finally {
    chromeProcess.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch(console.error);
