import { CURRENT_PRICE, HIST } from "./constants";
import { mulberry32 } from "./rng";

export type QuotePoint = { t: number; date: string; close: number };

/**
 * Weekly series interpolated in log-space between fiscal year-end prints,
 * then pinned to the model snapshot price. Seeded so SSR matches client.
 */
export function buildWeeklySeries(): QuotePoint[] {
  const anchors: { t: number; p: number }[] = HIST.years.map((y, i) => ({
    t: Date.UTC(y, 8, 28),
    p: HIST.price[i]!,
  }));
  anchors.push({ t: Date.UTC(2025, 11, 15), p: CURRENT_PRICE });

  const rand = mulberry32(7);
  const out: QuotePoint[] = [];
  const week = 7 * 24 * 3600 * 1000;
  for (let a = 0; a < anchors.length - 1; a++) {
    const a0 = anchors[a]!;
    const a1 = anchors[a + 1]!;
    const n = Math.max(1, Math.round((a1.t - a0.t) / week));
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const logp = Math.log(a0.p) * (1 - u) + Math.log(a1.p) * u;
      const wobble = (rand() - 0.5) * 0.035;
      const close = Math.exp(logp + wobble);
      const t = a0.t + i * week;
      out.push({ t, date: new Date(t).toISOString().slice(0, 10), close });
    }
  }
  out.push({
    t: anchors[anchors.length - 1]!.t,
    date: "2025-12-15",
    close: CURRENT_PRICE,
  });
  return out;
}

export const WEEKLY = buildWeeklySeries();

export function sliceRange(points: QuotePoint[], key: "6M" | "1Y" | "3Y" | "5Y" | "Max") {
  if (key === "Max") return points;
  const last = points[points.length - 1]!.t;
  const days = key === "6M" ? 182 : key === "1Y" ? 365 : key === "3Y" ? 365 * 3 : 365 * 5;
  const cut = last - days * 24 * 3600 * 1000;
  const sliced = points.filter((p) => p.t >= cut);
  return sliced.length > 2 ? sliced : points.slice(-12);
}

export const HIST_ROWS = HIST.years.map((year, i) => {
  const rev = HIST.revenue[i]!;
  const prev = i === 0 ? null : HIST.revenue[i - 1]!;
  return {
    year,
    revenue: rev,
    netIncome: HIST.netIncome[i]!,
    grossMargin: HIST.grossMargin[i]!,
    services: HIST.services[i]!,
    products: rev - HIST.services[i]!,
    servicesMix: HIST.services[i]! / rev,
    opIncome: HIST.opIncome[i]!,
    eps: HIST.eps[i]!,
    price: HIST.price[i]!,
    growth: prev == null ? null : rev / prev - 1,
  };
});
