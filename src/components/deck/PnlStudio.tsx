import { useEffect, useMemo, useState } from "react";
import { SECTOR_MARGINS, sequentialFunnel } from "@/lib/dcf/metrics";
import { pnlRows } from "@/lib/desk/universe";
import { pctPlain } from "@/lib/dcf/format";
import { ChartFrame } from "@/components/charts/chart-kit";
import { curvePath, xAt, yAt } from "@/lib/charts/math";
import { useFocusedName, useModel } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { cn } from "@/lib/utils";

const LAYER_KEYS = ["rev", "gp", "ebitda", "ebit", "ni"] as const;
const LAYER_LABELS = ["Revenue", "Gross profit", "EBITDA", "EBIT", "Net income"];

export function PnlStudio() {
  const ticker = useModel((s) => s.ticker);
  const name = useFocusedName();
  const voice = useVoice();
  const PNL = useMemo(() => pnlRows(ticker), [ticker]);
  const [yearI, setYearI] = useState(PNL.length - 1);
  useEffect(() => setYearI(PNL.length - 1), [ticker, PNL.length]);
  const p = PNL[yearI]!;
  const funnel = sequentialFunnel(p);
  const maxW = funnel[0]!.value;
  const [tile, setTile] = useState<"gross" | "ebitda" | "ebit" | "ebt" | "net">("gross");
  const [layer, setLayer] = useState<string | null>(null);
  const cashEps = name.years.map((_, i) => {
    const eps = name.eps[i]!;
    const fcfPs = name.shares[i]! > 0 ? (name.fcf[i]! * 1000) / name.shares[i]! : 0;
    return eps !== 0 ? fcfPs / eps : 1;
  });

  const tiles = [
    { id: "gross" as const, label: "Gross margin", aapl: p.gp / p.rev, sector: SECTOR_MARGINS.gross },
    { id: "ebitda" as const, label: "EBITDA margin", aapl: p.ebitda / p.rev, sector: SECTOR_MARGINS.ebitda },
    { id: "ebit" as const, label: "EBIT margin", aapl: p.ebit / p.rev, sector: SECTOR_MARGINS.ebit },
    { id: "ebt" as const, label: "EBT margin", aapl: p.ebt / p.rev, sector: SECTOR_MARGINS.ebt },
    { id: "net" as const, label: "Net margin", aapl: p.ni / p.rev, sector: SECTOR_MARGINS.net },
  ];

  return (
    <article className="rounded-2xl bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{name.symbol} revenue and profit</p>
          <h3 className="mt-1 font-serif text-2xl font-medium tracking-tight">{voice.pnlTitle}</h3>
        </div>
        <div className="flex flex-wrap gap-1">
          {PNL.map((row, i) => (
            <button
              key={row.year}
              type="button"
              onClick={() => setYearI(i)}
              className={cn(
                "h-8 rounded-full px-2.5 text-xs tabular",
                i === yearI ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {row.year}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <ChartFrame heightClass="h-72">
          {({ w, h }) => {
            const pad = { l: 36, r: 124, t: 8, b: 8 };
            const rowH = (h - pad.t - pad.b) / funnel.length;
            const cx = pad.l + (w - pad.l - pad.r) / 2;
            const inner = w - pad.l - pad.r;
            return (
              <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                {funnel.map((s, i) => {
                  const next = funnel[i + 1] ?? s;
                  const y = pad.t + i * rowH;
                  const w0 = inner * (s.value / maxW);
                  const w1 = inner * (next.value / maxW) * (i === funnel.length - 1 ? 1 : 0.92);
                  const l0 = cx - w0 / 2;
                  const r0 = cx + w0 / 2;
                  const l1 = cx - w1 / 2;
                  const r1 = cx + w1 / 2;
                  const on = layer === s.key || (!layer && s.key === "ni");
                  const d = `M${l0},${y + 2} L${r0},${y + 2} L${r1},${y + rowH - 2} L${l1},${y + rowH - 2} Z`;
                  return (
                    <g
                      key={s.key}
                      className="cursor-pointer"
                      onMouseEnter={() => setLayer(s.key)}
                      onMouseLeave={() => setLayer(null)}
                    >
                      <path
                        d={d}
                        fill="var(--color-accent)"
                        opacity={on ? 1 : 0.55}
                        className="deck-funnel-slice"
                        style={{ animationDelay: `${i * 70}ms` }}
                      />
                      {i > 0 ? (
                        <text
                          x={l0 + 10}
                          y={y + rowH / 2 + 4}
                          fontSize="11"
                          fill="white"
                          className="tabular"
                        >
                          {pctPlain(s.conv)}
                        </text>
                      ) : null}
                      <text x={w - pad.r + 10} y={y + rowH / 2 - 4} fontSize="10" fill="var(--color-muted-foreground)">
                        {s.label.toUpperCase()}
                      </text>
                      <text x={w - pad.r + 10} y={y + rowH / 2 + 10} fontSize="11" fill="var(--color-foreground)" className="tabular">
                        ${s.value.toFixed(1)}B · {pctPlain(s.shareOfRev, 0)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          }}
        </ChartFrame>

        <div>
          <div className="mb-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            {LAYER_KEYS.map((k, i) => (
              <button
                key={k}
                type="button"
                onMouseEnter={() => setLayer(k)}
                onMouseLeave={() => setLayer(null)}
                className={cn(layer === k ? "text-accent" : "hover:text-foreground")}
              >
                {LAYER_LABELS[i]}
              </button>
            ))}
          </div>
          <ChartFrame heightClass="h-64">
            {({ w, h }) => {
              const pad = { l: 8, r: 40, t: 12, b: 24 };
              const series = [
                { key: "rev", v: PNL.map((r) => r.rev) },
                { key: "gp", v: PNL.map((r) => r.gp) },
                { key: "ebitda", v: PNL.map((r) => r.ebitda) },
                { key: "ebit", v: PNL.map((r) => r.ebit) },
                { key: "ni", v: PNL.map((r) => r.ni) },
              ];
              const max = Math.max(...series.flatMap((s) => s.v));
              const n = PNL.length;
              return (
                <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                  <line
                    x1={xAt(yearI, n, pad.l, pad.r, w)}
                    x2={xAt(yearI, n, pad.l, pad.r, w)}
                    y1={pad.t}
                    y2={h - pad.b}
                    stroke="rgb(255 255 255 / 0.12)"
                  />
                  {series.map((s, si) => {
                    const xs = s.v.map((_, k) => xAt(k, n, pad.l, pad.r, w));
                    const ys = s.v.map((v) => yAt(v, 0, max, pad.t, pad.b, h));
                    const on = !layer || layer === s.key;
                    return (
                      <path
                        key={s.key}
                        d={curvePath(xs, ys)}
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth={on && layer === s.key ? 2.2 : 1.4}
                        opacity={on ? 0.3 + si * 0.14 : 0.08}
                        className="term-draw"
                      />
                    );
                  })}
                  {PNL.map((row, k) => (
                    <text
                      key={row.year}
                      x={xAt(k, n, pad.l, pad.r, w)}
                      y={h - 6}
                      textAnchor="middle"
                      fontSize="9"
                      fill="var(--color-muted-foreground)"
                    >
                      {row.year}
                    </text>
                  ))}
                </svg>
              );
            }}
          </ChartFrame>
        </div>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-5">
        {tiles.map((t) => {
          const win = t.aapl > t.sector;
          const on = tile === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTile(t.id)}
              className={cn(
                "rounded-xl p-4 text-left transition-colors duration-150",
                on && win ? "bg-up text-background" : on ? "bg-secondary" : "bg-secondary/50",
              )}
            >
              <p className={cn("text-[10px] uppercase tracking-widest", on && win ? "text-background/70" : "text-muted-foreground")}>
                {t.label}
              </p>
              <p className="mt-2 text-2xl font-medium tabular">{pctPlain(t.aapl)}</p>
              <p className={cn("mt-1 text-xs tabular", on && win ? "text-background/70" : "text-muted-foreground")}>
                Sector {pctPlain(t.sector)}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Dynamics of marginality</p>
          <ChartFrame className="mt-2" heightClass="h-52">
            {({ w, h }) => {
              const pad = { l: 8, r: 8, t: 10, b: 24 };
              const series = [
                PNL.map((r) => r.gp / r.rev),
                PNL.map((r) => r.ebitda / r.rev),
                PNL.map((r) => r.ebit / r.rev),
                PNL.map((r) => r.ebt / r.rev),
                PNL.map((r) => r.ni / r.rev),
              ];
              const n = PNL.length;
              return (
                <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                  {series.map((s, si) => {
                    const xs = s.map((_, k) => xAt(k, n, pad.l, pad.r, w));
                    const ys = s.map((v) => yAt(v, 0.18, 0.52, pad.t, pad.b, h) - si * 10);
                    return (
                      <path
                        key={si}
                        d={curvePath(xs, ys)}
                        fill="none"
                        stroke={si === 0 ? "var(--color-up)" : "var(--color-accent)"}
                        strokeWidth="1.5"
                        opacity={0.4 + si * 0.12}
                        className="term-draw"
                      />
                    );
                  })}
                </svg>
              );
            }}
          </ChartFrame>
        </div>
        <div>
          <p className="text-sm font-medium">Profit per share</p>
          <ChartFrame className="mt-2" heightClass="h-52">
            {({ w, h }) => {
              const pad = { l: 12, r: 12, t: 12, b: 24 };
              const n = name.eps.length;
              const max = Math.max(...name.eps, 0.01) * 1.2;
              const bw = ((w - pad.l - pad.r) / n) * 0.32;
              return (
                <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                  {name.eps.map((e, k) => {
                    const x = xAt(k, n, pad.l, pad.r, w);
                    const y = yAt(Math.max(0, e), 0, max, pad.t, pad.b, h);
                    const y0 = yAt(0, 0, max, pad.t, pad.b, h);
                    const cash = e * (cashEps[k] ?? 0.92);
                    const yc = yAt(Math.max(0, cash), 0, max, pad.t, pad.b, h);
                    const on = k === yearI;
                    return (
                      <g key={name.years[k]}>
                        <rect
                          x={x - bw - 2}
                          y={y}
                          width={bw}
                          height={y0 - y}
                          fill="var(--color-chart-1)"
                          opacity={on ? 1 : 0.72}
                          className="deck-grow origin-bottom"
                          style={{ transformBox: "fill-box" }}
                        />
                        <rect
                          x={x + 2}
                          y={yc}
                          width={bw}
                          height={y0 - yc}
                          fill="var(--color-up)"
                          opacity={on ? 1 : 0.72}
                          className="deck-grow origin-bottom"
                          style={{ transformBox: "fill-box" }}
                        />
                        <text x={x} y={h - 6} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">
                          {String(name.years[k]).slice(2)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            }}
          </ChartFrame>
          <p className="text-xs text-muted-foreground">Diluted EPS (gold) vs FCF per share (green).</p>
        </div>
      </div>
    </article>
  );
}
