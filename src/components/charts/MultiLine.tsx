import { useMemo, useState } from "react";
import { Panel, Kicker } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip, Crosshair, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { linePath, xAt, yAt } from "@/lib/charts/math";
import { cn } from "@/lib/utils";

export type LineSeries = {
  name: string;
  values: number[];
  color: string;
  dash?: boolean;
  width?: number;
  fill?: boolean;
};

export function MultiLine({
  kicker,
  title,
  series,
  labels,
  yPrefix = "$",
  ySuffix = "",
}: {
  kicker?: string;
  title: string;
  series: LineSeries[];
  labels: readonly (string | number)[];
  yPrefix?: string;
  ySuffix?: string;
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [logScale, setLogScale] = useState(false);

  const activeSeries = useMemo(() => series.filter((s) => !hidden[s.name]), [series, hidden]);
  const n = labels.length;
  const all = activeSeries.flatMap((s) => s.values);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const yMin = min >= 0 ? min * 0.92 : min * 1.06;
  const yMax = max * 1.06;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const idx = hover ?? pinned ?? n - 1;
  const i = Math.max(0, Math.min(n - 1, idx));

  function fmt(v: number) {
    const abs = Math.abs(v);
    const body = abs >= 100 ? v.toFixed(0) : v.toFixed(1);
    return `${yPrefix}${body}${ySuffix}`;
  }

  return (
    <Panel>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
      <ToolBar className="mt-4">
        <ToolChip on={logScale} onClick={() => setLogScale((v) => !v)} title="Log scale (positive series only)">
          Log
        </ToolChip>
      </ToolBar>
      <ChartFrame className="mt-3" heightClass="h-56 md:h-72">
        {({ w, h }) => {
          const xs = labels.map((_, ii) => xAt(ii, n, pad.l, pad.r, w));
          const useLog = logScale && yMin > 0;
          const y = (v: number) => yAt(v, yMin, yMax, pad.t, pad.b, h, useLog);
          return (
            <>
              <ChartSvg
                viewW={w}
                viewH={h}
                n={n}
                pad={pad}
                index={hover}
                label={title}
                onIndex={setHover}
                onCommit={setPinned}
              >
                {activeSeries.map((s) => (
                  <path
                    key={s.name}
                    d={linePath(xs, s.values.map(y))}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width ?? 2}
                    strokeDasharray={s.dash ? "5 5" : undefined}
                    className="pointer-events-none"
                  />
                ))}
                {labels.map((lb, ii) => (
                  <text key={`${String(lb)}-${ii}`} x={xs[ii]} y={h - 6} textAnchor="middle" fill="currentColor" opacity="0.45" fontSize="11">
                    {lb}
                  </text>
                ))}
                <text x={4} y={pad.t + 4} fill="currentColor" opacity="0.45" fontSize="11">
                  {fmt(yMax)}
                </text>
                <Crosshair x={xs[i]!} y={y(activeSeries[0]?.values[i] ?? yMin)} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
                {activeSeries.map((s) => (
                  <circle key={s.name} cx={xs[i]} cy={y(s.values[i]!)} r="3.5" fill={s.color} className="pointer-events-none" />
                ))}
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xs[i]! / w) * 100}>
                <p className="text-muted-foreground">{String(labels[i])}</p>
                {activeSeries.map((s) => (
                  <p key={s.name} className="mt-0.5 flex items-center justify-between gap-4 tabular">
                    <span className="text-muted-foreground">{s.name}</span>
                    <span>{fmt(s.values[i]!)}</span>
                  </p>
                ))}
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-2 text-xs">
        {series.map((s) => {
          const off = hidden[s.name];
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [s.name]: !h[s.name] }))}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-full bg-secondary px-3",
                off && "opacity-40",
              )}
            >
              <span className="h-0.5 w-5" style={{ background: s.color }} />
              <span className={off ? "line-through" : ""}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
