import type { ModelInputs } from "@/lib/dcf/engine";
import type { DcfBooks } from "@/lib/dcf/engine";
import type { LiveMarket } from "@/lib/market/types";

export const TICKERS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"] as const;
export type Ticker = (typeof TICKERS)[number];

export type MixKey = { id: string; label: string };
export type MixRow = { year: number; shares: Record<string, number> };

export type NameBooks = {
  symbol: Ticker;
  name: string;
  news: string;
  years: number[];
  /** $ billions */
  revenue: number[];
  netIncome: number[];
  /** percent, e.g. 46.9 */
  grossMargin: number[];
  eps: number[];
  price: number[];
  opIncome: number[];
  cash: number[];
  debt: number[];
  fcf: number[];
  buybacks: number[];
  capex: number[];
  /** millions of shares */
  shares: number[];
  mix: MixRow[];
  mixKeys: MixKey[];
  heroMixId: string;
  rdPct: number;
  sgaPct: number;
  daPct: number;
  capexPct: number;
  defaults: ModelInputs;
};

const YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

export const UNIVERSE: Record<Ticker, NameBooks> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple",
    news: "AAPL OR \"Apple Inc\" stock",
    years: YEARS,
    revenue: [265.6, 260.17, 274.52, 365.82, 394.33, 383.29, 391.04, 416.16],
    netIncome: [59.53, 55.26, 57.41, 94.68, 99.8, 97.0, 93.74, 112.01],
    grossMargin: [38.3, 37.8, 38.2, 41.8, 43.3, 44.1, 46.2, 46.9],
    eps: [2.98, 3.28, 3.28, 5.61, 6.11, 6.13, 6.08, 7.4],
    price: [39.5, 73.4, 132.7, 177.6, 129.9, 192.5, 254.5, 285.9],
    opIncome: [70.9, 63.93, 66.29, 108.95, 119.44, 114.3, 123.22, 133.05],
    cash: [237.1, 205.9, 191.8, 189.0, 165.4, 162.1, 151.3, 156.7],
    debt: [114.5, 108.0, 112.4, 124.7, 120.1, 111.1, 106.6, 96.8],
    fcf: [64.1, 58.9, 73.4, 92.9, 111.4, 99.6, 108.8, 108.9],
    buybacks: [72.7, 67.1, 72.5, 85.5, 89.4, 77.6, 94.9, 99.2],
    capex: [13.3, 10.5, 7.3, 11.1, 10.7, 10.9, 9.4, 9.6],
    shares: [19_882, 18_596, 17_528, 16_865, 16_326, 15_813, 15_344, 15_115],
    mixKeys: [
      { id: "iphone", label: "iPhone" },
      { id: "mac", label: "Mac" },
      { id: "ipad", label: "iPad" },
      { id: "wearables", label: "Watch" },
      { id: "services", label: "Services" },
    ],
    mix: [
      { year: 2018, shares: { iphone: 0.628, mac: 0.096, ipad: 0.07, wearables: 0.066, services: 0.14 } },
      { year: 2019, shares: { iphone: 0.547, mac: 0.099, ipad: 0.084, wearables: 0.094, services: 0.176 } },
      { year: 2020, shares: { iphone: 0.499, mac: 0.104, ipad: 0.087, wearables: 0.111, services: 0.199 } },
      { year: 2021, shares: { iphone: 0.526, mac: 0.096, ipad: 0.087, wearables: 0.105, services: 0.186 } },
      { year: 2022, shares: { iphone: 0.521, mac: 0.102, ipad: 0.074, wearables: 0.105, services: 0.198 } },
      { year: 2023, shares: { iphone: 0.524, mac: 0.077, ipad: 0.074, wearables: 0.104, services: 0.221 } },
      { year: 2024, shares: { iphone: 0.513, mac: 0.077, ipad: 0.068, wearables: 0.095, services: 0.247 } },
      { year: 2025, shares: { iphone: 0.501, mac: 0.079, ipad: 0.064, wearables: 0.094, services: 0.262 } },
    ],
    heroMixId: "services",
    rdPct: 0.077,
    sgaPct: 0.063,
    daPct: 0.028,
    capexPct: 0.025,
    defaults: { growth: [0.08, 0.09, 0.08, 0.07, 0.065], grossMargin: 0.475, wacc: 0.09, tgr: 0.035, taxRate: 0.162 },
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft",
    news: "MSFT OR \"Microsoft\" stock",
    years: YEARS,
    revenue: [110.4, 125.8, 143.0, 168.1, 198.3, 211.9, 245.1, 281.7],
    netIncome: [16.6, 39.2, 44.3, 61.3, 72.7, 72.4, 88.1, 101.8],
    grossMargin: [65.3, 65.9, 67.8, 68.9, 68.4, 68.9, 69.4, 69.1],
    eps: [2.13, 5.06, 5.76, 8.05, 9.65, 9.68, 11.8, 13.64],
    price: [98, 134, 203, 271, 257, 340, 447, 497],
    opIncome: [35.1, 43.0, 53.0, 69.9, 83.4, 89.0, 109.4, 128.5],
    cash: [133.8, 133.9, 136.5, 130.3, 107.0, 111.3, 75.5, 79.6],
    debt: [76.2, 72.3, 82.0, 67.8, 61.3, 60.0, 67.1, 43.0],
    fcf: [32.3, 38.3, 45.2, 56.1, 65.1, 59.5, 74.1, 71.6],
    buybacks: [10.0, 19.5, 23.0, 27.4, 32.7, 22.1, 17.3, 18.4],
    capex: [11.6, 13.9, 15.4, 20.6, 23.9, 28.1, 44.5, 64.5],
    shares: [7700, 7683, 7610, 7547, 7472, 7432, 7433, 7433],
    mixKeys: [
      { id: "productivity", label: "Productivity" },
      { id: "cloud", label: "Intelligent Cloud" },
      { id: "personal", label: "More Personal" },
    ],
    mix: [
      { year: 2018, shares: { productivity: 0.36, cloud: 0.32, personal: 0.32 } },
      { year: 2019, shares: { productivity: 0.35, cloud: 0.35, personal: 0.3 } },
      { year: 2020, shares: { productivity: 0.33, cloud: 0.38, personal: 0.29 } },
      { year: 2021, shares: { productivity: 0.32, cloud: 0.41, personal: 0.27 } },
      { year: 2022, shares: { productivity: 0.32, cloud: 0.42, personal: 0.26 } },
      { year: 2023, shares: { productivity: 0.31, cloud: 0.43, personal: 0.26 } },
      { year: 2024, shares: { productivity: 0.31, cloud: 0.44, personal: 0.25 } },
      { year: 2025, shares: { productivity: 0.3, cloud: 0.46, personal: 0.24 } },
    ],
    heroMixId: "cloud",
    rdPct: 0.12,
    sgaPct: 0.18,
    daPct: 0.06,
    capexPct: 0.16,
    defaults: { growth: [0.12, 0.11, 0.1, 0.09, 0.08], grossMargin: 0.69, wacc: 0.09, tgr: 0.04, taxRate: 0.18 },
  },
  GOOGL: {
    symbol: "GOOGL",
    name: "Alphabet",
    news: "GOOGL OR Alphabet OR Google stock",
    years: YEARS,
    revenue: [136.8, 161.9, 182.5, 257.6, 282.8, 307.4, 350.0, 390.0],
    netIncome: [30.7, 34.3, 40.3, 76.0, 60.0, 73.8, 100.1, 115.0],
    grossMargin: [56.5, 55.6, 53.6, 56.9, 55.4, 56.8, 58.1, 58.6],
    eps: [1.21, 2.46, 2.93, 5.61, 4.56, 5.8, 8.04, 9.4],
    price: [52, 67, 88, 145, 88, 140, 189, 196],
    opIncome: [27.5, 34.2, 41.2, 78.7, 74.8, 84.3, 112.4, 128.0],
    cash: [109.1, 119.7, 136.7, 139.6, 113.8, 110.9, 95.7, 95.0],
    debt: [4.0, 4.6, 13.9, 26.2, 29.6, 13.3, 13.1, 13.0],
    fcf: [22.8, 31.0, 42.8, 67.0, 60.0, 69.5, 72.8, 73.0],
    buybacks: [9.1, 18.4, 31.1, 50.3, 59.3, 61.5, 62.0, 62.0],
    capex: [25.1, 23.5, 22.3, 24.6, 31.5, 32.3, 52.5, 52.0],
    shares: [13_900, 13_800, 13_600, 13_400, 13_200, 12_500, 12_300, 12_200],
    mixKeys: [
      { id: "search", label: "Search" },
      { id: "youtube", label: "YouTube" },
      { id: "cloud", label: "Cloud" },
      { id: "other", label: "Other" },
      { id: "subs", label: "Subscriptions" },
    ],
    mix: [
      { year: 2018, shares: { search: 0.7, youtube: 0.08, cloud: 0.04, other: 0.15, subs: 0.03 } },
      { year: 2019, shares: { search: 0.67, youtube: 0.09, cloud: 0.05, other: 0.15, subs: 0.04 } },
      { year: 2020, shares: { search: 0.64, youtube: 0.1, cloud: 0.07, other: 0.14, subs: 0.05 } },
      { year: 2021, shares: { search: 0.61, youtube: 0.11, cloud: 0.09, other: 0.13, subs: 0.06 } },
      { year: 2022, shares: { search: 0.6, youtube: 0.11, cloud: 0.1, other: 0.12, subs: 0.07 } },
      { year: 2023, shares: { search: 0.58, youtube: 0.11, cloud: 0.11, other: 0.12, subs: 0.08 } },
      { year: 2024, shares: { search: 0.57, youtube: 0.11, cloud: 0.12, other: 0.11, subs: 0.09 } },
      { year: 2025, shares: { search: 0.56, youtube: 0.11, cloud: 0.13, other: 0.11, subs: 0.09 } },
    ],
    heroMixId: "cloud",
    rdPct: 0.15,
    sgaPct: 0.12,
    daPct: 0.05,
    capexPct: 0.13,
    defaults: { growth: [0.11, 0.1, 0.09, 0.08, 0.07], grossMargin: 0.58, wacc: 0.09, tgr: 0.035, taxRate: 0.16 },
  },
  AMZN: {
    symbol: "AMZN",
    name: "Amazon",
    news: "AMZN OR Amazon stock",
    years: YEARS,
    revenue: [232.9, 280.5, 386.1, 469.8, 514.0, 574.8, 638.0, 691.3],
    netIncome: [10.1, 11.6, 21.3, 33.4, -2.7, 30.4, 59.2, 59.2],
    grossMargin: [40.3, 41.0, 39.6, 42.0, 43.8, 47.0, 48.9, 49.0],
    eps: [0.51, 0.58, 1.06, 1.64, -0.14, 2.9, 5.53, 5.53],
    price: [75, 92, 163, 167, 84, 152, 219, 230],
    opIncome: [12.4, 14.5, 22.9, 24.9, 12.2, 36.9, 68.6, 71.0],
    cash: [32.2, 36.1, 84.4, 96.0, 70.0, 86.8, 101.2, 101.0],
    debt: [23.5, 63.2, 84.4, 116.4, 140.1, 135.6, 130.0, 130.0],
    fcf: [19.4, 25.8, 31.0, -9.1, -11.6, 35.5, 47.7, 48.0],
    buybacks: [0, 0, 0, 0, 6.0, 0, 0, 5.0],
    capex: [13.4, 16.8, 40.1, 61.1, 58.6, 48.4, 64.0, 64.0],
    shares: [10_000, 10_000, 10_200, 10_300, 10_200, 10_400, 10_500, 10_600],
    mixKeys: [
      { id: "stores", label: "Online stores" },
      { id: "third", label: "Third-party" },
      { id: "aws", label: "AWS" },
      { id: "ads", label: "Ads" },
      { id: "subs", label: "Subscriptions" },
    ],
    mix: [
      { year: 2018, shares: { stores: 0.52, third: 0.18, aws: 0.11, ads: 0.04, subs: 0.15 } },
      { year: 2019, shares: { stores: 0.5, third: 0.19, aws: 0.12, ads: 0.05, subs: 0.14 } },
      { year: 2020, shares: { stores: 0.48, third: 0.2, aws: 0.12, ads: 0.06, subs: 0.14 } },
      { year: 2021, shares: { stores: 0.46, third: 0.21, aws: 0.13, ads: 0.07, subs: 0.13 } },
      { year: 2022, shares: { stores: 0.43, third: 0.22, aws: 0.16, ads: 0.07, subs: 0.12 } },
      { year: 2023, shares: { stores: 0.4, third: 0.22, aws: 0.16, ads: 0.08, subs: 0.14 } },
      { year: 2024, shares: { stores: 0.38, third: 0.22, aws: 0.17, ads: 0.09, subs: 0.14 } },
      { year: 2025, shares: { stores: 0.37, third: 0.22, aws: 0.18, ads: 0.1, subs: 0.13 } },
    ],
    heroMixId: "aws",
    rdPct: 0.12,
    sgaPct: 0.1,
    daPct: 0.08,
    capexPct: 0.09,
    defaults: { growth: [0.1, 0.1, 0.09, 0.08, 0.07], grossMargin: 0.49, wacc: 0.09, tgr: 0.04, taxRate: 0.13 },
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA",
    news: "NVDA OR NVIDIA stock",
    years: YEARS,
    revenue: [9.7, 11.7, 10.9, 16.7, 26.9, 27.0, 60.9, 130.5],
    netIncome: [3.0, 4.1, 2.8, 4.3, 9.8, 4.4, 29.8, 72.9],
    grossMargin: [59.9, 61.2, 62.0, 64.9, 64.9, 56.9, 72.7, 75.0],
    eps: [0.15, 0.17, 0.11, 0.16, 0.37, 0.17, 1.19, 2.94],
    price: [4, 6, 13, 29, 15, 50, 134, 140],
    opIncome: [3.2, 3.8, 2.8, 4.5, 10.0, 4.2, 33.0, 81.5],
    cash: [7.6, 10.9, 11.6, 21.2, 13.3, 26.0, 43.2, 43.0],
    debt: [2.0, 2.0, 7.0, 10.9, 9.7, 8.5, 8.5, 8.5],
    fcf: [3.1, 2.8, 4.7, 8.1, 3.8, 27.0, 60.6, 61.0],
    buybacks: [1.6, 0, 0, 0, 0, 0, 9.7, 30.0],
    capex: [0.6, 0.5, 1.1, 1.0, 1.8, 1.1, 3.2, 3.5],
    shares: [25_000, 24_700, 24_800, 25_300, 25_100, 24_700, 24_600, 24_500],
    mixKeys: [
      { id: "data", label: "Data center" },
      { id: "gaming", label: "Gaming" },
      { id: "viz", label: "Visualization" },
      { id: "auto", label: "Auto" },
      { id: "oem", label: "OEM" },
    ],
    mix: [
      { year: 2018, shares: { data: 0.4, gaming: 0.48, viz: 0.06, auto: 0.04, oem: 0.02 } },
      { year: 2019, shares: { data: 0.42, gaming: 0.46, viz: 0.06, auto: 0.04, oem: 0.02 } },
      { year: 2020, shares: { data: 0.55, gaming: 0.35, viz: 0.05, auto: 0.04, oem: 0.01 } },
      { year: 2021, shares: { data: 0.62, gaming: 0.3, viz: 0.04, auto: 0.03, oem: 0.01 } },
      { year: 2022, shares: { data: 0.55, gaming: 0.36, viz: 0.05, auto: 0.03, oem: 0.01 } },
      { year: 2023, shares: { data: 0.78, gaming: 0.17, viz: 0.02, auto: 0.02, oem: 0.01 } },
      { year: 2024, shares: { data: 0.88, gaming: 0.09, viz: 0.01, auto: 0.01, oem: 0.01 } },
      { year: 2025, shares: { data: 0.89, gaming: 0.08, viz: 0.01, auto: 0.01, oem: 0.01 } },
    ],
    heroMixId: "data",
    rdPct: 0.1,
    sgaPct: 0.06,
    daPct: 0.02,
    capexPct: 0.03,
    defaults: { growth: [0.22, 0.18, 0.14, 0.11, 0.09], grossMargin: 0.73, wacc: 0.1, tgr: 0.045, taxRate: 0.14 },
  },
};

export const LAST_YEAR_INDEX = YEARS.length - 1;

export const MIX_FILLS = [
  "var(--color-chart-2)",
  "color-mix(in oklab, var(--color-foreground) 42%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 26%, transparent)",
  "color-mix(in oklab, var(--color-foreground) 14%, transparent)",
  "var(--color-accent)",
] as const;

export function isTicker(s: string): s is Ticker {
  return (TICKERS as readonly string[]).includes(s.toUpperCase());
}

export function parseTicker(raw: unknown, fallback: Ticker = "AAPL"): Ticker {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "GOOG") return "GOOGL";
  if (s === "AMAZON" || s === "MOON") return "AMZN";
  if (s === "GOOGLE" || s === "ALPHABET") return "GOOGL";
  if (s === "MICROSOFT") return "MSFT";
  if (s === "NVIDIA" || s === "NVIDEA") return "NVDA";
  if (s === "APPLE") return "AAPL";
  return isTicker(s) ? s : fallback;
}

export function nameOf(ticker: Ticker) {
  return UNIVERSE[ticker];
}

export function streetOf(ticker: Ticker): ModelInputs {
  const d = UNIVERSE[ticker].defaults;
  return {
    growth: d.growth.map((g) => Math.max(0.02, g - 0.02)),
    grossMargin: Math.max(0.2, d.grossMargin - 0.01),
    wacc: d.wacc + 0.005,
    tgr: Math.max(0.02, d.tgr - 0.005),
    taxRate: d.taxRate + 0.003,
  };
}

export function mixFill(keys: MixKey[], id: string, heroId: string) {
  if (id === heroId) return "var(--color-accent)";
  const i = keys.findIndex((k) => k.id === id);
  return MIX_FILLS[Math.max(0, i)] ?? MIX_FILLS[0];
}

export function mixShare(name: NameBooks, yearIndex: number, id: string) {
  const row = name.mix[yearIndex];
  return row?.shares[id] ?? 0;
}

export function mixDollars(name: NameBooks, yearIndex: number, id: string) {
  return (name.revenue[yearIndex] ?? 0) * mixShare(name, yearIndex, id);
}

export function heroShare(name: NameBooks, yearIndex: number) {
  return mixShare(name, yearIndex, name.heroMixId);
}

export function heroLabel(name: NameBooks) {
  return name.mixKeys.find((k) => k.id === name.heroMixId)?.label ?? name.heroMixId;
}

export function pnlRows(ticker: Ticker) {
  const n = UNIVERSE[ticker];
  return n.years.map((year, i) => {
    const rev = n.revenue[i]!;
    const gp = rev * (n.grossMargin[i]! / 100);
    const ebit = n.opIncome[i]!;
    const ni = n.netIncome[i]!;
    const da = rev * n.daPct;
    const tax = n.defaults.taxRate;
    const ebt = tax < 0.99 ? ni / (1 - tax) : ni;
    return { year, rev, gp, ebitda: ebit + da, ebit, ebt, ni };
  });
}

export function dcfBooksOf(name: NameBooks, index: number): DcfBooks {
  const i = Math.max(0, Math.min(name.years.length - 1, index));
  const year = name.years[i]!;
  return {
    baseRev: name.revenue[i]! * 1_000,
    cash: name.cash[i]! * 1_000,
    debt: name.debt[i]! * 1_000,
    shares: name.shares[i]!,
    rdPct: name.rdPct,
    sgaPct: name.sgaPct,
    daPct: name.daPct,
    capexPct: name.capexPct,
    labels: [1, 2, 3, 4, 5].map((k) => `FY${year + k}`),
  };
}

/** CNBC TTM revenue may be dollars, millions, or billions. Normalize to $ millions. */
export function ttmRevenueMm(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  if (raw > 1e11) return raw / 1e6;
  if (raw > 1e8) return raw / 1e3;
  if (raw > 1e4) return raw;
  return raw * 1_000;
}

export function overlayLiveBooks(
  books: DcfBooks,
  market: LiveMarket | null | undefined,
  latest: boolean,
): DcfBooks & { ttm: boolean } {
  if (!latest || !market?.aapl) return { ...books, ttm: false };
  let ttm = false;
  let baseRev = books.baseRev;
  let shares = books.shares;
  const liveTtm = ttmRevenueMm(market.aapl.revenueTtm);
  if (liveTtm && baseRev > 0 && Math.abs(liveTtm - baseRev) / baseRev < 0.35) {
    baseRev = liveTtm;
    ttm = true;
  }
  if (market.aapl.sharesOut != null && market.aapl.sharesOut > 1e8) {
    shares = market.aapl.sharesOut / 1e6;
  }
  return { ...books, baseRev, shares, ttm };
}

export function snapshotName(ticker: Ticker) {
  const n = UNIVERSE[ticker];
  const i = n.years.length - 1;
  return {
    ticker,
    name: n.name,
    year: n.years[i]!,
    revenue: n.revenue[i]!,
    netIncome: n.netIncome[i]!,
    gm: n.grossMargin[i]!,
    eps: n.eps[i]!,
    fcf: n.fcf[i]!,
    hero: heroLabel(n),
    heroMix: heroShare(n, i),
  };
}
