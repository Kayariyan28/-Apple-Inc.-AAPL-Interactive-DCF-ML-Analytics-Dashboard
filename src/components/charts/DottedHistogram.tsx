import { useId, useMemo, useState } from "react";
import { CURRENT_PRICE } from "@/lib/dcf/constants";
import type { HistogramBin } from "@/lib/dcf/engine";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { Panel, Kicker } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { xAt } from "@/lib/charts/math";
import { r } from "@/lib/utils";

export function DottedHistogram({
  bins,
  median,
  title = "Fair-value distribution",
  kicker = "Monte Carlo",
  marketPrice = CURRENT_PRICE,
  marks,
}: {
  bins: HistogramBin[];
  median: number;
  title?: string;
  kicker?: string;
  marketPrice?: number;
  marks?: { x: number; label: string }[];
}) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(() => {
    const mkt = bins.findIndex((b) => marketPrice >= b.x0 && marketPrice < b.x1);
    return mkt >= 0 ? mkt : Math.floor(bins.length / 2);
  });
  const [range, setRange] = useState<{ a: number; b: number } | null>(null);
  const [showCdf, setShowCdf] = useState(true);

  const n = bins.length;
  const max = Math.max(...bins.map((b) => b.count), 1);
  const cdf = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const b of bins) {
      acc += b.share;
      out.push(acc);
    }
    return out;
  }, [bins]);

  const hi = hover ?? pinned ?? 0;
  const active = bins[hi];
  const pad = { l: 8, r: 8, t: 20, b: 28 };
  const loSel = range ? Math.min(range.a, range.b) : hi;
  const hiSel = range ? Math.max(range.a, range.b) : hi;
  const selectedShare = range
    ? bins.slice(loSel, hiSel + 1).reduce((a, b) => a + b.share, 0)
    : active?.share ?? 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Kicker>{kicker}</Kicker>
          <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
        </div>
        {active ? (
          <div className="rounded-lg bg-secondary px-3 py-2 text-right">
            <p className="tabular text-sm font-medium">{pctPlain(range ? selectedShare : active.share)}</p>
            <p className="text-xs text-muted-foreground">
              {moneyShare(bins[loSel]!.x0)}–{moneyShare(bins[hiSel]!.x1)}
            </p>
          </div>
        ) : null}
      </div>
      <ToolBar className="mt-4">
        <ToolChip on={showCdf} onClick={() => setShowCdf((v) => !v)} title="Overlay the cumulative distribution">
          CDF
        </ToolChip>
        {range ? (
          <ToolChip on={false} onClick={() => setRange(null)}>
            Clear range
          </ToolChip>
        ) : null}
      </ToolBar>
      <ChartFrame className="mt-3" heightClass="h-52 md:h-64">
        {({ w, h }) => {
          const bw = (w - pad.l - pad.r) / n;
          const xVal = (v: number) =>
            r(pad.l + ((v - bins[0]!.x0) / (bins[n - 1]!.x1 - bins[0]!.x0 || 1)) * (w - pad.l - pad.r));
          const medianX = xVal(median);
          const mktX = xVal(marketPrice);
          const cdfY = (s: number) => r(pad.t + (1 - s) * (h - pad.t - pad.b));
          const cdfD = bins
            .map((b, i) => {
              const x = pad.l + i * bw + bw / 2;
              return `${i === 0 ? "M" : "L"}${r(x)},${cdfY(cdf[i]!)}`;
            })
            .join(" ");
          return (
            <>
              <ChartSvg
                viewW={w}
                viewH={h}
                n={n}
                pad={pad}
                index={hover}
                label="Price histogram"
                brushable
                brush={range}
                onIndex={setHover}
                onCommit={(i) => {
                  setPinned(i);
                  setRange(null);
                }}
                onBrush={(a, b) => setRange({ a, b })}
                onDoubleReset={() => setRange(null)}
              >
                <defs>
                  <pattern id={`${gid}-dot`} width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="1.2" cy="1.2" r="0.9" fill="currentColor" opacity="0.55" />
                  </pattern>
                </defs>
                {bins.map((b, i) => {
                  const bh = ((h - pad.t - pad.b) * b.count) / max;
                  const x = pad.l + i * bw;
                  const y = h - pad.b - bh;
                  const on = range ? i >= loSel && i <= hiSel : i === hi;
                  return (
                    <rect
                      key={i}
                      x={r(x + 1.5)}
                      y={r(y)}
                      width={r(Math.max(1, bw - 3))}
                      height={r(Math.max(0, bh))}
                      rx="3"
                      fill={on ? "var(--color-warn)" : `url(#${gid}-dot)`}
                      opacity={on ? 1 : 0.85}
                      className="pointer-events-none"
                    />
                  );
                })}
                {showCdf ? (
                  <path d={cdfD} fill="none" stroke="var(--color-accent)" strokeWidth="1.8" className="pointer-events-none" />
                ) : null}
                <line x1={medianX} x2={medianX} y1={pad.t} y2={h - pad.b} stroke="var(--color-up)" strokeDasharray="4 4" className="pointer-events-none" />
                <line x1={mktX} x2={mktX} y1={pad.t} y2={h - pad.b} stroke="var(--color-down)" strokeDasharray="3 3" className="pointer-events-none" />
                {(marks ?? []).map((m) => (
                  <text key={m.label} x={xVal(m.x)} y={pad.t - 4} textAnchor="middle" fill="currentColor" opacity="0.45" fontSize="10" className="pointer-events-none">
                    {m.label}
                  </text>
                ))}
                <text x={pad.l} y={h - 8} fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(bins[0]!.x0)}
                </text>
                <text x={w - pad.r} y={h - 8} textAnchor="end" fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(bins[n - 1]!.x1)}
                </text>
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xAt(hi, n, pad.l, pad.r, w) / w) * 100}>
                <p className="text-muted-foreground">
                  {moneyShare(active!.x0)}–{moneyShare(active!.x1)}
                </p>
                <p className="mt-1 text-sm font-medium tabular">{pctPlain(active!.share)} of paths</p>
                {showCdf ? <p className="tabular text-muted-foreground">CDF {pctPlain(cdf[hi]!)}</p> : null}
                {range ? <p className="mt-1">Selected {pctPlain(selectedShare)}</p> : null}
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>
      <p className="mt-2 text-sm text-muted-foreground">
        Green dashed is the median. Red dashed is the live tape. Drag across bins to read P(range).
      </p>
    </Panel>
  );
}
