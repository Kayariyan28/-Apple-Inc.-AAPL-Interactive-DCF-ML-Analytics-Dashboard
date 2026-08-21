import { useState } from "react";
import { TGR_RANGE, WACC_RANGE } from "@/lib/dcf/constants";
import { moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { linePath, xAt, yAt } from "@/lib/charts/math";
import type { HistogramBin } from "@/lib/dcf/engine";
import type { LatticeCell, SparkSeries, VizSpec } from "@/lib/term/types";
import { useModel } from "@/lib/store";
import { cn } from "@/lib/utils";

const SPARK_COLOR: Record<string, string> = {
  fg: "var(--color-foreground)",
  accent: "var(--color-accent)",
  up: "var(--color-up)",
  down: "var(--color-down)",
  muted: "var(--color-muted-foreground)",
};

function Spark({ series, labels }: { series: SparkSeries[]; labels?: string[] }) {
  const [i, setI] = useState<number | null>(null);
  const n = Math.max(...series.map((s) => s.values.length), 2);
  const all = series.flatMap((s) => s.values.filter((v) => Number.isFinite(v)));
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = { l: 4, r: 4, t: 8, b: 8 };
  const W = 320;
  const H = 92;
  const idx = i ?? n - 1;
  return (
    <div className="mt-6">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-svg h-24 w-full"
        onMouseLeave={() => setI(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const u = (e.clientX - rect.left) / Math.max(1, rect.width);
          setI(Math.max(0, Math.min(n - 1, Math.round(u * (n - 1)))));
        }}
      >
        {series.map((s) => {
          const xs: number[] = [];
          const ys: number[] = [];
          s.values.forEach((v, j) => {
            if (!Number.isFinite(v)) return;
            xs.push(xAt(j, n, pad.l, pad.r, W));
            ys.push(yAt(v, min, max, pad.t, pad.b, H));
          });
          return (
            <path
              key={s.name}
              d={linePath(xs, ys)}
              fill="none"
              stroke={SPARK_COLOR[s.color ?? "fg"]}
              strokeWidth={s.name.toLowerCase().includes("mid") || s.color === "fg" ? 1.8 : 1.2}
              opacity={s.color === "fg" ? 1 : 0.85}
              className="term-draw"
            />
          );
        })}
        <circle
          cx={xAt(idx, n, pad.l, pad.r, W)}
          cy={yAt(series[0]?.values[idx] ?? min, min, max, pad.t, pad.b, H)}
          r={2.4}
          fill="var(--color-foreground)"
        />
      </svg>
      <p className="mt-1 text-xs tabular text-muted-foreground">
        {labels?.[idx] ?? `#${idx + 1}`}
        {series.map((s) => {
          const v = s.values[idx];
          if (v == null || !Number.isFinite(v)) return null;
          const shown = Math.abs(v) >= 20 ? moneyShare(v) : v.toFixed(2);
          return (
            <span key={s.name}>
              {" · "}
              {s.name} {shown}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function MiniHist({ bins, market }: { bins: HistogramBin[]; market?: number }) {
  const max = Math.max(...bins.map((b) => b.share), 1e-9);
  return (
    <div className="mt-6 flex h-24 items-end gap-px">
      {bins.map((b, i) => {
        const h = (b.share / max) * 100;
        const on = market != null && market >= b.x0 && market < b.x1;
        return (
          <div
            key={i}
            title={`${moneyShare(b.x0)}–${moneyShare(b.x1)} · ${(b.share * 100).toFixed(1)}%`}
            className={cn(
              "min-w-0 flex-1 rounded-sm transition-[height,background-color] duration-300",
              on ? "bg-accent" : "bg-foreground/35",
            )}
            style={{ height: `${Math.max(4, h)}%`, transitionDelay: `${i * 8}ms` }}
          />
        );
      })}
    </div>
  );
}

function MiniHeat({ grid, market }: { grid: number[][]; market: number }) {
  const [cell, setCell] = useState<{ i: number; j: number } | null>(null);
  const focus = cell ?? { i: 4, j: 3 };
  const price = grid[focus.i]?.[focus.j];
  return (
    <div className="mt-6">
      <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${TGR_RANGE.length}, minmax(0, 1fr))` }}>
        {grid.map((row, i) =>
          row.map((p, j) => {
            const ratio = Number.isFinite(p) ? p / market : 1;
            const on = i === focus.i && j === focus.j;
            return (
              <button
                key={`${i}-${j}`}
                type="button"
                onMouseEnter={() => setCell({ i, j })}
                onFocus={() => setCell({ i, j })}
                className={cn(
                  "h-3.5 rounded-[2px] transition-transform duration-150 ease-out hover:scale-110",
                  !Number.isFinite(p)
                    ? "bg-secondary"
                    : ratio > 1.1
                      ? "bg-up/70"
                      : ratio > 1
                        ? "bg-up/35"
                        : ratio > 0.9
                          ? "bg-secondary"
                          : "bg-down/50",
                  on && "ring-1 ring-foreground",
                )}
                aria-label={`${pctPlain(WACC_RANGE[i]!)} / ${pctPlain(TGR_RANGE[j]!)}`}
              />
            );
          }),
        )}
      </div>
      {price != null && Number.isFinite(price) ? (
        <p className="mt-2 text-xs tabular text-muted-foreground">
          {pctPlain(WACC_RANGE[focus.i]!)} × {pctPlain(TGR_RANGE[focus.j]!)} · {moneyShare(price)} · {pct(price / market - 1)} vs
          tape
        </p>
      ) : null}
    </div>
  );
}

function Lattice({ cells, note }: { cells: LatticeCell[]; note?: string }) {
  const [i, setI] = useState<number | null>(null);
  if (!cells.length) return null;
  const focus = i != null ? cells[i] : null;
  const up = cells.filter((c) => c.up).length;
  return (
    <div className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">+ {note || "lattice"}</p>
        <p className="text-xs tabular text-muted-foreground">{focus ? pct(focus.ret) : `${up}/${cells.length} up`}</p>
      </div>
      <div className="grid grid-cols-10 gap-y-2">
        {cells.map((c, idx) => (
          <button
            key={idx}
            type="button"
            onMouseEnter={() => setI(idx)}
            onMouseLeave={() => setI(null)}
            onFocus={() => setI(idx)}
            className="flex size-7 items-center justify-center text-muted-foreground transition-colors duration-150 hover:text-foreground"
            aria-label={pct(c.ret)}
          >
            <svg
              viewBox="0 0 12 12"
              className={cn(
                "size-3.5 transition-transform duration-200",
                c.up ? "-rotate-45 text-foreground/80" : "rotate-[135deg] text-muted-foreground",
              )}
            >
              <path d="M3 2.5 L9 6 L3 9.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export function VizPane({ viz }: { viz: VizSpec | null }) {
  const ticker = useModel((s) => s.ticker);
  if (!viz) {
    return (
      <div className="flex h-full flex-col justify-between px-5 py-6 md:px-6">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{ticker} desk</p>
          <h2 className="mt-5 font-serif text-3xl font-medium tracking-tight">Waiting on a command.</h2>
        </div>
      </div>
    );
  }

  const hintTone =
    viz.hint && (viz.hint.startsWith("+") || viz.kind === "quote" || viz.kind === "intraday")
      ? "text-up"
      : viz.hint?.startsWith("-")
        ? "text-down"
        : "text-muted-foreground";

  return (
    <div key={`${viz.kind}-${viz.headline}`} className="flex h-full min-h-0 flex-col overflow-y-auto px-5 py-6 md:px-6">
      <p className="term-rise text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">{viz.kicker}</p>
      <h2 className="term-rise mt-5 font-serif text-[1.85rem] font-medium leading-[1.15] tracking-tight md:text-[2.05rem]">
        {viz.title}
      </h2>
      <div className="term-rise mt-7">
        <p className="font-sans text-4xl font-medium tracking-tight tabular md:text-5xl">{viz.headline}</p>
        {viz.hint ? <p className={cn("mt-2 text-sm tabular", hintTone)}>{viz.hint}</p> : null}
      </div>
      <ul className="mt-8 space-y-4">
        {viz.rows.map((row, i) => (
          <li
            key={`${row.label}-${i}`}
            className="term-rise flex items-start justify-between gap-4"
            style={{ animationDelay: `${80 + i * 40}ms` }}
          >
            <div className="min-w-0">
              {row.value ? (
                <p
                  className={cn(
                    "text-sm font-medium tabular",
                    row.tone === "up" ? "text-up" : row.tone === "down" ? "text-down" : "text-foreground",
                  )}
                >
                  {row.value}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">{row.label}</p>
              {row.detail ? <p className="mt-0.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{row.detail}</p> : null}
            </div>
            {i === viz.rows.length - 1 && viz.note ? (
              <p className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">{viz.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {viz.heat && viz.market != null ? <MiniHeat grid={viz.heat} market={viz.market} /> : null}
      {viz.hist ? <MiniHist bins={viz.hist} market={viz.market} /> : null}
      {viz.spark?.length ? <Spark series={viz.spark} labels={viz.labels} /> : null}
      <Lattice cells={viz.lattice} note={viz.latticeNote} />
    </div>
  );
}
