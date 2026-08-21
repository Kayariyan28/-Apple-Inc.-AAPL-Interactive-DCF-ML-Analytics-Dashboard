import { CASH, DEBT, FORECAST_LABELS, FORECAST_YEARS, MANAGEMENT_DEFAULTS, SHARES, STREET_DEFAULTS, TGR_RANGE, WACC_RANGE, WEEK_52_HIGH, WEEK_52_LOW } from "@/lib/dcf/constants";
import { runDcf, runMonteCarlo, sensitivityGrid, streetDcf, type ModelInputs } from "@/lib/dcf/engine";
import { booksForYear, LAST_YEAR_INDEX } from "@/lib/dcf/books";
import { UNIVERSE, heroLabel, parseTicker, pnlRows, streetOf } from "@/lib/desk/universe";
import { money, moneyShare, pct, pctPlain, billions } from "@/lib/dcf/format";
import { histPriceMoves } from "@/lib/dcf/calibrate";
import { priceEnsemble } from "@/lib/dcf/regress";
import { historicalVar, pathStats, simulateGbm, simulateJumpDiffusion } from "@/lib/dcf/stochastic";
import { clamp } from "@/lib/dcf/rng";
import { WEEKLY } from "@/lib/dcf/history";
import { impliedGrowth, impliedTgr, impliedWacc, liveCapm, analyzeTape } from "@/lib/market/analyze";
import { bollinger, fibLevels, sma, windowAnalytics } from "@/lib/charts/math";
import { CATALOG, findCommand } from "./catalog";
import { asNumber, asRate, intAt, pairs, parseLine, splitStatements } from "./parse";
import { getScript, listScripts, removeScript, saveScript } from "./scripts";
import { asciiArea, asciiBar, sparkline } from "./ascii";
import { FILTERS, evalTest, preprocess, runFilter, splitAndOr, splitPipes } from "./shell";
import { CASH_SERIES, INSTALLED_BASE, MIX_NOW, S_CURVE, sequentialFunnel, PNL_NOW } from "@/lib/dcf/metrics";
import { syntaxPage } from "./syntax";
import { getTable, listTables, renderTable } from "./tables";
import type { LatticeCell, ModelPatch, Parsed, SparkSeries, TermCtx, TermLine, TermResult, TermTheme, VizSpec } from "./types";

function err(text: string): TermLine {
  return { kind: "err", text };
}
function sys(text: string): TermLine {
  return { kind: "sys", text };
}

function linesOf(texts: string[], kind: TermLine["kind"] = "out"): TermLine[] {
  return texts.map((text) => ({ kind, text }));
}

function ok(lines: string[], viz: VizSpec | null = null, extra?: Partial<TermResult>): TermResult {
  return { lines: linesOf(lines), viz, ...extra };
}

function fail(message: string): TermResult {
  return { lines: [err(message)], viz: null };
}

function booksOf(ctx: TermCtx) {
  return booksForYear(LAST_YEAR_INDEX, ctx.market, ctx.ticker ?? "AAPL");
}

function nameOfCtx(ctx: TermCtx) {
  return UNIVERSE[ctx.ticker ?? "AAPL"];
}

function signedRets(prices: readonly number[]): number[] {
  const outR: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const a = prices[i - 1]!;
    const b = prices[i]!;
    if (a > 0) outR.push(b / a - 1);
  }
  return outR;
}

function latticeFrom(rets: readonly number[], cap = 100): LatticeCell[] {
  return rets.slice(-cap).map((ret) => ({ up: ret >= 0, ret }));
}

function dailyCloses(ctx: TermCtx): number[] {
  const d = ctx.market?.daily.map((b) => b.close) ?? [];
  if (d.length >= 8) return d;
  const w = WEEKLY.map((p) => p.close);
  if (Math.abs(w[w.length - 1]! - ctx.tape) > 0.05) w.push(ctx.tape);
  return w;
}

function tapeLattice(ctx: TermCtx): LatticeCell[] {
  return latticeFrom(signedRets(dailyCloses(ctx)));
}

function pathLattice(paths: Float64Array[], s0: number, cap = 100): LatticeCell[] {
  const n = Math.min(cap, paths.length);
  const cells: LatticeCell[] = [];
  for (let i = 0; i < n; i++) {
    const last = paths[i]![paths[i]!.length - 1]!;
    cells.push({ up: last >= s0, ret: s0 > 0 ? last / s0 - 1 : 0 });
  }
  return cells;
}

function fmtPct(n: number, d = 1) {
  return pct(n, d);
}

function helpText(cmd?: string): string[] {
  if (cmd) {
    const e = findCommand(cmd);
    if (!e) return [`Unknown command '${cmd}'. Type help.`];
    return [`${e.name} — ${e.blurb}`, `usage: ${e.usage}`, e.aliases.length ? `aliases: ${e.aliases.join(", ")}` : ""].filter(Boolean);
  }
  const groups = ["tape", "dcf", "sim", "risk", "scripts"] as const;
  const lines = ["Data Desk · every command runs the same engines as the pages. use MSFT to switch names.", ""];
  for (const g of groups) {
    lines.push(g.toUpperCase());
    for (const c of CATALOG.filter((x) => x.group === g)) {
      lines.push(`  ${c.usage.padEnd(32)} ${c.blurb}`);
    }
    lines.push("");
  }
  lines.push("Scripts: new / edit / save / run / ls / cat / rm. Stored on this device.");
  lines.push("Shell: ;  |  &&  ||  for x in …; do …; done  if [ $WACC -gt 9 ]; then …; fi");
  lines.push("Quote awk programs:  table hist | awk '{print $1,$2}'");
  lines.push("Filters: grep awk head tail wc sort cut uniq tr sed tee.  $(cmd)  $TAPE $WACC $TGR");
  lines.push("Tables: table hist|mix|pnl|cash|tape|peers|fcf|intraday");
  lines.push("F1 catalog   syntax   help awk   ⌘K palette   watch quote 12");
  return lines;
}

function vizQuote(ctx: TermCtx): { lines: string[]; viz: VizSpec } {
  const a = ctx.market?.aapl;
  const sym = ctx.ticker ?? a?.symbol ?? "AAPL";
  const px = a?.price ?? ctx.tape;
  const chg = a?.changePct ?? 0;
  const dcf = runDcf(ctx.input, px, booksOf(ctx));
  const vs = dcf.price / px - 1;
  const hi = a?.high52;
  const lo = a?.low52;
  const range = hi != null && lo != null && hi > lo ? (px - lo) / (hi - lo) : null;
  const closes = dailyCloses(ctx);
  const lines = [
    `${sym}  ${moneyShare(px)}  ${fmtPct(chg)}  session ${a?.session ?? "n/a"}`,
    `source ${ctx.market?.source ?? "snapshot"}   as-of ${a?.asOf ?? "—"}`,
    `DCF ${moneyShare(dcf.price)}  (${fmtPct(vs)} vs tape)`,
    a?.pe != null ? `P/E ${a.pe.toFixed(1)}   beta ${a.beta?.toFixed(2) ?? "—"}   52w ${lo?.toFixed(0) ?? "—"}–${hi?.toFixed(0) ?? "—"}` : `52w ${WEEK_52_RANGE()}`,
    ctx.market?.spx ? `SPX ${moneyShare(ctx.market.spx.price)} ${fmtPct(ctx.market.spx.changePct)}` : "",
    ctx.market?.vix ? `VIX ${ctx.market.vix.price.toFixed(2)}` : "",
    ctx.market?.rf != null ? `10Y ${pctPlain(ctx.market.rf)}` : "",
  ].filter(Boolean);
  const spark = sparkline(closes, 48);
  if (spark) {
    lines.push("");
    lines.push(spark);
  }
  const viz: VizSpec = {
    kind: "quote",
    kicker: "Live tape · open feed",
    title: `${sym} last print`,
    headline: moneyShare(px),
    hint: fmtPct(chg),
    note: a?.session ?? "snapshot",
    rows: [
      { label: "Change", value: fmtPct(chg), tone: chg >= 0 ? "up" : "down" },
      { label: "DCF", value: moneyShare(dcf.price), detail: fmtPct(vs) + " vs tape", tone: vs >= 0 ? "up" : "down" },
      { label: "52-week", value: range != null ? pctPlain(range) : "—", detail: hi != null && lo != null ? `${lo.toFixed(0)}–${hi.toFixed(0)}` : undefined },
      { label: "P/E", value: a?.pe != null ? a.pe.toFixed(1) : "—" },
    ],
    spark: [{ name: "Close", values: closes, color: "fg" }],
    lattice: tapeLattice(ctx),
    latticeNote: "signed daily (or weekly) returns",
    market: px,
  };
  return { lines, viz };
}

function WEEK_52_RANGE() {
  return `${WEEK_52_LOW}–${WEEK_52_HIGH}`;
}

function vizDcf(ctx: TermCtx): { lines: string[]; viz: VizSpec } {
  const b = booksOf(ctx);
  const dcf = runDcf(ctx.input, ctx.tape, b);
  const street = streetDcf(ctx.tape, b, streetOf(ctx.ticker ?? "AAPL"));
  const vs = dcf.price / ctx.tape - 1;
  const lines = [
    `DCF ${moneyShare(dcf.price)}   tape ${moneyShare(ctx.tape)}   ${fmtPct(vs)}`,
    `EV ${money(dcf.ev / 1e6, 2)}T   equity ${money(dcf.equity / 1e6, 2)}T   TV ${pctPlain(dcf.tvPct)} of EV`,
    `WACC ${pctPlain(ctx.input.wacc)}  TGR ${pctPlain(ctx.input.tgr)}  GM ${pctPlain(ctx.input.grossMargin)}  tax ${pctPlain(ctx.input.taxRate)}`,
    `growth ${ctx.input.growth.map((g) => pctPlain(g, 1)).join("  ")}`,
    `FCF  ${dcf.fcf.map((f, i) => `${FORECAST_LABELS[i]} ${billions(f, 1)}`).join("  ")}`,
    `street ${moneyShare(street.price)} (${fmtPct(street.price / ctx.tape - 1)})`,
    `shares ${b.shares.toFixed(0)}mm  cash ${billions(b.cash, 0)}  debt ${billions(b.debt, 0)}`,
  ];
  const area = asciiArea(
    dcf.fcf.map((f) => f / 1000),
    48,
    4,
  );
  if (area.length) {
    lines.push("");
    lines.push("FCF $B");
    lines.push(...area);
  }
  const viz: VizSpec = {
    kind: "dcf",
    kicker: "Discounted cash flow",
    title: "Implied fair value",
    headline: moneyShare(dcf.price),
    hint: fmtPct(vs) + " vs tape",
    note: `${pctPlain(ctx.input.wacc)} WACC · ${pctPlain(ctx.input.tgr)} TGR`,
    rows: [
      { label: "Tape", value: moneyShare(ctx.tape) },
      { label: "Street case", value: moneyShare(street.price), detail: fmtPct(street.price / ctx.tape - 1) },
      { label: "TV share", value: pctPlain(dcf.tvPct) },
      { label: "FY29 FCF", value: billions(dcf.fcf[4]!, 1) },
    ],
    spark: [
      { name: "FCF $B", values: dcf.fcf.map((f) => f / 1000), color: "accent" },
      { name: "Revenue $B", values: dcf.revenue.map((f) => f / 1000), color: "fg" },
    ],
    labels: [...FORECAST_LABELS],
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns while cash compounds",
    market: ctx.tape,
  };
  return { lines, viz };
}

function cmdMc(ctx: TermCtx, parsed: Parsed): TermResult {
  const n = intAt(parsed, ["n", "paths", "sims"], ctx.nSims, 500, 50_000);
  const seed = intAt(parsed, ["seed"], 42, 1, 1_000_000);
  const mc = runMonteCarlo(ctx.input, n, seed, ctx.tape, booksOf(ctx));
  const lines = [
    `Monte Carlo n=${n.toLocaleString()} seed=${seed}  tape ${moneyShare(ctx.tape)}`,
    `mean ${moneyShare(mc.mean)}  median ${moneyShare(mc.median)}  std ${moneyShare(mc.std)}`,
    `P5 ${moneyShare(mc.p5)}  P25 ${moneyShare(mc.p25)}  P75 ${moneyShare(mc.p75)}  P95 ${moneyShare(mc.p95)}`,
    `${pctPlain(mc.probBelowMarket)} of paths price below the tape`,
    `shocks  WACC ±1.0%  TGR ±0.5%  g ±2.5%  EBIT ±1.5%`,
  ];
  const histSpark = sparkline(
    mc.bins.map((b) => b.share),
    48,
  );
  if (histSpark) {
    lines.push("");
    lines.push(histSpark);
    lines.push(`${asciiBar(mc.probBelowMarket)}  ${pctPlain(mc.probBelowMarket)} below tape`);
  }
  const sample = mc.sorted;
  const signs: number[] = [];
  const step = Math.max(1, Math.floor(sample.length / 100));
  for (let i = 0; i < sample.length && signs.length < 100; i += step) {
    signs.push(sample[i]! / ctx.tape - 1);
  }
  const viz: VizSpec = {
    kind: "mc",
    kicker: `Monte Carlo · ${n.toLocaleString()} paths`,
    title: "Distribution of fair value",
    headline: moneyShare(mc.median),
    hint: "median",
    note: `${pctPlain(mc.probBelowMarket)} below tape`,
    rows: [
      { label: "Mean", value: moneyShare(mc.mean) },
      { label: "P5 / P95", value: `${moneyShare(mc.p5)} · ${moneyShare(mc.p95)}` },
      { label: "Std", value: moneyShare(mc.std) },
      { label: "Below tape", value: pctPlain(mc.probBelowMarket), tone: "down" },
    ],
    hist: mc.bins,
    lattice: latticeFrom(signs),
    latticeNote: "path vs tape (sample)",
    market: ctx.tape,
  };
  return ok(lines, viz);
}

function cmdPaths(ctx: TermCtx, parsed: Parsed, jump: boolean): TermResult {
  const n = intAt(parsed, ["n", "paths"], Math.min(ctx.nSims, 8_000), 200, 12_000);
  const seed = intAt(parsed, ["seed"], jump ? 123 : 42, 1, 1_000_000);
  const lambda = asRate(parsed.kv.lambda, 0.3);
  const muJ = asNumber(parsed.kv.muj) ?? -0.05;
  const sigJ = asNumber(parsed.kv.sigj) ?? 0.15;
  const bundle = jump
    ? simulateJumpDiffusion(n, 5, seed, lambda, muJ, sigJ, ctx.cal)
    : simulateGbm(n, 5, seed, ctx.cal);
  const y5 = pathStats(bundle, 5);
  const kind = jump ? "jump" : "paths";
  const title = jump ? "Merton jump-diffusion" : "Geometric Brownian motion";
  const lines = [
    `${jump ? "Jump-diffusion" : "GBM"} n=${n.toLocaleString()}  S0 ${moneyShare(ctx.cal.s0)}  μ ${pctPlain(ctx.cal.mu)}  σ ${pctPlain(ctx.cal.sigma)}`,
    `source ${ctx.cal.source}`,
    jump ? `λ ${lambda.toFixed(2)}  μJ ${fmtPct(muJ)}  σJ ${pctPlain(sigJ)}` : "",
    `Y5 mean ${moneyShare(y5.mean)}  median ${moneyShare(y5.median)}  P5 ${moneyShare(y5.p5)}  P95 ${moneyShare(y5.p95)}`,
    `P(Y5>$300) ${pctPlain(y5.p300)}  P(Y5>$400) ${pctPlain(y5.p400)}  P(Y5<$150) ${pctPlain(y5.p150)}`,
  ].filter(Boolean);
  const fan = asciiArea(bundle.p50, 46, 5);
  if (fan.length) {
    lines.push("");
    lines.push("median path");
    lines.push(...fan);
  }
  const spark: SparkSeries[] = [
    { name: "P5", values: bundle.p5, color: "down" },
    { name: "Median", values: bundle.p50, color: "fg" },
    { name: "P95", values: bundle.p95, color: "up" },
  ];
  const viz: VizSpec = {
    kind,
    kicker: title,
    title: "Five-year fan",
    headline: moneyShare(y5.median),
    hint: "year-5 median",
    note: `μ ${pctPlain(ctx.cal.mu)} · σ ${pctPlain(ctx.cal.sigma)} · S0 ${moneyShare(ctx.cal.s0)}`,
    rows: [
      { label: "Y5 mean", value: moneyShare(y5.mean) },
      { label: "Y5 P5", value: moneyShare(y5.p5), tone: "down" },
      { label: "Y5 P95", value: moneyShare(y5.p95), tone: "up" },
      { label: "P(>$300)", value: pctPlain(y5.p300) },
    ],
    spark,
    labels: ["Now", "Y1", "Y2", "Y3", "Y4", "Y5"],
    lattice: pathLattice(bundle.paths, ctx.cal.s0),
    latticeNote: "terminal vs S0 (first 100 paths)",
    market: ctx.tape,
  };
  return ok(lines, viz);
}

function cmdSens(ctx: TermCtx): TermResult {
  const dcf = runDcf(ctx.input, ctx.tape, booksOf(ctx));
  const grid = sensitivityGrid(dcf.fcf, booksOf(ctx).cash, booksOf(ctx).debt, booksOf(ctx).shares);
  const wi = WACC_RANGE.reduce((best, w, i) => (Math.abs(w - ctx.input.wacc) < Math.abs(WACC_RANGE[best]! - ctx.input.wacc) ? i : best), 0);
  const ti = TGR_RANGE.reduce((best, t, i) => (Math.abs(t - ctx.input.tgr) < Math.abs(TGR_RANGE[best]! - ctx.input.tgr) ? i : best), 0);
  const cell = grid[wi]![ti]!;
  const header = ["WACC\\TGR", ...TGR_RANGE.map((t) => pctPlain(t, 1).padStart(7))].join(" ");
  const body = grid.map((row, i) => {
    const cells = row.map((p) => (Number.isFinite(p) ? moneyShare(p).replace("$", "").padStart(7) : "    n/a"));
    return `${pctPlain(WACC_RANGE[i]!, 1).padEnd(8)} ${cells.join(" ")}`;
  });
  const lines = [
    `Sensitivity on live FCF · tape ${moneyShare(ctx.tape)}`,
    `active cell WACC ${pctPlain(WACC_RANGE[wi]!)} × TGR ${pctPlain(TGR_RANGE[ti]!)} → ${moneyShare(cell)} (${fmtPct(cell / ctx.tape - 1)})`,
    header,
    ...body,
  ];
  return ok(lines, {
    kind: "sens",
    kicker: "WACC × terminal growth",
    title: "Implied price grid",
    headline: moneyShare(cell),
    hint: `${pctPlain(WACC_RANGE[wi]!)} × ${pctPlain(TGR_RANGE[ti]!)}`,
    note: fmtPct(cell / ctx.tape - 1) + " vs tape",
    rows: [
      { label: "Tape", value: moneyShare(ctx.tape) },
      { label: "Active WACC", value: pctPlain(ctx.input.wacc) },
      { label: "Active TGR", value: pctPlain(ctx.input.tgr) },
    ],
    heat: grid,
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns",
    market: ctx.tape,
  });
}

function cmdForecast(ctx: TermCtx): TermResult {
  const ticker = ctx.ticker ?? "AAPL";
  const px = priceEnsemble(ctx.tape, ticker);
  const fits = px.fits;
  const dcf = runDcf(ctx.input, ctx.tape, booksOf(ctx));
  const last = px.mid[px.mid.length - 1]!;
  const lines = [
    `Ensemble rebased to tape ${moneyShare(ctx.tape)} (k=${px.k.toFixed(4)} vs FY2025 print)`,
    `CY25–29  ${px.mid.map((p, i) => `${FORECAST_YEARS[i]} ${moneyShare(p)}`).join("  ")}`,
    `bull ${moneyShare(px.upper[4]!)}  bear ${moneyShare(px.lower[4]!)}`,
    `from revenue ${moneyShare(px.fromRev[4]!)}  from EPS ${moneyShare(px.fromEps[4]!)}  from time ${moneyShare(px.time[4]!)}`,
    `R²  rev ${fits.revenue.r2.linear.toFixed(2)}  eps ${fits.eps.r2.linear.toFixed(2)}  px ${fits.price.r2.linear.toFixed(2)}`,
    `DCF ${moneyShare(dcf.price)} vs ensemble CY25 ${moneyShare(px.mid[0]!)}`,
  ];
  const area = asciiArea(px.mid, 46, 5);
  if (area.length) {
    lines.push("");
    lines.push("ensemble mid");
    lines.push(...area);
  }
  return ok(lines, {
    kind: "forecast",
    kicker: "OLS ensemble · live rebase",
    title: "Price path from eight prints",
    headline: moneyShare(last),
    hint: "CY2029 mid",
    note: fmtPct(last / ctx.tape - 1) + " vs tape",
    rows: [
      { label: "CY25", value: moneyShare(px.mid[0]!) },
      { label: "From EPS", value: moneyShare(px.fromEps[4]!) },
      { label: "From revenue", value: moneyShare(px.fromRev[4]!) },
      { label: "R² price", value: fits.price.r2.linear.toFixed(2) },
    ],
    spark: [
      { name: "Mid", values: px.mid, color: "fg" },
      { name: "Bull", values: px.upper, color: "up" },
      { name: "Bear", values: px.lower, color: "down" },
    ],
    labels: FORECAST_YEARS.map(String),
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns under the forecast",
    market: ctx.tape,
  });
}

function cmdRisk(ctx: TermCtx): TermResult {
  const daily = ctx.market?.daily.map((b) => b.close);
  const risk = historicalVar(ctx.cal, daily, nameOfCtx(ctx).price);
  const dollar = Math.round(1_000_000 * Math.max(0, risk.hist95));
  const lines = [
    `VaR  S0 ${moneyShare(risk.s0)}  μ ${pctPlain(risk.mu)}  σ ${pctPlain(risk.sigma)}`,
    `historical  90% ${pctPlain(Math.max(0, risk.hist90))}  95% ${pctPlain(Math.max(0, risk.hist95))}  99% ${pctPlain(Math.max(0, risk.hist99))}`,
    `CVaR / ES  95% ${pctPlain(Math.max(0, risk.cvar95))}  99% ${pctPlain(Math.max(0, risk.cvar99))}`,
    `parametric  90% ${pctPlain(Math.max(0, risk.par90))}  95% ${pctPlain(Math.max(0, risk.par95))}  99% ${pctPlain(Math.max(0, risk.par99))}`,
    risk.dailySigma != null
      ? `live daily σ (ann.) ${pctPlain(risk.dailySigma)}  daily hist 95% ${pctPlain(Math.max(0, risk.dailyHist95 ?? 0))}`
      : "live daily σ  n<8 — using annual prints only",
    `$1M 95% hist VaR  ${money(dollar, 0)}`,
    `source ${ctx.cal.source}`,
  ];
  const moves = histPriceMoves(ctx.ticker ?? "AAPL");
  return ok(lines, {
    kind: "risk",
    kicker: "Left tail",
    title: "Value at risk",
    headline: pctPlain(Math.max(0, risk.hist95)),
    hint: "historical 95% · 1y",
    note: ctx.cal.source,
    rows: [
      { label: "CVaR 95%", value: pctPlain(Math.max(0, risk.cvar95)), tone: "down" },
      { label: "Param 95%", value: pctPlain(Math.max(0, risk.par95)) },
      { label: "Annual σ", value: pctPlain(risk.sigma) },
      { label: "Live σ", value: risk.dailySigma != null ? pctPlain(risk.dailySigma) : "—" },
    ],
    spark: [{ name: "FY price", values: [...nameOfCtx(ctx).price], color: "fg" }],
    labels: nameOfCtx(ctx).years.map(String),
    lattice: latticeFrom(moves.map((m) => m.ret)),
    latticeNote: "FY2018–FY2025 annual signs",
    market: ctx.tape,
  });
}

function cmdCal(ctx: TermCtx): TermResult {
  const c = ctx.cal;
  const moves = histPriceMoves(ctx.ticker ?? "AAPL");
  const lines = [
    `S0 ${moneyShare(c.s0)}  μ ${pctPlain(c.mu, 2)}  σ ${pctPlain(c.sigma, 2)}`,
    `n annual ${c.nAnnual}  n daily ${c.nDaily}  realized ${c.realized != null ? pctPlain(c.realized, 2) : "n/a"}`,
    `source ${c.source}`,
    `annual log-returns  ${moves.map((m) => `${m.year} ${fmtPct(m.ret)}`).join("  ")}`,
  ];
  return ok(lines, {
    kind: "cal",
    kicker: "Live calibration",
    title: "μ from 10-K, σ blended",
    headline: pctPlain(c.sigma, 1),
    hint: "σ used by GBM / VaR",
    note: c.source,
    rows: [
      { label: "S0", value: moneyShare(c.s0) },
      { label: "μ", value: pctPlain(c.mu, 2) },
      { label: "σ annual", value: pctPlain(c.sigma, 2) },
      { label: "Realized", value: c.realized != null ? pctPlain(c.realized, 2) : "n<8 daily" },
    ],
    spark: [{ name: "Close", values: dailyCloses(ctx), color: "accent" }],
    lattice: tapeLattice(ctx),
    latticeNote: "live signed returns",
    market: ctx.tape,
  });
}

function cmdMeasure(ctx: TermCtx): TermResult {
  const closes = dailyCloses(ctx);
  const n = closes.length;
  const period = n >= 20 ? 20 : Math.max(5, Math.min(10, n));
  const w = windowAnalytics(closes, n);
  const mid = sma(closes, period);
  const bb = bollinger(closes, period, 2);
  const last = closes[n - 1]!;
  const lastSma = [...mid].reverse().find((v) => v != null) ?? last;
  const lastUp = [...bb.upper].reverse().find((v) => v != null);
  const lastLo = [...bb.lower].reverse().find((v) => v != null);
  const lo = Math.min(...closes);
  const hi = Math.max(...closes);
  const fibs = fibLevels(lo, hi);
  const lines = [
    `window n=${n}  last ${moneyShare(last)}  SMA${period} ${moneyShare(lastSma)}`,
    lastUp != null && lastLo != null ? `Bollinger(${period},2)  ${moneyShare(lastLo)} – ${moneyShare(lastUp)}` : "Bollinger: not enough bars",
    `total ${fmtPct(w.total)}  CAGR ${pctPlain(w.cagr)}  vol ${pctPlain(w.vol)}  max DD ${fmtPct(w.maxDd)}  Sharpe ${w.sharpe.toFixed(2)}`,
    `range ${moneyShare(lo)} – ${moneyShare(hi)}`,
    `Fib  ${fibs.map((f) => `${(f.ratio * 100).toFixed(1)} ${moneyShare(f.price)}`).join("  ")}`,
  ];
  const spark = sparkline(closes, 48);
  if (spark) {
    lines.push("");
    lines.push(spark);
  }
  const smaVals = mid.map((v) => v ?? Number.NaN);
  return ok(lines, {
    kind: "measure",
    kicker: "Tape measurements",
    title: `SMA ${period} · Bollinger · Fib`,
    headline: moneyShare(last),
    hint: `vs SMA ${fmtPct(last / lastSma - 1)}`,
    note: `n=${n} · vol ${pctPlain(w.vol)}`,
    rows: [
      { label: `SMA ${period}`, value: moneyShare(lastSma) },
      { label: "Vol (ann.)", value: pctPlain(w.vol) },
      { label: "Max drawdown", value: fmtPct(w.maxDd), tone: "down" },
      { label: "Sharpe", value: w.sharpe.toFixed(2) },
    ],
    spark: [
      { name: "Close", values: closes, color: "fg" },
      { name: `SMA${period}`, values: smaVals.filter((v) => Number.isFinite(v)), color: "accent" },
    ],
    lattice: latticeFrom(signedRets(closes)),
    latticeNote: "window signed returns",
    market: ctx.tape,
  });
}

function cmdReverse(ctx: TermCtx): TermResult {
  const dcf = runDcf(ctx.input, ctx.tape, booksOf(ctx));
  const b = booksOf(ctx);
  const iw = impliedWacc(ctx.input, ctx.tape, b);
  const it = impliedTgr(ctx.input, ctx.tape, b);
  const ig = impliedGrowth(ctx.input, ctx.tape, b);
  const lines = [
    `tape ${moneyShare(ctx.tape)}  model ${moneyShare(dcf.price)}  gap ${fmtPct(ctx.tape / dcf.price - 1)}`,
    `implied WACC ${pctPlain(iw)}  (slider ${pctPlain(ctx.input.wacc)}, Δ ${(10000 * (iw - ctx.input.wacc)).toFixed(0)} bp)`,
    it
      ? `implied TGR ${pctPlain(it)}  (slider ${pctPlain(ctx.input.tgr)})`
      : `implied TGR  unreachable — TGR would exceed WACC ${pctPlain(ctx.input.wacc)}`,
    `flat growth to match tape  ${pctPlain(ig)}`,
  ];
  return ok(lines, {
    kind: "dcf",
    kicker: "Reverse DCF",
    title: "What the tape is assuming",
    headline: pctPlain(iw),
    hint: "implied WACC",
    note: it ? `implied TGR ${pctPlain(it)}` : "TGR unreachable",
    rows: [
      { label: "Tape", value: moneyShare(ctx.tape) },
      { label: "Model", value: moneyShare(dcf.price) },
      { label: "Implied g", value: pctPlain(ig) },
      { label: "Slider WACC", value: pctPlain(ctx.input.wacc) },
    ],
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns",
    market: ctx.tape,
  });
}

function cmdCapm(ctx: TermCtx, apply: boolean): TermResult {
  const c = liveCapm(ctx.market, ctx.input.taxRate, ctx.tape, booksOf(ctx));
  const lines = [
    `rf ${pctPlain(c.rf)}  beta ${c.beta.toFixed(2)}  ERP 5.0%  credit spread 60 bp`,
    `ke ${pctPlain(c.ke)}  kd ${pctPlain(c.kd)}  CAPM WACC ${pctPlain(c.wacc)}`,
    `slider WACC ${pctPlain(ctx.input.wacc)}  gap ${(10000 * (c.wacc - ctx.input.wacc)).toFixed(0)} bp`,
    apply ? `applied CAPM WACC ${pctPlain(c.wacc)} to the model` : "run apply-capm to write this into the sliders",
  ];
  const result = ok(lines, {
    kind: "dcf",
    kicker: "Live CAPM",
    title: "Cost of capital from the tape",
    headline: pctPlain(c.wacc),
    hint: "WACC",
    note: `ke ${pctPlain(c.ke)} · rf ${pctPlain(c.rf)} · β ${c.beta.toFixed(2)}`,
    rows: [
      { label: "ke", value: pctPlain(c.ke) },
      { label: "kd", value: pctPlain(c.kd) },
      { label: "Slider", value: pctPlain(ctx.input.wacc) },
      { label: "Gap", value: `${(10000 * (c.wacc - ctx.input.wacc)).toFixed(0)} bp` },
    ],
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns",
    market: ctx.tape,
  });
  if (apply) result.patch = { wacc: clamp(c.wacc, 0.06, 0.14) };
  return result;
}

function cmdSet(ctx: TermCtx, parsed: Parsed): TermResult {
  const p = pairs(parsed);
  const patch: ModelPatch = {};
  const notes: string[] = [];
  const growth = [...ctx.input.growth];
  let grew = false;
  const assignRate = (key: string, lo: number, hi: number, write: (v: number) => void) => {
    if (p[key] == null) return;
    const v = clamp(asRate(p[key], NaN), lo, hi);
    if (!Number.isFinite(v)) return;
    write(v);
    notes.push(`${key} ${pctPlain(v)}`);
  };
  assignRate("wacc", 0.06, 0.14, (v) => (patch.wacc = v));
  assignRate("tgr", 0.01, 0.06, (v) => (patch.tgr = v));
  assignRate("gm", 0.4, 0.55, (v) => (patch.grossMargin = v));
  assignRate("margin", 0.4, 0.55, (v) => (patch.grossMargin = v));
  assignRate("gross", 0.4, 0.55, (v) => (patch.grossMargin = v));
  assignRate("tax", 0.1, 0.25, (v) => (patch.taxRate = v));
  for (let i = 0; i < 5; i++) {
    const key = `g${i + 1}`;
    const alt = `g${i}`;
    const raw = p[key] ?? p[alt];
    if (raw == null) continue;
    growth[i] = clamp(asRate(raw, growth[i]!), 0, 0.15);
    grew = true;
    notes.push(`${key} ${pctPlain(growth[i]!)}`);
  }
  if (p.growth != null) {
    const g = clamp(asRate(p.growth, NaN), 0, 0.15);
    if (Number.isFinite(g)) {
      for (let i = 0; i < 5; i++) growth[i] = g;
      grew = true;
      notes.push(`growth ${pctPlain(g)} × 5`);
    }
  }
  if (grew) patch.growth = growth;
  const n = asNumber(p.n ?? p.nsims ?? p.sims);
  if (n != null) {
    const allowed = [5_000, 10_000, 25_000, 50_000];
    const nearest = allowed.reduce((b, x) => (Math.abs(x - n) < Math.abs(b - n) ? x : b), allowed[0]!);
    patch.nSims = nearest;
    notes.push(`nSims ${nearest.toLocaleString()}`);
  }
  if (!notes.length) {
    return fail("set  wacc=9 tgr=3 gm=47.5 tax=16 g1=8  (percents or decimals)");
  }
  const next: ModelInputs = {
    growth: patch.growth ?? ctx.input.growth,
    grossMargin: patch.grossMargin ?? ctx.input.grossMargin,
    wacc: patch.wacc ?? ctx.input.wacc,
    tgr: patch.tgr ?? ctx.input.tgr,
    taxRate: patch.taxRate ?? ctx.input.taxRate,
  };
  if (next.tgr >= next.wacc) {
    next.tgr = next.wacc - 0.005;
    patch.tgr = next.tgr;
    notes.push(`tgr clamped to ${pctPlain(next.tgr)} (must sit under WACC)`);
  }
  const dcf = runDcf(next, ctx.tape, booksOf(ctx));
  notes.push(`repriced DCF ${moneyShare(dcf.price)} (${fmtPct(dcf.price / ctx.tape - 1)} vs tape)`);
  return { lines: linesOf(notes), viz: vizDcf({ ...ctx, input: next }).viz, patch };
}

function cmdScenario(ctx: TermCtx, parsed: Parsed): TermResult {
  const name = (parsed.args[0] ?? parsed.kv.name ?? "").toLowerCase();
  if (name !== "management" && name !== "street" && name !== "mgmt" && name !== "mgt") {
    return fail("scenario management | street");
  }
  const scenario = name.startsWith("st") ? "street" : "management";
  const src = scenario === "management" ? nameOfCtx(ctx).defaults : streetOf(ctx.ticker ?? "AAPL");
  const input: ModelInputs = {
    growth: [...src.growth],
    grossMargin: src.grossMargin,
    wacc: src.wacc,
    tgr: src.tgr,
    taxRate: src.taxRate,
  };
  const { lines, viz } = vizDcf({ ...ctx, input });
  return {
    lines: [sys(`Loaded ${scenario} case.`), ...linesOf(lines)],
    viz,
    patch: { ...input, scenario },
  };
}

function cmdHist(ctx: TermCtx): TermResult {
  const name = nameOfCtx(ctx);
  const last = name.years.length - 1;
  const hero = heroLabel(name);
  const heroVals = name.years.map((_, i) => name.revenue[i]! * (name.mix[i]?.shares[name.heroMixId] ?? 0));
  const moves = name.price.map((p, i) => {
    if (i === 0) return 0;
    return p / name.price[i - 1]! - 1;
  }).slice(1);
  const lines = [
    `${name.symbol}  FY    Rev$B   NI$B    GM%    EPS    Price`,
    ...name.years.map((y, i) =>
      `${y}  ${name.revenue[i]!.toFixed(1).padStart(6)}  ${name.netIncome[i]!.toFixed(1).padStart(5)}  ${name.grossMargin[i]!.toFixed(1).padStart(5)}  ${name.eps[i]!.toFixed(2).padStart(5)}  ${name.price[i]!.toFixed(1).padStart(6)}`,
    ),
    "",
    `annual price moves  ${name.years.slice(1).map((y, i) => `${y} ${fmtPct(moves[i]!)}`).join("  ")}`,
  ];
  return ok(lines, {
    kind: "hist",
    kicker: "10-K prints",
    title: `${name.symbol} FY2018–FY2025`,
    headline: moneyShare(name.price[last]!),
    hint: "FY2025 print",
    note: "not the live tape",
    rows: [
      { label: "Revenue", value: `$${name.revenue[last]!.toFixed(1)}B` },
      { label: "EPS", value: `$${name.eps[last]!.toFixed(2)}` },
      { label: "GM", value: `${name.grossMargin[last]!.toFixed(1)}%` },
      { label: hero, value: `$${heroVals[last]!.toFixed(1)}B` },
    ],
    spark: [{ name: "Price", values: [...name.price], color: "fg" }],
    labels: name.years.map(String),
    lattice: latticeFrom(moves),
    latticeNote: "annual price signs",
  });
}

function cmdNews(ctx: TermCtx): TermResult {
  const news = ctx.market?.news ?? [];
  if (!news.length) return fail("No headlines on the tape yet. Try refresh.");
  const lines = news.slice(0, 10).map((n, i) => `${String(i + 1).padStart(2, "0")}  ${n.title}  — ${n.source}`);
  return ok(lines, {
    kind: "news",
    kicker: "Google News",
    title: "What the tape is reading",
    headline: String(news.length),
    hint: "headlines",
    rows: news.slice(0, 4).map((n) => ({ label: n.source, detail: n.title })),
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns",
    market: ctx.tape,
  });
}

function cmdStatus(ctx: TermCtx): TermResult {
  const dcf = runDcf(ctx.input, ctx.tape, booksOf(ctx));
  const lines = [
    `Data Desk · ${ctx.ticker} · no sign-in · scripts on this device`,
    `tape ${moneyShare(ctx.tape)}  DCF ${moneyShare(dcf.price)}  ${fmtPct(dcf.price / ctx.tape - 1)}`,
    `scenario ${ctx.scenario}  nSims ${ctx.nSims.toLocaleString()}`,
    `WACC ${pctPlain(ctx.input.wacc)}  TGR ${pctPlain(ctx.input.tgr)}  GM ${pctPlain(ctx.input.grossMargin)}`,
    `cal S0 ${moneyShare(ctx.cal.s0)}  μ ${pctPlain(ctx.cal.mu)}  σ ${pctPlain(ctx.cal.sigma)}  ${ctx.cal.source}`,
    `feed ${ctx.market?.source ?? "snapshot"}  stale ${ctx.market?.stale ?? true}`,
  ];
  return { lines: linesOf(lines), viz: vizQuote(ctx).viz };
}

function cmdHelp(parsed: Parsed): TermResult {
  const topic = parsed.args[0];
  const special = topic ? syntaxPage(topic) : null;
  const known = topic ? ["shell", "awk", "table", "pipes", "keys", "syntax", "man", "posix", "sh"].includes(topic.toLowerCase()) : false;
  const lines = known && special ? special : helpText(topic);
  return ok(lines, {
    kind: "help",
    kicker: known ? "Language" : "Command catalog",
    title: topic ? `help ${topic}` : "Type a command",
    headline: topic ? (known ? topic : (findCommand(topic)?.name ?? "?")) : String(CATALOG.length),
    hint: topic ? "command" : "verbs",
    note: "syntax · help awk · help table · F1",
    rows: CATALOG.slice(0, 6).map((c) => ({ label: c.name, detail: c.blurb })),
    lattice: [],
    latticeNote: "",
  });
}

function cmdSyntax(parsed: Parsed): TermResult {
  const topic = parsed.args[0] ?? parsed.kv.topic ?? "shell";
  const lines = syntaxPage(topic);
  return ok(lines, {
    kind: "help",
    kicker: "Shell grammar",
    title: `syntax ${topic}`,
    headline: topic,
    hint: "posix + awk",
    note: "Always quote awk '{…}' so $1 is a field, not a variable.",
    rows: [
      { label: "Pipes", detail: "cmd | awk '{print $1}'" },
      { label: "Vars", detail: "$TAPE $WACC $TGR" },
      { label: "Tables", detail: "table hist | awk 'NR>1'" },
      { label: "Test", detail: "[ $WACC -gt 9 ]" },
    ],
    lattice: [],
  });
}

function cmdTable(ctx: TermCtx, parsed: Parsed): TermResult {
  const name = parsed.args[0] ?? "";
  if (!name) {
    const names = listTables();
    return ok(
      ["table <name> — header + raw numbers for awk", "", ...names.map((n) => `  ${n}`), "", "example: table hist | awk 'NR>1 {s+=$2} END {print s}'"],
      {
        kind: "help",
        kicker: "Datasets",
        title: "Machine-readable tables",
        headline: String(names.length),
        hint: "tables",
        rows: names.map((n) => ({ label: n })),
        lattice: [],
      },
    );
  }
  const spec = getTable(name, ctx);
  if (!spec) return fail(`Unknown table '${name}'. Try: table hist|mix|pnl|cash|tape|peers|fcf|intraday`);
  const lines = renderTable(spec);
  const numeric = spec.rows.map((r) => Number(r[1])).filter((v) => Number.isFinite(v));
  return ok(lines, {
    kind: "hist",
    kicker: `table ${spec.name}`,
    title: spec.note,
    headline: spec.name,
    hint: `${spec.rows.length} rows`,
    note: spec.header.join(" · "),
    rows: spec.header.slice(0, 4).map((h, i) => ({ label: h, value: String(spec.rows.at(-1)?.[i] ?? "") })),
    spark: numeric.length > 1 ? [{ name: spec.header[1] ?? "c1", values: numeric, color: "accent" }] : undefined,
    labels: spec.rows.map((r) => String(r[0])),
    lattice: [],
  });
}

function cmdPeers(ctx: TermCtx): TermResult {
  const peers = ctx.market?.peers ?? [];
  if (!peers.length) return fail("No peer tape yet. Try refresh.");
  const a = ctx.market?.aapl;
  const rows = peers.slice(0, 8);
  const lines = [
    a ? `${a.symbol}  ${moneyShare(a.price)}  ${fmtPct(a.changePct)}  P/E ${a.pe?.toFixed(1) ?? "—"}` : "",
    "sym          last      chg      P/E",
    ...rows.map((p) => {
      const pe = p.pe != null ? p.pe.toFixed(1).padStart(6) : "     —";
      return `${p.symbol.padEnd(8)}  ${moneyShare(p.price).padStart(10)}  ${fmtPct(p.changePct).padStart(7)}  ${pe}`;
    }),
  ].filter(Boolean);
  return ok(lines, {
    kind: "peers",
    kicker: "Mega-cap tape",
    title: `Peers vs ${a?.symbol ?? ctx.ticker}`,
    headline: a ? moneyShare(a.price) : "—",
    hint: a ? fmtPct(a.changePct) : undefined,
    note: `${peers.length} names`,
    rows: rows.slice(0, 4).map((p) => ({
      label: p.symbol,
      value: moneyShare(p.price),
      detail: fmtPct(p.changePct),
      tone: p.changePct >= 0 ? "up" : "down",
    })),
    spark: a && ctx.market ? [{ name: a.symbol, values: dailyCloses(ctx), color: "fg" }] : undefined,
    lattice: tapeLattice(ctx),
    latticeNote: "focused signed returns",
    market: ctx.tape,
  });
}

function cmdIntraday(ctx: TermCtx): TermResult {
  const bars = ctx.market?.intraday ?? [];
  if (bars.length < 2) return fail("No session bars on the tape. Try refresh while the cash session is open.");
  const closes = bars.map((b) => b.close);
  const first = closes[0]!;
  const last = closes[closes.length - 1]!;
  const chg = last / first - 1;
  const hi = Math.max(...closes);
  const lo = Math.min(...closes);
  const lines = [
    `session  n=${bars.length}  last ${moneyShare(last)}  ${fmtPct(chg)} from open print`,
    `range ${moneyShare(lo)} – ${moneyShare(hi)}`,
    "",
    sparkline(closes, 48),
    ...asciiArea(closes, 48, 4),
  ];
  return ok(lines, {
    kind: "intraday",
    kicker: "Session tape",
    title: "Intraday",
    headline: moneyShare(last),
    hint: fmtPct(chg),
    note: `${bars.length} bars`,
    rows: [
      { label: "Open print", value: moneyShare(first) },
      { label: "High", value: moneyShare(hi), tone: "up" },
      { label: "Low", value: moneyShare(lo), tone: "down" },
      { label: "Bars", value: String(bars.length) },
    ],
    spark: [{ name: "Intraday", values: closes, color: "accent" }],
    labels: bars.map((b) => b.label),
    lattice: latticeFrom(signedRets(closes)),
    latticeNote: "bar-to-bar signs",
    market: last,
  });
}

function cmdBrief(ctx: TermCtx): TermResult {
  if (!ctx.market) return fail("No live tape yet. Try refresh.");
  const a = analyzeTape(ctx.market, ctx.input, booksOf(ctx));
  const lines = [
    `valuation  ${a.valuation}   VIX ${a.vixRegime}   CAPM WACC ${pctPlain(a.capmWacc)}`,
    `implied WACC ${pctPlain(a.impliedWacc)}${a.impliedTgr ? `   implied TGR ${pctPlain(a.impliedTgr)}` : ""}`,
    "",
    ...a.findings.map((f) => `[${f.kicker}]  ${f.text}`),
  ];
  return ok(lines, {
    kind: "brief",
    kicker: "Data journalism",
    title: "What the tape is saying",
    headline: a.valuation,
    hint: `VIX ${a.vixRegime}`,
    note: `CAPM ${pctPlain(a.capmWacc)}`,
    rows: a.findings.slice(0, 4).map((f) => ({
      label: f.kicker,
      detail: f.text,
      tone: f.tone,
    })),
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns under the story",
    market: ctx.tape,
  });
}

function cmdCompare(ctx: TermCtx): TermResult {
  const b = booksOf(ctx);
  const mgmt = runDcf({ ...nameOfCtx(ctx).defaults, growth: [...nameOfCtx(ctx).defaults.growth] }, ctx.tape, b);
  const st = streetDcf(ctx.tape, b, streetOf(ctx.ticker ?? "AAPL"));
  const live = runDcf(ctx.input, ctx.tape, b);
  const lines = [
    `tape       ${moneyShare(ctx.tape)}`,
    `live model ${moneyShare(live.price)}  ${fmtPct(live.price / ctx.tape - 1)}`,
    `management ${moneyShare(mgmt.price)}  ${fmtPct(mgmt.price / ctx.tape - 1)}`,
    `street     ${moneyShare(st.price)}  ${fmtPct(st.price / ctx.tape - 1)}`,
    `mgmt − street  ${moneyShare(mgmt.price - st.price)}`,
  ];
  return ok(lines, {
    kind: "compare",
    kicker: "Two cases, one tape",
    title: "Management vs street",
    headline: moneyShare(live.price),
    hint: fmtPct(live.price / ctx.tape - 1) + " live",
    note: `tape ${moneyShare(ctx.tape)}`,
    rows: [
      { label: "Management", value: moneyShare(mgmt.price), detail: fmtPct(mgmt.price / ctx.tape - 1) },
      { label: "Street", value: moneyShare(st.price), detail: fmtPct(st.price / ctx.tape - 1) },
      { label: "Spread", value: moneyShare(mgmt.price - st.price) },
      { label: "Tape", value: moneyShare(ctx.tape) },
    ],
    spark: [
      { name: "Mgmt FCF", values: mgmt.fcf.map((f) => f / 1000), color: "up" },
      { name: "Street FCF", values: st.fcf.map((f) => f / 1000), color: "down" },
    ],
    labels: [...FORECAST_LABELS],
    lattice: tapeLattice(ctx),
    latticeNote: "tape returns",
    market: ctx.tape,
  });
}

function cmdWhatif(ctx: TermCtx, parsed: Parsed): TermResult {
  const setRes = cmdSet(ctx, parsed);
  if (setRes.lines.some((l) => l.kind === "err") && !setRes.patch) return setRes;
  return setRes;
}

function cmdWatch(parsed: Parsed): TermResult {
  const cmd = parsed.args[0] ?? parsed.kv.cmd ?? "quote";
  const sec = Math.max(4, Math.min(120, asNumber(parsed.args[1] ?? parsed.kv.sec ?? parsed.kv.s) ?? 12));
  if (cmd === "off" || cmd === "stop") {
    return { lines: [sys("Watcher stopped.")], viz: null, script: { type: "unwatch" } };
  }
  return {
    lines: [sys(`Watching '${cmd}' every ${sec}s. unwatch to stop.`)],
    viz: null,
    script: { type: "watch", cmd, seconds: sec },
  };
}

function cmdTheme(parsed: Parsed): TermResult {
  const name = (parsed.args[0] ?? "apple").toLowerCase();
  if (name !== "apple" && name !== "phosphor" && name !== "amber") {
    return fail("theme apple | phosphor | amber");
  }
  return {
    lines: [sys(`Theme '${name}'.`)],
    viz: null,
    script: { type: "theme", name: name as TermTheme },
  };
}

function cmdKeys(): TermResult {
  const lines = [
    "↑ / ↓          history",
    "Tab            complete",
    "⌘K / Ctrl+K    command palette",
    "Ctrl+R         reverse-i-search",
    "Ctrl+L         clear",
    "Ctrl+C         stop watcher / clear prompt",
    "F1             help",
    "Alt+1…4        switch tabs",
    "Esc            close editor / palette",
    "cmd | grep X   pipe",
    "a && b          and",
    "a || b          or",
    "for x in …; do …; done",
    "if [ $WACC -gt 9 ]; then …; fi",
    "case $TAPE in * ) … ;; esac",
    "$(dcf)          command substitution",
    "name() { … }    function",
  ];
  return ok(lines, {
    kind: "help",
    kicker: "Keyboard",
    title: "Desk shortcuts",
    headline: "⌘K",
    hint: "palette",
    rows: [
      { label: "Palette", value: "⌘K" },
      { label: "Help", value: "F1" },
      { label: "Clear", value: "Ctrl+L" },
      { label: "Search", value: "Ctrl+R" },
    ],
    lattice: [],
  });
}

function cmdMix(ctx: TermCtx): TermResult {
  const name = nameOfCtx(ctx);
  const ids = name.mixKeys.map((k) => k.id);
  const last = name.mix[name.mix.length - 1]!;
  const hero = name.heroMixId;
  const lines = [
    ["year", ...name.mixKeys.map((k) => k.label.padEnd(8))].join("  "),
    ...name.mix.map((r) => `${r.year}  ${ids.map((id) => pctPlain(r.shares[id] ?? 0).padStart(6)).join(" ")}`),
  ];
  return ok(lines, {
    kind: "hist",
    kicker: "Revenue mix",
    title: `${name.symbol} mix through FY2025`,
    headline: pctPlain(last.shares[hero] ?? 0),
    hint: `FY2025 ${heroLabel(name)}`,
    rows: name.mixKeys.map((k) => ({ label: k.label, value: pctPlain(last.shares[k.id] ?? 0) })),
    spark: [{ name: `${heroLabel(name)} $B`, values: name.mix.map((r, i) => name.revenue[i]! * (r.shares[hero] ?? 0)), color: "accent" }],
    labels: name.years.map(String),
    lattice: [],
    market: name.revenue[name.revenue.length - 1],
  });
}

function cmdFunnel(ctx: TermCtx): TermResult {
  const rows = pnlRows(ctx.ticker ?? "AAPL");
  const p = rows[rows.length - 1]!;
  const f = sequentialFunnel(p as Parameters<typeof sequentialFunnel>[0]);
  const lines = f.map((s) => `${s.label.padEnd(16)} ${s.value.toFixed(1).padStart(7)}B  ${pctPlain(s.shareOfRev)}  conv ${pctPlain(s.conv)}`);
  return ok(["FY" + p.year, ...lines, "", ...asciiArea(f.map((s) => s.value), 46, 4)], {
    kind: "dcf",
    kicker: "P&L funnel",
    title: "What remains of $1 of revenue",
    headline: pctPlain(f[f.length - 1]!.shareOfRev),
    hint: "net margin",
    rows: f.map((s) => ({ label: s.label, value: `$${s.value.toFixed(1)}B`, detail: pctPlain(s.shareOfRev) })),
    spark: [{ name: "Funnel", values: f.map((s) => s.value), color: "accent" }],
    lattice: [],
  });
}

function cmdCash(ctx: TermCtx): TermResult {
  const name = nameOfCtx(ctx);
  const i = name.years.length - 1;
  const lines = name.years.map(
    (y, k) =>
      `${y}  cash ${name.cash[k]!.toFixed(0).padStart(6)}  FCF ${name.fcf[k]!.toFixed(0).padStart(5)}  buybacks ${name.buybacks[k]!.toFixed(0).padStart(5)}`,
  );
  return ok(lines, {
    kind: "hist",
    kicker: "Cash vs returned capital",
    title: `${name.symbol} cash and FCF`,
    headline: `$${name.fcf[i]!.toFixed(0)}B`,
    hint: "FY FCF",
    rows: [
      { label: "Cash", value: `$${name.cash[i]!.toFixed(0)}B` },
      { label: "Buybacks", value: `$${name.buybacks[i]!.toFixed(0)}B` },
      { label: "Capex", value: `$${name.capex[i]!.toFixed(1)}B` },
    ],
    spark: [
      { name: "Cash", values: [...name.cash], color: "accent" },
      { name: "Buybacks", values: [...name.buybacks], color: "muted" },
    ],
    labels: name.years.map(String),
    lattice: [],
  });
}

function cmdUse(parsed: Parsed): TermResult {
  const raw = parsed.args[0] ?? parsed.kv.ticker ?? parsed.kv.name ?? "";
  if (!raw) return fail("use AAPL|MSFT|GOOGL|AMZN|NVDA  (moon → AMZN)");
  const ticker = parseTicker(raw);
  const known = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "MOON", "AMAZON", "GOOGLE", "ALPHABET", "MICROSOFT", "NVIDIA", "APPLE", "GOOG", "NVIDEA"];
  if (!known.includes(raw.toUpperCase()) && ticker === "AAPL" && raw.toUpperCase() !== "AAPL") {
    return fail(`Unknown name '${raw}'. Try AAPL MSFT GOOGL AMZN NVDA.`);
  }
  const name = UNIVERSE[ticker];
  return ok([`Focus ${ticker} · ${name.name}. Tape, 10-K, mix, and DCF rebase.`], {
    kind: "quote",
    kicker: "Universe",
    title: `${ticker} is the focused name`,
    headline: ticker,
    hint: name.name,
    rows: [
      { label: "Revenue FY25", value: `$${name.revenue[name.revenue.length - 1]!.toFixed(0)}B` },
      { label: heroLabel(name), value: pctPlain(name.mix[name.mix.length - 1]!.shares[name.heroMixId] ?? 0) },
    ],
    lattice: [],
  }, { ticker });
}

function cmdExpo(ctx: TermCtx): TermResult {
  const name = nameOfCtx(ctx);
  if (name.symbol !== "AAPL") {
    const hero = heroLabel(name);
    const shares = name.mix.map((m) => (m.shares[name.heroMixId] ?? 0) * 100);
    const last = shares[shares.length - 1]!;
    const first = shares[0]!;
    const lines = name.years.map(
      (y, i) => `${y}  ${hero.padEnd(16)} ${shares[i]!.toFixed(1)}%  rev $${name.revenue[i]!.toFixed(0)}B`,
    );
    return ok(lines, {
      kind: "forecast",
      kicker: `${name.symbol} mix`,
      title: `${hero} share of revenue`,
      headline: `${last.toFixed(1)}%`,
      hint: `FY${name.years[0]} ${first.toFixed(1)}% → FY${name.years[name.years.length - 1]}`,
      rows: name.mixKeys.map((k) => ({
        label: k.label,
        value: pctPlain(name.mix[name.mix.length - 1]!.shares[k.id] ?? 0),
      })),
      spark: [
        { name: `${hero} %`, values: shares, color: "fg" },
        { name: "Revenue $B", values: [...name.revenue], color: "accent" },
      ],
      labels: name.years.map(String),
      lattice: [],
    });
  }
  const last = S_CURVE.subs[S_CURVE.subs.length - 1]!;
  const lines = S_CURVE.labels.map((l, i) => {
    const est = S_CURVE.years[i]! > S_CURVE.disclosedThrough ? "  est" : "";
    return `${l.padEnd(8)} ${S_CURVE.subs[i]!.toFixed(2)}B${est}`;
  });
  return ok(lines, {
    kind: "forecast",
    kicker: "Paid subscriptions",
    title: "The flywheel does not do linear",
    headline: `${last.toFixed(2)}B`,
    hint: "FY28E paid subs",
    rows: S_CURVE.eras.map((e) => ({
      label: e.title,
      detail: e.note,
      value: `${S_CURVE.subs[e.i]!.toFixed(2)}B`,
    })),
    spark: [
      { name: "Subs B", values: [...S_CURVE.subs], color: "fg" },
      { name: "Devices B", values: [...INSTALLED_BASE.devices], color: "accent" },
    ],
    labels: [...S_CURVE.labels],
    lattice: [],
  });
}

function cmdExport(parsed: Parsed, ctx: TermCtx): TermResult {
  const p = pairs(parsed);
  const notes: string[] = [];
  const patch: ModelPatch = {};
  if (p.wacc) {
    patch.wacc = clamp(asRate(p.wacc, ctx.input.wacc), 0.06, 0.14);
    notes.push(`export WACC=${pctPlain(patch.wacc)}`);
  }
  if (p.tgr) {
    patch.tgr = clamp(asRate(p.tgr, ctx.input.tgr), 0.01, 0.06);
    notes.push(`export TGR=${pctPlain(patch.tgr)}`);
  }
  if (!notes.length) {
    const env = ctx.env ?? {};
    const keys = Object.keys(env);
    return ok(keys.length ? keys.map((k) => `${k}=${env[k]}`) : ["TAPE WACC TGR (set with export wacc=9)"]);
  }
  return { lines: linesOf(notes), viz: null, patch };
}

export function runOne(parsed: Parsed, ctx: TermCtx): TermResult {
  switch (parsed.cmd) {
    case "help":
      return cmdHelp(parsed);
    case "syntax":
    case "man":
      return cmdSyntax(parsed);
    case "table":
    case "tbl":
      return cmdTable(ctx, parsed);
    case "clear":
      return { lines: [], viz: null, clear: true };
    case "echo":
      return ok([parsed.raw.replace(/^echo\s+/i, "")]);
    case "quote": {
      const r = vizQuote(ctx);
      return ok(r.lines, r.viz);
    }
    case "dcf": {
      const r = vizDcf(ctx);
      return ok(r.lines, r.viz);
    }
    case "peers":
      return cmdPeers(ctx);
    case "intraday":
      return cmdIntraday(ctx);
    case "brief":
      return cmdBrief(ctx);
    case "compare":
      return cmdCompare(ctx);
    case "whatif":
      return cmdWhatif(ctx, parsed);
    case "watch":
      return cmdWatch(parsed);
    case "unwatch":
      return { lines: [sys("Watcher stopped.")], viz: null, script: { type: "unwatch" } };
    case "theme":
      return cmdTheme(parsed);
    case "keys":
      return cmdKeys();
    case "mix":
      return cmdMix(ctx);
    case "funnel":
      return cmdFunnel(ctx);
    case "cash":
      return cmdCash(ctx);
    case "expo":
      return cmdExpo(ctx);
    case "export":
    case "let":
    case "env":
      return cmdExport(parsed, ctx);
    case "test":
    case "[": {
      const bits = parsed.cmd === "[" ? parsed.args.filter((a) => a !== "]") : parsed.args;
      const pass = evalTest(bits.join(" "), ctx.env ?? {});
      return pass ? ok(["true"]) : fail("false");
    }
    case "true":
      return ok(["true"]);
    case "false":
      return fail("false");
    case "source":
      if (!parsed.args[0]) return fail("source <script>");
      return { lines: [sys(`run ${parsed.args[0]}`)], viz: null, script: { type: "run", name: parsed.args[0] } };
    case "reset":
      return cmdScenario(ctx, { ...parsed, args: ["management"], kv: {}, cmd: "scenario", raw: "reset" });
    case "mc":
      return cmdMc(ctx, parsed);
    case "paths":
      return cmdPaths(ctx, parsed, false);
    case "jump":
      return cmdPaths(ctx, parsed, true);
    case "sens":
      return cmdSens(ctx);
    case "forecast":
      return cmdForecast(ctx);
    case "risk":
      return cmdRisk(ctx);
    case "cal":
      return cmdCal(ctx);
    case "measure":
      return cmdMeasure(ctx);
    case "reverse":
      return cmdReverse(ctx);
    case "capm":
      return cmdCapm(ctx, false);
    case "applycapm":
      return cmdCapm(ctx, true);
    case "set":
      return cmdSet(ctx, parsed);
    case "scenario":
      return cmdScenario(ctx, parsed);
    case "hist":
      return cmdHist(ctx);
    case "news":
      return cmdNews(ctx);
    case "status":
      return cmdStatus(ctx);
    case "refresh":
      return { lines: [sys("Pulling the open feed…")], viz: null, script: { type: "run", name: "__refresh__" } };
    case "use":
    case "focus":
    case "ticker":
      return cmdUse(parsed);
    case "ls": {
      const all = listScripts();
      const lines = all.length
        ? all.map((s) => `${s.builtin ? "b" : "u"}  ${s.name.padEnd(16)}  ${s.body.split("\n").filter(Boolean).length} lines`)
        : ["No scripts."];
      return {
        lines: linesOf(["name                 src", ...lines]),
        viz: {
          kind: "script",
          kicker: "Scripts",
          title: "Saved on this device",
          headline: String(all.length),
          hint: "scripts",
          rows: all.map((s) => ({ label: s.name, detail: s.builtin ? "builtin" : "user", value: `${s.body.split("\n").filter(Boolean).length}` })),
          lattice: [],
        },
        script: { type: "ls" },
      };
    }
    case "cat": {
      const name = parsed.args[0];
      if (!name) return fail("cat <name>");
      const s = getScript(name);
      if (!s) return fail(`No script '${name}'. Try ls.`);
      return ok([`# ${s.name}${s.builtin ? " (builtin)" : ""}`, ...s.body.split("\n")], {
        kind: "script",
        kicker: "Script",
        title: s.name,
        headline: s.name,
        hint: s.builtin ? "builtin" : "user",
        rows: s.body.split("\n").filter(Boolean).map((l) => ({ label: l })),
        lattice: [],
      });
    }
    case "rm": {
      const name = parsed.args[0];
      if (!name) return fail("rm <name>");
      const res = removeScript(name);
      return { lines: [res.ok ? sys(res.message) : err(res.message)], viz: null, script: { type: "rm", name } };
    }
    case "new": {
      const name = parsed.args[0];
      if (!name) return fail("new <name>");
      return { lines: [sys(`New script '${name}'. Type commands in the editor, then save.`)], viz: null, script: { type: "new", name } };
    }
    case "edit": {
      const name = parsed.args[0];
      if (!name) return fail("edit <name>");
      const s = getScript(name);
      if (!s) return fail(`No script '${name}'.`);
      return { lines: [sys(`Editing '${s.name}'.`)], viz: null, script: { type: "edit", name: s.name } };
    }
    case "save": {
      const name = parsed.args[0];
      const rest = parsed.args.slice(1).join(" ");
      if (rest) {
        const saved = saveScript(name || "untitled", rest.replace(/\\n/g, "\n"));
        return { lines: [sys(`Saved '${saved.name}'.`)], viz: null, script: { type: "save", name: saved.name, body: saved.body } };
      }
      return { lines: [sys(name ? `Saving as '${name}'.` : "Saving editor buffer.")], viz: null, script: { type: "save", name } };
    }
    case "run": {
      const name = parsed.args[0];
      if (!name) return fail("run <name>");
      return { lines: [sys(`run ${name}`)], viz: null, script: { type: "run", name } };
    }
    default:
      if (FILTERS.has(parsed.cmd)) {
        return fail(`Filters need a pipe. Try: hist | ${parsed.cmd} …`);
      }
      return fail(`Unknown command '${parsed.cmd}'. Type help.`);
  }
}

export function applyPatchToInput(input: ModelInputs, patch: ModelPatch): ModelInputs {
  return {
    growth: patch.growth ? [...patch.growth] : [...input.growth],
    grossMargin: patch.grossMargin ?? input.grossMargin,
    wacc: patch.wacc ?? input.wacc,
    tgr: patch.tgr ?? input.tgr,
    taxRate: patch.taxRate ?? input.taxRate,
  };
}

export function runStatement(raw: string, ctx: TermCtx): TermResult {
  const parsed = parseLine(raw);
  if (!parsed) return { lines: [], viz: null };
  return runOne(parsed, ctx);
}

function runPipeline(raw: string, ctx: TermCtx): TermResult {
  const parts = splitPipes(raw);
  if (parts.length <= 1) return runStatement(raw, ctx);
  let stdin: string[] = [];
  let viz: VizSpec | null = null;
  let patch: ModelPatch | undefined;
  let lines: TermLine[] = [];
  for (const part of parts) {
    const parsed = parseLine(part);
    if (!parsed) continue;
    if (FILTERS.has(parsed.cmd)) {
      try {
        const out = runFilter(parsed.cmd, parsed.args, stdin);
        stdin = out;
        lines = linesOf(out);
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
      continue;
    }
    const res = runOne(parsed, ctx);
    stdin = res.lines.filter((l) => l.kind === "out" || l.kind === "sys").map((l) => l.text);
    lines = res.lines;
    if (res.viz) viz = res.viz;
    if (res.patch) patch = { ...patch, ...res.patch };
    if (res.script || res.clear) return res;
  }
  return { lines, viz, patch };
}

function expandCommandSubs(src: string, ctx: TermCtx): string {
  return src.replace(/\$\(([^)]+)\)/g, (_, inner: string) => {
    const res = runPipeline(inner, ctx);
    const line = res.lines.find((l) => l.kind === "out" || l.kind === "sys");
    return line?.text ?? "";
  });
}

export function runText(raw: string, ctx: TermCtx): TermResult {
  const env: Record<string, string> = {
    TAPE: ctx.tape.toFixed(2),
    WACC: (ctx.input.wacc * 100).toFixed(1),
    TGR: (ctx.input.tgr * 100).toFixed(1),
    YEAR: String(new Date().getFullYear()),
    ...(ctx.env ?? {}),
  };
  const { body, fns } = preprocess(raw, env);
  const expanded = expandCommandSubs(body, { ...ctx, env });
  const stmts = splitStatements(expanded);
  let input = { ...ctx.input, growth: [...ctx.input.growth] };
  let viz: VizSpec | null = null;
  let patch: ModelPatch | undefined;
  let clear = false;
  const lines: TermLine[] = [];
  let lastScript = undefined as TermResult["script"];
  const live = { ...ctx, input, env };

  for (const stmt of stmts) {
    const token = stmt.trim().split(/\s+/)[0] ?? "";
    if (fns[token]) {
      const inner = runText(fns[token]!, live);
      lines.push(...inner.lines);
      if (inner.viz) viz = inner.viz;
      if (inner.patch) {
        patch = { ...patch, ...inner.patch };
        input = applyPatchToInput(input, inner.patch);
        live.input = input;
      }
      continue;
    }
    const chain = splitAndOr(stmt);
    let okSoFar = true;
    for (const piece of chain) {
      if (piece.op === "and" && !okSoFar) continue;
      if (piece.op === "or" && okSoFar) continue;
      const res = runPipeline(piece.text, { ...live, input });
      const failed = res.lines.some((l) => l.kind === "err");
      okSoFar = !failed;
      if (res.clear) {
        clear = true;
        lines.length = 0;
        continue;
      }
      lines.push(...res.lines);
      if (res.viz) viz = res.viz;
      if (res.patch) {
        patch = { ...patch, ...res.patch };
        input = applyPatchToInput(input, res.patch);
        live.input = input;
      }
      if (res.script) lastScript = res.script;
    }
  }
  return { lines, viz, patch, clear, script: lastScript };
}

export function runScriptBody(name: string, body: string, ctx: TermCtx): TermResult {
  const res = runText(body, ctx);
  return {
    ...res,
    lines: [sys(`— ${name} —`), ...res.lines],
  };
}
