import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const url = "http://127.0.0.1:8080/term";
const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errors = [];

async function shot(page, name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(1800);
await shot(page, "term-boot");

const input = page.getByRole("textbox", { name: "Command" });
await input.click();
await input.fill("help");
await page.keyboard.press("Enter");
await page.waitForTimeout(700);
await shot(page, "term-help");

await input.fill("dcf");
await page.keyboard.press("Enter");
await page.waitForTimeout(900);
await shot(page, "term-dcf");

await input.fill("mc n=5000");
await page.keyboard.press("Enter");
await page.waitForTimeout(1400);
await shot(page, "term-mc");

await input.fill("ls");
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
await shot(page, "term-ls");

await page.getByRole("button", { name: "fair" }).first().click();
await page.waitForTimeout(1200);
await shot(page, "term-script-run");

await input.fill("measure");
await page.keyboard.press("Enter");
await page.waitForTimeout(800);
await shot(page, "term-measure");

await page.locator("[data-tab=dcf]").click();
await page.waitForTimeout(900);
await shot(page, "term-tab-dcf");

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
mpage.on("pageerror", (e) => errors.push("mobile " + String(e)));
await mpage.goto(url, { waitUntil: "networkidle", timeout: 45000 });
await mpage.waitForTimeout(1800);
await mpage.screenshot({ path: `${out}/term-mobile.png` });

const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);

console.log(JSON.stringify({ errors, overflow, title: await page.title() }, null, 2));
await browser.close();
