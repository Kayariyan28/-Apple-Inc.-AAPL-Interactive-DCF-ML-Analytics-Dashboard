import { CURRENT_PRICE, HIST } from "./constants";
import { annualFromHist, logReturns, type Calibration } from "./calibrate";
import { gaussian, mean, mulberry32, percentile, poisson, stdev } from "./rng";

export { logReturns, type Calibration };

export const CALIBRATION: Calibration = annualFromHist(CURRENT_PRICE);

export type PathBundle = {
  steps: number;
  n: number;
  paths: Float64Array[];
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
  mean: number[];
};

function summarize(all: Float64Array[], steps: number): Omit<PathBundle, "paths" | "steps" | "n"> {
  const p5: number[] = [];
  const p25: number[] = [];
  const p50: number[] = [];
  const p75: number[] = [];
  const p95: number[] = [];
  const avg: number[] = [];
  const col = new Float64Array(all.length);
  for (let t = 0; t <= steps; t++) {
    for (let i = 0; i < all.length; i++) col[i] = all[i]![t]!;
    const sorted = col.slice().sort();
    p5.push(percentile(sorted, 5));
    p25.push(percentile(sorted, 25));
    p50.push(percentile(sorted, 50));
    p75.push(percentile(sorted, 75));
    p95.push(percentile(sorted, 95));
    avg.push(mean(col));
  }
  return { p5, p25, p50, p75, p95, mean: avg };
}

export function simulateGbm(n: number, steps = 5, seed = 42, cal: Calibration = CALIBRATION): PathBundle {
  const { mu, sigma, s0 } = cal;
  const rand = mulberry32(seed);
  const paths: Float64Array[] = Array.from({ length: n }, () => new Float64Array(steps + 1));
  for (let i = 0; i < n; i++) paths[i]![0] = s0;
  const drift = mu - 0.5 * sigma * sigma;
  for (let t = 0; t < steps; t++) {
    for (let i = 0; i < n; i++) {
      const z = gaussian(rand);
      paths[i]![t + 1] = paths[i]![t]! * Math.exp(drift + sigma * z);
    }
  }
  return { steps, n, paths, ...summarize(paths, steps) };
}

export function simulateJumpDiffusion(
  n: number,
  steps = 5,
  seed = 123,
  lambda = 0.3,
  muJ = -0.05,
  sigJ = 0.15,
  cal: Calibration = CALIBRATION,
): PathBundle {
  const { mu, sigma, s0 } = cal;
  const rand = mulberry32(seed);
  const paths: Float64Array[] = Array.from({ length: n }, () => new Float64Array(steps + 1));
  for (let i = 0; i < n; i++) paths[i]![0] = s0;
  const compensator = lambda * (Math.exp(muJ + 0.5 * sigJ * sigJ) - 1);
  const drift = mu - 0.5 * sigma * sigma - compensator;
  for (let t = 0; t < steps; t++) {
    for (let i = 0; i < n; i++) {
      const z = gaussian(rand);
      const jumps = poisson(lambda, rand);
      let J = 0;
      for (let k = 0; k < jumps; k++) J += muJ + sigJ * gaussian(rand);
      paths[i]![t + 1] = paths[i]![t]! * Math.exp(drift + sigma * z + J);
    }
  }
  return { steps, n, paths, ...summarize(paths, steps) };
}

export function pathStats(bundle: PathBundle, yearIndex: number) {
  const col = new Float64Array(bundle.n);
  for (let i = 0; i < bundle.n; i++) col[i] = bundle.paths[i]![yearIndex]!;
  const sorted = col.slice().sort();
  const above = (threshold: number) => col.reduce((a, p) => a + (p > threshold ? 1 : 0), 0) / bundle.n;
  const below = (threshold: number) => col.reduce((a, p) => a + (p < threshold ? 1 : 0), 0) / bundle.n;
  return {
    mean: mean(col),
    median: percentile(sorted, 50),
    std: stdev(col),
    p5: percentile(sorted, 5),
    p95: percentile(sorted, 95),
    p300: above(300),
    p400: above(400),
    p150: below(150),
  };
}

export function gbmProbabilityMatrix(bundle: PathBundle, bands: number[]) {
  const years = [1, 2, 3, 4, 5];
  return years.map((y) => {
    const shares: number[] = [];
    for (let b = 0; b < bands.length - 1; b++) {
      const lo = bands[b]!;
      const hi = bands[b + 1]!;
      let c = 0;
      for (let i = 0; i < bundle.n; i++) {
        const p = bundle.paths[i]![y]!;
        if (p >= lo && p < hi) c += 1;
      }
      shares.push(c / bundle.n);
    }
    return shares;
  });
}

export function expectedShortfall(simple: number[], p: number) {
  const sorted = simple.slice().sort((a, b) => a - b);
  const cut = Math.max(1, Math.floor((p / 100) * sorted.length));
  const tail = sorted.slice(0, cut);
  return -mean(tail);
}

export function historicalVar(cal: Calibration = CALIBRATION, daily?: readonly number[], annual?: readonly number[]) {
  const rets = logReturns(annual && annual.length > 2 ? [...annual] : HIST.price);
  const simple = rets.map((r) => Math.exp(r) - 1);
  const sorted = simple.slice().sort((a, b) => a - b);
  const { mu, sigma } = cal;
  const z90 = 1.28155;
  const z95 = 1.64485;
  const z99 = 2.32635;
  const histAt = (pct: number) => {
    const idx = Math.max(0, Math.floor((pct / 100) * sorted.length) - 1);
    return -sorted[idx]!;
  };
  let dailySigma: number | null = null;
  let dailyHist95: number | null = null;
  if (daily && daily.length >= 8) {
    const d = logReturns(daily).map((r) => Math.exp(r) - 1);
    const ds = d.slice().sort((a, b) => a - b);
    dailySigma = stdev(d, 1) * Math.sqrt(252);
    const idx = Math.max(0, Math.floor(0.05 * ds.length) - 1);
    dailyHist95 = -ds[idx]!;
  }
  return {
    hist90: histAt(10),
    hist95: histAt(5),
    hist99: histAt(1),
    cvar95: expectedShortfall(simple, 5),
    cvar99: expectedShortfall(simple, 1),
    par90: z90 * sigma - mu,
    par95: z95 * sigma - mu,
    par99: z99 * sigma - mu,
    sigma,
    mu,
    dailySigma,
    dailyHist95,
    s0: cal.s0,
  };
}
