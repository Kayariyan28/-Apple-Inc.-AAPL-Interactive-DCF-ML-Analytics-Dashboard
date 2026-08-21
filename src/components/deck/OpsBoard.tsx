import { useMemo, useState, type ReactNode } from "react";
import { Activity, Radio, TriangleAlert, Users } from "lucide-react";
import type { Quote, TapeBar } from "@/lib/market/types";
import { moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { curvePath, linePath, xAt, yAt } from "@/lib/charts/math";
import { useFocusedName } from "@/lib/store";
import { cn } from "@/lib/utils";

type Cell = { id: string; label: string; value: number; tone: "up" | "mid" | "down" };
type Rect = Cell & { x: number; y: number; w: number; h: number };

function packTreemap(items: Cell[], x: number, y: number, w: number, h: number): Rect[] {
  const rects: Rect[] = [];
  const total = items.reduce((s, c) => s + c.value, 0) || 1;
  const nodes = [...items]
    .sort((a, b) => b.value - a.value)
    .map((c) => ({ ...c, area: (c.value / total) * w * h }));

  function dice(list: typeof nodes, x0: number, y0: number, w0: number, h0: number) {
    if (!list.length) return;
    if (list.length === 1) {
      const n = list[0]!;
      rects.push({ ...n, x: x0, y: y0, w: w0, h: h0 });
      return;
    }
    const sum = list.reduce((s, n) => s + n.area, 0);
    let acc = 0;
    let i = 0;
    while (i < list.length - 1 && acc < sum * 0.48) {
      acc += list[i]!.area;
      i++;
    }
    i = Math.max(1, i);
    const left = list.slice(0, i);
    const right = list.slice(i);
    const leftArea = left.reduce((s, n) => s + n.area, 0);
    if (w0 >= h0) {
      const lw = (leftArea / sum) * w0;
      dice(left, x0, y0, lw, h0);
      dice(right, x0 + lw, y0, w0 - lw, h0);
    } else {
      const lh = (leftArea / sum) * h0;
      dice(left, x0, y0, w0, lh);
      dice(right, x0, y0 + lh, w0, h0 - lh);
    }
  }
  dice(nodes, x, y, w, h);
  return rects;
}

function Spark({ values, color }: { values: number[]; color: string }) {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const W = 320;
  const H = 72;
  const xs = values.map((_, i) => xAt(i, n, 4, 4, W));
  const ys = values.map((v) => yAt(v, min, max, 6, 6, H));
  const area = `${linePath(xs, ys)} L${xs[n - 1]},${H - 4} L${xs[0]},${H - 4} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg h-16 w-full">
      <path d={area} fill={color} opacity="0.18" />
      <path d={curvePath(xs, ys)} fill="none" stroke={color} strokeWidth="1.4" className="term-draw" />
    </svg>
  );
}

export function OpsBoard({
  aapl,
  peers,
  daily,
  intraday,
  vix,
  session,
}: {
  aapl: Quote;
  peers: Quote[];
  daily: TapeBar[];
  intraday: TapeBar[];
  vix: number | null;
  session: string;
}) {
  const name = useFocusedName();
  const lastMix = name.mix[name.mix.length - 1]!;
  const cells: Cell[] = useMemo(() => {
    const mix = name.mixKeys.map((k, i) => ({
      id: k.id,
      label: k.label,
      value: (lastMix.shares[k.id] ?? 0) * 100,
      tone: (k.id === name.heroMixId ? "up" : i < 3 ? "mid" : "down") as Cell["tone"],
    }));
    const peerCells = [aapl, ...peers].map((p) => ({
      id: p.symbol,
      label: p.symbol,
      value: Math.max(8, (p.mktCap ?? 1e12) / 1e11),
      tone: (p.changePct >= 0 ? "up" : "down") as Cell["tone"],
    }));
    return [...mix, ...peerCells].slice(0, 14);
  }, [aapl, peers, name.heroMixId, name.mixKeys, lastMix]);
  const [hit, setHit] = useState<string | null>(null);
  const closes = (intraday.length > 8 ? intraday : daily).map((b) => b.close);
  const volSeries = daily.map((b, i) => Math.abs((b.close - (daily[i - 1]?.close ?? b.close)) * 40 + (aapl.volume / 1e7) * (0.6 + (i % 5) * 0.08)));
  const vol = aapl.volume;
  const open = session === "open" || session === "pre" || session === "post";
  const hitCell = cells.find((c) => c.id === hit);

  return (
    <article className="overflow-hidden rounded-2xl bg-[#0d0d0d] p-4 shadow-[0_24px_80px_rgb(0_0_0/0.45)] md:p-5">
      <p className="px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Operating system · {name.symbol} mix + mega-cap tape
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[22rem]">
          <svg viewBox="0 0 640 360" className="h-full w-full">
            {packTreemap(cells, 2, 2, 636, 356).map((c) => {
              const on = hit === c.id;
              const fill = c.tone === "up" ? "#30d158" : c.tone === "mid" ? "#248a3d" : "#3a3a3c";
              const g = 3;
              return (
                <g
                  key={c.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHit(c.id)}
                  onMouseLeave={() => setHit(null)}
                >
                  <rect
                    x={c.x + g}
                    y={c.y + g}
                    width={Math.max(0, c.w - g * 2)}
                    height={Math.max(0, c.h - g * 2)}
                    rx="6"
                    fill={fill}
                    opacity={on ? 1 : 0.92}
                  />
                  {c.w > 70 && c.h > 36 ? (
                    <>
                      <text x={c.x + 12} y={c.y + 22} fontSize="12" fill={c.tone === "down" ? "#f5f5f7" : "#04210c"} fontWeight="600">
                        {c.label}
                      </text>
                      <text x={c.x + 12} y={c.y + c.h - 14} fontSize="11" fill={c.tone === "down" ? "rgb(255 255 255 / 0.7)" : "#04210c"} opacity="0.8">
                        {c.value > 8 ? c.value.toFixed(0) : pctPlain(c.value / 100)}
                      </text>
                    </>
                  ) : null}
                </g>
              );
            })}
          </svg>
          {hitCell ? (
            <p className="pointer-events-none absolute bottom-2 left-3 text-xs tabular text-foreground/80">
              {hitCell.label} · {hitCell.value > 8 ? hitCell.value.toFixed(0) : pctPlain(hitCell.value / 100)}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-card p-4">
            <Kpi icon={<Users className="size-3.5" />} label="Last print" value={moneyShare(aapl.price)} hint={pct(aapl.changePct)} up={aapl.changePct >= 0} />
            <Kpi icon={<Activity className="size-3.5" />} label="Volume" value={compact(vol)} hint="session" />
            <Kpi icon={<TriangleAlert className="size-3.5" />} label="VIX" value={vix != null ? vix.toFixed(1) : "—"} hint="vol regime" />
            <Kpi icon={<Radio className="size-3.5" />} label="Session" value={open ? "LIVE" : "CLOSED"} hint={session} up={open} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs text-muted-foreground">Daily visitor analog · {aapl.symbol} tape</p>
              <p className="mt-1 text-2xl font-medium tabular">{moneyShare(closes[closes.length - 1] ?? aapl.price)}</p>
              <Spark values={closes.length > 2 ? closes : name.price.map(Number)} color="var(--color-up)" />
            </div>
            <div className="rounded-xl bg-card p-4">
              <p className="text-xs text-muted-foreground">Traffic analog · |ΔP| × volume</p>
              <p className="mt-1 text-2xl font-medium tabular">{compact(vol)}</p>
              <Spark values={volSeries.length > 2 ? volSeries : name.price.map(Number)} color="var(--color-accent)" />
            </div>
          </div>
          <div className="rounded-xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Uptime · session flags, last 90 weekly prints</p>
            <p className="mt-1 text-2xl font-medium tabular">{open ? "99.9%" : "99.9%"}</p>
            <div className="mt-3 flex h-10 items-end gap-px">
              {Array.from({ length: 90 }, (_, i) => {
                const halt = i === 41 || i === 62;
                return (
                  <span
                    key={i}
                    className={cn("min-w-0 flex-1 rounded-[1px] transition-colors", halt ? "h-6 bg-warn" : "h-8 bg-up/80")}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  up,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  up?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-xl font-medium tabular">{value}</p>
      {hint ? <p className={cn("text-xs tabular", up ? "text-up" : "text-muted-foreground")}>{hint}</p> : null}
    </div>
  );
}

function compact(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}
