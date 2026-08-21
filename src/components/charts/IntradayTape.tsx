import { useEffect, useId, useMemo, useState } from "react";
import type { TapeBar } from "@/lib/market/types";
import { moneyShare, pct } from "@/lib/dcf/format";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { ChartFrame, ChartSvg, ChartTip, Crosshair, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { areaPath, linePath, sma, windowAnalytics, xAt, yAt } from "@/lib/charts/math";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { cn } from "@/lib/utils";

type RangeKey = "1D" | "15D";

function etMinutes(ms: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function sessionBands(points: TapeBar[], n: number, w: number, pad: { l: number; r: number }) {
  if (points.length < 4) return [];
  const bands: { x: number; width: number; kind: "pre" | "rth" | "post" }[] = [];
  let i = 0;
  while (i < points.length) {
    const mins = etMinutes(points[i]!.t);
    const kind: "pre" | "rth" | "post" = mins < 9 * 60 + 30 ? "pre" : mins < 16 * 60 ? "rth" : "post";
    let j = i + 1;
    while (j < points.length) {
      const m = etMinutes(points[j]!.t);
      const k: "pre" | "rth" | "post" = m < 9 * 60 + 30 ? "pre" : m < 16 * 60 ? "rth" : "post";
      if (k !== kind) break;
      j += 1;
    }
    const x0 = xAt(i, n, pad.l, pad.r, w);
    const x1 = xAt(Math.max(i, j - 1), n, pad.l, pad.r, w);
    bands.push({ x: x0, width: Math.max(2, x1 - x0), kind });
    i = j;
  }
  return bands;
}

export function IntradayTape({
  intraday,
  daily,
  prevClose,
}: {
  intraday: TapeBar[];
  daily: TapeBar[];
  prevClose: number;
}) {
  const gid = useId();
  const symbol = useFocusedName().symbol;
  const voice = useVoice();
  const [range, setRange] = useState<RangeKey>(intraday.length > 8 ? "1D" : "15D");
  useEffect(() => {
    if (intraday.length > 8) setRange("1D");
  }, [intraday.length]);
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [zoom, setZoom] = useState<[number, number] | null>(null);
  const [showVwap, setShowVwap] = useState(true);

  const raw = range === "1D" && intraday.length > 8 ? intraday : daily;
  const points = useMemo(() => {
    if (!zoom) return raw;
    const lo = Math.max(0, Math.min(zoom[0], zoom[1]));
    const hi = Math.min(raw.length - 1, Math.max(zoom[0], zoom[1]));
    const next = raw.slice(lo, hi + 1);
    return next.length > 2 ? next : raw;
  }, [raw, zoom]);
  const empty = points.length < 2;
  const n = points.length;
  const pad = { l: 10, r: 10, t: 14, b: 18 };

  const vwap = useMemo(() => {
    const closes = points.map((p) => p.close);
    return sma(closes, Math.min(12, Math.max(3, Math.floor(closes.length / 8))));
  }, [points]);

  const last = points[n - 1];
  const activeIdx = hover ?? pinned ?? n - 1;
  const active = points[Math.max(0, Math.min(n - 1, activeIdx))];
  const first = points[0];
  const base = range === "1D" && prevClose ? prevClose : first?.close ?? 0;
  const change = active && base ? active.close / base - 1 : 0;
  const down = change < 0;
  const stroke = down ? "var(--color-down)" : "var(--color-up)";
  const weeks = range === "1D" ? 1 / 52 : 15 / 5;
  const stats = empty ? null : windowAnalytics(points.map((p) => p.close), weeks);

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {range === "1D" ? voice.sessionKicker : `${symbol} last prints`}
          </p>
          {active ? (
            <>
              <p className="mt-2 font-sans text-4xl font-medium tracking-tight tabular md:text-5xl">
                {moneyShare(active.close)}
              </p>
              <p className={cn("mt-2 text-sm tabular", down ? "text-down" : "text-up")}>
                {pct(change)}
                <span className="ml-2 text-muted-foreground">
                  {active.label || (range === "1D" ? "Last" : "")}
                </span>
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Tape is catching up.</p>
          )}
        </div>
        <Segmented<RangeKey>
          size="sm"
          value={range}
          onChange={(v) => {
            setRange(v);
            setZoom(null);
            setPinned(null);
          }}
          options={[
            { value: "1D", label: "Today" },
            { value: "15D", label: "15D" },
          ]}
        />
      </div>

      {empty || !last ? (
        <div className="mt-6 flex h-52 items-center rounded-xl bg-secondary px-4 text-sm text-muted-foreground">
          Intraday bars are not in this refresh. Quotes below are still live.
        </div>
      ) : (
        <>
          <ToolBar className="mt-4">
            <ToolChip on={showVwap} onClick={() => setShowVwap((v) => !v)} title="Short moving average as a VWAP proxy">
              VWAP
            </ToolChip>
            {zoom ? (
              <ToolChip on={false} onClick={() => setZoom(null)}>
                Reset
              </ToolChip>
            ) : null}
          </ToolBar>
          <ChartFrame className="mt-3" heightClass="h-52 md:h-64">
            {({ w, h }) => {
              const min = Math.min(...points.map((p) => p.close));
              const max = Math.max(...points.map((p) => p.close));
              const xs = points.map((_, i) => xAt(i, n, pad.l, pad.r, w));
              const y = (v: number) => yAt(v, min * 0.998, max * 1.002, pad.t, pad.b, h);
              const ys = points.map((p) => y(p.close));
              const bands = range === "1D" ? sessionBands(points, n, w, pad) : [];
              const i = Math.max(0, Math.min(n - 1, activeIdx));
              return (
                <>
                  <ChartSvg
                    viewW={w}
                    viewH={h}
                    n={n}
                    pad={pad}
                    index={hover}
                    label={`${symbol} live tape`}
                    brushable
                    onIndex={setHover}
                    onCommit={setPinned}
                    onBrush={(a, b) => setZoom([Math.min(a, b), Math.max(a, b)])}
                    onDoubleReset={() => {
                      setZoom(null);
                      setPinned(null);
                    }}
                  >
                    {bands.map((b, bi) => (
                      <rect
                        key={bi}
                        x={b.x}
                        y={pad.t}
                        width={b.width}
                        height={h - pad.t - pad.b}
                        fill={b.kind === "rth" ? "transparent" : "currentColor"}
                        opacity={b.kind === "rth" ? 0 : 0.04}
                        className="pointer-events-none"
                      />
                    ))}
                    {range === "1D" && prevClose > 0 ? (
                      <line
                        x1={pad.l}
                        x2={w - pad.r}
                        y1={y(prevClose)}
                        y2={y(prevClose)}
                        stroke="currentColor"
                        strokeOpacity="0.22"
                        strokeDasharray="4 4"
                        className="pointer-events-none"
                      />
                    ) : null}
                    <defs>
                      <linearGradient id={`${gid}-tape`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
                        <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={areaPath(xs, ys, h - pad.b)} fill={`url(#${gid}-tape)`} className="pointer-events-none" />
                    <path d={linePath(xs, ys)} fill="none" stroke={stroke} strokeWidth="2.2" className="pointer-events-none" />
                    {showVwap ? (
                      <path
                        d={xs
                          .map((x, idx) => {
                            const v = vwap[idx];
                            if (v == null) return "";
                            const cmd = idx === 0 || vwap[idx - 1] == null ? "M" : "L";
                            return `${cmd}${x},${y(v)}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="var(--color-warn)"
                        strokeWidth="1.3"
                        className="pointer-events-none"
                      />
                    ) : null}
                    <Crosshair x={xs[i]!} y={ys[i]!} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
                    <circle cx={xs[i]} cy={ys[i]} r="4.5" fill={stroke} className="pointer-events-none" />
                    <text x={pad.l} y={14} fill="currentColor" opacity="0.45" fontSize="11">
                      {moneyShare(max)}
                    </text>
                    <text x={pad.l} y={h - 6} fill="currentColor" opacity="0.45" fontSize="11">
                      {moneyShare(min)}
                    </text>
                  </ChartSvg>
                  <ChartTip visible={hover != null || pinned != null} xPct={(xs[i]! / w) * 100}>
                    <p className="text-muted-foreground">{active?.label || "Print"}</p>
                    <p className="mt-1 text-sm font-medium tabular">{moneyShare(active?.close ?? 0)}</p>
                    <p className={cn("tabular", down ? "text-down" : "text-up")}>{pct(change)}</p>
                  </ChartTip>
                </>
              );
            }}
          </ChartFrame>
          {stats ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Window {pct(stats.total)} · proxy vol {pct(stats.vol, 0)}
              {range === "1D" ? " · shaded wings are pre-market and after hours. Dashed line is yesterday’s close." : "."}{" "}
              Drag to zoom.
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
