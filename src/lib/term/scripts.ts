import type { DeskScript } from "./types";

const KEY = "aapl.desk.scripts";

export const BUILTIN_SCRIPTS: DeskScript[] = [
  {
    name: "fair",
    body: "quote\ndcf\nreverse\ncapm",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "shock",
    body: "mc n=10000",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "tail",
    body: "cal\nrisk\njump n=4000",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "brief",
    body: "quote\nnews\nreverse\ncapm\nbrief",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "reprice",
    body: "apply-capm\ndcf\nreverse",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "stress",
    body: "set wacc=11 tgr=2\nmc n=8000\nrisk",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "full",
    body: "quote\ndcf\nforecast\nsens\nrisk\nmeasure",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "audit",
    body: "for c in quote dcf reverse capm\ndo\n  $c | head 3\ndone",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "scan",
    body: "hist | grep 202 | awk '{print $1,$2}'",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "ops",
    body: "mix && funnel && cash && expo",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "fairness",
    body: "if [ $TAPE -gt 250 ]; then\n  echo rich tape — reverse the multiple\n  reverse\nelse\n  echo cheap tape — run the DCF\n  dcf\nfi",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "rollup",
    body: "for y in 2021 2022 2023 2024 2025\ndo\n  hist | grep $y\ndone",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "watchdog",
    body: "mix | awk '{print $1,$6}' | tail 5\nfunnel | grep -i net\ncash | tail 2\nexpo | sed s/est/EST/",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "yoy",
    body: "table hist | awk 'NR>1 {if(p) printf \"%s  %+.1f%%\\n\", $1, 100*($2-p)/p; p=$2}'",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "awksum",
    body: "echo revenue $B across FY18–25\ntable hist | awk 'NR>1 {s+=$2} END {print s}'\necho services mix last print\ntable mix | awk 'NR>1 {m=$6} END {printf \"%.1f%%\\n\", m*100}'",
    updatedAt: 0,
    builtin: true,
  },
  {
    name: "fcfsum",
    body: "table fcf | awk 'NR>1 {s+=$4} END {print \"explicit FCF $B\", s}'",
    updatedAt: 0,
    builtin: true,
  },
];

function canStore() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readUser(): DeskScript[] {
  if (!canStore()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DeskScript[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.name === "string" && typeof s.body === "string");
  } catch {
    return [];
  }
}

function writeUser(scripts: DeskScript[]) {
  if (!canStore()) return;
  window.localStorage.setItem(KEY, JSON.stringify(scripts));
}

export function listScripts(): DeskScript[] {
  const user = readUser();
  const overridden = new Set(user.map((s) => s.name.toLowerCase()));
  const builtins = BUILTIN_SCRIPTS.filter((s) => !overridden.has(s.name.toLowerCase()));
  return [...builtins, ...user].sort((a, b) => a.name.localeCompare(b.name));
}

export function getScript(name: string): DeskScript | null {
  const n = name.toLowerCase();
  return listScripts().find((s) => s.name.toLowerCase() === n) ?? null;
}

export function saveScript(name: string, body: string): DeskScript {
  const clean = name.trim().replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") || "untitled";
  const next: DeskScript = { name: clean, body, updatedAt: Date.now(), builtin: false };
  const user = readUser().filter((s) => s.name.toLowerCase() !== clean.toLowerCase());
  user.push(next);
  writeUser(user);
  return next;
}

export function removeScript(name: string): { ok: boolean; message: string } {
  const n = name.toLowerCase();
  const user = readUser();
  const idx = user.findIndex((s) => s.name.toLowerCase() === n);
  if (idx >= 0) {
    user.splice(idx, 1);
    writeUser(user);
    const builtin = BUILTIN_SCRIPTS.some((s) => s.name.toLowerCase() === n);
    return { ok: true, message: builtin ? `Removed override. Builtin '${name}' restored.` : `Removed '${name}'.` };
  }
  if (BUILTIN_SCRIPTS.some((s) => s.name.toLowerCase() === n)) {
    return { ok: false, message: `Cannot delete builtin '${name}'. Save an override, then rm.` };
  }
  return { ok: false, message: `No script named '${name}'.` };
}

export function scriptNames(): string[] {
  return listScripts().map((s) => s.name);
}
