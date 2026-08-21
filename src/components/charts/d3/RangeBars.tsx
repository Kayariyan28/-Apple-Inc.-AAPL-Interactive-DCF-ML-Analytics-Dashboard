import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { moneyShare } from "@/lib/dcf/format";
import { ChartFrame } from "@/components/charts/chart-kit";
import type { TapeBar } from "@/lib/market/types";

type Range = { open: number; close: number; high: number; low: number; label: string };

function rangesFromCloses(bars: TapeBar[]): Range[] {
  const out: Range[] = [];
  for (let i = 1; i < bars.length; i++) {
    const open = bars[i - 1]!.close;
    const close = bars[i]!.close;
    out.push({
      open,
      close,
      high: Math.max(open, close),
      low: Math.min(open, close),
      label: bars[i]!.label,
    });
  }
  return out;
}

export function RangeBars({
  bars,
  heightClass = "h-36 md:h-44",
  onInk = false,
}: {
  bars: TapeBar[];
  heightClass?: string;
  onInk?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const rows = rangesFromCloses(bars).slice(-40);
  const ink = onInk ? "#f5f5f7" : "#1d1d1f";
  const muted = onInk ? "rgb(255 255 255 / 0.35)" : "rgb(29 29 31 / 0.35)";
  const up = onInk ? "#30d158" : "#0088ff";
  const down = onInk ? "#ff453a" : "#1d1d1f";

  return (
    <ChartFrame heightClass={heightClass}>
      {({ w, h }) => (
        <RangeSvg
          rows={rows}
          w={w}
          h={h}
          hover={hover}
          setHover={setHover}
          svgRef={ref}
          ink={ink}
          muted={muted}
          up={up}
          down={down}
        />
      )}
    </ChartFrame>
  );
}

function RangeSvg({
  rows,
  w,
  h,
  hover,
  setHover,
  svgRef,
  ink,
  muted,
  up,
  down,
}: {
  rows: Range[];
  w: number;
  h: number;
  hover: number | null;
  setHover: (i: number | null) => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  ink: string;
  muted: string;
  up: string;
  down: string;
}) {
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const svg = d3.select(el);
    svg.selectAll("*").remove();
    const pad = { l: 8, r: 8, t: 10, b: 18 };
    const n = Math.max(rows.length, 1);
    const x = d3.scaleBand<number>().domain(d3.range(n)).range([pad.l, w - pad.r]).padding(0.34);
    const lo = d3.min(rows, (d) => d.low) ?? 0;
    const hi = d3.max(rows, (d) => d.high) ?? 1;
    const y = d3.scaleLinear().domain([lo * 0.995, hi * 1.005]).range([h - pad.b, pad.t]);
    const g = svg.append("g");
    const bw = Math.max(2, x.bandwidth());
    rows.forEach((d, i) => {
      const cx = (x(i) ?? 0) + bw / 2;
      const color = d.close >= d.open ? up : down;
      const y0 = y(d.open);
      const y1 = y(d.close);
      g.append("line")
        .attr("x1", cx)
        .attr("x2", cx)
        .attr("y1", y(d.high))
        .attr("y2", y(d.low))
        .attr("stroke", color)
        .attr("stroke-width", 1);
      g.append("rect")
        .attr("x", cx - bw / 2)
        .attr("y", Math.min(y0, y1))
        .attr("width", bw)
        .attr("height", Math.max(1.5, Math.abs(y1 - y0)))
        .attr("fill", color)
        .attr("opacity", hover == null || hover === i ? 1 : 0.35);
    });
    if (hover != null && rows[hover]) {
      const d = rows[hover]!;
      g.append("text")
        .attr("x", pad.l)
        .attr("y", 12)
        .attr("fill", ink)
        .attr("font-size", 11)
        .attr("font-variant", "tabular-nums")
        .text(`${d.label}  ${moneyShare(d.close)}`);
    }
    const ticks = [0, Math.floor((n - 1) / 2), n - 1].filter((i, k, a) => a.indexOf(i) === k && rows[i]);
    ticks.forEach((i) => {
      g.append("text")
        .attr("x", (x(i) ?? 0) + bw / 2)
        .attr("y", h - 4)
        .attr("text-anchor", "middle")
        .attr("fill", muted)
        .attr("font-size", 9)
        .text(rows[i]!.label.slice(0, 6));
    });
    svg.on("mousemove", (event: MouseEvent) => {
      const [mx] = d3.pointer(event);
      const i = Math.max(0, Math.min(n - 1, Math.round(((mx - pad.l) / Math.max(1, w - pad.l - pad.r)) * (n - 1))));
      setHover(i);
    });
    svg.on("mouseleave", () => setHover(null));
  }, [rows, w, h, hover, setHover, svgRef, ink, muted, up, down]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${w} ${h}`}
      className="chart-svg h-full w-full"
      role="img"
      aria-label="Daily range bars from successive closes"
    />
  );
}
