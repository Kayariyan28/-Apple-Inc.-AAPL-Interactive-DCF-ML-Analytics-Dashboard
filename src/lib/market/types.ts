import type { Ticker } from "@/lib/desk/universe";

export type MarketSession = "open" | "pre" | "post" | "closed";

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  previousClose: number;
  volume: number;
  pe: number | null;
  beta: number | null;
  eps: number | null;
  mktCap: number | null;
  sharesOut: number | null;
  high52: number | null;
  low52: number | null;
  dividendYield: number | null;
  grossMarginTtm: number | null;
  revenueTtm: number | null;
  session: MarketSession;
  asOf: string;
  asOfMs: number;
};

export type TapeBar = {
  t: number;
  close: number;
  label: string;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

export type TapeNews = {
  title: string;
  source: string;
  url: string;
  published: string;
  publishedMs: number;
};

export type LiveMarket = {
  /** Focused name. `aapl` is the focused quote (legacy field name). */
  ticker: Ticker;
  aapl: Quote;
  peers: Quote[];
  spx: Quote | null;
  vix: Quote | null;
  tenYear: Quote | null;
  /** 10-year yield as a decimal (0.0469 = 4.69%). */
  rf: number | null;
  intraday: TapeBar[];
  daily: TapeBar[];
  news: TapeNews[];
  source: string;
  fetchedAt: number;
  stale: boolean;
};

export type Finding = {
  kicker: string;
  text: string;
  tone: "up" | "down" | "muted";
};

export type TapeAnalysis = {
  impliedWacc: number;
  impliedTgr: number | null;
  impliedGrowth: number;
  capmWacc: number;
  ke: number;
  rf: number;
  beta: number;
  rangePos: number | null;
  vsSpx: number | null;
  vixRegime: "quiet" | "normal" | "elevated" | "stress";
  valuation: "cheap" | "fair" | "rich" | "stretched";
  shareUplift: number | null;
  findings: Finding[];
};
