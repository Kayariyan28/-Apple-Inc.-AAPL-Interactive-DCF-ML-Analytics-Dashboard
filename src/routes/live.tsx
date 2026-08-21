import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { WEEKLY } from "@/lib/dcf/history";
import { moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { analyzeTape, snapshotFacts } from "@/lib/market/analyze";
import { briefLiveTape } from "@/lib/market/functions";
import { useMarket, useTape } from "@/lib/market/use-tape";
import { useFocusedName, useLiveBooks, useLiveDcf, useModel } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { IntradayTape } from "@/components/charts/IntradayTape";
import { TapeStatus } from "@/components/layout/TapeStatus";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, Stat } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live")({ component: LivePage });

function LivePage() {
  const market = useMarket();
  const status = useTape((s) => s.status);
  const refresh = useTape((s) => s.refresh);
  const dcf = useLiveDcf();
  const books = useLiveBooks();
  const name = useFocusedName();
  const voice = useVoice();
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  const setWacc = useModel((s) => s.setWacc);
  const input = useMemo(
    () => ({ growth, grossMargin, wacc, tgr, taxRate }),
    [growth, grossMargin, wacc, tgr, taxRate],
  );
  const analysis = useMemo(() => (market ? analyzeTape(market, input, books) : null), [market, input, books]);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefing, setBriefing] = useState(false);
  const [briefErr, setBriefErr] = useState<string | null>(null);

  const valuationCopy = {
    cheap: `The ${name.symbol} tape is offering versus cash.`,
    fair: `${name.name} tape and model are in the same room.`,
    rich: `The ${name.symbol} tape is paying a premium to cash.`,
    stretched: `The ${name.symbol} tape is a long way from the 10-K.`,
  } as const;

  if (!market) {
    return (
      <main>
        <PageHeader
          kicker={`Module 00 · ${name.symbol} live tape`}
          title={voice.liveTitle}
          lede={status === "error" ? "The tape is unreachable. Retry in a moment." : "Picking up the open feed."}
        />
      </main>
    );
  }

  const aapl = market.aapl;
  const vs = dcf.price / aapl.price - 1;
  const daily = (() => {
    if (market.daily.length > 2) return market.daily;
    const fallback = WEEKLY.slice(-18).map((p) => ({ t: p.t, close: p.close, label: p.date }));
    const last = fallback[fallback.length - 1];
    if (name.symbol !== "AAPL") {
      return name.years.map((y, i) => ({ t: Date.UTC(y, 8, 28), close: name.price[i]!, label: String(y) }));
    }
    if (!last || Math.abs(last.close - aapl.price) < 0.05) return fallback;
    return [...fallback, { t: aapl.asOfMs || last.t + 1, close: aapl.price, label: "Live" }];
  })();

  async function onBrief() {
    if (!market || !analysis) return;
    setBriefing(true);
    setBriefErr(null);
    try {
      const res = await briefLiveTape({
        data: { facts: snapshotFacts(market, input, dcf.price, books) },
      });
      if (res.ok) setBrief(res.text);
      else setBriefErr(res.error);
    } catch {
      setBriefErr("Briefing failed.");
    } finally {
      setBriefing(false);
    }
  }

  return (
    <main>
      <PageHeader
        kicker={`Module 00 · ${name.symbol} live tape`}
        title={voice.liveTitle}
        lede={voice.liveLede}
      />
      <PageBody>
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <TapeStatus session={aapl.session} stale={market.stale} />
              <p className="mt-3 font-sans text-5xl font-medium tracking-tight tabular md:text-6xl">
                {moneyShare(aapl.price)}
              </p>
              <p className={cn("mt-2 text-sm tabular", aapl.changePct >= 0 ? "text-up" : "text-down")}>
                {aapl.change >= 0 ? "+" : ""}
                {aapl.change.toFixed(2)} ({pct(aapl.changePct)}) · {aapl.asOf || "NASDAQ"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {name.symbol} · {market.source}
                {aapl.asOf ? ` · ${aapl.asOf}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {analysis ? (
                <Badge variant={analysis.valuation === "cheap" ? "up" : analysis.valuation === "fair" ? "outline" : "down"}>
                  {analysis.valuation}
                </Badge>
              ) : null}
              <Button variant="secondary" size="sm" onClick={() => void refresh(name.symbol)} className="gap-2">
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            </div>
          </div>
          {analysis ? (
            <p className="mt-6 max-w-2xl font-serif text-2xl font-medium leading-snug tracking-tight">
              {valuationCopy[analysis.valuation]}
            </p>
          ) : null}
        </Panel>

        <IntradayTape intraday={market.intraday} daily={daily} prevClose={aapl.previousClose} />

        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={`${name.symbol} DCF vs tape`}
              value={pct(vs)}
              hint={`${moneyShare(dcf.price)} implied`}
              tone={vs >= 0 ? "up" : "down"}
            />
            <Stat
              label="Implied WACC"
              value={analysis ? pctPlain(analysis.impliedWacc) : "—"}
              hint={`Model ${pctPlain(wacc)}`}
            />
            <Stat
              label="Live CAPM WACC"
              value={analysis ? pctPlain(analysis.capmWacc) : "—"}
              hint={analysis ? `rf ${pctPlain(analysis.rf)} · β ${analysis.beta.toFixed(2)}` : undefined}
            />
            <Stat
              label="Implied 5y growth"
              value={analysis ? pctPlain(analysis.impliedGrowth) : "—"}
              hint={`Uniform CAGR to hit the ${name.symbol} tape`}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {analysis ? (
              <Button size="sm" variant="secondary" onClick={() => setWacc(Math.round(analysis.capmWacc * 200) / 200)}>
                Apply live WACC
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" asChild>
              <Link to="/dcf">Open the DCF</Link>
            </Button>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-3">
          <MacroCard label="10-year" quote={market.tenYear} suffix="%" yieldMode />
          <MacroCard label="VIX" quote={market.vix} />
          <MacroCard label="S&P 500" quote={market.spx} />
        </div>

        {analysis ? (
          <Panel>
            <h3 className="text-lg font-medium tracking-tight">{name.name} live reading</h3>
            <ul className="mt-5 space-y-5">
              {analysis.findings.map((f) => (
                <li key={f.kicker}>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{f.kicker}</p>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
            {analysis.impliedTgr == null ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Terminal growth cannot be the bridge at {pctPlain(wacc)} WACC. Net cash on the {name.symbol} 10-K is{" "}
                {((books.cash - books.debt) / 1000).toFixed(0)}B; the tape is not about the balance sheet.
              </p>
            ) : null}
            {aapl.sharesOut ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Diluted shares on the feed: {(aapl.sharesOut / 1e9).toFixed(2)}B · {name.symbol} 10-K snapshot{" "}
                {(books.shares / 1000).toFixed(2)}B.
              </p>
            ) : null}
          </Panel>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium tracking-tight">Peers on the same feed</h3>
              <p className="text-xs text-muted-foreground">Session</p>
            </div>
            <ul className="mt-2">
              {market.peers.map((p) => (
                <li key={p.symbol} className="flex items-center justify-between gap-3 border-t border-border py-3.5">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="tabular text-xs text-muted-foreground">
                      {p.symbol} · {moneyShare(p.price)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs tabular",
                      p.changePct >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down",
                    )}
                  >
                    {pct(p.changePct)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <h3 className="text-lg font-medium tracking-tight">{name.symbol} tape notes</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ["P/E", aapl.pe != null ? aapl.pe.toFixed(1) : "—"],
                ["EPS (ttm)", aapl.eps != null ? `$${aapl.eps.toFixed(2)}` : "—"],
                ["Gross margin", aapl.grossMarginTtm != null ? pctPlain(aapl.grossMarginTtm) : "—"],
                ["52-week", aapl.low52 && aapl.high52 ? `${moneyShare(aapl.low52)} – ${moneyShare(aapl.high52)}` : "—"],
                ["Mkt cap", aapl.mktCap != null ? `$${(aapl.mktCap / 1e12).toFixed(2)}T` : "—"],
                ["Volume", aapl.volume ? aapl.volume.toLocaleString("en-US") : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium tracking-tight">Open {name.name} headlines</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Google News RSS for {name.symbol}. Not a sentiment score.
              </p>
            </div>
          </div>
          {market.news.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No headlines in this refresh.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {market.news.map((n) => (
                <li key={n.url} className="py-3">
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm leading-snug group-hover:underline">{n.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {n.source}
                        {n.published ? ` · ${n.published.replace(/ \+0000$/, "")}` : ""}
                      </p>
                    </div>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <h3 className="text-lg font-medium tracking-tight">Editor’s brief</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Optional. Runs once when you ask — it does not sit on the refresh loop.
          </p>
          {brief ? (
            <blockquote className="mt-5 max-w-3xl font-serif text-2xl font-medium leading-snug tracking-tight">
              {brief}
            </blockquote>
          ) : null}
          {briefErr ? <p className="mt-3 text-sm text-down">{briefErr}</p> : null}
          <Button className="mt-5" variant="secondary" size="sm" disabled={briefing} onClick={() => void onBrief()}>
            {briefing ? "Briefing…" : brief ? "Refresh brief" : `Brief the ${name.symbol} tape`}
          </Button>
        </Panel>
      </PageBody>
    </main>
  );
}

function MacroCard({
  label,
  quote,
  suffix,
  yieldMode,
}: {
  label: string;
  quote: { price: number; changePct: number; name: string; asOf: string } | null;
  suffix?: string;
  yieldMode?: boolean;
}) {
  if (!quote) {
    return (
      <Panel>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 text-sm text-muted-foreground">Not in this feed.</p>
      </Panel>
    );
  }
  const display = yieldMode ? `${quote.price.toFixed(3)}${suffix ?? ""}` : quote.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return (
    <Panel>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-sans text-2xl font-medium tracking-tight tabular">{display}</p>
      <p className={cn("mt-1 text-xs tabular", quote.changePct >= 0 ? "text-up" : "text-down")}>{pct(quote.changePct)}</p>
    </Panel>
  );
}
