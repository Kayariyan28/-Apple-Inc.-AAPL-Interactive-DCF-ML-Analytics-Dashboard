import { useState } from "react";
import { Panel, Kicker } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip } from "@/components/charts/chart-kit";
import { cn, r } from "@/lib/utils";

export function GroupedBars({
  kicker,
  title,
  labels,
  series,
  ySuffix = "",
}: {
  kicker?: string;
  title: string;
  labels: readonly string[];
  series: { name: string; values: number[]; color: string }[];
  ySuffix?: string;
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = series.filter((s) => !hidden[s.name]);
  const n = labels.length;
  const max = Math.max(...active.flatMap((s) => s.values), 1);
  const pad = { l: 12, r: 12, t: 20, b: 32 };
  const idx = hover ?? pinned ?? -1;
  const i = idx >= 0 ? Math.max(0, Math.min(n - 1, idx)) : -1;

  return (
    <Panel>
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
      <ChartFrame className="mt-4" heightClass="h-52 md:h-64">
        {({ w, h }) => {
          const groupW = (w - pad.l - pad.r) / n;
          const barW = (groupW - 16) / Math.max(1, active.length);
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
                {labels.map((lb, gi) => {
                  const gx = pad.l + gi * groupW;
                  const on = i === gi;
                  return (
                    <g key={`${lb}-${gi}`}>
                      {on ? (
                        <rect
                          x={r(gx + 2)}
                          y={pad.t}
                          width={r(groupW - 4)}
                          height={h - pad.t - pad.b}
                          rx="8"
                          fill="currentColor"
                          opacity="0.05"
                          className="pointer-events-none"
                        />
                      ) : null}
                      {active.map((s, si) => {
                        const v = s.values[gi]!;
                        const bh = ((h - pad.t - pad.b) * v) / max;
                        return (
                          <rect
                            key={s.name}
                            x={r(gx + 8 + si * barW)}
                            y={r(h - pad.b - bh)}
                            width={r(Math.max(4, barW - 4))}
                            height={r(Math.max(0, bh))}
                            rx="6"
                            fill={s.color}
                            opacity={on || i < 0 ? 0.95 : 0.45}
                            className="pointer-events-none"
                          />
                        );
                      })}
                      <text x={r(gx + groupW / 2)} y={h - 8} textAnchor="middle" fill="currentColor" opacity="0.5" fontSize="11">
                        {lb}
                      </text>
                    </g>
                  );
                })}
              </ChartSvg>
              {i >= 0 ? (
                <ChartTip visible xPct={((pad.l + (i + 0.5) * groupW) / w) * 100}>
                  <p className="text-muted-foreground">{labels[i]}</p>
                  {active.map((s) => (
                    <p key={s.name} className="mt-0.5 flex justify-between gap-4 tabular">
                      <span className="text-muted-foreground">{s.name}</span>
                      <span>
                        {s.values[i]!.toFixed(s.values[i]! >= 20 ? 0 : 1)}
                        {ySuffix}
                      </span>
                    </p>
                  ))}
                </ChartTip>
              ) : null}
            </>
          );
        }}
      </ChartFrame>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        {series.map((s) => {
          const off = hidden[s.name];
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [s.name]: !h[s.name] }))}
              className={cn("inline-flex h-8 items-center gap-2 rounded-full bg-secondary px-3", off && "opacity-40")}
            >
              <span className="size-2 rounded-sm" style={{ background: s.color }} />
              <span className={off ? "line-through" : ""}>{s.name}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
