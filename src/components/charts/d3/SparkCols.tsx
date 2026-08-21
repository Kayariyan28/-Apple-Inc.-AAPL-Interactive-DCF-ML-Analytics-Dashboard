import { useState } from "react";
import { ChartFrame, ChartSvg } from "@/components/charts/chart-kit";
import { xAt, yAt } from "@/lib/charts/math";

export function SparkCols({
  values,
  labels,
  heightClass = "h-16",
  onAccent = true,
  selected,
  onSelect,
}: {
  values: number[];
  labels?: string[];
  heightClass?: string;
  onAccent?: boolean;
  selected?: number;
  onSelect?: (i: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const n = values.length;
  const last = n - 1;
  const i = hover ?? selected ?? last;
  const v = values[i] ?? 0;
  return (
    <div>
      <ChartFrame heightClass={heightClass}>
        {({ w, h }) => {
          const pad = { l: 2, r: 2, t: 8, b: 4 };
          const max = Math.max(...values, 1) * 1.08;
          const slot = (w - pad.l - pad.r) / Math.max(1, n);
          const bw = Math.max(3, slot * 0.62);
          return (
            <ChartSvg
              viewW={w}
              viewH={h}
              n={n}
              pad={pad}
              index={hover}
              label="Revenue spark"
              onIndex={setHover}
              onCommit={onSelect}
            >
              {values.map((val, k) => {
                const cx = xAt(k, n, pad.l, pad.r, w);
                const y = yAt(val, 0, max, pad.t, pad.b, h);
                const bh = Math.max(2, h - pad.b - y);
                const on = k === (selected ?? last);
                const fill = onAccent
                  ? on
                    ? "var(--color-accent-foreground)"
                    : "color-mix(in oklab, var(--color-accent-foreground) 55%, transparent)"
                  : on
                    ? "var(--color-accent)"
                    : "color-mix(in oklab, var(--color-accent) 45%, transparent)";
                return (
                  <rect
                    key={k}
                    x={cx - bw / 2}
                    y={y}
                    width={bw}
                    height={bh}
                    rx="2"
                    fill={fill}
                    opacity={hover == null || k === i ? 1 : 0.4}
                  />
                );
              })}
            </ChartSvg>
          );
        }}
      </ChartFrame>
      <p className={onAccent ? "text-xs tabular text-accent-foreground/70" : "text-xs tabular text-muted-foreground"}>
        {labels?.[i] ?? `FY${i}`} · ${v.toFixed(0)}B
      </p>
    </div>
  );
}
