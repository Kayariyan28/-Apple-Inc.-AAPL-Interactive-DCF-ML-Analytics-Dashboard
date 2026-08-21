import { chromium } from "playwright";

const url = process.env.QA_URL ?? "http://127.0.0.1:8080";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const title = await page.title();
const desk = await page.locator("header").innerText();
await page.screenshot({ path: "/workspace/screenshots/desk-home.png", fullPage: false });

await page.getByRole("tab", { name: "MSFT" }).first().click();
await page.waitForTimeout(1500);
const afterMsft = await page.locator("header").innerText();
const body = await page.locator("h1").innerText();
await page.screenshot({ path: "/workspace/screenshots/desk-msft.png" });

await page.goto(`${url}/print`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const printHead = await page.locator("article header h2, article h2").first().innerText();
const printKicker = await page.locator("article").innerText();
await page.screenshot({ path: "/workspace/screenshots/desk-print-msft.png", fullPage: true });

await page.getByRole("tab", { name: "NVDA" }).first().click();
await page.waitForTimeout(1800);
const nvdaPrint = await page.locator("article").innerText();
await page.screenshot({ path: "/workspace/screenshots/desk-print-nvda.png", fullPage: true });

await page.getByRole("button", { name: "Ask Grok" }).click();
await page.waitForTimeout(400);
const grok = await page.getByText("Ask Grok").nth(1).isVisible();
const starters = await page.getByText("Why is the tape rich versus the DCF?").isVisible();
await page.screenshot({ path: "/workspace/screenshots/desk-grok.png" });
await page.keyboard.press("Escape");

await page.goto(`${url}/term`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.keyboard.type("use moon");
await page.keyboard.press("Enter");
await page.waitForTimeout(1200);
const term = await page.locator("body").innerText();
await page.screenshot({ path: "/workspace/screenshots/desk-term-moon.png" });

console.log(
  JSON.stringify(
    {
      title,
      deskHasDataDesk: desk.includes("Data Desk"),
      afterMsftHasMSFT: afterMsft.includes("MSFT"),
      h1: body.slice(0, 80),
      printHead,
      printHasMicrosoft: printKicker.includes("Microsoft") || printKicker.includes("MSFT"),
      nvdaHasNvidia: nvdaPrint.includes("NVIDIA") || nvdaPrint.includes("NVDA"),
      grok,
      starters,
      termHasAmazon: /AMZN|Amazon|moon/i.test(term),
      errors,
    },
    null,
    2,
  ),
);

await browser.close();
