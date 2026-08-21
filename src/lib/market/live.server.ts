import { CURRENT_PRICE, PEERS, SHARES, WEEK_52_HIGH, WEEK_52_LOW } from "@/lib/dcf/constants";
import { TICKERS, UNIVERSE, parseTicker, type Ticker } from "@/lib/desk/universe";
import { asList, mapSession, parseNumber, parseRatio, rec, str } from "./parse";
import type { LiveMarket, Quote, TapeBar, TapeNews } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const CNBC_SYMBOLS = "AAPL|MSFT|GOOGL|AMZN|NVDA|.SPX|.VIX|US10Y";
const CNBC_URL =
  "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol" +
  `?symbols=${encodeURIComponent(CNBC_SYMBOLS)}&requestMethod=itv&noform=1&partnerId=2&output=json&fundamentals=1&exthrs=1`;

const TTL_MS = 12_000;
const caches = new Map<Ticker, { at: number; data: LiveMarket }>();
let quotesCache: { at: number; quotes: Quote[]; session: Quote["session"] } | null = null;

async function pull(url: string, headers: Record<string, string>, timeoutMs: number, json: boolean) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return json ? await res.json() : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function pullRetry(url: string, headers: Record<string, string>, timeoutMs: number, json: boolean) {
  try {
    return await pull(url, headers, timeoutMs, json);
  } catch {
    return await pull(url, headers, timeoutMs, json);
  }
}

function quoteFromCnbc(raw: unknown, session: Quote["session"]): Quote | null {
  const q = rec(raw);
  if (!q) return null;
  const rawSym = str(q.symbol).replace(/^\./, "").toUpperCase();
  const symbol = rawSym === "GOOG" ? "GOOGL" : rawSym;
  const price = parseNumber(q.last);
  if (!symbol || price == null) return null;
  const prev = parseNumber(q.previous_day_closing) ?? price;
  const change = parseNumber(q.change) ?? price - prev;
  const changePct = parseRatio(q.change_pct) ?? (prev ? change / prev : 0);
  const ext = rec(q.ExtendedMktQuote);
  const extPrice = ext ? parseNumber(ext.last) : null;
  const useExt = (session === "pre" || session === "post") && extPrice != null && Math.abs(extPrice - price) > 0.005;
  const asOf = str(q.last_timedate) || str(q.last_time);
  const name = UNIVERSE[symbol as Ticker]?.name || str(q.name) || symbol;
  return {
    symbol,
    name,
    price: useExt ? extPrice! : price,
    change: useExt && ext ? (parseNumber(ext.change) ?? change) : change,
    changePct: useExt && ext ? (parseRatio(ext.change_pct) ?? changePct) : changePct,
    previousClose: prev,
    volume: parseNumber(q.volume) ?? 0,
    pe: parseNumber(q.pe),
    beta: parseNumber(q.beta),
    eps: parseNumber(q.eps),
    mktCap: parseNumber(q.mktcapView),
    sharesOut: parseNumber(q.sharesout),
    high52: parseNumber(q.yrhiprice),
    low52: parseNumber(q.yrloprice),
    dividendYield: parseRatio(q.dividendyield),
    grossMarginTtm: parseRatio(q.GROSMGNTTM),
    revenueTtm: parseNumber(q.revenuettm),
    session,
    asOf,
    asOfMs: Date.parse(str(q.last_time)) || Date.now(),
  };
}

function fallbackQuote(ticker: Ticker = "AAPL"): Quote {
  const n = UNIVERSE[ticker];
  const last = n.price[n.price.length - 1]!;
  const shares = n.shares[n.shares.length - 1]!;
  const eps = n.eps[n.eps.length - 1]!;
  return {
    symbol: ticker,
    name: n.name,
    price: ticker === "AAPL" ? CURRENT_PRICE : last,
    change: 0,
    changePct: 0,
    previousClose: ticker === "AAPL" ? CURRENT_PRICE : last,
    volume: 0,
    pe: eps > 0 ? last / eps : null,
    beta: 1.1,
    eps,
    mktCap: last * shares * 1e6,
    sharesOut: shares * 1e6,
    high52: ticker === "AAPL" ? WEEK_52_HIGH : last,
    low52: ticker === "AAPL" ? WEEK_52_LOW : last * 0.6,
    dividendYield: null,
    grossMarginTtm: n.grossMargin[n.grossMargin.length - 1]! / 100,
    revenueTtm: n.revenue[n.revenue.length - 1]! * 1e9,
    session: "closed",
    asOf: "FY snapshot",
    asOfMs: 0,
  };
}

function fallbackPeer(p: (typeof PEERS)[number]): Quote {
  return {
    ...fallbackQuote(p.ticker as Ticker),
    symbol: p.ticker,
    name: p.name,
    price: p.price,
    change: p.price * p.change,
    changePct: p.change,
    previousClose: p.price / (1 + p.change),
    pe: null,
    beta: null,
    eps: null,
    mktCap: null,
    sharesOut: null,
    high52: null,
    low52: null,
  };
}

function fallbackMarket(ticker: Ticker = "AAPL"): LiveMarket {
  const focus = fallbackQuote(ticker);
  const peers = TICKERS.filter((s) => s !== ticker).map((s) => {
    const canned = PEERS.find((p) => p.ticker === s);
    return canned ? fallbackPeer(canned) : fallbackQuote(s);
  });
  return {
    ticker,
    aapl: focus,
    peers,
    spx: null,
    vix: null,
    tenYear: null,
    rf: 0.045,
    intraday: [],
    daily: [],
    news: [],
    source: "FY snapshot",
    fetchedAt: Date.now(),
    stale: true,
  };
}

function innerTag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return "";
  return m[1]!.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function decodeXml(s: string) {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'");
}

function parseNews(xml: string): TapeNews[] {
  const items: TapeNews[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && items.length < 8) {
    const block = m[1]!;
    const title = decodeXml(innerTag(block, "title"));
    if (!title) continue;
    const published = innerTag(block, "pubDate");
    items.push({
      title,
      source: decodeXml(innerTag(block, "source")) || "News",
      url: innerTag(block, "link"),
      published,
      publishedMs: Date.parse(published) || 0,
    });
  }
  return items;
}

function parseIntraday(raw: unknown): TapeBar[] {
  const data = rec(rec(raw)?.data);
  const rows = asList(data?.chart);
  const out: TapeBar[] = [];
  for (const item of rows) {
    const row = rec(item);
    if (!row) continue;
    const t = typeof row.x === "number" ? row.x : parseNumber(row.x);
    const close = typeof row.y === "number" ? row.y : parseNumber(row.y);
    if (t == null || close == null) continue;
    const z = rec(row.z);
    out.push({ t, close, label: str(z?.dateTime) });
  }
  return out;
}

function parseDaily(raw: unknown): TapeBar[] {
  const data = rec(rec(raw)?.data);
  const rows = asList(rec(rec(data)?.tradesTable)?.rows);
  const out: TapeBar[] = [];
  for (const row of rows) {
    const r = rec(row);
    if (!r) continue;
    const date = str(r.date);
    const close = parseNumber(r.close);
    if (!date || close == null) continue;
    const t = Date.parse(date);
    const open = parseNumber(r.open);
    const high = parseNumber(r.high);
    const low = parseNumber(r.low);
    const volume = parseNumber(r.volume);
    out.push({
      t: Number.isFinite(t) ? t : 0,
      close,
      label: date,
      open: open ?? undefined,
      high: high ?? undefined,
      low: low ?? undefined,
      volume: volume ?? undefined,
    });
  }
  return out.reverse();
}

function sessionFromNasdaq(raw: unknown): Quote["session"] {
  const status = str(rec(rec(raw)?.data)?.marketStatus);
  return mapSession(status);
}

function quoteFromNasdaqInfo(raw: unknown, session: Quote["session"], ticker: Ticker): Quote | null {
  const data = rec(rec(raw)?.data);
  const primary = rec(data?.primaryData);
  if (!primary) return null;
  const price = parseNumber(primary.lastSalePrice);
  if (price == null) return null;
  const change = parseNumber(primary.netChange) ?? 0;
  const changePct = parseRatio(primary.percentageChange) ?? 0;
  const prev = parseNumber(data?.previousClose) ?? price - change;
  return {
    ...fallbackQuote(ticker),
    price,
    change,
    changePct,
    previousClose: prev,
    volume: parseNumber(primary.volume) ?? 0,
    session,
    asOf: str(primary.lastTradeTimestamp) || str(data?.timeAsOf),
    asOfMs: Date.now(),
  };
}

async function pullQuotes(): Promise<{ quotes: Quote[]; session: Quote["session"] }> {
  if (quotesCache && Date.now() - quotesCache.at < TTL_MS) return quotesCache;
  const nqHeaders = {
    Accept: "application/json",
    "User-Agent": UA,
    Origin: "https://www.nasdaq.com",
    Referer: "https://www.nasdaq.com/",
  };
  const cnbcHeaders = { Accept: "application/json", "User-Agent": UA };
  const [cnbcR, infoR] = await Promise.allSettled([
    pullRetry(CNBC_URL, cnbcHeaders, 8000, true),
    pull("https://api.nasdaq.com/api/quote/AAPL/info?assetclass=stocks", nqHeaders, 6000, true),
  ]);
  const session = infoR.status === "fulfilled" ? sessionFromNasdaq(infoR.value) : "closed";
  const quotes: Quote[] = [];
  if (cnbcR.status === "fulfilled") {
    const payload = rec(cnbcR.value);
    const list = asList(rec(payload?.FormattedQuoteResult)?.FormattedQuote);
    for (const item of list) {
      const q = quoteFromCnbc(item, session);
      if (q) quotes.push(q);
    }
  }
  quotesCache = { at: Date.now(), quotes, session };
  return quotesCache;
}

async function pullLive(ticker: Ticker): Promise<LiveMarket> {
  const nqHeaders = {
    Accept: "application/json",
    "User-Agent": UA,
    Origin: "https://www.nasdaq.com",
    Referer: "https://www.nasdaq.com/",
  };
  const to = new Date();
  const from = new Date(to.getTime() - 370 * 86_400_000);
  const nqChart = `https://api.nasdaq.com/api/quote/${ticker}/chart?assetclass=stocks`;
  const nqInfo = `https://api.nasdaq.com/api/quote/${ticker}/info?assetclass=stocks`;
  const histUrl =
    `https://api.nasdaq.com/api/quote/${ticker}/historical?assetclass=stocks` +
    `&fromdate=${from.toISOString().slice(0, 10)}&todate=${to.toISOString().slice(0, 10)}`;
  const newsQ = UNIVERSE[ticker].news;
  const newsUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(newsQ)}&hl=en-US&gl=US&ceid=US:en`;

  const [bundle, chartR, infoR, histR, newsR] = await Promise.allSettled([
    pullQuotes(),
    pull(nqChart, nqHeaders, 8000, true),
    pull(nqInfo, nqHeaders, 6000, true),
    pull(histUrl, nqHeaders, 8000, true),
    pull(newsUrl, { Accept: "application/rss+xml, application/xml, text/xml", "User-Agent": UA }, 8000, false),
  ]);

  const quotes = bundle.status === "fulfilled" ? bundle.value.quotes : [];
  const session =
    infoR.status === "fulfilled"
      ? sessionFromNasdaq(infoR.value)
      : bundle.status === "fulfilled"
        ? bundle.value.session
        : "closed";

  const by = new Map(quotes.map((q) => [q.symbol, q]));
  let focus = by.get(ticker) ?? null;
  if (!focus && infoR.status === "fulfilled") focus = quoteFromNasdaqInfo(infoR.value, session, ticker);
  if (!focus) throw new Error(`${ticker} quote missing`);

  if (infoR.status === "fulfilled") {
    const info = rec(rec(infoR.value)?.data);
    const primary = rec(info?.primaryData);
    const last = parseNumber(primary?.lastSalePrice);
    if (last != null) focus.price = last;
    const chg = parseNumber(primary?.netChange);
    const pctChg = parseRatio(primary?.percentageChange);
    if (chg != null) focus.change = chg;
    if (pctChg != null) focus.changePct = pctChg;
    const vol = parseNumber(primary?.volume);
    if (vol != null) focus.volume = vol;
    focus.session = session;
    const prev = parseNumber(rec(info)?.previousClose);
    if (prev != null) focus.previousClose = prev;
  }
  focus.symbol = ticker;
  focus.name = UNIVERSE[ticker].name;

  const peers = TICKERS.filter((s) => s !== ticker)
    .map((s) => by.get(s) ?? null)
    .filter((q): q is Quote => q != null)
    .map((q) => ({ ...q, name: UNIVERSE[q.symbol as Ticker]?.name ?? q.name }));

  const tenYear = by.get("US10Y") ?? null;
  const rf = tenYear ? (tenYear.price > 1 ? tenYear.price / 100 : tenYear.price) : null;

  const sources: string[] = [];
  if (quotes.length) sources.push("CNBC quotes");
  const intraday = chartR.status === "fulfilled" ? parseIntraday(chartR.value) : [];
  const daily = histR.status === "fulfilled" ? parseDaily(histR.value) : [];
  const news = newsR.status === "fulfilled" && typeof newsR.value === "string" ? parseNews(newsR.value) : [];
  if (intraday.length) sources.push("Nasdaq tape");
  if (daily.length) sources.push("Nasdaq OHLC");
  if (news.length) sources.push("Google News");
  if (!sources.length) sources.push("Public market feed");

  return {
    ticker,
    aapl: focus,
    peers,
    spx: by.get("SPX") ?? null,
    vix: by.get("VIX") ?? null,
    tenYear,
    rf,
    intraday,
    daily,
    news,
    source: sources.join(" · "),
    fetchedAt: Date.now(),
    stale: false,
  };
}

export async function fetchLiveMarket(symbol: string = "AAPL"): Promise<LiveMarket> {
  const ticker = parseTicker(symbol);
  const hit = caches.get(ticker);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  try {
    const data = await pullLive(ticker);
    caches.set(ticker, { at: Date.now(), data });
    return data;
  } catch {
    if (hit) return { ...hit.data, stale: true };
    return fallbackMarket(ticker);
  }
}
