import { FORECAST_YEARS, HIST } from "./constants";
import { UNIVERSE, type Ticker } from "@/lib/desk/universe";

function solve(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let i = 0; i < n; i++) {
    let max = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r]![i]!) > Math.abs(M[max]![i]!)) max = r;
    [M[i], M[max]] = [M[max]!, M[i]!];
    const pivot = M[i]![i]!;
    for (let c = i; c <= n; c++) M[i]![c]! /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r]![i]!;
      for (let c = i; c <= n; c++) M[r]![c]! -= f * M[i]![c]!;
    }
  }
  return M.map((row) => row[n]!);
}

export function olsLinear(xs: number[], ys: number[]) {
  const n = xs.length;
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
    sxx += xs[i]! * xs[i]!;
    sxy += xs[i]! * ys[i]!;
  }
  const den = n * sxx - sx * sx;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  return { intercept, slope, predict: (x: number) => intercept + slope * x };
}

export function olsPoly2(xs: number[], ys: number[]) {
  const n = xs.length;
  let s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0,
    sy = 0,
    sxy = 0,
    sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }
  const [a, b, c] = solve(
    [
      [n, s1, s2],
      [s1, s2, s3],
      [s2, s3, s4],
    ],
    [sy, sxy, sx2y],
  );
  return { a: a!, b: b!, c: c!, predict: (x: number) => a! + b! * x + c! * x * x };
}

export function olsExp(xs: number[], ys: number[]) {
  const logs = ys.map((y) => Math.log(Math.max(y, 1e-9)));
  const lin = olsLinear(xs, logs);
  return {
    ...lin,
    predict: (x: number) => Math.exp(lin.intercept + lin.slope * x),
  };
}

export function r2(ys: number[], yhat: number[]) {
  const ybar = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < ys.length; i++) {
    ssTot += (ys[i]! - ybar) ** 2;
    ssRes += (ys[i]! - yhat[i]!) ** 2;
  }
  return 1 - ssRes / ssTot;
}

const XS = HIST.years.map((y) => y - 2018);

export function fitSeries(values: readonly number[]) {
  const ys = [...values];
  const lin = olsLinear(XS, ys);
  const poly = olsPoly2(XS, ys);
  const exp = olsExp(XS, ys);
  const yhatLin = XS.map(lin.predict);
  const yhatPoly = XS.map(poly.predict);
  const yhatExp = XS.map(exp.predict);
  const ensembleR2 = (r2(ys, yhatLin) + r2(ys, yhatPoly) + r2(ys, yhatExp)) / 3;
  const future = FORECAST_YEARS.map((y) => y - 2018);
  const linear = future.map(lin.predict);
  const polynomial = future.map(poly.predict);
  const exponential = future.map(exp.predict);
  const ensemble = linear.map((v, i) => 0.4 * v + 0.25 * polynomial[i]! + 0.35 * exponential[i]!);
  return {
    linear,
    polynomial,
    exponential,
    ensemble,
    r2: { linear: r2(ys, yhatLin), poly: r2(ys, yhatPoly), exp: r2(ys, yhatExp), ensemble: ensembleR2 },
  };
}

export function fitsFor(ticker: Ticker) {
  const n = UNIVERSE[ticker];
  const hero = n.mix.map((row) => (row.shares[n.heroMixId] ?? 0) * 100);
  return {
    revenue: fitSeries(n.revenue),
    gm: fitSeries(n.grossMargin),
    eps: fitSeries(n.eps),
    price: fitSeries(n.price),
    hero,
    heroFit: fitSeries(hero),
  };
}

export const REVENUE_FIT = fitSeries(HIST.revenue);
export const GM_FIT = fitSeries(HIST.grossMargin);
export const EPS_FIT = fitSeries(HIST.eps);
export const PRICE_FIT = fitSeries(HIST.price);

export function priceEnsemble(livePx?: number, ticker: Ticker = "AAPL") {
  const n = UNIVERSE[ticker];
  const { revenue: revFit, eps: epsFit, price: pxFit } = fitsFor(ticker);
  const lastPx = Number(n.price[n.price.length - 1]);
  const lastRev = Number(n.revenue[n.revenue.length - 1]);
  const lastEps = Number(n.eps[n.eps.length - 1]);
  const px = livePx ?? lastPx;
  const k = lastPx > 0 ? px / lastPx : 1;
  const time = pxFit.ensemble.map((v) => v * k);
  const fromRev = lastRev > 0 ? revFit.ensemble.map((rev) => (rev / lastRev) * px) : time;
  const fromEps = lastEps !== 0 ? epsFit.ensemble.map((eps) => (eps / lastEps) * px) : time;
  const mid = time.map((t, i) => 0.3 * t + 0.35 * fromRev[i]! + 0.35 * fromEps[i]!);
  return {
    mid,
    upper: mid.map((m) => m * 1.43),
    lower: mid.map((m) => m * 0.7),
    fromRev,
    fromEps,
    time,
    k,
    pePath: mid.map((p, i) => p / Math.max(1e-6, epsFit.ensemble[i]!)),
    fits: { revenue: revFit, eps: epsFit, price: pxFit },
  };
}
