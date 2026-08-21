import { useId, useMemo, useState } from "react";
import { CURRENT_PRICE, PEERS, SHARES, WEEK_52_HIGH, WEEK_52_LOW } from "@/lib/dcf/constants";
import { money, moneyShare, pct } from "@/lib/dcf/format";
import { sliceRange, WEEKLY, type QuotePoint } from "@/lib/dcf/history";
import { useLiveDcf, useFocusedName, useStreetDcf } from "@/lib/store";
import { useMarket } from "@/lib/market/use-tape";
import { TapeStatus } from "@/components/layout/TapeStatus";
import { Segmented } from "@/components/ui/segmented";
import { Panel } from "@/components/ui/panel";
import {
  ChartFrame,
  ChartReadout,
  ChartSvg,
  ChartTip,
  Crosshair,
  ToolBar,
  ToolChip,
} from "@/components/charts/chart-kit";
import {
  areaPath,
  bandPath,
  bollinger,
  definedLine,
  fibLevels,
  linePath,
  sma,
  windowAnalytics,
  xAt,
  yAt,
} from "@/lib/charts/math";
import { cn, r } from "@/lib/utils";

type RangeKey = "6M" | "1Y" | "3Y" | "5Y" | "Max";
type SmaSet = { s20: boolean; s50: boolean; s200: boolean };

function bandFrom(
  xs: number[],
  hi: (number | null)[],
  lo: (number | null)[],
  y: (v: number) => number,
) {
  const px: number[] = [];
  const top: number[] = [];
  const bot: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const h = hi[i];
    const l = lo[i];
    if (h == null || l == null) continue;
    px.push(xs[i]!);
    top.push(y(h));
    bot.push(y(l));
  }
  return bandPath(px, top, bot);
}

export function PriceChart() {
  const gid = useId();
  const [range, setRange] = useState<RangeKey>("5Y");
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [logScale, setLogScale] = useState(false);
  const [showBb, setShowBb] = useState(false);
  const [showFv, setShowFv] = useState(true);
  const [showFib, setShowFib] = useState(false);
  const [measureOn, setMeasureOn] = useState(false);
  const [measure, setMeasure] = useState<{ a: number; b: number } | null>(null);
  const [measureA, setMeasureA] = useState<number | null>(null);
  const [smaOn, setSmaOn] = useState<SmaSet>({ s20: true, s50: true, s200: false });
  const [levels, setLevels] = useState<number[]>([]);

  const market = useMarket();
  const dcf = useLiveDcf();
  const street = useStreetDcf();
  const name = useFocusedName();
  const livePx = market?.aapl.price ?? CURRENT_PRICE;

  const series: QuotePoint[] = useMemo(() => {
    if (market?.daily?.length) {
      return market.daily.map((b) => ({ t: b.t, date: b.label, close: b.close }));
    }
    if (name.symbol !== "AAPL") {
      return name.years.map((y, i) => ({
        t: Date.UTC(y, 8, 28),
        date: String(y),
        close: name.price[i]!,
      }));
    }
    return WEEKLY;
  }, [market?.daily, name]);

  const points = useMemo(() => {
    const sliced = sliceRange(series, range);
    if (!market) return sliced;
    const last = sliced[sliced.length - 1];
    if (last && Math.abs(last.close - livePx) < 0.05) return sliced;
    return [...sliced, { t: Date.now(), date: "Live", close: livePx }];
  }, [range, market, livePx, series]);

  const view = useMemo(() => {
    if (!zoom) return points;
    const lo = Math.max(0, Math.min(zoom[0], zoom[1]));
    const hiIdx = Math.min(points.length - 1, Math.max(zoom[0], zoom[1]));
    const next = points.slice(lo, hiIdx + 1);
    return next.length > 2 ? next : points;
  }, [points, zoom]);

  const indicators = useMemo(() => {
    const full = market ? [...series, { t: Date.now(), date: "Live", close: livePx }] : series;
    const closes = full.map((p) => p.close);
    const s20 = sma(closes, 20);
    const s50 = sma(closes, 50);
    const s200 = sma(closes, 200);
    const bb = bollinger(closes, 20, 2);
    const t0 = view[0]?.t ?? 0;
    const i0 = full.findIndex((p) => p.t >= t0);
    const start = i0 < 0 ? 0 : i0;
    const take = (arr: (number | null)[]) => view.map((_, i) => arr[start + i] ?? null);
    return {
      s20: take(s20),
      s50: take(s50),
      s200: take(s200),
      bbMid: take(bb.mid),
      bbHi: take(bb.upper),
      bbLo: take(bb.lower),
    };
  }, [market, livePx, view, series]);

  const n = view.length;
  const first = view[0]?.close ?? livePx;
  const hi = Math.max(...view.map((p) => p.close));
  const loPx = Math.min(...view.map((p) => p.close));
  const pad = { l: 8, r: 10, t: 18, b: 22 };
  const yMin = loPx * 0.985;
  const yMax = hi * 1.02;
  const weeks = Math.max(1, (view[n - 1]!.t - view[0]!.t) / (7 * 24 * 3600 * 1000));
  const stats = windowAnalytics(
    view.map((p) => p.close),
    weeks,
  );

  const activeIdx = hover ?? pinned ?? n - 1;
  const active: QuotePoint = view[Math.max(0, Math.min(n - 1, activeIdx))] ?? view[n - 1]!;
  const change = active.close / first - 1;
  const down = change < 0;
  const stroke = down ? "var(--color-down)" : "var(--color-up)";
  const dayChg = market?.aapl.changePct ?? change;
  const shares = market?.aapl.sharesOut ?? SHARES * 1e6;
  const mktCap = (livePx * shares) / 1e12;
  const pe = market?.aapl.pe ?? livePx / 7.4;
  const high52 = market?.aapl.high52 ?? WEEK_52_HIGH;
  const low52 = market?.aapl.low52 ?? WEEK_52_LOW;
  const peerRows = market?.peers.length
    ? market.peers.map((p) => ({ key: p.symbol, name: p.name, price: p.price, changePct: p.changePct }))
    : PEERS.map((p) => ({ key: p.ticker, name: p.name, price: p.price, changePct: p.change }));

  function resetWindow() {
    setZoom(null);
    setMeasure(null);
    setMeasureA(null);
    setPinned(null);
    setLevels([]);
  }

  function onCommit(i: number) {
    if (measureOn) {
      if (measureA == null) {
        setMeasureA(i);
        setMeasure(null);
      } else {
        setMeasure({ a: measureA, b: i });
        setMeasureA(null);
        setMeasureOn(false);
      }
      return;
    }
    setPinned((p) => (p === i ? null : i));
  }

  const fib = showFib ? fibLevels(loPx, hi) : [];

  return (
    <Panel className="overflow-hidden p-0 md:p-0">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{name.name}</p>
              <TapeStatus
                session={market?.aapl.session ?? "closed"}
                stale={market?.stale ?? true}
                className="mt-1"
              />
              <p className="mt-3 font-sans text-5xl font-medium tracking-tight tabular md:text-6xl">
                {moneyShare(hover != null || pinned != null ? active.close : livePx)}
              </p>
              <p className={cn("mt-2 text-sm tabular", (hover != null || pinned != null ? down : dayChg < 0) ? "text-down" : "text-up")}>
                {hover != null || pinned != null
                  ? `${money(active.close - first, 2)} (${pct(change)}) · ${active.date}`
                  : `${pct(dayChg)} session · ${range} from ${moneyShare(first)}`}
              </p>
            </div>
            <Segmented<RangeKey>
              size="sm"
              value={range}
              onChange={(v) => {
                setRange(v);
                resetWindow();
              }}
              options={[
                { value: "6M", label: "6M" },
                { value: "1Y", label: "1Y" },
                { value: "3Y", label: "3Y" },
                { value: "5Y", label: "5Y" },
                { value: "Max", label: "Max" },
              ]}
            />
          </div>

          <ToolBar className="mt-5">
            <ToolChip on={smaOn.s20} onClick={() => setSmaOn((s) => ({ ...s, s20: !s.s20 }))} title="20-week average">
              SMA 20
            </ToolChip>
            <ToolChip on={smaOn.s50} onClick={() => setSmaOn((s) => ({ ...s, s50: !s.s50 }))} title="50-week average">
              SMA 50
            </ToolChip>
            <ToolChip on={smaOn.s200} onClick={() => setSmaOn((s) => ({ ...s, s200: !s.s200 }))} title="200-week average">
              SMA 200
            </ToolChip>
            <ToolChip on={showBb} onClick={() => setShowBb((v) => !v)} title="Bollinger bands ±2σ">
              Bands
            </ToolChip>
            <ToolChip on={logScale} onClick={() => setLogScale((v) => !v)} title="Logarithmic price scale">
              Log
            </ToolChip>
            <ToolChip on={showFv} onClick={() => setShowFv((v) => !v)} title="DCF fair value overlay">
              DCF
            </ToolChip>
            <ToolChip on={showFib} onClick={() => setShowFib((v) => !v)} title="Fibonacci retracement of the window">
              Fib
            </ToolChip>
            <ToolChip
              on={measureOn}
              onClick={() => {
                setMeasureOn((v) => !v);
                setMeasureA(null);
              }}
              title="Click two prints to measure"
            >
              Measure
            </ToolChip>
            <ToolChip
              on={false}
              onClick={() => {
                const px = active.close;
                setLevels((ls) =>
                  ls.some((lv) => Math.abs(lv - px) / px < 0.004)
                    ? ls.filter((lv) => Math.abs(lv - px) / px >= 0.004)
                    : [...ls, px],
                );
              }}
              title="Pin a horizontal level at the cursor"
            >
              Level
            </ToolChip>
            {(zoom || measure || levels.length > 0) && (
              <ToolChip on={false} onClick={resetWindow} title="Clear zoom, measure and levels">
                Reset
              </ToolChip>
            )}
          </ToolBar>

          <ChartFrame className="mt-4" heightClass="h-52 md:h-72">
            {({ w, h }) => {
              const xs = view.map((_, i) => xAt(i, n, pad.l, pad.r, w));
              const y = (v: number) => yAt(v, yMin, yMax, pad.t, pad.b, h, logScale);
              const ys = view.map((p) => y(p.close));
              const xi = xs[Math.max(0, Math.min(n - 1, activeIdx))] ?? xs[n - 1]!;
              const yi = y(active.close);
              const xPct = (xi / w) * 100;
              return (
                <>
                  <ChartSvg
                    viewW={w}
                    viewH={h}
                    n={n}
                    pad={pad}
                    index={hover}
                    label={`${name.symbol} price history`}
                    brushable={!measureOn}
                    onIndex={setHover}
                    onCommit={onCommit}
                    onBrush={(a, b) => {
                      setZoom([Math.min(a, b), Math.max(a, b)]);
                    }}
                    onDoubleReset={resetWindow}
                  >
                    <defs>
                      <linearGradient id={`${gid}-fill`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {showBb ? (
                      <g className="pointer-events-none">
                        <path d={bandFrom(xs, indicators.bbHi, indicators.bbLo, y)} fill="var(--color-accent)" opacity="0.1" />
                        <path d={definedLine(xs, indicators.bbHi, y)} fill="none" stroke="var(--color-accent)" strokeOpacity="0.4" strokeDasharray="3 4" />
                        <path d={definedLine(xs, indicators.bbLo, y)} fill="none" stroke="var(--color-accent)" strokeOpacity="0.4" strokeDasharray="3 4" />
                      </g>
                    ) : null}
                    <path d={areaPath(xs, ys, h - pad.b)} fill={`url(#${gid}-fill)`} className="pointer-events-none" />
                    <path d={linePath(xs, ys)} fill="none" stroke={stroke} strokeWidth="2.2" className="pointer-events-none" />
                    {smaOn.s20 ? (
                      <path d={definedLine(xs, indicators.s20, y)} fill="none" stroke="var(--color-chart-1)" strokeWidth="1.4" className="pointer-events-none" />
                    ) : null}
                    {smaOn.s50 ? (
                      <path d={definedLine(xs, indicators.s50, y)} fill="none" stroke="var(--color-chart-2)" strokeWidth="1.4" className="pointer-events-none" />
                    ) : null}
                    {smaOn.s200 ? (
                      <path d={definedLine(xs, indicators.s200, y)} fill="none" stroke="var(--color-chart-5)" strokeWidth="1.6" className="pointer-events-none" />
                    ) : null}
                    {showFv && dcf.price > yMin && dcf.price < yMax * 1.2 ? (
                      <g className="pointer-events-none">
                        <line x1={pad.l} x2={w - pad.r} y1={y(dcf.price)} y2={y(dcf.price)} stroke="var(--color-warn)" strokeDasharray="5 4" strokeOpacity="0.85" />
                        <text x={w - pad.r} y={r(y(dcf.price) - 4)} textAnchor="end" fill="var(--color-warn)" fontSize="11">
                          DCF {moneyShare(dcf.price)}
                        </text>
                        <line x1={pad.l} x2={w - pad.r} y1={y(street.price)} y2={y(street.price)} stroke="var(--color-muted-foreground)" strokeDasharray="2 4" strokeOpacity="0.7" />
                      </g>
                    ) : null}
                    {fib.map((f) => (
                      <g key={f.ratio} className="pointer-events-none">
                        <line x1={pad.l} x2={w - pad.r} y1={y(f.price)} y2={y(f.price)} stroke="currentColor" strokeOpacity="0.18" />
                        <text x={pad.l + 4} y={r(y(f.price) - 3)} fill="currentColor" opacity="0.4" fontSize="11">
                          {f.ratio.toFixed(3)}
                        </text>
                      </g>
                    ))}
                    {levels.map((lv) => (
                      <g key={lv} className="pointer-events-none">
                        <line x1={pad.l} x2={w - pad.r} y1={y(lv)} y2={y(lv)} stroke="var(--color-chart-2)" strokeDasharray="4 3" />
                        <text x={w - pad.r} y={r(y(lv) + 12)} textAnchor="end" fill="var(--color-chart-2)" fontSize="11">
                          {moneyShare(lv)}
                        </text>
                      </g>
                    ))}
                    {measure ? (
                      <g className="pointer-events-none">
                        <line
                          x1={xs[measure.a]}
                          x2={xs[measure.b]}
                          y1={y(view[measure.a]!.close)}
                          y2={y(view[measure.b]!.close)}
                          stroke="var(--color-foreground)"
                          strokeWidth="1.4"
                        />
                        <circle cx={xs[measure.a]} cy={y(view[measure.a]!.close)} r="3.5" fill="var(--color-foreground)" />
                        <circle cx={xs[measure.b]} cy={y(view[measure.b]!.close)} r="3.5" fill="var(--color-foreground)" />
                      </g>
                    ) : null}
                    {measureA != null ? (
                      <circle cx={xs[measureA]} cy={y(view[measureA]!.close)} r="4" fill="var(--color-warn)" className="pointer-events-none" />
                    ) : null}
                    <Crosshair x={xi} y={yi} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
                    <circle cx={xi} cy={yi} r="4.5" fill={stroke} className="pointer-events-none" />
                    <text x={pad.l} y={14} fill="currentColor" opacity="0.45" fontSize="11">
                      {moneyShare(yMax)}
                    </text>
                    <text x={pad.l} y={h - 6} fill="currentColor" opacity="0.45" fontSize="11">
                      {moneyShare(yMin)}
                    </text>
                  </ChartSvg>
                  <ChartTip visible={hover != null || pinned != null} xPct={xPct}>
                    <p className="text-muted-foreground">{active.date}</p>
                    <p className="mt-1 text-sm font-medium tabular">{moneyShare(active.close)}</p>
                    <p className={cn("tabular", change < 0 ? "text-down" : "text-up")}>{pct(change)} vs window</p>
                    {smaOn.s20 && indicators.s20[activeIdx] != null ? (
                      <p className="mt-1 tabular text-muted-foreground">SMA20 {moneyShare(indicators.s20[activeIdx]!)}</p>
                    ) : null}
                    {smaOn.s50 && indicators.s50[activeIdx] != null ? (
                      <p className="tabular text-muted-foreground">SMA50 {moneyShare(indicators.s50[activeIdx]!)}</p>
                    ) : null}
                    <p className="mt-1 text-muted-foreground">Drag to zoom · double-tap to reset</p>
                  </ChartTip>
                </>
              );
            }}
          </ChartFrame>

          {measure ? <MeasureStrip points={view} a={measure.a} b={measure.b} /> : null}

          <ChartReadout
            items={[
              { label: "Open", value: moneyShare(first) },
              { label: "High", value: moneyShare(hi) },
              { label: "Low", value: moneyShare(loPx) },
              { label: "CAGR", value: pct(stats.cagr), tone: stats.cagr >= 0 ? "up" : "down" },
              { label: "Ann. vol", value: pct(stats.vol, 0) },
              { label: "Max drawdown", value: pct(stats.maxDd), tone: "down" },
              { label: "Mkt cap", value: `$${mktCap.toFixed(2)}T` },
              { label: "P/E", value: pe.toFixed(1) },
              { label: "52-week", value: `${moneyShare(low52)} – ${moneyShare(high52)}` },
              { label: "Sharpe (proxy)", value: stats.sharpe.toFixed(2) },
              { label: "Window", value: zoom ? "Zoomed" : range, tone: zoom ? "muted" : undefined },
              { label: "DCF gap", value: pct(dcf.price / livePx - 1), tone: dcf.price >= livePx ? "up" : "down" },
            ]}
          />
        </div>

        <aside className="border-t border-border lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-sm text-muted-foreground">Peers</p>
            <p className="text-xs text-muted-foreground">{market ? "live feed" : "snapshot"}</p>
          </div>
          <ul>
            {peerRows.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="tabular text-xs text-muted-foreground">{moneyShare(p.price)}</p>
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
          <p className="px-5 py-4 text-xs text-muted-foreground">
            Session change versus {name.symbol} {pct(dayChg)}. Drag across the tape to zoom; arrows to scrub.
          </p>
        </aside>
      </div>
    </Panel>
  );
}

function MeasureStrip({ points, a, b }: { points: QuotePoint[]; a: number; b: number }) {
  const pa = points[a]!;
  const pb = points[b]!;
  const dPx = pb.close - pa.close;
  const dPct = pa.close ? pb.close / pa.close - 1 : 0;
  const days = Math.abs(pb.t - pa.t) / (24 * 3600 * 1000);
  const years = Math.max(1 / 365, days / 365);
  const ann = pa.close > 0 ? Math.pow(pb.close / pa.close, 1 / years) - 1 : 0;
  return (
    <div className="mt-3 rounded-lg bg-secondary px-3 py-2 text-xs tabular">
      <span className="text-muted-foreground">{pa.date}</span>
      {" → "}
      <span className="text-muted-foreground">{pb.date}</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span className={dPx >= 0 ? "text-up" : "text-down"}>
        {money(dPx, 2)} ({pct(dPct)})
      </span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span>{Math.round(days)}d</span>
      <span className="mx-2 text-muted-foreground">·</span>
      <span>ann. {pct(ann)}</span>
    </div>
  );
}
