import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });
const errors = [];

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(String(e)));

async function clickTicker(sym) {
  await page.getByRole("tab", { name: sym, exact: true }).first().click();
  await page.waitForTimeout(400);
}

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await page.getByRole("heading", { name: /novel|arithmetic/i }).waitFor({ timeout: 15000 });
await page.screenshot({ path: `${out}/voice-aapl-home.png` });

await clickTicker("MSFT");
await page.getByRole("heading", { name: /Azure is the novel/i }).waitFor({ timeout: 10000 });
if (!(await page.getByText(/Intelligent Cloud is now almost half/i).count())) errors.push("MSFT lede missing");
await page.screenshot({ path: `${out}/voice-msft-home.png` });

await page.goto("http://127.0.0.1:8080/print", { waitUntil: "networkidle", timeout: 45000 });
await clickTicker("MSFT");
await page.getByRole("heading", { name: /Every Microsoft 10-K/i }).waitFor({ timeout: 10000 });
if (!(await page.getByText(/Intelligent Cloud eating/i).count())) errors.push("MSFT mix lede missing on print");
await page.screenshot({ path: `${out}/voice-msft-print.png` });

await clickTicker("NVDA");
await page.getByRole("heading", { name: /Every NVIDIA 10-K/i }).waitFor({ timeout: 10000 });
if (!(await page.getByText(/Data center is 89%/i).count()) && !(await page.getByText(/Gaming collapsed/i).count())) {
  errors.push("NVDA mix lede missing on print");
}
await page.screenshot({ path: `${out}/voice-nvda-print.png` });

await page.goto("http://127.0.0.1:8080/live", { waitUntil: "networkidle", timeout: 45000 });
await clickTicker("GOOGL");
await page.getByRole("heading", { name: /open Alphabet feed/i }).waitFor({ timeout: 10000 });
if (!(await page.getByText(/Google News RSS for GOOGL/i).count())) errors.push("GOOGL news copy missing");
await page.screenshot({ path: `${out}/voice-googl-live.png` });

await browser.close();
console.log(JSON.stringify({ errors, n: errors.length }, null, 2));
if (errors.length) process.exit(1);
