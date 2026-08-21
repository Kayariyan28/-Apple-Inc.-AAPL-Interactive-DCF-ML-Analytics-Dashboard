import { CURRENT_PRICE } from "./constants";
import { WEEKLY } from "./history";
import { mean, stdev } from "./rng";
import type { LiveMarket } from "@/lib/market/types";
import { windowAnalytics } from "@/lib/charts/math";
import { UNIVERSE, type Ticker } from "@/lib/desk/universe";

export function logReturns(prices: readonly number[]) {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(Math.log(prices[i]! / prices[i - 1]!));
  return out;
}

export type Calibration = {
  mu: number;
  sigma: number;
  s0: number;
  nAnnual: number;
  realized: number | null;
  nDaily: number;
  source: string;
};

export function annualFromHist(s0 = CURRENT_PRICE, ticker: Ticker = "AAPL"): Calibration {
  const prices = UNIVERSE[ticker].price;
  const rets = logReturns(prices);
  return {
    mu: mean(rets),
    sigma: stdev(rets, 1),
    s0,
    nAnnual: rets.length,
    realized: null,
    nDaily: 0,
    source: "FY2018–FY2025 annual prints",
  };
}

export function realizedVol(prices: readonly number[], periodsPerYear: number) {
  const rets = logReturns(prices);
  if (rets.length < 3) return null;
  return stdev(rets, 1) * Math.sqrt(periodsPerYear);
}

/** Long-run μ from 10-K prints, σ blended with live realized vol, S0 = tape. */
export function liveCalibrate(s0: number, daily?: readonly number[], ticker: Ticker = "AAPL"): Calibration {
  const base = annualFromHist(s0, ticker);
  const realized = daily && daily.length >= 8 ? realizedVol(daily, 252) : null;
  const sigma = realized != null ? 0.65 * base.sigma + 0.35 * realized : base.sigma;
  return {
    ...base,
    s0,
    sigma,
    realized,
    nDaily: daily?.length ?? 0,
    source: realized != null ? "blend · annual μ + live realized σ" : base.source,
  };
}

export function calibrateMarket(market: LiveMarket | null, fallbackPx: number): Calibration {
  const ticker = (market?.ticker ?? "AAPL") as Ticker;
  const s0 = market?.aapl.price ?? fallbackPx;
  const daily = market?.daily.map((b) => b.close);
  return liveCalibrate(s0, daily, ticker);
}

export function weeklyWindow(livePx: number) {
  const closes = WEEKLY.map((p) => p.close);
  if (Math.abs(closes[closes.length - 1]! - livePx) > 0.05) closes.push(livePx);
  const weeks = Math.max(1, closes.length);
  return windowAnalytics(closes, weeks);
}

export function histPriceMoves(ticker: Ticker = "AAPL") {
  const hist = UNIVERSE[ticker];
  const out: { year: number; from: number; to: number; ret: number }[] = [];
  for (let i = 1; i < hist.price.length; i++) {
    const from = hist.price[i - 1]!;
    const to = hist.price[i]!;
    out.push({ year: hist.years[i]!, from, to, ret: to / from - 1 });
  }
  return out;
}
