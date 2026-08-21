import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const out = "/workspace/screenshots";
mkdirSync(out, { recursive: true });
const errors = [];

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desktop.newPage();
page.on("pageerror", (e) => errors.push("login " + e));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("login console " + m.text());
});

await page.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle", timeout: 45000 });
await page.getByRole("heading", { name: "Sign in" }).waitFor({ timeout: 15000 });
await page.getByRole("button", { name: "Continue with Google" }).waitFor();
await page.getByRole("button", { name: "Continue with X" }).waitFor();
await page.getByRole("button", { name: "Sign in with email" }).waitFor();
await page.screenshot({ path: `${out}/login.png`, fullPage: false });

await page.getByRole("button", { name: "Need an account? Create one" }).click();
await page.getByRole("button", { name: "Create account" }).waitFor();
await page.screenshot({ path: `${out}/login-signup.png`, fullPage: false });

const home = await desktop.newPage();
home.on("pageerror", (e) => errors.push("home " + e));
await home.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
await home.getByRole("link", { name: "Sign in" }).first().waitFor({ timeout: 15000 });
await home.screenshot({ path: `${out}/home-signin.png`, fullPage: false });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mpage = await mobile.newPage();
mpage.on("pageerror", (e) => errors.push("login-m " + e));
await mpage.goto("http://127.0.0.1:8080/login", { waitUntil: "networkidle", timeout: 45000 });
await mpage.getByRole("heading", { name: "Sign in" }).waitFor({ timeout: 15000 });
await mpage.screenshot({ path: `${out}/login-mobile.png`, fullPage: false });

await browser.close();
console.log(JSON.stringify({ errors, n: errors.length }, null, 2));
if (errors.length) process.exit(1);
