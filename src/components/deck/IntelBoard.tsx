import { useMemo, useState } from "react";
import type { Quote } from "@/lib/market/types";
import { FORECAST_YEARS } from "@/lib/dcf/constants";
import { moneyShare, pct } from "@/lib/dcf/format";
import { ChartFrame } from "@/components/charts/chart-kit";
import { curvePath, xAt, yAt } from "@/lib/charts/math";
import { priceEnsemble } from "@/lib/dcf/regress";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";

const RIGHT = [
  { id: "fcf", label: "Free cash flow", v: 0.26 },
  { id: "opex", label: "Reinvested", v: 0.47 },
  { id: "tax", label: "Tax + other", v: 0.27 },
];

function ribbon(x1: number, y1: number, t1: number, x2: number, y2: number, t2: number) {
  const mx = (x1 + x2) / 2;
  return `M${x1},${y1 - t1 / 2}
    C${mx},${y1 - t1 / 2} ${mx},${y2 - t2 / 2} ${x2},${y2 - t2 / 2}
    L${x2},${y2 + t2 / 2}
    C${mx},${y2 + t2 / 2} ${mx},${y1 + t1 / 2} ${x1},${y1 + t1 / 2} Z`;
}

export function IntelBoard({ aapl, peers, tape }: { aapl: Quote; peers: Quote[]; tape: number }) {
  const name = useFocusedName();
  const voice = useVoice();
  const [hover, setHover] = useState<string | null>(null);
  const ens = priceEnsemble(tape, name.symbol);
  const lastMix = name.mix[name.mix.length - 1]!;
  const lastI = name.years.length - 1;
  const LEFT = name.mixKeys.map((k) => ({ id: k.id, label: k.label, v: lastMix.shares[k.id] ?? 0 }));
  const bubbles = useMemo(() => {
    return [aapl, ...peers].map((q, i) => ({
      q,
      x: 0.14 + ((q.pe ?? 25) / 55) * 0.7,
      y: 0.18 + i * 0.15 + Math.max(-0.08, Math.min(0.08, q.changePct * 4)),
      r: 12 + Math.sqrt((q.mktCap ?? 1e12) / 1e12) * 20,
    }));
  }, [aapl, peers]);

  return (
    <div className="grid gap-4">
      <article className="rounded-2xl bg-card p-5 md:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Where a {name.symbol} revenue dollar goes</p>
        <h3 className="mt-1 font-serif text-2xl font-medium tracking-tight">{name.symbol} mix → cash.</h3>
        <ChartFrame className="mt-4" heightClass="h-56 md:h-64">
          {({ w, h }) => {
            const pad = 20;
            const lh = (h - pad * 2) / LEFT.length;
            const rh = (h - pad * 2) / RIGHT.length;
            const lx = 8;
            const lw = 110;
            const rx = w - 124;
            const rw = 110;
            return (
              <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                {LEFT.map((L, i) =>
                  RIGHT.map((R, j) => {
                    const y1 = pad + i * lh + lh / 2;
                    const y2 = pad + j * rh + rh / 2;
                    const t1 = 6 + L.v * 36;
                    const t2 = 4 + R.v * 28;
                    const on = hover === L.id || hover === R.id;
                    return (
                      <path
                        key={`${L.id}-${R.id}`}
                        d={ribbon(lx + lw, y1, t1 * R.v * 1.6, rx, y2, t2 * L.v * 1.4)}
                        fill="var(--color-accent)"
                        opacity={on ? 0.38 : 0.12}
                        className="transition-opacity duration-200"
                      />
                    );
                  }),
                )}
                {LEFT.map((L, i) => (
                  <g key={L.id} className="cursor-pointer" onMouseEnter={() => setHover(L.id)} onMouseLeave={() => setHover(null)}>
                    <rect x={lx} y={pad + i * lh + 8} width={lw} height={lh - 16} rx="4" fill="var(--color-accent)" opacity={hover === L.id ? 1 : 0.82} />
                    <text x={lx + 10} y={pad + i * lh + lh / 2 + 4} fontSize="11" fill="white">
                      {L.label}
                    </text>
                  </g>
                ))}
                {RIGHT.map((R, i) => (
                  <g key={R.id} className="cursor-pointer" onMouseEnter={() => setHover(R.id)} onMouseLeave={() => setHover(null)}>
                    <rect
                      x={rx}
                      y={pad + i * rh + 8}
                      width={rw}
                      height={rh - 16}
                      rx="4"
                      fill="var(--color-secondary)"
                      stroke={hover === R.id ? "var(--color-accent)" : "var(--color-border)"}
                    />
                    <text x={rx + 10} y={pad + i * rh + rh / 2 + 4} fontSize="11" fill="var(--color-foreground)">
                      {R.label}
                    </text>
                  </g>
                ))}
              </svg>
            );
          }}
        </ChartFrame>
        <p className="text-xs text-muted-foreground">
          FY{name.years[lastI]} revenue ${name.revenue[lastI]!.toFixed(0)}B · cash ${name.cash[lastI]!.toFixed(0)}B · debt $
          {name.debt[lastI]!.toFixed(0)}B
        </p>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl bg-card p-5 md:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Mega-cap threat / opportunity</p>
          <h3 className="mt-1 font-serif text-2xl font-medium tracking-tight">Bubbles sized by cap, placed by multiple.</h3>
          <ChartFrame className="mt-4" heightClass="h-64">
            {({ w, h }) => (
              <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                {[0.25, 0.5, 0.75].map((u) => (
                  <line
                    key={u}
                    x1={24}
                    x2={w - 12}
                    y1={12 + u * (h - 36)}
                    y2={12 + u * (h - 36)}
                    stroke="rgb(255 255 255 / 0.05)"
                  />
                ))}
                <line x1={20} x2={w - 12} y1={h - 20} y2={h - 20} stroke="rgb(255 255 255 / 0.1)" />
                <line x1={20} x2={20} y1={12} y2={h - 20} stroke="rgb(255 255 255 / 0.1)" />
                <text x={w / 2} y={h - 4} textAnchor="middle" fontSize="9" fill="var(--color-muted-foreground)">
                  P/E →
                </text>
                {bubbles.map((b) => {
                  const cx = 20 + b.x * (w - 40);
                  const cy = h - 20 - b.y * (h - 40);
                  const on = hover === b.q.symbol;
                  const focused = b.q.symbol === name.symbol;
                  return (
                    <g
                      key={b.q.symbol}
                      className="cursor-pointer"
                      onMouseEnter={() => setHover(b.q.symbol)}
                      onMouseLeave={() => setHover(null)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={b.r}
                        fill={focused ? "var(--color-accent)" : "var(--color-secondary)"}
                        stroke={on ? "var(--color-foreground)" : focused ? "var(--color-accent)" : "rgb(255 255 255 / 0.18)"}
                        opacity={on ? 0.95 : 0.7}
                      />
                      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fill="white">
                        {b.q.symbol}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </ChartFrame>
          <p className="text-xs tabular text-muted-foreground">
            {hover
              ? (() => {
                  const q = [aapl, ...peers].find((p) => p.symbol === hover);
                  return q ? `${q.symbol} ${moneyShare(q.price)} ${pct(q.changePct)} P/E ${q.pe?.toFixed(1) ?? "—"}` : hover;
                })()
              : "Hover a name. Size is market cap. X is P/E."}
          </p>
        </article>

        <article className="rounded-2xl bg-card p-5 md:p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Monitored path · OLS ensemble</p>
          <h3 className="mt-1 font-serif text-2xl font-medium tracking-tight">{voice.intelTitle}</h3>
          <ChartFrame className="mt-4" heightClass="h-64">
            {({ w, h }) => {
              const pad = { l: 12, r: 48, t: 16, b: 28 };
              const n = ens.mid.length;
              const all = [...ens.mid, ...ens.upper, ...ens.lower, tape];
              const min = Math.min(...all) * 0.92;
              const max = Math.max(...all) * 1.05;
              const series = [
                { v: ens.upper, c: "var(--color-up)", name: "hi" },
                { v: ens.mid, c: "var(--color-foreground)", name: "mid" },
                { v: ens.lower, c: "var(--color-down)", name: "lo" },
              ];
              return (
                <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg h-full w-full">
                  {series.map((s) => {
                    const xs = s.v.map((_, i) => xAt(i, n, pad.l, pad.r, w));
                    const ys = s.v.map((v) => yAt(v, min, max, pad.t, pad.b, h));
                    return (
                      <g key={s.name}>
                        <path d={curvePath(xs, ys)} fill="none" stroke={s.c} strokeWidth="1.6" className="term-draw" />
                        {xs.map((x, i) => (
                          <circle key={i} cx={x} cy={ys[i]} r="3" fill={s.c} />
                        ))}
                      </g>
                    );
                  })}
                  {FORECAST_YEARS.map((y, i) => (
                    <text
                      key={y}
                      x={xAt(i, n, pad.l, pad.r, w)}
                      y={h - 8}
                      textAnchor="middle"
                      fontSize="10"
                      fill="var(--color-muted-foreground)"
                    >
                      {y}
                    </text>
                  ))}
                </svg>
              );
            }}
          </ChartFrame>
        </article>
      </div>
    </div>
  );
}
