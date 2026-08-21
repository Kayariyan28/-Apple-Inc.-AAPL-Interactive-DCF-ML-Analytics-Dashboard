import type { DcfBooks } from "./engine";
import type { LiveMarket } from "@/lib/market/types";
import {
  LAST_YEAR_INDEX,
  UNIVERSE,
  dcfBooksOf,
  overlayLiveBooks,
  type Ticker,
} from "@/lib/desk/universe";

export { LAST_YEAR_INDEX, ttmRevenueMm } from "@/lib/desk/universe";

function clampIndex(i: number) {
  return Math.max(0, Math.min(LAST_YEAR_INDEX, i));
}

export function booksForYear(
  index: number,
  market?: LiveMarket | null,
  ticker: Ticker = "AAPL",
): DcfBooks & { ttm: boolean; year: number } {
  const name = UNIVERSE[ticker];
  const i = clampIndex(index);
  const latest = i === LAST_YEAR_INDEX;
  const base = dcfBooksOf(name, i);
  const live = overlayLiveBooks(base, market, latest);
  return { ...live, year: name.years[i]! };
}

/** Actual 10-K growth for years that have printed; model sliders after that. */
export function growthFromYear(index: number, forward: number[], ticker: Ticker = "AAPL"): number[] {
  const name = UNIVERSE[ticker];
  const i = clampIndex(index);
  const realized: number[] = [];
  for (let k = 0; k < 5; k++) {
    const a = i + k;
    const b = a + 1;
    if (b >= name.revenue.length) break;
    const prev = name.revenue[a]!;
    if (prev <= 0) break;
    realized.push(name.revenue[b]! / prev - 1);
  }
  const need = 5 - realized.length;
  const rest: number[] = [];
  for (let k = 0; k < need; k++) {
    rest.push(forward[k] ?? forward[forward.length - 1] ?? 0.05);
  }
  return [...realized, ...rest];
}

export function marginForYear(
  index: number,
  slider: number,
  market?: LiveMarket | null,
  ticker: Ticker = "AAPL",
): number {
  const name = UNIVERSE[ticker];
  const i = clampIndex(index);
  if (i === LAST_YEAR_INDEX) {
    const live = market?.aapl.grossMarginTtm;
    if (live != null && live > 0.15 && live < 0.9) return live;
    return slider;
  }
  return name.grossMargin[i]! / 100;
}
