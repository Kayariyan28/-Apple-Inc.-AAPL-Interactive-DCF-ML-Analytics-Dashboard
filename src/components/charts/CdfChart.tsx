import { useState } from "react";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { Panel } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip, Crosshair } from "@/components/charts/chart-kit";
import { linePath, xAt, yAt } from "@/lib/charts/math";

export function CdfChart({
  points,
  market,
  title = "Cumulative distribution",
}: {
  points: { x: number; y: number }[];
  market: number;
  title?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const n = points.length;
  if (n < 2) return null;
  const min = points[0]!.x;
  const max = points[n - 1]!.x;
  const pad = { l: 16, r: 16, t: 16, b: 28 };
  const idx = hover ?? pinned ?? n - 1;
  const active = points[Math.max(0, Math.min(n - 1, idx))]!;

  return (
    <Panel>
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        At {moneyShare(active.x)} the model sits at the {pctPlain(active.y)} percentile.
      </p>
      <ChartFrame className="mt-4" heightClass="h-48 md:h-56">
        {({ w, h }) => {
          const xs = points.map((_, i) => xAt(i, n, pad.l, pad.r, w));
          const y = (v: number) => yAt(v, 0, 1, pad.t, pad.b, h);
          const ys = points.map((p) => y(p.y));
          const i = Math.max(0, Math.min(n - 1, idx));
          const mktX = pad.l + ((market - min) / (max - min || 1)) * (w - pad.l - pad.r);
          return (
            <>
              <ChartSvg
                viewW={w}
                viewH={h}
                n={n}
                pad={pad}
                index={hover}
                label="CDF"
                onIndex={setHover}
                onCommit={setPinned}
              >
                <path d={linePath(xs, ys)} fill="none" stroke="var(--color-accent)" strokeWidth="2.2" className="pointer-events-none" />
                <line x1={mktX} x2={mktX} y1={pad.t} y2={h - pad.b} stroke="var(--color-down)" strokeDasharray="4 4" className="pointer-events-none" />
                <text x={mktX + 6} y={pad.t + 10} fill="var(--color-down)" fontSize="11">
                  Market
                </text>
                <Crosshair x={xs[i]!} y={ys[i]!} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
                <circle cx={xs[i]} cy={ys[i]} r="4" fill="var(--color-accent)" className="pointer-events-none" />
                <text x={pad.l} y={h - 8} fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(min)}
                </text>
                <text x={w - pad.r} y={h - 8} textAnchor="end" fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(max)}
                </text>
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xs[i]! / w) * 100}>
                <p className="tabular text-sm font-medium">{moneyShare(active.x)}</p>
                <p className="text-muted-foreground">P(X ≤ x) = {pctPlain(active.y)}</p>
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>
    </Panel>
  );
}
