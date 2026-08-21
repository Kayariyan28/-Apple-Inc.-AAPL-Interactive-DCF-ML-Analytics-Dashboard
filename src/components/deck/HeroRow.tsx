import { useMemo, useState } from "react";
import { PIPELINE, STAGES } from "@/lib/dcf/metrics";
import { billions, pctPlain } from "@/lib/dcf/format";
import { ChartFrame } from "@/components/charts/chart-kit";
import { curvePath, xAt, yAt } from "@/lib/charts/math";
import { useCount } from "./motion";
import { useFocusedName } from "@/lib/store";
import { cn, r } from "@/lib/utils";

const PAPER = ["#1d1d1f", "#636366", "#8e8e93", "#c7c7cc", "#e8e8ed"] as const;

function paperFill(id: string, heroId: string, i: number) {
  if (id === heroId) return "#0a84ff";
  return PAPER[i % PAPER.length]!;
}

export function MixColumns() {
  const name = useFocusedName();
  const [hover, setHover] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const i = hover ?? pin ?? name.mix.length - 1;
  const row = name.mix[i]!;
  const layersDef = name.mixKeys.map((k, ki) => ({
    key: k.id,
    label: k.label,
    fill: paperFill(k.id, name.heroMixId, ki),
  }));
  const active = layersDef.filter((l) => !hidden[l.key]);
  const layers = name.mix.map((r, yi) => {
    let y0 = 0;
    const bands = active.map((l) => {
      const mag = name.revenue[yi]! * (r.shares[l.key] ?? 0);
      const b = { ...l, mag, y0, y1: y0 + mag };
      y0 += mag;
      return b;
    });
    return { year: r.year, total: y0, bands };
  });
  const max = Math.max(...layers.map((l) => l.total), 1);
  const hero = name.mixKeys.find((k) => k.id === name.heroMixId);

  return (
    <article className="deck-paper flex min-h-0 flex-col rounded-2xl p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-paper-muted">
          {name.symbol} mix · {hero?.label ?? "hero"} compounding
        </p>
        <ul className="flex flex-wrap justify-end gap-3 text-[10px] uppercase tracking-widest text-paper-muted">
          {layersDef.map((l) => (
            <li key={l.key}>
              <button
                type="button"
                onClick={() => setHidden((h) => ({ ...h, [l.key]: !h[l.key] }))}
                className={cn("flex items-center gap-1.5", hidden[l.key] && "opacity-30")}
              >
                <span className="size-2 rounded-sm" style={{ background: l.fill }} />
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <ChartFrame className="mt-4" heightClass="h-56 md:h-64">
        {({ w, h }) => {
          const pad = { l: 10, r: 10, t: 18, b: 32 };
          const n = layers.length;
          const slot = (w - pad.l - pad.r) / n;
          const bw = slot * 0.42;
          return (
            <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full" role="img" aria-label="Segment mix">
              <rect x={pad.l} y={h - pad.b} width={w - pad.l - pad.r} height="7" fill="#1d1d1f" />
              {layers.map((l, yi) => {
                const x = pad.l + yi * slot + (slot - bw) / 2;
                const on = yi === i;
                return (
                  <g
                    key={l.year}
                    className="cursor-pointer"
                    onMouseEnter={() => setHover(yi)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setPin(yi === pin ? null : yi)}
                  >
                    {l.bands.map((b) => {
                      const y = yAt(b.y1, 0, max, pad.t, pad.b, h);
                      const hh = Math.max(1, yAt(b.y0, 0, max, pad.t, pad.b, h) - y);
                      return (
                        <rect
                          key={b.key}
                          x={x}
                          y={y}
                          width={bw}
                          height={hh}
                          fill={b.fill}
                          opacity={on ? 1 : 0.88}
                          className="deck-grow origin-bottom"
                          style={{ transformBox: "fill-box", animationDelay: `${yi * 55}ms` }}
                        />
                      );
                    })}
                    <text
                      x={x + bw / 2}
                      y={h - 10}
                      textAnchor="middle"
                      fill="currentColor"
                      className="fill-paper-muted"
                      fontSize="10"
                    >
                      {String(l.year).slice(2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        }}
      </ChartFrame>
      <p className="mt-2 text-xs tabular text-paper-muted">
        FY{row.year} · {name.mixKeys.map((k) => `${k.label} ${pctPlain(row.shares[k.id] ?? 0)}`).join(" · ")} ·{" "}
        {billions(name.revenue[i]! * 1000, 0)}
        {pin != null ? " · pinned" : ""}
      </p>
    </article>
  );
}

export function CashPath() {
  const name = useFocusedName();
  const [i, setI] = useState<number | null>(null);
  const idx = i ?? name.cash.length - 1;
  const fcf = name.fcf[idx]!;
  const overlay = useCount(fcf, 1100);
  const n = name.cash.length;
  const all = [...name.cash, ...name.buybacks];
  const min = Math.min(...all) * 0.82;
  const max = Math.max(...all) * 1.1;

  return (
    <article className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl bg-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Cash balance / returned capital ($B)
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">FCF, last print</p>
      </div>
      <p className="pointer-events-none absolute left-5 top-[3.4rem] z-10 font-sans text-6xl font-medium tracking-tight tabular text-foreground/90 md:text-7xl">
        +${overlay.toFixed(0)}B
      </p>
      <ChartFrame className="mt-10" heightClass="h-40 md:h-48">
        {({ w, h }) => {
          const pad = { l: 8, r: 18, t: 28, b: 24 };
          const xs = name.cash.map((_, k) => xAt(k, n, pad.l, pad.r, w));
          const cashY = name.cash.map((v) => yAt(v, min, max, pad.t, pad.b, h));
          const bbY = name.buybacks.map((v) => yAt(v, min, max, pad.t, pad.b, h));
          return (
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="chart-svg h-full w-full"
              onMouseLeave={() => setI(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const u = (e.clientX - rect.left) / Math.max(1, rect.width);
                setI(Math.max(0, Math.min(n - 1, Math.round(u * (n - 1)))));
              }}
            >
              <line
                x1={xs[idx]}
                x2={xs[idx]}
                y1={pad.t}
                y2={h - pad.b}
                stroke="rgb(255 255 255 / 0.12)"
              />
              <path d={curvePath(xs, cashY)} fill="none" stroke="var(--color-accent)" strokeWidth="1.9" className="term-draw" />
              <path
                d={curvePath(xs, bbY)}
                fill="none"
                stroke="rgb(255 255 255 / 0.55)"
                strokeWidth="1.4"
                strokeDasharray="3 5"
                className="term-draw"
              />
              <circle cx={xs[idx]} cy={cashY[idx]} r="3.4" fill="var(--color-accent)" />
              <circle cx={xs[idx]} cy={bbY[idx]} r="2.8" fill="rgb(255 255 255 / 0.7)" />
              {name.years.map((y, k) => (
                <text key={y} x={xs[k]} y={h - 6} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">
                  {String(y).slice(2)}
                </text>
              ))}
            </svg>
          );
        }}
      </ChartFrame>
      <p className="relative z-10 text-xs tabular text-muted-foreground">
        FY{name.years[idx]} · cash ${name.cash[idx]!.toFixed(0)}B · buybacks ${name.buybacks[idx]!.toFixed(0)}B ·
        capex ${name.capex[idx]!.toFixed(1)}B
      </p>
    </article>
  );
}

export function PipelineGantt() {
  const name = useFocusedName();
  const [focus, setFocus] = useState<string | null>(null);
  if (name.symbol !== "AAPL") {
    const start = name.mix[0]!;
    const end = name.mix[name.mix.length - 1]!;
    return (
      <article className="deck-paper flex min-h-0 flex-col rounded-2xl p-5 md:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-paper-muted">
          Mix trajectory · FY{start.year} → FY{end.year}
        </p>
        <div className="mt-6 space-y-4">
          {name.mixKeys.map((k) => {
            const a = start.shares[k.id] ?? 0;
            const b = end.shares[k.id] ?? 0;
            const on = focus === k.id;
            const lo = Math.min(a, b);
            const span = Math.abs(b - a);
            return (
              <button
                key={k.id}
                type="button"
                onMouseEnter={() => setFocus(k.id)}
                onMouseLeave={() => setFocus(null)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="w-[5.4rem] text-[11px] font-medium tracking-[0.12em] text-ink/80">{k.label}</span>
                <span className="relative h-3 flex-1 rounded-sm bg-ink/10">
                  <span
                    className={cn("absolute top-0 h-full rounded-sm", b >= a ? "bg-accent" : "bg-ink/30", on && "brightness-110")}
                    style={{ left: `${lo * 100}%`, width: `${Math.max(0.02, span) * 100}%` }}
                  />
                  <span className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${b * 100}%` }} />
                </span>
                <span className="w-10 text-right text-[11px] tabular text-paper-muted">{pctPlain(b)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-paper-muted">Bar is the FY18–FY25 move. Tick is the latest mix.</p>
      </article>
    );
  }
  return (
    <article className="deck-paper flex min-h-0 flex-col rounded-2xl p-5 md:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-paper-muted">
        Pipeline expansion · product development platform
      </p>
      <div className="relative mt-5">
        <div className="mb-2 flex pl-[5.5rem] text-[10px] uppercase tracking-widest text-paper-muted">
          {STAGES.map((s) => (
            <span key={s} className="flex-1">
              {s}
            </span>
          ))}
        </div>
        <div className="absolute bottom-0 left-[5.5rem] top-6 flex w-[calc(100%-5.5rem)]">
          {STAGES.map((s) => (
            <span key={s} className="flex-1 border-l border-ink/10" />
          ))}
        </div>
        <div className="space-y-5">
          {PIPELINE.map((fam) => (
            <div key={fam.family} className="relative">
              <p className="mb-2 w-[5.2rem] text-[11px] font-medium tracking-[0.14em] text-ink/80">{fam.family}</p>
              <div className="ml-[5.5rem] space-y-2">
                {fam.rows.map((row) => (
                  <button
                    key={row.name}
                    type="button"
                    onMouseEnter={() => setFocus(row.name)}
                    onMouseLeave={() => setFocus(null)}
                    className="relative block h-3 w-full"
                    aria-label={row.name}
                  >
                    <span
                      className={cn(
                        "absolute top-0 h-full rounded-sm transition-all duration-200",
                        row.tone === "done" && "bg-ink/25",
                        row.tone === "now" && "bg-accent",
                        row.tone === "next" && "bg-ink",
                        focus === row.name && "brightness-110",
                      )}
                      style={{ left: `${row.start * 100}%`, width: `${(row.end - row.start) * 100}%` }}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-1 ml-[5.5rem] text-[11px] text-paper-muted">
                {focus && fam.rows.some((r) => r.name === focus)
                  ? fam.rows.find((r) => r.name === focus)?.name
                  : fam.rows.map((r) => r.name).join(" · ")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export function KeyFigures({ mktCap, heroMix, heroName, tape, shares, fcf }: { mktCap: number | null; heroMix: number; heroName: string; tape: number; shares: number; fcf: number }) {
  const cap = useCount((mktCap ?? tape * shares * 1e6) / 1e12, 1000);
  const mix = useCount(heroMix * 100, 1000);
  const f = useCount(fcf, 1000);
  return (
    <article className="flex min-h-0 flex-col justify-between rounded-2xl bg-card p-5 md:p-6">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Key figures</p>
        <span className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-foreground">↗</span>
      </div>
      <dl className="mt-8 space-y-7">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Live market cap</dt>
          <dd className="mt-1 font-sans text-5xl font-medium tracking-tight tabular md:text-6xl">${cap.toFixed(2)}T</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{heroName} mix, FY2025</dt>
          <dd className="mt-1 font-sans text-4xl font-medium tracking-tight tabular">{mix.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">Free cash flow</dt>
          <dd className="mt-1 font-sans text-4xl font-medium tracking-tight tabular">${f.toFixed(0)}B</dd>
        </div>
      </dl>
    </article>
  );
}

export function HalfDonut() {
  const name = useFocusedName();
  const [hover, setHover] = useState<string | null>(null);
  const last = name.mix[name.mix.length - 1]!;
  const slices = useMemo(() => {
    let a = 0;
    return name.mixKeys.map((k, i) => {
      const share = last.shares[k.id] ?? 0;
      const gap = 0.018;
      const start = a + gap / 2;
      const end = a + Math.PI * share - gap / 2;
      a += Math.PI * share;
      return { key: k.id, label: k.label, fill: paperFill(k.id, name.heroMixId, i), share, start, end };
    });
  }, [name, last]);
  const focus = slices.find((s) => s.key === hover) ?? slices.find((s) => s.key === name.heroMixId) ?? slices[0]!;
  const cx = 160;
  const cy = 28;
  const rOut = 118;
  const rIn = 62;

  function arc(start: number, end: number, r0: number, r1: number) {
    const p = (ang: number, rad: number) => [r(cx + rad * Math.cos(ang)), r(cy + rad * Math.sin(ang))] as const;
    const large = end - start > Math.PI ? 1 : 0;
    const a0 = p(start, r1);
    const a1 = p(end, r1);
    const b1 = p(end, r0);
    const b0 = p(start, r0);
    return `M${a0[0]},${a0[1]} A${r1},${r1} 0 ${large} 1 ${a1[0]},${a1[1]} L${b1[0]},${b1[1]} A${r0},${r0} 0 ${large} 0 ${b0[0]},${b0[1]} Z`;
  }

  return (
    <article className="deck-paper flex min-h-0 flex-col rounded-2xl p-5 md:p-6">
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-paper-muted">
        FY{name.years[name.years.length - 1]} {name.symbol} revenue mix
      </p>
      <ChartFrame className="mt-1" heightClass="h-52 md:h-56">
        {() => (
          <svg viewBox="0 0 320 200" className="chart-svg mx-auto h-full w-full max-w-sm">
            {slices.map((s) => {
              const mid = (s.start + s.end) / 2;
              const lx = cx + (rOut + 22) * Math.cos(mid);
              const ly = cy + (rOut + 18) * Math.sin(mid);
              const on = hover === s.key || (!hover && s.key === name.heroMixId);
              return (
                <g key={s.key}>
                  <path
                    d={arc(s.start, s.end, rIn, rOut)}
                    fill={s.fill}
                    opacity={hover && hover !== s.key ? 0.4 : 1}
                    className="cursor-pointer transition-opacity duration-200"
                    onMouseEnter={() => setHover(s.key)}
                    onMouseLeave={() => setHover(null)}
                  />
                  {s.share > 0.12 ? (
                    <text
                      x={r(lx)}
                      y={r(ly)}
                      textAnchor={Math.cos(mid) > 0.2 ? "start" : Math.cos(mid) < -0.2 ? "end" : "middle"}
                      fontSize="10"
                      fill="#1d1d1f"
                      className="pointer-events-none"
                      fontWeight={on ? 600 : 400}
                    >
                      {s.label.split(" ")[0]!.toUpperCase()} {pctPlain(s.share, 0)}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <text x={cx} y={18} textAnchor="middle" fontSize="11" fill="#6e6e73">
              {focus.label}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="20" fill="#1d1d1f" fontWeight="500">
              {pctPlain(focus.share)}
            </text>
          </svg>
        )}
      </ChartFrame>
      <p className="text-xs text-paper-muted">Hover a wedge. {focus.label} is the slice this desk watches.</p>
    </article>
  );
}

export function HeroRow({ mktCap, tape }: { mktCap: number | null; tape: number }) {
  const name = useFocusedName();
  const last = name.mix.length - 1;
  const hero = name.mixKeys.find((k) => k.id === name.heroMixId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MixColumns />
      <CashPath />
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
        <PipelineGantt />
        <KeyFigures
          mktCap={mktCap}
          heroMix={name.mix[last]!.shares[name.heroMixId] ?? 0}
          heroName={hero?.label ?? "Hero"}
          tape={tape}
          shares={name.shares[last]!}
          fcf={name.fcf[last]!}
        />
        <HalfDonut />
      </div>
    </div>
  );
}
