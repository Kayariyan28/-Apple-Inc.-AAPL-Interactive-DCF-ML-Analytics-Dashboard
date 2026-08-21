import { FORECAST_LABELS } from "@/lib/dcf/constants";
import { booksForYear, LAST_YEAR_INDEX } from "@/lib/dcf/books";
import { runDcf, type ModelInputs } from "@/lib/dcf/engine";
import { UNIVERSE, heroLabel, pnlRows, type Ticker } from "@/lib/desk/universe";
import type { LiveMarket } from "@/lib/market/types";

export type TableSpec = {
  name: string;
  header: string[];
  rows: (string | number)[][];
  note: string;
};

function n(v: number, d = 4) {
  if (!Number.isFinite(v)) return "";
  return Number(v.toFixed(d));
}

export function tableHist(ticker: Ticker = "AAPL"): TableSpec {
  const name = UNIVERSE[ticker];
  const hero = name.heroMixId;
  return {
    name: "hist",
    header: ["year", "revenue", "netIncome", "gm", "hero", "eps", "price", "opIncome"],
    rows: name.years.map((y, i) => [
      y,
      n(name.revenue[i]!, 2),
      n(name.netIncome[i]!, 2),
      n(name.grossMargin[i]!, 2),
      n(name.revenue[i]! * (name.mix[i]?.shares[hero] ?? 0), 2),
      n(name.eps[i]!, 2),
      n(name.price[i]!, 2),
      n(name.opIncome[i]!, 2),
    ]),
    note: `${ticker} FY 10-K prints. revenue/netIncome/hero/opIncome $B, gm %, price year-end. hero = ${heroLabel(name)}.`,
  };
}

export function tableMix(ticker: Ticker = "AAPL"): TableSpec {
  const name = UNIVERSE[ticker];
  const ids = name.mixKeys.map((k) => k.id);
  return {
    name: "mix",
    header: ["year", ...ids],
    rows: name.mix.map((r) => [r.year, ...ids.map((id) => n(r.shares[id] ?? 0, 4))]),
    note: `${ticker} share of total revenue. Fractions, not percents.`,
  };
}

export function tablePnl(ticker: Ticker = "AAPL"): TableSpec {
  const rows = pnlRows(ticker);
  return {
    name: "pnl",
    header: ["year", "rev", "gp", "ebitda", "ebit", "ebt", "ni"],
    rows: rows.map((p) => [p.year, n(p.rev, 2), n(p.gp, 2), n(p.ebitda, 2), n(p.ebit, 2), n(p.ebt, 2), n(p.ni, 2)]),
    note: `${ticker} P&L funnel, $B.`,
  };
}

export function tableCash(ticker: Ticker = "AAPL"): TableSpec {
  const name = UNIVERSE[ticker];
  return {
    name: "cash",
    header: ["year", "cash", "buybacks", "capex", "fcf"],
    rows: name.years.map((y, i) => [
      y,
      n(name.cash[i]!, 2),
      n(name.buybacks[i]!, 2),
      n(name.capex[i]!, 2),
      n(name.fcf[i]!, 2),
    ]),
    note: `${ticker} cash, buybacks, capex, FCF. $B.`,
  };
}

export function tableTape(market: LiveMarket | null, tape: number): TableSpec {
  const daily = market?.daily ?? [];
  const rows: (string | number)[][] = daily.map((b, i) => {
    const prev = daily[i - 1]?.close;
    const ret = prev && prev > 0 ? b.close / prev - 1 : 0;
    return [i + 1, b.label, n(b.close, 4), n(ret, 6)];
  });
  if (!rows.length) {
    rows.push([1, "tape", n(tape, 4), 0]);
  }
  return {
    name: "tape",
    header: ["i", "label", "close", "ret"],
    rows,
    note: "Daily closes from the open feed. ret is close-to-close.",
  };
}

export function tablePeers(market: LiveMarket | null): TableSpec {
  const names = market ? [market.aapl, ...market.peers] : [];
  return {
    name: "peers",
    header: ["sym", "price", "chg", "pe", "mcap"],
    rows: names.map((q) => [
      q.symbol,
      n(q.price, 4),
      n(q.changePct, 6),
      q.pe != null ? n(q.pe, 2) : "",
      q.mktCap != null ? n(q.mktCap / 1e9, 2) : "",
    ]),
    note: "Live mega-cap tape. mcap $B.",
  };
}

export function tableFcf(input: ModelInputs, tape: number, ticker: Ticker = "AAPL", market: LiveMarket | null = null): TableSpec {
  const books = booksForYear(LAST_YEAR_INDEX, market, ticker);
  const dcf = runDcf(input, tape, books);
  return {
    name: "fcf",
    header: ["year", "revenue", "ebit", "fcf", "pv"],
    rows: dcf.fcf.map((f, i) => [
      (dcf.years[i] as string) ?? FORECAST_LABELS[i] ?? String(i),
      n(dcf.revenue[i]! / 1000, 3),
      n((dcf.ebit[i] ?? 0) / 1000, 3),
      n(f / 1000, 3),
      n((dcf.pvFcf[i] ?? 0) / 1000, 3),
    ]),
    note: `${ticker} live DCF build. $B. pv is discounted FCF.`,
  };
}

export function tableIntraday(market: LiveMarket | null): TableSpec {
  const bars = market?.intraday ?? [];
  return {
    name: "intraday",
    header: ["i", "label", "close", "ret"],
    rows: bars.map((b, i) => {
      const prev = bars[i - 1]?.close;
      const ret = prev && prev > 0 ? b.close / prev - 1 : 0;
      return [i + 1, b.label, n(b.close, 4), n(ret, 6)];
    }),
    note: "Session bars. Empty when the cash session is closed.",
  };
}

const CATALOG = ["hist", "mix", "pnl", "cash", "tape", "peers", "fcf", "intraday"] as const;
export type TableName = (typeof CATALOG)[number];

export function listTables() {
  return [...CATALOG];
}

export function renderTable(spec: TableSpec): string[] {
  const head = spec.header.join("  ");
  const rows = spec.rows.map((r) => r.map((c) => String(c)).join("  "));
  return [head, ...rows];
}

export function getTable(
  name: string,
  ctx: { input: ModelInputs; tape: number; market: LiveMarket | null; ticker?: Ticker },
): TableSpec | null {
  const ticker = ctx.ticker ?? "AAPL";
  switch (name.toLowerCase()) {
    case "hist":
    case "10k":
      return tableHist(ticker);
    case "mix":
    case "segment":
      return tableMix(ticker);
    case "pnl":
    case "funnel":
      return tablePnl(ticker);
    case "cash":
    case "buyback":
      return tableCash(ticker);
    case "tape":
    case "daily":
      return tableTape(ctx.market, ctx.tape);
    case "peers":
    case "comp":
      return tablePeers(ctx.market);
    case "fcf":
    case "dcf":
      return tableFcf(ctx.input, ctx.tape, ticker, ctx.market);
    case "intraday":
    case "session":
      return tableIntraday(ctx.market);
    default:
      return null;
  }
}
