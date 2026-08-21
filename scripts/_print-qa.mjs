import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });
const errors = [];

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

const desktop = await browser.newContext({ viewport: { width: 1440, height: 980 } });
const page = await desktop.newPage();
page.on("pageerror", (e) => errors.push("print " + e));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("print console " + m.text());
});

await page.goto("http://127.0.0.1:8080/print", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1800);
await shot(page, "print-board");
await page.screenshot({ path: `${out}/print-board-full.png`, fullPage: true });

const fy21 = page.getByRole("tab", { name: "FY21" });
if (await fy21.count()) {
  await fy21.click();
  await page.waitForTimeout(500);
  await shot(page, "print-fy21");
}
const fy25 = page.getByRole("tab", { name: "FY25" });
if (await fy25.count()) await fy25.click();
await page.waitForTimeout(300);

const oneM = page.getByRole("tab", { name: "1M" });
if (await oneM.count()) {
  await oneM.click();
  await page.waitForTimeout(400);
}
const svg = page.getByRole("img", { name: "AAPL candlesticks" });
if (await svg.count()) {
  const box = await svg.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.42);
    await page.waitForTimeout(350);
    await shot(page, "print-candle-hover");
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.42, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await shot(page, "print-candle-zoom");
  }
}
const fifty = page.getByRole("button", { name: "52w" });
if (await fifty.count()) await fifty.click();
const services = page.getByRole("button", { name: /Services/ }).first();
if (await services.count()) await services.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/print-board-interact.png`, fullPage: false });

const iphone = page.getByRole("button", { name: "iPhone" });
if (await iphone.count()) await iphone.click();
const pack = page.getByRole("img", { name: "Peer market-cap pack" });
if (await pack.count()) {
  const box = await pack.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.45);
    await page.waitForTimeout(250);
  }
}
await shot(page, "print-mix-pack");

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
mpage.on("pageerror", (e) => errors.push("print-m " + e));
await mpage.goto("http://127.0.0.1:8080/print", { waitUntil: "networkidle", timeout: 45000 });
await mpage.waitForTimeout(1400);
await mpage.screenshot({ path: `${out}/print-mobile.png`, fullPage: false });
await mpage.screenshot({ path: `${out}/print-mobile-full.png`, fullPage: true });

const tctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const term = await tctx.newPage();
term.on("pageerror", (e) => errors.push("term " + e));
term.on("console", (m) => {
  if (m.type() === "error") errors.push("term console " + m.text());
});
await term.goto("http://127.0.0.1:8080/term", { waitUntil: "networkidle", timeout: 45000 });
await term.waitForTimeout(1800);
const input = term.getByRole("textbox", { name: "Command" });
await input.click();
await input.fill("syntax awk");
await term.keyboard.press("Enter");
await term.waitForTimeout(800);
await shot(term, "term-syntax-awk");

await input.fill("table hist | awk 'NR>1 {s+=$2} END {print s}'");
await term.keyboard.press("Enter");
await term.waitForTimeout(900);
await shot(term, "term-awk-sum");

await input.fill("run yoy");
await term.keyboard.press("Enter");
await term.waitForTimeout(900);
await shot(term, "term-awk-yoy");

await browser.close();
console.log(JSON.stringify({ errors, n: errors.length }, null, 2));
if (errors.length) process.exit(1);
