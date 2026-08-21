import { useMemo, useState } from "react";
import * as d3 from "d3";
import { billions, pctPlain } from "@/lib/dcf/format";
import { mixFill } from "@/lib/desk/universe";
import { useVoice } from "@/lib/desk/voice";
import { useFocusedName } from "@/lib/store";
import { ChartFrame, ChartSvg } from "@/components/charts/chart-kit";
import { xAt } from "@/lib/charts/math";
import { cn } from "@/lib/utils";

export function StreamMix({
  heightClass = "h-48 md:h-56",
  isolate,
  onIsolate,
  yearIndex,
  onYear,
}: {
  heightClass?: string;
  isolate?: string | null;
  onIsolate?: (key: string | null) => void;
  yearIndex?: number;
  onYear?: (i: number) => void;
}) {
  const name = useFocusedName();
  const voice = useVoice();
  const keys = name.mixKeys;
  const hero = name.heroMixId;
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [localKey, setLocalKey] = useState<string | null>(hero);
  const key = isolate !== undefined ? isolate : localKey;
  const setKey = (k: string | null) => {
    setLocalKey(k);
    onIsolate?.(k);
  };

  type Row = { year: number; total: number } & Record<string, number>;

  const data = useMemo<Row[]>(
    () =>
      name.mix.map((r, i) => {
        const row: Row = { year: r.year, total: name.revenue[i]! };
        for (const k of keys) row[k.id] = name.revenue[i]! * (r.shares[k.id] ?? 0);
        return row;
      }),
    [name, keys],
  );

  const series = useMemo(() => {
    const stack = d3
      .stack<Row>()
      .keys(keys.map((k) => k.id))
      .offset(d3.stackOffsetNone)
      .order(d3.stackOrderNone);
    return stack(data);
  }, [data, keys]);

  const n = data.length;
  const focus = hover ?? yearIndex ?? pinned ?? n - 1;
  const row = data[focus]!;
  const rev = name.revenue[focus]!;
  const focusKey = key ?? hero;
  const focusLabel = keys.find((k) => k.id === focusKey)?.label ?? focusKey;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="toolbar" aria-label="Segment mix">
        {keys.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={key === k.id}
            onClick={() => setKey(key === k.id ? null : k.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-150",
              key === k.id || key == null ? "text-foreground" : "text-muted-foreground",
              key === k.id ? "bg-secondary" : "hover:text-foreground",
            )}
          >
            <span className="size-1.5 rounded-full" style={{ background: mixFill(keys, k.id, hero) }} />
            {k.label}
          </button>
        ))}
      </div>

      <ChartFrame className="mt-2" heightClass={heightClass}>
        {({ w, h }) => {
          const pad = { l: 6, r: 6, t: 10, b: 20 };
          const y1 = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 1;
          const y = d3.scaleLinear().domain([0, y1]).range([h - pad.b, pad.t]);
          const area = d3
            .area<d3.SeriesPoint<Row>>()
            .x((_, i) => xAt(i, n, pad.l, pad.r, w))
            .y0((d) => y(d[0]))
            .y1((d) => y(d[1]))
            .curve(d3.curveLinear);
          const ax = xAt(focus, n, pad.l, pad.r, w);
          return (
            <ChartSvg
              viewW={w}
              viewH={h}
              n={n}
              pad={pad}
              index={hover}
              label={`${name.symbol} revenue mix`}
              onIndex={setHover}
              onCommit={(i) => {
                setPinned(i);
                onYear?.(i);
              }}
              onDoubleReset={() => setPinned(null)}
            >
              {series.map((s) => {
                const k = String(s.key);
                const dim = key != null && key !== k;
                return (
                  <path
                    key={k}
                    d={area(s) ?? ""}
                    fill={mixFill(keys, k, hero)}
                    opacity={dim ? 0.16 : k === hero ? 1 : 0.92}
                    className="pointer-events-none"
                  />
                );
              })}
              {hover != null ? (
                <line
                  x1={ax}
                  x2={ax}
                  y1={pad.t}
                  y2={h - pad.b}
                  stroke="var(--color-ink)"
                  strokeOpacity="0.2"
                  className="pointer-events-none"
                />
              ) : null}
              {data.map((d, i) => (
                <text
                  key={d.year}
                  x={xAt(i, n, pad.l, pad.r, w)}
                  y={h - 5}
                  textAnchor="middle"
                  fill={i === (yearIndex ?? n - 1) ? "var(--color-ink)" : "var(--color-paper-muted)"}
                  fontSize="9"
                  fontWeight={i === (yearIndex ?? n - 1) ? 600 : 400}
                >
                  {String(d.year).slice(2)}
                </text>
              ))}
            </ChartSvg>
          );
        }}
      </ChartFrame>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs tabular text-paper-muted">
          FY{row.year} · {focusLabel} {billions((row[focusKey] ?? 0) * 1000, 1)} · {pctPlain((row[focusKey] ?? 0) / rev)} of
          revenue
        </p>
        <p className="text-xs tabular text-paper-muted">{voice.mixHint}</p>
      </div>
    </div>
  );
}
