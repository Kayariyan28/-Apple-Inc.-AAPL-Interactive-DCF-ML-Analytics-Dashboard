import {
  BASE_REV,
  CAPEX_PCT,
  CASH,
  CURRENT_PRICE,
  DA_PCT,
  DEBT,
  FORECAST_LABELS,
  NWC_PCT,
  RD_PCT,
  SGA_PCT,
  SHARES,
  STREET_DEFAULTS,
  TGR_RANGE,
  WACC_RANGE,
} from "./constants";
import { clamp, gaussian, mean, median, mulberry32, percentile, stdev } from "./rng";

export type ModelInputs = {
  growth: number[];
  grossMargin: number;
  wacc: number;
  tgr: number;
  taxRate: number;
};

export type DcfResult = {
  years: readonly string[];
  revenue: number[];
  ebit: number[];
  ebitMargin: number[];
  nopat: number[];
  fcf: number[];
  pvFcf: number[];
  tv: number;
  pvTv: number;
  ev: number;
  equity: number;
  price: number;
  tvPct: number;
  sumPvFcf: number;
  upside: number;
  premiumToDcf: number;
};

export type DcfBooks = {
  baseRev: number;
  cash: number;
  debt: number;
  shares: number;
  rdPct?: number;
  sgaPct?: number;
  daPct?: number;
  capexPct?: number;
  labels?: readonly string[];
};

export function runDcf(input: ModelInputs, marketPrice = CURRENT_PRICE, books?: DcfBooks): DcfResult {
  const baseRev = books?.baseRev ?? BASE_REV;
  const cash = books?.cash ?? CASH;
  const debt = books?.debt ?? DEBT;
  const shares = books?.shares ?? SHARES;
  const rd = books?.rdPct ?? RD_PCT;
  const sga = books?.sgaPct ?? SGA_PCT;
  const da = books?.daPct ?? DA_PCT;
  const capex = books?.capexPct ?? CAPEX_PCT;
  const revs = [baseRev];
  for (const g of input.growth) revs.push(revs[revs.length - 1]! * (1 + g));
  const pr = revs.slice(1);
  const ebit = pr.map((r) => r * (input.grossMargin - rd - sga));
  const nopat = ebit.map((e) => e * (1 - input.taxRate));
  const fcf = nopat.map((n, i) => {
    const r = pr[i]!;
    const dnwc = (pr[i]! - revs[i]!) * NWC_PCT;
    return n + r * da - r * capex - dnwc;
  });
  const wacc = Math.max(input.wacc, input.tgr + 0.002);
  const pvFcf = fcf.map((f, i) => f / (1 + wacc) ** (i + 1));
  const tv = (fcf[fcf.length - 1]! * (1 + input.tgr)) / (wacc - input.tgr);
  const pvTv = tv / (1 + wacc) ** 5;
  const sumPvFcf = pvFcf.reduce((a, b) => a + b, 0);
  const ev = sumPvFcf + pvTv;
  const equity = ev + cash - debt;
  const price = equity / Math.max(shares, 1);
  return {
    years: books?.labels ?? FORECAST_LABELS,
    revenue: pr,
    ebit,
    ebitMargin: ebit.map((e, i) => e / pr[i]!),
    nopat,
    fcf,
    pvFcf,
    tv,
    pvTv,
    ev,
    equity,
    price,
    tvPct: pvTv / ev,
    sumPvFcf,
    upside: price / marketPrice - 1,
    premiumToDcf: marketPrice / price - 1,
  };
}

export function streetDcf(marketPrice = CURRENT_PRICE, books?: DcfBooks, street: ModelInputs = STREET_DEFAULTS) {
  return runDcf(street, marketPrice, books);
}

export type HistogramBin = { x0: number; x1: number; count: number; share: number };

export type MonteCarloResult = {
  n: number;
  mean: number;
  median: number;
  std: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  probBelowMarket: number;
  bins: HistogramBin[];
  sorted: Float64Array;
};

export function runMonteCarlo(
  input: ModelInputs,
  n: number,
  seed = 42,
  marketPrice = CURRENT_PRICE,
  books?: DcfBooks,
): MonteCarloResult {
  const rand = mulberry32(seed);
  const prices = new Float64Array(n);
  const meanG = mean(input.growth);
  const rd = books?.rdPct ?? RD_PCT;
  const sga = books?.sgaPct ?? SGA_PCT;
  const ebitM = input.grossMargin - sga - rd;
  const baseRev = books?.baseRev ?? BASE_REV;
  const cash = books?.cash ?? CASH;
  const debt = books?.debt ?? DEBT;
  const shares = books?.shares ?? SHARES;
  const gLo = meanG - 0.12;
  const gHi = meanG + 0.12;
  const mLo = ebitM - 0.08;
  const mHi = ebitM + 0.08;
  for (let i = 0; i < n; i++) {
    let w = clamp(input.wacc + gaussian(rand) * 0.01, 0.06, 0.16);
    let t = clamp(input.tgr + gaussian(rand) * 0.005, 0.01, 0.06);
    if (w <= t) t = w - 0.01;
    let rev = baseRev;
    let pv = 0;
    let lf = 0;
    for (let yr = 1; yr <= 5; yr++) {
      const g = clamp(meanG + gaussian(rand) * 0.025, gLo, gHi);
      const m = clamp(ebitM + gaussian(rand) * 0.015, mLo, mHi);
      rev *= 1 + g;
      const fcf = rev * m * (1 - input.taxRate) * 1.002;
      pv += fcf / (1 + w) ** yr;
      lf = fcf;
    }
    prices[i] = (pv + (lf * (1 + t)) / (w - t) / (1 + w) ** 5 + cash - debt) / Math.max(shares, 1);
  }
  const sorted = prices.slice().sort();
  const min = sorted[0]!;
  const max = sorted[n - 1]!;
  const binCount = 36;
  const width = (max - min) / binCount || 1;
  const counts = new Array<number>(binCount).fill(0);
  for (let i = 0; i < n; i++) {
    const idx = Math.min(binCount - 1, Math.floor((prices[i]! - min) / width));
    counts[idx]! += 1;
  }
  const bins: HistogramBin[] = counts.map((count, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count,
    share: count / n,
  }));
  return {
    n,
    mean: mean(prices),
    median: median(sorted),
    std: stdev(prices),
    p5: percentile(sorted, 5),
    p25: percentile(sorted, 25),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    probBelowMarket: prices.reduce((acc, p) => acc + (p < marketPrice ? 1 : 0), 0) / n,
    bins,
    sorted,
  };
}

export function sensitivityGrid(fcf: number[], cash = CASH, debt = DEBT, shares = SHARES) {
  const last = fcf[fcf.length - 1]!;
  return WACC_RANGE.map((w) =>
    TGR_RANGE.map((t) => {
      if (w <= t) return Number.NaN;
      const pv = fcf.reduce((acc, f, i) => acc + f / (1 + w) ** (i + 1), 0);
      const tv = (last * (1 + t)) / (w - t) / (1 + w) ** 5;
      return (pv + tv + cash - debt) / Math.max(shares, 1);
    }),
  );
}

export function cagr(start: number, end: number, years: number) {
  return (end / start) ** (1 / years) - 1;
}
