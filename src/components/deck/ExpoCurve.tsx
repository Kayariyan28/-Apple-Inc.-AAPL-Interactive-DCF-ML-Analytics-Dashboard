import { useState } from "react";
import { S_CURVE } from "@/lib/dcf/metrics";
import { ChartFrame } from "@/components/charts/chart-kit";
import { curvePath, xAt, yAt } from "@/lib/charts/math";

export function ExpoCurve() {
  const [i, setI] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const n = S_CURVE.subs.length;
  const idx = i ?? pin ?? n - 1;
  const max = 3.3;
  const val = S_CURVE.subs[idx]!;
  const estimate = S_CURVE.years[idx]! > S_CURVE.disclosedThrough;

  return (
    <article className="overflow-hidden rounded-2xl bg-[#0a0a0a] p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Paid relationships</p>
          <h3 className="mt-2 font-serif text-2xl font-medium tracking-tight md:text-3xl">The flywheel does not do linear.</h3>
        </div>
        <p className="font-sans text-4xl font-medium tabular">
          {val >= 1 ? `${val.toFixed(2)}B` : `${Math.round(val * 1000)}M`}
          {estimate ? <span className="ml-2 text-sm text-muted-foreground">est.</span> : null}
        </p>
      </div>
      <ChartFrame className="mt-6" heightClass="h-64 md:h-80">
        {({ w, h }) => {
          const pad = { l: 48, r: 56, t: 40, b: 36 };
          const xs = S_CURVE.subs.map((_, k) => xAt(k, n, pad.l, pad.r, w));
          const ys = S_CURVE.subs.map((v) => yAt(v, 0, max, pad.t, pad.b, h));
          const lastEraX = xs[S_CURVE.eras[1]!.i]!;
          return (
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="chart-svg h-full w-full"
              onMouseLeave={() => setI(null)}
              onClick={() => setPin(idx)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const u = (e.clientX - rect.left) / Math.max(1, rect.width);
                setI(Math.max(0, Math.min(n - 1, Math.round(u * (n - 1)))));
              }}
            >
              <rect
                x={lastEraX}
                y={pad.t}
                width={Math.max(0, w - pad.r - lastEraX)}
                height={h - pad.t - pad.b}
                fill="rgb(255 255 255 / 0.035)"
              />
              {[1, 2, 3].map((g) => (
                <g key={g}>
                  <line
                    x1={pad.l}
                    x2={w - pad.r}
                    y1={yAt(g, 0, max, pad.t, pad.b, h)}
                    y2={yAt(g, 0, max, pad.t, pad.b, h)}
                    stroke="rgb(255 255 255 / 0.06)"
                  />
                  <text
                    x={pad.l - 10}
                    y={yAt(g, 0, max, pad.t, pad.b, h) + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--color-muted-foreground)"
                  >
                    {g}B
                  </text>
                </g>
              ))}
              {S_CURVE.eras.map((era) => {
                const x = xs[era.i]!;
                return (
                  <g key={era.title}>
                    <line x1={x} x2={x} y1={pad.t} y2={h - pad.b} stroke="rgb(255 255 255 / 0.1)" />
                    <text
                      x={x + (era.i > 10 ? -8 : 8)}
                      y={22}
                      textAnchor={era.i > 10 ? "end" : "start"}
                      fontSize="11"
                      fill="var(--color-muted-foreground)"
                    >
                      {era.title}
                    </text>
                  </g>
                );
              })}
              <path d={curvePath(xs, ys)} fill="none" stroke="var(--color-foreground)" strokeWidth="1.7" className="term-draw" />
              {S_CURVE.milestones.map((m) => (
                <g key={m.i}>
                  <circle cx={xs[m.i]} cy={ys[m.i]} r="4.2" fill="var(--color-foreground)" />
                  <text x={xs[m.i]! + 8} y={ys[m.i]! - 10} fontSize="11" fill="var(--color-foreground)">
                    {m.label}
                  </text>
                </g>
              ))}
              <line x1={xs[idx]} x2={xs[idx]} y1={pad.t} y2={h - pad.b} stroke="rgb(255 255 255 / 0.18)" />
              <circle cx={xs[idx]} cy={ys[idx]} r="5" fill="var(--color-foreground)" />
              {S_CURVE.labels.map((lab, k) =>
                k % 2 === 0 || k === n - 1 ? (
                  <text
                    key={lab}
                    x={xs[k]}
                    y={h - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--color-muted-foreground)"
                  >
                    {lab}
                  </text>
                ) : null,
              )}
            </svg>
          );
        }}
      </ChartFrame>
      <p className="mt-3 text-xs text-muted-foreground">
        Apple paid subscriptions. Disclosed through 1.0B (2023). FY24–FY28E are desk estimates — Services growth plus
        Intelligence attach. Hover to read a year; click to pin.
      </p>
    </article>
  );
}
