import { useId, useMemo, useState } from "react";
import type { TapeBar } from "@/lib/market/types";
import { moneyShare, pct } from "@/lib/dcf/format";
import { bucketCandles, candlesFromCloses, sliceBars, withLivePrint, type Candle } from "@/lib/charts/candles";
import { definedLine, niceTicks, sma, xAt, yAt } from "@/lib/charts/math";
import { ChartFrame, ChartSvg, ChartTip, Crosshair, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { Segmented } from "@/components/ui/segmented";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { cn } from "@/lib/utils";

type Period = "1D" | "1M" | "3M" | "1Y";

export function CandleTape({
  intraday,
  daily,
  fallback,
  live,
  prevClose,
  dcf,
  high52,
  low52,
  asOf,
  sessionLive,
}: {
  intraday: TapeBar[];
  daily: TapeBar[];
  fallback: TapeBar[];
  live: number;
  prevClose: number;
  dcf: number;
  high52: number | null;
  low52: number | null;
  asOf: number;
  sessionLive: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const name = useFocusedName();
  const voice = useVoice();
  const symbol = name.symbol;
  const hasIntra = intraday.length > 12;
  const [period, setPeriod] = useState<Period>(hasIntra ? "1D" : "1M");
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [showSma, setShowSma] = useState(true);
  const [showDcf, setShowDcf] = useState(true);
  const [showRange, setShowRange] = useState(false);

  const rawCandles = useMemo(() => {
    if (period === "1D" && hasIntra) {
      return bucketCandles(withLivePrint(intraday, live, asOf), 64);
    }
    const src = daily.length > 4 ? daily : fallback;
    const days = period === "1M" ? 32 : period === "3M" ? 95 : 370;
    return candlesFromCloses(withLivePrint(sliceBars(src, days), live, asOf));
  }, [period, hasIntra, intraday, daily, fallback, live, asOf]);

  const candles = useMemo(() => {
    if (!zoom) return rawCandles;
    const lo = Math.max(0, Math.min(zoom[0], zoom[1]));
    const hi = Math.min(rawCandles.length - 1, Math.max(zoom[0], zoom[1]));
    const next = rawCandles.slice(lo, hi + 1);
    return next.length > 2 ? next : rawCandles;
  }, [rawCandles, zoom]);

  const n = candles.length;
  const empty = n < 2;
  const last = candles[n - 1];
  const activeIdx = Math.max(0, Math.min(n - 1, hover ?? pinned ?? n - 1));
  const active = candles[activeIdx];
  const base = period === "1D" && prevClose > 0 ? prevClose : candles[0]?.open ?? 0;
  const change = active && base ? active.close / base - 1 : 0;
  const sessionChange = last && prevClose > 0 ? last.close / prevClose - 1 : change;
  const hasVol = candles.some((c) => c.volume != null && c.volume > 0);
  const ohlc = candles.some((c) => c.ohlc && c.high - c.low > Math.abs(c.close - c.open) + 0.01);
  const winLo = n ? Math.min(...candles.map((c) => c.low)) : 0;
  const winHi = n ? Math.max(...candles.map((c) => c.high)) : 0;
  const dcfOff = showDcf && dcf > 0 && n > 0 && (dcf < winLo * 0.94 || dcf > winHi * 1.06);
  const smaPeriod = Math.min(20, Math.max(5, Math.floor(n / 6)));
  const ma = useMemo(() => sma(candles.map((c) => c.close), smaPeriod), [candles, smaPeriod]);

  const periodOpts: { value: Period; label: string }[] = [
    ...(hasIntra ? [{ value: "1D" as const, label: "Today" }] : []),
    { value: "1M", label: "1M" },
    { value: "3M", label: "3M" },
    { value: "1Y", label: "1Y" },
  ];

  return (
    <section className="print-card flex min-w-0 flex-col p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {period === "1D" ? voice.sessionKicker : voice.candlesKicker}
            {ohlc && period !== "1D" ? " · daily OHLC" : period !== "1D" ? " · range from closes" : ""}
            {sessionLive ? " · live" : ""}
          </p>
          {active ? (
            <>
              <p className="mt-1.5 font-sans text-4xl font-medium tracking-tight tabular md:text-5xl">
                {moneyShare(active.close)}
              </p>
              <p className={cn("mt-1 text-sm tabular", change < 0 ? "text-down" : "text-up")}>
                {pct(period === "1D" ? sessionChange : change)}
                <span className="ml-2 text-muted-foreground">{active.label || "Last"}</span>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Tape is catching up.</p>
          )}
        </div>
        <Segmented<Period>
          size="sm"
          value={period}
          onChange={(v) => {
            setPeriod(v);
            setZoom(null);
            setPinned(null);
            setHover(null);
          }}
          options={periodOpts}
        />
      </div>

      <ToolBar className="mt-3">
        <ToolChip on={showSma} onClick={() => setShowSma((v) => !v)} title="Simple moving average">
          SMA {smaPeriod}
        </ToolChip>
        <ToolChip on={showDcf} onClick={() => setShowDcf((v) => !v)} title="Model fair value on this tape">
          DCF
        </ToolChip>
        <ToolChip on={showRange} onClick={() => setShowRange((v) => !v)} title="52-week high and low">
          52w
        </ToolChip>
        {zoom ? (
          <ToolChip on={false} onClick={() => setZoom(null)}>
            Reset
          </ToolChip>
        ) : null}
      </ToolBar>

      {empty || !last ? (
        <div className="mt-4 flex h-64 items-center rounded-xl bg-secondary px-4 text-sm text-muted-foreground md:h-80">
          Waiting on the open tape.
        </div>
      ) : (
        <ChartFrame className="mt-3" heightClass="h-64 md:h-80">
          {({ w, h }) => {
            const pad = { l: 12, r: 56, t: 14, b: hasVol ? 36 : 22 };
            const volH = hasVol ? 18 : 0;
            const lows = candles.map((c) => c.low);
            const highs = candles.map((c) => c.high);
            let min = Math.min(...lows);
            let max = Math.max(...highs);
            const padPct = (max - min) * 0.06 || 1;
            min -= padPct;
            max += padPct;
            const inView = (v: number) => v >= min && v <= max;
            const y = (v: number) => yAt(v, min, max, pad.t, pad.b + volH, h);
            const ticks = niceTicks(min, max, 4);
            const slot = (w - pad.l - pad.r) / Math.max(1, n);
            const bodyW = Math.max(3.5, Math.min(16, slot * 0.74));
            const volMax = Math.max(1, ...candles.map((c) => c.volume ?? 0));
            const ax = xAt(activeIdx, n, pad.l, pad.r, w);
            const ay = y(active.close);
            const lastY = y(last.close);
            const dcfIn = showDcf && dcf > 0 && inView(dcf);
            const dcfY = dcfIn ? y(dcf) : 0;
            const xs = candles.map((_, k) => xAt(k, n, pad.l, pad.r, w));
            const maYs = ma.map((v) => (v == null ? null : y(v)));
            const maPath = definedLine(xs, maYs, (v) => v);
            const xPct = ((ax - pad.l) / Math.max(1, w - pad.l - pad.r)) * 100;
            const showHair = hover != null || pinned != null;

            return (
              <>
                <ChartSvg
                  viewW={w}
                  viewH={h}
                  n={n}
                  pad={pad}
                  index={hover}
                  label={`${symbol} candlesticks`}
                  brushable
                  onIndex={setHover}
                  onCommit={setPinned}
                  onBrush={(a, b) => setZoom([Math.min(a, b), Math.max(a, b)])}
                  onDoubleReset={() => {
                    setZoom(null);
                    setPinned(null);
                  }}
                >
                  <defs>
                    <linearGradient id={`${gid}-up`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-up)" stopOpacity="1" />
                      <stop offset="100%" stopColor="var(--color-up)" stopOpacity="0.55" />
                    </linearGradient>
                    <linearGradient id={`${gid}-dn`} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-down)" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="var(--color-down)" stopOpacity="1" />
                    </linearGradient>
                  </defs>

                  {ticks.map((t) => (
                    <g key={t}>
                      <line
                        x1={pad.l}
                        x2={w - pad.r}
                        y1={y(t)}
                        y2={y(t)}
                        stroke="currentColor"
                        strokeOpacity="0.06"
                      />
                      <text
                        x={w - pad.r + 6}
                        y={y(t) + 3}
                        fill="currentColor"
                        fillOpacity="0.38"
                        fontSize="9"
                        fontVariant="tabular-nums"
                      >
                        {t >= 100 ? t.toFixed(0) : t.toFixed(1)}
                      </text>
                    </g>
                  ))}

                  {showRange && high52 && inView(high52) ? (
                    <line
                      x1={pad.l}
                      x2={w - pad.r}
                      y1={y(high52)}
                      y2={y(high52)}
                      stroke="var(--color-warn)"
                      strokeOpacity="0.55"
                      strokeDasharray="3 4"
                    />
                  ) : null}
                  {showRange && low52 && inView(low52) ? (
                    <line
                      x1={pad.l}
                      x2={w - pad.r}
                      y1={y(low52)}
                      y2={y(low52)}
                      stroke="var(--color-warn)"
                      strokeOpacity="0.4"
                      strokeDasharray="3 4"
                    />
                  ) : null}
                  {dcfIn ? (
                    <g className="pointer-events-none">
                      <line
                        x1={pad.l}
                        x2={w - pad.r}
                        y1={dcfY}
                        y2={dcfY}
                        stroke="var(--color-accent)"
                        strokeWidth="1.4"
                        strokeDasharray="5 4"
                      />
                      <text
                        x={pad.l + 2}
                        y={dcfY - 5}
                        fill="var(--color-accent)"
                        fontSize="10"
                        fontWeight="500"
                        fontVariant="tabular-nums"
                      >
                        DCF {moneyShare(dcf)}
                      </text>
                    </g>
                  ) : null}

                  {period === "1D" && prevClose > 0 ? (
                    <line
                      x1={pad.l}
                      x2={w - pad.r}
                      y1={y(prevClose)}
                      y2={y(prevClose)}
                      stroke="currentColor"
                      strokeOpacity="0.22"
                      strokeDasharray="4 4"
                    />
                  ) : null}

                  {candles.map((c, k) => {
                    const cx = xAt(k, n, pad.l, pad.r, w);
                    const yO = y(c.open);
                    const yC = y(c.close);
                    const yH = y(c.high);
                    const yL = y(c.low);
                    const bull = c.close >= c.open;
                    const dim = hover != null && hover !== k && pinned !== k;
                    const fill = bull ? `url(#${gid}-up)` : `url(#${gid}-dn)`;
                    const stroke = bull ? "var(--color-up)" : "var(--color-down)";
                    const bodyTop = Math.min(yO, yC);
                    const bodyH = Math.max(1.8, Math.abs(yC - yO));
                    return (
                      <g key={`${c.t}-${k}`} opacity={dim ? 0.28 : 1}>
                        <line
                          x1={cx}
                          x2={cx}
                          y1={yH}
                          y2={yL}
                          stroke={stroke}
                          strokeWidth="1.35"
                          strokeLinecap="round"
                        />
                        <rect
                          x={cx - bodyW / 2}
                          y={bodyTop}
                          width={bodyW}
                          height={bodyH}
                          rx="1.6"
                          fill={fill}
                          stroke={stroke}
                          strokeWidth="0.6"
                        />
                      </g>
                    );
                  })}

                  {showSma && maPath ? (
                    <path d={maPath} fill="none" stroke="var(--color-chart-2)" strokeWidth="1.5" opacity="0.9" />
                  ) : null}

                  {hasVol
                    ? candles.map((c, k) => {
                        const cx = xAt(k, n, pad.l, pad.r, w);
                        const vh = Math.max(1, ((c.volume ?? 0) / volMax) * volH);
                        const bull = c.close >= c.open;
                        return (
                          <rect
                            key={`v${k}`}
                            x={cx - bodyW / 2}
                            y={h - pad.b + (volH - vh) + 4}
                            width={bodyW}
                            height={vh}
                            rx="1"
                            fill={bull ? "var(--color-up)" : "var(--color-down)"}
                            opacity={hover != null && hover !== k ? 0.22 : 0.55}
                          />
                        );
                      })
                    : null}

                  {showHair ? <Crosshair x={ax} y={ay} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} /> : null}
                </ChartSvg>

                <PriceTag
                  top={lastY}
                  tone={last.close >= last.open ? "up" : "down"}
                  text={moneyShare(last.close)}
                />

                <ChartTip visible={hover != null && !!active} xPct={xPct}>
                  <CandleTip candle={active} prev={candles[activeIdx - 1] ?? null} />
                </ChartTip>
              </>
            );
          }}
        </ChartFrame>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {ohlc
          ? "Open, high, low, close from the Nasdaq tape. Hover for the print, drag to zoom."
          : "Bodies use successive closes — no invented wicks. Hover for the print, drag to zoom."}
        {showDcf && dcfOff ? ` DCF ${moneyShare(dcf)} sits off this window so the candles stay in scale.` : ""}
      </p>
    </section>
  );
}

function PriceTag({ top, tone, text }: { top: number; tone: "up" | "down" | "accent"; text: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute right-0 -translate-y-1/2 rounded-l-md px-1.5 py-0.5 text-xs font-medium tabular",
        tone === "up" && "bg-up text-background",
        tone === "down" && "bg-down text-accent-foreground",
        tone === "accent" && "bg-accent text-accent-foreground",
      )}
      style={{ top }}
    >
      {text}
    </div>
  );
}

function CandleTip({ candle, prev }: { candle: Candle | undefined; prev: Candle | null }) {
  if (!candle) return null;
  const delta = candle.close - candle.open;
  const vsPrev = prev ? candle.close / prev.close - 1 : null;
  const showHL = candle.high - candle.low > Math.abs(candle.close - candle.open) + 0.02;
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{candle.label || "Print"}</p>
      <p className="tabular">
        O {moneyShare(candle.open)}
        <span className="mx-1.5 text-muted-foreground">·</span>
        C {moneyShare(candle.close)}
      </p>
      {showHL ? (
        <p className="tabular text-muted-foreground">
          H {moneyShare(candle.high)}
          <span className="mx-1.5">·</span>
          L {moneyShare(candle.low)}
        </p>
      ) : null}
      <p className={cn("tabular", delta >= 0 ? "text-up" : "text-down")}>
        {pct(candle.open ? delta / candle.open : 0)}
        {vsPrev != null ? ` · vs prior ${pct(vsPrev)}` : ""}
      </p>
      {candle.volume != null ? (
        <p className="tabular text-muted-foreground">Vol {(candle.volume / 1e6).toFixed(1)}M</p>
      ) : null}
    </div>
  );
}
