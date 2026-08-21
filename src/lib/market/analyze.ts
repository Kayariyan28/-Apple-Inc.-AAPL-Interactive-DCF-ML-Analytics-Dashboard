import { CURRENT_PRICE } from "@/lib/dcf/constants";
import { runDcf, type DcfBooks, type ModelInputs } from "@/lib/dcf/engine";
import { UNIVERSE, snapshotName, streetOf, type Ticker } from "@/lib/desk/universe";
import { pct, pctPlain } from "@/lib/dcf/format";
import type { Finding, LiveMarket, TapeAnalysis } from "./types";

export const ERP = 0.05;
export const CREDIT_SPREAD = 0.006;

export function impliedWacc(input: ModelInputs, target: number, books?: DcfBooks): number {
  let lo = Math.max(input.tgr + 0.004, 0.04);
  let hi = 0.22;
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    const price = runDcf({ ...input, wacc: mid }, target, books).price;
    if (price > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function impliedTgr(input: ModelInputs, target: number, books?: DcfBooks): number | null {
  const ceiling = input.wacc - 0.002;
  if (ceiling <= 0.005) return null;
  if (runDcf({ ...input, tgr: ceiling }, target, books).price < target) return null;
  let lo = 0.005;
  let hi = ceiling;
  for (let i = 0; i < 42; i++) {
    const mid = (lo + hi) / 2;
    const price = runDcf({ ...input, tgr: mid }, target, books).price;
    if (price < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function impliedGrowth(input: ModelInputs, target: number, books?: DcfBooks): number {
  let lo = -0.05;
  let hi = 0.45;
  for (let i = 0; i < 42; i++) {
    const g = (lo + hi) / 2;
    const price = runDcf({ ...input, growth: [g, g, g, g, g] }, target, books).price;
    if (price < target) lo = g;
    else hi = g;
  }
  return (lo + hi) / 2;
}

export function capm(rf: number, beta: number, taxRate: number, equity: number, debt: number) {
  const ke = rf + beta * ERP;
  const kd = rf + CREDIT_SPREAD;
  const v = equity + debt;
  const wacc = v <= 0 ? ke : (equity / v) * ke + (debt / v) * kd * (1 - taxRate);
  return { ke, kd, wacc };
}

export function liveCapm(market: LiveMarket | null, taxRate: number, tape: number, books?: DcfBooks) {
  const ticker = (market?.ticker ?? "AAPL") as Ticker;
  const shares = books?.shares ?? UNIVERSE[ticker].shares[UNIVERSE[ticker].shares.length - 1]!;
  const debtMm = books?.debt ?? UNIVERSE[ticker].debt[UNIVERSE[ticker].debt.length - 1]! * 1_000;
  const rf = market?.rf ?? 0.045;
  const beta = market?.aapl.beta ?? 1.1;
  const equity = market?.aapl.mktCap ?? tape * shares * 1e6;
  return { ...capm(rf, beta, taxRate, equity, debtMm * 1e6), rf, beta };
}

function vixRegime(v: number): TapeAnalysis["vixRegime"] {
  if (v >= 30) return "stress";
  if (v >= 20) return "elevated";
  if (v >= 13) return "normal";
  return "quiet";
}

function valuation(premium: number): TapeAnalysis["valuation"] {
  if (premium >= 0.4) return "stretched";
  if (premium >= 0.1) return "rich";
  if (premium <= -0.1) return "cheap";
  return "fair";
}

export function analyzeTape(market: LiveMarket, input: ModelInputs, books?: DcfBooks): TapeAnalysis {
  const ticker = (market.ticker ?? "AAPL") as Ticker;
  const name = UNIVERSE[ticker].name;
  const tape = market.aapl.price || CURRENT_PRICE;
  const dcf = runDcf(input, tape, books);
  const premium = tape / dcf.price - 1;
  const rf = market.rf ?? 0.045;
  const beta = market.aapl.beta ?? 1.1;
  const shares = books?.shares ?? UNIVERSE[ticker].shares.at(-1)!;
  const debtMm = books?.debt ?? UNIVERSE[ticker].debt.at(-1)! * 1_000;
  const equity = market.aapl.mktCap ?? tape * shares * 1e6;
  const { ke, wacc: capmWacc } = capm(rf, beta, input.taxRate, equity, debtMm * 1e6);
  const iw = impliedWacc(input, tape, books);
  const it = impliedTgr(input, tape, books);
  const ig = impliedGrowth(input, tape, books);
  const hi = market.aapl.high52;
  const lo = market.aapl.low52;
  const rangePos = hi != null && lo != null && hi > lo ? (tape - lo) / (hi - lo) : null;
  const vsSpx =
    market.spx && Number.isFinite(market.spx.changePct) ? market.aapl.changePct - market.spx.changePct : null;
  const vix = market.vix?.price ?? 16;
  const liveSharesMm = market.aapl.sharesOut != null ? market.aapl.sharesOut / 1e6 : null;
  const shareUplift = liveSharesMm && liveSharesMm > 0 ? shares / liveSharesMm - 1 : null;

  const findings: Finding[] = [];

  findings.push({
    kicker: "Cash vs tape",
    tone: premium >= 0.08 ? "down" : premium <= -0.05 ? "up" : "muted",
    text:
      premium >= 0.08
        ? `The ${name} tape prints ${tape.toFixed(2)} against a DCF of ${dcf.price.toFixed(2)} — a ${pct(premium)} premium to textbook cash. The market is still writing a novel the model refuses to capitalize.`
        : premium <= -0.05
          ? `The ${name} tape at ${tape.toFixed(2)} sits ${pct(premium)} below the DCF. Either the market is offering, or the model is too kind on growth and WACC.`
          : `${name} tape and DCF are within shouting distance (${pct(premium)}). Fair value, on these assumptions, is not an argument.`,
  });

  findings.push({
    kicker: "Reverse DCF",
    tone: iw + 0.01 < input.wacc ? "down" : "muted",
    text: it
      ? `To justify the ${ticker} print, WACC has to fall to ${pctPlain(iw)} (you are using ${pctPlain(input.wacc)}), or terminal growth has to rise to ${pctPlain(it)} from ${pctPlain(input.tgr)}.`
      : `Gordon growth cannot reach this ${ticker} tape at a ${pctPlain(input.wacc)} WACC — terminal growth would exceed the discount rate. The only bridge is a ${pctPlain(iw)} cost of capital, or a growth path the 10-K does not show.`,
  });

  const waccGap = capmWacc - input.wacc;
  findings.push({
    kicker: "Live CAPM",
    tone: "muted",
    text: `A ${pctPlain(rf)} 10-year and beta ${beta.toFixed(2)} imply a ${pctPlain(ke)} cost of equity and a ${pctPlain(capmWacc)} WACC. Your slider is ${pctPlain(input.wacc)} — ${Math.abs(waccGap * 100).toFixed(0)} bp ${waccGap > 0 ? "below" : "above"} the live hurdle.`,
  });

  if (rangePos != null && hi != null && lo != null) {
    findings.push({
      kicker: "52-week",
      tone: rangePos > 0.85 ? "down" : rangePos < 0.35 ? "up" : "muted",
      text: `The stock sits ${pctPlain(rangePos)} of the way up its 52-week range (${lo.toFixed(0)}–${hi.toFixed(0)}). ${
        rangePos > 0.85 ? "Little air left under the old high." : rangePos < 0.35 ? "The drawdown is still the story." : "Mid-range. Neither a capitulation nor a breakout."
      }`,
    });
  }

  const regime = vixRegime(vix);
  findings.push({
    kicker: "Vol",
    tone: regime === "stress" || regime === "elevated" ? "down" : "muted",
    text:
      regime === "quiet"
        ? `VIX at ${vix.toFixed(1)} is a quiet tape. This is not a crash premium — it is a complacency premium.`
        : regime === "normal"
          ? `VIX at ${vix.toFixed(1)} is an ordinary afternoon. Option markets are not arguing with the cash model today.`
          : regime === "elevated"
            ? `VIX at ${vix.toFixed(1)} is elevated. The tape is paying for insurance the DCF does not.`
            : `VIX at ${vix.toFixed(1)} is stress. Fair-value arithmetic is the wrong instrument until the left tail closes.`,
  });

  if (vsSpx != null && market.spx) {
    findings.push({
      kicker: "Relative",
      tone: vsSpx < -0.005 ? "down" : vsSpx > 0.005 ? "up" : "muted",
      text:
        vsSpx < -0.004
          ? `${ticker} is lagging the S&P 500 by ${pct(Math.abs(vsSpx))} on the session. The megacap is offering, not bid.`
          : vsSpx > 0.004
            ? `${ticker} is leading the S&P 500 by ${pct(vsSpx)} today. The stock is the bid inside the index.`
            : `${ticker} is tracking the S&P 500 (relative ${pct(vsSpx)}). This is index beta, not a ${name}-specific tape.`,
    });
  }

  if (shareUplift != null && Math.abs(shareUplift) > 0.01) {
    findings.push({
      kicker: "Shares",
      tone: "muted",
      text: `The tape’s share count is ${((liveSharesMm ?? shares) / 1000).toFixed(2)}B versus ${(shares / 1000).toFixed(2)}B in the 10-K snapshot — a ${pct(shareUplift)} mechanical lift to DCF per share.`,
    });
  }

  return {
    impliedWacc: iw,
    impliedTgr: it,
    impliedGrowth: ig,
    capmWacc,
    ke,
    rf,
    beta,
    rangePos,
    vsSpx,
    vixRegime: regime,
    valuation: valuation(premium),
    shareUplift,
    findings,
  };
}

export function snapshotFacts(market: LiveMarket, input: ModelInputs, dcfPrice: number, books?: DcfBooks): string {
  const a = market.aapl;
  const ticker = (market.ticker ?? a.symbol ?? "AAPL") as Ticker;
  const names = [market.aapl, ...market.peers].map((q) => ({
    s: q.symbol,
    px: q.price,
    chg: q.changePct,
    pe: q.pe,
    mcap: q.mktCap,
    beta: q.beta,
  }));
  const snap = snapshotName(ticker);
  return JSON.stringify({
    focus: ticker,
    name: UNIVERSE[ticker].name,
    tape: a.price,
    chg: a.changePct,
    dcf: Number(dcfPrice.toFixed(2)),
    wacc: input.wacc,
    tgr: input.tgr,
    gm: input.grossMargin,
    growth: input.growth,
    street: streetOf(ticker),
    rf: market.rf,
    vix: market.vix?.price ?? null,
    spx: market.spx?.changePct ?? null,
    pe: a.pe,
    beta: a.beta,
    high52: a.high52,
    low52: a.low52,
    session: a.session,
    books: books
      ? { rev: books.baseRev, cash: books.cash, debt: books.debt, shares: books.shares }
      : null,
    fy: snap,
    universe: names,
  });
}
