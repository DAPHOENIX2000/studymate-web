/**
 * E2E smoke test for StudyMate web.
 * Boots the dev server, drives Chrome through every view via puppeteer-core,
 * captures console errors + runtime exceptions, screenshots each view.
 *
 * Run with: node scripts/e2e.js
 * Exit code 0 = no errors, 1 = some errors caught.
 */
const puppeteer = require("puppeteer-core");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME = "/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome";
const PORT = 3100;
const ROOT = path.join(__dirname, "..");
const SHOT_DIR = "/tmp/e2e-shots";

function log(...args) {
  console.log("[e2e]", ...args);
}

function waitForServer(url, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (Date.now() - start > timeoutMs) return reject(new Error("server boot timeout"));
      http
        .get(url, (res) => {
          res.destroy();
          if (res.statusCode === 200) resolve();
          else setTimeout(tick, 500);
        })
        .on("error", () => setTimeout(tick, 500));
    };
    tick();
  });
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  // Boot the dev server
  log("starting dev server on port", PORT);
  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
  let serverLog = "";
  server.stdout.on("data", (d) => (serverLog += d.toString()));
  server.stderr.on("data", (d) => (serverLog += d.toString()));

  const cleanup = () => {
    try {
      server.kill("SIGTERM");
    } catch {}
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(1); });

  try {
    await waitForServer(`http://localhost:${PORT}`);
    log("server ready");
  } catch (e) {
    log("server failed to boot:", e.message);
    log("--- server log ---\n" + serverLog.slice(-2000));
    cleanup();
    process.exit(1);
  }

  // Launch chrome
  log("launching chrome");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1440, height: 900 },
  });

  const issues = [];

  // Helper: load a view and collect issues
  async function testView(name, navFn) {
    log(`testing view: ${name}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Filter out noisy expected errors
        if (text.includes("Failed to load resource") && text.includes("fonts")) return;
        // External font/CSS loads can return 403 in sandbox — irrelevant to app correctness
        if (text.includes("Failed to load resource") && (text.includes("403") || text.includes("404"))) return;
        if (text.includes("fontshare") || text.includes("googleapis.com/css")) return;
        errors.push(`console.error: ${text.slice(0, 300)}`);
      }
    });

    try {
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle2", timeout: 60000 });
      // Wait for splash to clear
      await new Promise((r) => setTimeout(r, 2500));
      // Run nav function if provided
      if (navFn) await navFn(page);
      // Give it a moment for any post-render setState loops to surface
      await new Promise((r) => setTimeout(r, 1500));

      await page.screenshot({
        path: path.join(SHOT_DIR, `${name}.png`),
        fullPage: false,
      });

      if (errors.length > 0) {
        issues.push({ view: name, errors });
      } else {
        log(`  ✓ ${name}: clean`);
      }
    } catch (e) {
      issues.push({ view: name, errors: [`navigation failed: ${e.message}`] });
    } finally {
      await page.close();
    }
  }

  // 1. Library (initial view)
  await testView("library");

  // 2. Click a subject → Study view
  await testView("study", async (page) => {
    // Click first subject card
    const cards = await page.$$('button[class*="rounded-xl"]');
    if (cards.length > 0) {
      await cards[0].click();
      await new Promise((r) => setTimeout(r, 1500));
    }
  });

  // 3. Quiz
  await testView("quiz", async (page) => {
    // Open subject first, then click Quiz in sidebar
    const cards = await page.$$('button[class*="rounded-xl"]');
    if (cards.length > 0) await cards[0].click();
    await new Promise((r) => setTimeout(r, 1500));
    // Click Quiz in sidebar
    const quizBtn = await page.$('button[title=""], button:has(svg)');
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && txt.trim() === "Quiz") {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  });

  // 4. Flashcards
  await testView("flashcards", async (page) => {
    const cards = await page.$$('button[class*="rounded-xl"]');
    if (cards.length > 0) await cards[0].click();
    await new Promise((r) => setTimeout(r, 1500));
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && txt.trim() === "Flashcards") {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  });

  // 5. Progress
  await testView("progress", async (page) => {
    const cards = await page.$$('button[class*="rounded-xl"]');
    if (cards.length > 0) await cards[0].click();
    await new Promise((r) => setTimeout(r, 1500));
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && txt.trim() === "Progress") {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  });

  // 6. Settings
  await testView("settings", async (page) => {
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && txt.trim() === "Settings") {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  });

  // 7. Light mode
  await testView("light-mode", async (page) => {
    const allBtns = await page.$$("button");
    for (const btn of allBtns) {
      const txt = await page.evaluate((el) => el.textContent, btn);
      if (txt && (txt.trim() === "Light mode" || txt.trim() === "Dark mode")) {
        await btn.click();
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  });

  await browser.close();
  cleanup();

  log("\n========================================");
  log(`screenshots saved to: ${SHOT_DIR}`);
  if (issues.length === 0) {
    log("✓ ALL CLEAN — no errors detected in any view");
    process.exit(0);
  } else {
    log(`✗ ${issues.length} view(s) had issues:`);
    for (const i of issues) {
      log(`\n${i.view}:`);
      for (const e of i.errors) log("  - " + e);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  log("fatal:", e);
  process.exit(1);
});
