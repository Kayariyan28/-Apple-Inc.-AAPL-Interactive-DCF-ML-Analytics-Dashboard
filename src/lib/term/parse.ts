import type { Parsed } from "./types";

const ALIAS: Record<string, string> = {
  "?": "help",
  h: "help",
  tape: "quote",
  px: "quote",
  price: "quote",
  q: "quote",
  fair: "dcf",
  monte: "mc",
  sim: "mc",
  simulate: "mc",
  gbm: "paths",
  path: "paths",
  merton: "jump",
  jd: "jump",
  heat: "sens",
  sensitivity: "sens",
  grid: "sens",
  ml: "forecast",
  ens: "forecast",
  var: "risk",
  cvar: "risk",
  rdcf: "reverse",
  implied: "reverse",
  rev: "reverse",
  calib: "cal",
  calibration: "cal",
  tech: "measure",
  sma: "measure",
  bb: "measure",
  fib: "measure",
  history: "hist",
  headlines: "news",
  cls: "clear",
  list: "ls",
  load: "run",
  exec: "run",
  del: "rm",
  delete: "rm",
  create: "new",
  sc: "scenario",
  case: "scenario",
  "apply-capm": "applycapm",
  apply_capm: "applycapm",
  "apply-wacc": "applycapm",
  whoami: "status",
  info: "status",
  comp: "peers",
  bars: "intraday",
  session: "intraday",
  story: "brief",
  narrative: "brief",
  if: "whatif",
  vs: "compare",
  defaults: "reset",
  shortcuts: "keys",
  man: "syntax",
  tbl: "table",
  stop: "unwatch",
  segment: "mix",
  pnl: "funnel",
  buyback: "cash",
  cashflow: "cash",
  base: "expo",
  installed: "expo",
  subs: "expo",
  "let": "export",
  source: "run",
};

export function resolveCmd(token: string) {
  const t = token.toLowerCase();
  return ALIAS[t] ?? t;
}

export function splitStatements(raw: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === ";" || ch === "\n") {
      const t = cur.trim();
      if (t) out.push(t);
      cur = "";
      continue;
    }
    cur += ch;
  }
  const t = cur.trim();
  if (t) out.push(t);
  return out;
}

function tokenize(raw: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function parseLine(raw: string): Parsed | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const tokens = tokenize(trimmed);
  if (!tokens.length) return null;
  const cmd = resolveCmd(tokens[0]!);
  const args: string[] = [];
  const kv: Record<string, string> = {};
  for (const t of tokens.slice(1)) {
    const eq = t.indexOf("=");
    if (eq > 0) kv[t.slice(0, eq).toLowerCase()] = t.slice(eq + 1);
    else args.push(t);
  }
  return { cmd, args, kv, raw: trimmed };
}

export function asNumber(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/[_%,$]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** 9 → 0.09, 0.09 stays, 9% → 0.09 */
export function asRate(raw: string | undefined, fallback: number): number {
  const n = asNumber(raw);
  if (n == null) return fallback;
  return Math.abs(n) > 1 ? n / 100 : n;
}

export function intAt(parsed: Parsed, keys: string[], fallback: number, lo: number, hi: number) {
  let n: number | null = null;
  for (const k of keys) {
    n = asNumber(parsed.kv[k]);
    if (n != null) break;
  }
  if (n == null) n = asNumber(parsed.args[0]);
  if (n == null) n = fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function pairs(parsed: Parsed): Record<string, string> {
  const out = { ...parsed.kv };
  for (let i = 0; i < parsed.args.length; i++) {
    const k = parsed.args[i]!.toLowerCase();
    const v = parsed.args[i + 1];
    if (v != null && !k.includes("=") && out[k] == null) {
      out[k] = v;
      i += 1;
    }
  }
  return out;
}
