import { useState } from "react";
import { Panel, Kicker } from "@/components/ui/panel";
import type { PathBundle } from "@/lib/dcf/stochastic";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { ChartFrame, ChartSvg, ChartTip, Crosshair, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { bandPath, linePath, xAt, yAt } from "@/lib/charts/math";

const LABELS = ["Now", "Y1", "Y2", "Y3", "Y4", "Y5"];

export function FanChart({
  bundle,
  sample = 70,
  title,
  kicker = "Stochastic paths",
  market,
}: {
  bundle: PathBundle;
  sample?: number;
  title: string;
  kicker?: string;
  market?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [showOuter, setShowOuter] = useState(true);
  const n = bundle.steps + 1;
  const all = [...bundle.p5, ...bundle.p95];
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.05;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const idx = hover ?? pinned ?? bundle.steps;
  const t = Math.max(0, Math.min(bundle.steps, idx));
  const step = Math.max(1, Math.floor(bundle.n / sample));

  const p5 = bundle.p5[t]!;
  const p25 = bundle.p25[t]!;
  const p50 = bundle.p50[t]!;
  const p75 = bundle.p75[t]!;
  const p95 = bundle.p95[t]!;

  return (
    <Panel>
      <Kicker>{kicker}</Kicker>
      <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
      <ToolBar className="mt-4">
        <ToolChip on={showPaths} onClick={() => setShowPaths((v) => !v)}>
          Sample paths
        </ToolChip>
        <ToolChip on={showOuter} onClick={() => setShowOuter((v) => !v)}>
          5–95 band
        </ToolChip>
      </ToolBar>
      <ChartFrame className="mt-3" heightClass="h-64 md:h-80">
        {({ w, h }) => {
          const xs = Array.from({ length: n }, (_, i) => xAt(i, n, pad.l, pad.r, w));
          const y = (v: number) => yAt(v, min, max, pad.t, pad.b, h);
          const xi = xs[t]!;
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
                {showPaths
                  ? bundle.paths
                      .filter((_, i) => i % step === 0)
                      .map((p, i) => (
                        <path
                          key={i}
                          d={linePath(xs, Array.from(p).map((v) => y(v)))}
                          fill="none"
                          stroke="var(--color-accent)"
                          strokeOpacity="0.12"
                          strokeWidth="1"
                          className="pointer-events-none"
                        />
                      ))
                  : null}
                {showOuter ? (
                  <path d={bandPath(xs, bundle.p95.map(y), bundle.p5.map(y))} fill="var(--color-accent)" opacity="0.12" className="pointer-events-none" />
                ) : null}
                <path d={bandPath(xs, bundle.p75.map(y), bundle.p25.map(y))} fill="var(--color-accent)" opacity="0.18" className="pointer-events-none" />
                <path d={linePath(xs, bundle.p50.map(y))} fill="none" stroke="var(--color-foreground)" strokeWidth="2.2" className="pointer-events-none" />
                {market != null ? (
                  <line x1={pad.l} x2={w - pad.r} y1={y(market)} y2={y(market)} stroke="var(--color-down)" strokeDasharray="4 4" strokeOpacity="0.7" className="pointer-events-none" />
                ) : null}
                {LABELS.map((lb, i) => (
                  <text key={lb} x={xs[i]} y={h - 6} textAnchor="middle" fill="currentColor" opacity="0.45" fontSize="11">
                    {lb}
                  </text>
                ))}
                <text x={4} y={pad.t + 4} fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(max)}
                </text>
                <text x={4} y={h - pad.b} fill="currentColor" opacity="0.45" fontSize="11">
                  {moneyShare(min)}
                </text>
                <Crosshair x={xi} y={y(p50)} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
                <circle cx={xi} cy={y(p50)} r="4.5" fill="var(--color-foreground)" className="pointer-events-none" />
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xi / w) * 100}>
                <p className="text-muted-foreground">{LABELS[t] ?? `Step ${t}`}</p>
                <p className="mt-1 tabular">Median {moneyShare(p50)}</p>
                <p className="tabular text-muted-foreground">25–75 {moneyShare(p25)}–{moneyShare(p75)}</p>
                <p className="tabular text-muted-foreground">5–95 {moneyShare(p5)}–{moneyShare(p95)}</p>
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-6 bg-foreground" /> Median {moneyShare(p50)}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-accent/30" /> IQR {pctPlain((p75 - p25) / p50)}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-3 rounded-sm bg-accent/15" /> 5–95
        </span>
      </div>
    </Panel>
  );
}
