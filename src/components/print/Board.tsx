import { useEffect, useMemo, useState } from "react";
import { booksForYear, growthFromYear, LAST_YEAR_INDEX, marginForYear } from "@/lib/dcf/books";
import { runDcf } from "@/lib/dcf/engine";
import { billions, moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { heroLabel, heroShare, isTicker, mixDollars } from "@/lib/desk/universe";
import { liveCapm, impliedWacc } from "@/lib/market/analyze";
import type { LiveMarket, TapeBar } from "@/lib/market/types";
import type { ModelInputs } from "@/lib/dcf/engine";
import { useFocusedName, useModel } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { CandleTape } from "@/components/charts/d3/CandleTape";
import { StreamMix } from "@/components/charts/d3/StreamMix";
import { PackPeers } from "@/components/charts/d3/PackPeers";
import { cn } from "@/lib/utils";

function yoy(curr: number, prev: number) {
  return prev > 0 ? curr / prev - 1 : 0;
}

export function PrintBoard({
  market,
  tape,
  input,
}: {
  market: LiveMarket | null;
  tape: number;
  input: ModelInputs;
}) {
  const ticker = useModel((s) => s.ticker);
  const setTicker = useModel((s) => s.setTicker);
  const name = useFocusedName();
  const voice = useVoice();
  const [yearIdx, setYearIdx] = useState(LAST_YEAR_INDEX);
  const [mixKey, setMixKey] = useState<string | null>(name.heroMixId);
  const [peer, setPeer] = useState<string>(ticker);
  const [waccSrc, setWaccSrc] = useState<"capm" | "model">("capm");

  useEffect(() => {
    setYearIdx(LAST_YEAR_INDEX);
    setMixKey(name.heroMixId);
    setPeer(ticker);
  }, [ticker, name.heroMixId]);

  const a = market?.aapl;
  const latest = yearIdx === LAST_YEAR_INDEX;
  const year = name.years[yearIdx]!;
  const rev = name.revenue[yearIdx]!;
  const ni = name.netIncome[yearIdx]!;
  const hero = mixDollars(name, yearIdx, name.heroMixId);
  const gm = name.grossMargin[yearIdx]!;
  const eps = name.eps[yearIdx]!;
  const fcf = name.fcf[yearIdx]!;
  const prevRev = yearIdx > 0 ? name.revenue[yearIdx - 1]! : rev;
  const mix = heroShare(name, yearIdx);
  const live = market ? !market.stale : false;
  const histBars: TapeBar[] = name.years.map((y, i) => ({
    t: Date.UTC(y, 8, 28),
    close: name.price[i]!,
    label: String(y),
  }));

  const books = useMemo(() => booksForYear(yearIdx, market, ticker), [yearIdx, market, ticker]);
  const growth = useMemo(() => growthFromYear(yearIdx, input.growth, ticker), [yearIdx, input.growth, ticker]);
  const grossMargin = marginForYear(yearIdx, input.grossMargin, market, ticker);
  const capm = liveCapm(market, input.taxRate, tape, books);
  const dcfInput = useMemo(
    () => ({
      ...input,
      growth,
      grossMargin,
      wacc: waccSrc === "capm" ? capm.wacc : input.wacc,
    }),
    [input, growth, grossMargin, waccSrc, capm.wacc],
  );
  const dcf = useMemo(() => runDcf(dcfInput, tape, books), [dcfInput, tape, books]);
  const iw = useMemo(() => impliedWacc(dcfInput, tape, books), [dcfInput, tape, books]);

  const vs = dcf.price / tape - 1;
  const tapePrem = tape / dcf.price - 1;
  const mcap = a?.mktCap ?? tape * books.shares * 1e6;
  const hi = a?.high52 ?? null;
  const lo = a?.low52 ?? null;
  const range = hi != null && lo != null && hi > lo ? (tape - lo) / (hi - lo) : null;
  const daily = market?.daily?.length ? market.daily : [];
  const intraday = market?.intraday?.length ? market.intraday : [];
  const peers = market ? [market.aapl, ...market.peers] : [];
  const chg = a?.changePct ?? 0;
  const realizedN = growth.filter((_, k) => yearIdx + k + 1 < name.years.length).length;
  const heroName = heroLabel(name);

  const kpis = [
    { k: "Revenue", v: `$${rev.toFixed(0)}B`, d: `${pct(yoy(rev, prevRev))} YoY` },
    { k: heroName, v: `$${hero.toFixed(0)}B`, d: `${pctPlain(mix, 0)} mix` },
    { k: "Net income", v: `$${ni.toFixed(0)}B`, d: pct(yoy(ni, yearIdx > 0 ? name.netIncome[yearIdx - 1]! : ni)) },
    { k: "Diluted EPS", v: `$${eps.toFixed(2)}`, d: latest && a?.eps ? `TTM ${a.eps.toFixed(2)}` : "10-K" },
    { k: "Free cash flow", v: `$${fcf.toFixed(0)}B`, d: `${pctPlain(fcf / rev)} of sales` },
    { k: "Gross margin", v: `${gm.toFixed(1)}%`, d: books.ttm ? "TTM live" : "10-K" },
  ];

  return (
    <article className="print-frame flex flex-col gap-2 p-2">
      <header className="print-card flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {ticker} · {name.name} · 10-K and tape
            </p>
            <h2 className="mt-1 font-sans text-3xl font-medium tracking-tight md:text-4xl">
              FY{year}{" "}
              <span className="text-lg text-muted-foreground">{latest ? (books.ttm ? "TTM live" : "latest print") : "historical books"}</span>
            </h2>
          </div>
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", live ? "live-dot bg-up" : "bg-muted-foreground")} />
            {live ? a?.session ?? "live" : "last print"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 sm:grid-cols-8" role="tablist" aria-label="Fiscal year">
          {name.years.map((y, i) => {
            const on = i === yearIdx;
            return (
              <button
                key={y}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setYearIdx(i)}
                className={cn(
                  "h-11 rounded-md text-sm font-medium tabular transition-colors duration-150",
                  on ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {`FY${String(y).slice(2)}`}
              </button>
            );
          })}
        </div>
      </header>

      <section className="print-card grid grid-cols-2 gap-px overflow-hidden bg-border sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((s) => (
          <div key={s.k} className="bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.k}</p>
            <p className="mt-1 font-sans text-xl font-medium tracking-tight tabular md:text-2xl">{s.v}</p>
            <p className="mt-0.5 text-xs tabular text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </section>

      <CandleTape
        intraday={intraday}
        daily={daily}
        fallback={histBars}
        live={tape}
        prevClose={a?.previousClose ?? tape}
        dcf={dcf.price}
        high52={hi}
        low52={lo}
        asOf={a?.asOfMs ?? Date.now()}
        sessionLive={live && (a?.session === "open" || a?.session === "pre" || a?.session === "post")}
      />

      <section className="print-card grid gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Live tape</p>
          <p className="mt-1 font-sans text-2xl font-medium tracking-tight tabular">{moneyShare(tape)}</p>
          <p className={cn("mt-0.5 text-xs tabular", chg >= 0 ? "text-up" : "text-down")}>{pct(chg)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Live DCF</p>
          <p className="mt-1 font-sans text-2xl font-medium tracking-tight tabular">{moneyShare(dcf.price)}</p>
          <p className="mt-0.5 text-xs tabular text-muted-foreground">
            {waccSrc === "capm" ? "CAPM WACC" : "model WACC"} {pctPlain(dcfInput.wacc)}
          </p>
        </div>
        <div className="bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Tape vs DCF</p>
          <p className={cn("mt-1 font-sans text-2xl font-medium tracking-tight tabular", tapePrem > 0.02 ? "text-down" : tapePrem < -0.02 ? "text-up" : "")}>
            {pct(tapePrem)}
          </p>
          <p className="mt-0.5 text-xs tabular text-muted-foreground">{pct(vs)} model vs tape</p>
        </div>
        <div className="bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Implied WACC</p>
          <p className="mt-1 font-sans text-2xl font-medium tracking-tight tabular">{pctPlain(iw)}</p>
          <p className="mt-0.5 text-xs tabular text-muted-foreground">
            CAPM {pctPlain(capm.wacc)} · β {capm.beta.toFixed(2)}
          </p>
        </div>
        <div className="bg-card p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Discount rate</p>
          <div className="mt-3 flex gap-1" role="tablist" aria-label="WACC source">
            <button
              type="button"
              role="tab"
              aria-selected={waccSrc === "capm"}
              onClick={() => setWaccSrc("capm")}
              className={cn(
                "h-11 flex-1 rounded-md text-sm font-medium transition-colors duration-150",
                waccSrc === "capm" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              Live CAPM
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={waccSrc === "model"}
              onClick={() => setWaccSrc("model")}
              className={cn(
                "h-11 flex-1 rounded-md text-sm font-medium transition-colors duration-150",
                waccSrc === "model" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              Model slider
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {latest
              ? books.ttm
                ? "Base revenue is trailing twelve-month from the open feed. Shares follow the live quote."
                : "Base revenue is the latest 10-K. Shares follow the live quote when the tape has them."
              : `${realizedN} year${realizedN === 1 ? "" : "s"} of printed growth, then the model path. Cash and debt from that 10-K.`}
          </p>
        </div>
        <div className="bg-card p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Live context</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs tabular sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Market cap</dt>
              <dd className="font-medium">${(mcap / 1e12).toFixed(2)}T</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">P/E</dt>
              <dd className="font-medium">{a?.pe != null ? a.pe.toFixed(1) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">10-year</dt>
              <dd className="font-medium">{pctPlain(capm.rf)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">52-week</dt>
              <dd className="font-medium">{range != null ? pctPlain(range) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">SPX today</dt>
              <dd className={cn("font-medium", (market?.spx?.changePct ?? 0) >= 0 ? "text-up" : "text-down")}>
                {market?.spx ? pct(market.spx.changePct) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">VIX</dt>
              <dd className="font-medium">{market?.vix ? market.vix.price.toFixed(1) : "—"}</dd>
            </div>
          </dl>
          {hi != null && lo != null ? (
            <div className="mt-4">
              <RangeTrack lo={lo} hi={hi} tape={tape} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-2 lg:grid-cols-2">
        <div className="print-card deck-paper p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-paper-muted">{name.symbol} revenue mix</p>
              <p className="mt-1 text-sm text-ink/80">{voice.mixLede}</p>
            </div>
            <p className="font-sans text-4xl font-medium tracking-tight tabular text-ink">{pctPlain(mix, 0)}</p>
          </div>
          <div className="mt-3">
            <StreamMix
              isolate={mixKey}
              onIsolate={setMixKey}
              yearIndex={yearIdx}
              onYear={setYearIdx}
              heightClass="h-48 md:h-56"
            />
          </div>
        </div>
        <div className="print-card bg-card p-4 md:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Mega-cap tape</p>
          <p className="mt-1 text-sm text-muted-foreground">{voice.peersHint}</p>
          <div className="mt-4">
            {peers.length ? (
              <PackPeers
                names={peers}
                selected={peer}
                focus={ticker}
                onSelect={(s) => {
                  setPeer(s);
                  if (isTicker(s)) setTicker(s);
                }}
              />
            ) : (
              <p className="mt-8 text-sm text-muted-foreground">Waiting on the open feed.</p>
            )}
          </div>
        </div>
      </section>

      <p className="px-3 pb-2 text-xs leading-relaxed text-muted-foreground">
        FY{year} {name.symbol} books: revenue {billions(rev * 1000, 1)}, net income {billions(ni * 1000, 1)}, EPS ${eps.toFixed(2)},
        FCF ${fcf.toFixed(0)}B. DCF uses {books.ttm ? "live TTM revenue" : "that 10-K"} and the open tape
        ({moneyShare(tape)}). Educational model, not advice.
      </p>
    </article>
  );
}

function RangeTrack({ lo, hi, tape }: { lo: number; hi: number; tape: number }) {
  const u = hi > lo ? Math.max(0, Math.min(1, (tape - lo) / (hi - lo))) : 0.5;
  return (
    <div>
      <div className="flex justify-between text-xs tabular text-muted-foreground">
        <span>{moneyShare(lo)}</span>
        <span>52-week</span>
        <span>{moneyShare(hi)}</span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-full bg-secondary">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${u * 100}%` }} />
        <div
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
          style={{ left: `${u * 100}%` }}
        />
      </div>
    </div>
  );
}
