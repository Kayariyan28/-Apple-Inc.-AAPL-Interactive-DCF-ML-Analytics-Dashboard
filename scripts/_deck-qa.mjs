import { chromium } from "playwright";

const b = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const errs = [];
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => {
  if (m.type() === "error") errs.push(m.text());
});

await p.goto("http://127.0.0.1:8080/deck", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(1800);

async function shot(sel, file) {
  const loc = p.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  await p.waitForTimeout(250);
  await loc.screenshot({ path: `/workspace/screenshots/${file}.png` });
}

await p.screenshot({ path: "/workspace/screenshots/deck-top.png" });
await shot("text=The flywheel does not do linear.", "deck-mid");
await shot("text=Who owns the stack.", "deck-compete");
await shot("text=How much of $1 of revenue survives.", "deck-pnl");
await shot("text=live mix + mega-cap tape", "deck-ops");
await shot("text=Where a revenue dollar goes", "deck-intel");

await p.goto("http://127.0.0.1:8080/term", { waitUntil: "networkidle", timeout: 45000 });
await p.waitForTimeout(1800);
const input = p.getByRole("textbox", { name: "Command" });
await input.fill("hist | grep 2024 | sed s/2024/FY24/");
await p.keyboard.press("Enter");
await p.waitForTimeout(400);
await input.fill("run fairness");
await p.keyboard.press("Enter");
await p.waitForTimeout(800);
await input.fill("run rollup");
await p.keyboard.press("Enter");
await p.waitForTimeout(700);
await input.fill("if [ $WACC -ge 9 ]; then echo WACC is elevated; else echo WACC is loose; fi");
await p.keyboard.press("Enter");
await p.waitForTimeout(400);
await input.fill("mix | awk '{print $1,$6}' | tail 4");
await p.keyboard.press("Enter");
await p.waitForTimeout(400);
await input.fill("test $TAPE -gt 200 && echo tape is north of 200");
await p.keyboard.press("Enter");
await p.waitForTimeout(700);
await p.screenshot({ path: "/workspace/screenshots/term-shell.png" });

const m = await b.newPage({ viewport: { width: 390, height: 844 } });
m.on("pageerror", (e) => errs.push("mobile " + String(e)));
await m.goto("http://127.0.0.1:8080/deck", { waitUntil: "networkidle", timeout: 45000 });
await m.waitForTimeout(1400);
await m.screenshot({ path: "/workspace/screenshots/deck-mobile.png" });

console.log(JSON.stringify({ errs: [...new Set(errs)].slice(0, 6), title: await p.title() }, null, 2));
await b.close();
