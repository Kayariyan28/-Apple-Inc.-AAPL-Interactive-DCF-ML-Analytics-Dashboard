import { useState } from "react";
import type { DcfResult } from "@/lib/dcf/engine";
import { CASH, DEBT } from "@/lib/dcf/constants";
import { trillions } from "@/lib/dcf/format";
import { Panel, Kicker } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip } from "@/components/charts/chart-kit";
import { r } from "@/lib/utils";

const NOTES: Record<string, string> = {
  "PV of FCFs": "Discounted unlevered cash from the five-year explicit period.",
  "PV of TV": "Gordon growth on year-5 FCF, brought back at WACC.",
  Enterprise: "PV of FCFs plus PV of terminal value.",
  Cash: "Gross cash added to enterprise value.",
  Debt: "Gross debt subtracted to reach equity.",
  Equity: "Value to common shareholders. Divide by diluted shares for the implied price.",
};

export function Waterfall({ dcf }: { dcf: DcfResult }) {
  const steps = [
    { label: "PV of FCFs", v: dcf.sumPvFcf, kind: "up" as const },
    { label: "PV of TV", v: dcf.pvTv, kind: "up" as const },
    { label: "Enterprise", v: dcf.ev, kind: "total" as const },
    { label: "Cash", v: CASH, kind: "up" as const },
    { label: "Debt", v: -DEBT, kind: "down" as const },
    { label: "Equity", v: dcf.equity, kind: "total" as const },
  ];
  const pad = { l: 8, r: 8, t: 28, b: 48 };
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  let cursor = 0;
  const rects = steps.map((s, i) => {
    const start = s.kind === "total" ? 0 : cursor;
    const end = s.kind === "total" ? s.v : cursor + s.v;
    cursor = s.kind === "total" ? s.v : end;
    return { ...s, start, end, i };
  });
  const max = Math.max(...rects.map((row) => Math.max(row.start, row.end)));
  const n = steps.length;
  const idx = hover ?? pinned;
  const active = idx != null ? rects[idx] : null;

  return (
    <Panel>
      <Kicker>Equity bridge</Kicker>
      <h3 className="mt-1 text-lg font-medium tracking-tight">How cash becomes a share price</h3>
      <ChartFrame className="mt-4" heightClass="h-56 md:h-64">
        {({ w, h }) => {
          const bw = (w - pad.l - pad.r) / n;
          const y = (v: number) => r(pad.t + (1 - v / max) * (h - pad.t - pad.b));
          const hh = (a: number, b: number) => Math.abs(y(a) - y(b));
          return (
            <>
              <ChartSvg
                viewW={w}
                viewH={h}
                n={n}
                pad={pad}
                index={hover}
                label="Equity waterfall"
                onIndex={setHover}
                onCommit={setPinned}
              >
                {rects.map((row) => {
                  const x = r(pad.l + row.i * bw + 10);
                  const fill =
                    row.kind === "total"
                      ? "var(--color-foreground)"
                      : row.v < 0
                        ? "var(--color-down)"
                        : "var(--color-up)";
                  const on = idx === row.i;
                  return (
                    <g key={row.label}>
                      <rect
                        x={x}
                        y={y(Math.max(row.start, row.end))}
                        width={r(bw - 20)}
                        height={Math.max(4, r(hh(row.start, row.end)))}
                        rx="8"
                        fill={fill}
                        opacity={on || idx == null ? (row.kind === "total" ? 1 : 0.85) : 0.35}
                        className="pointer-events-none"
                      />
                      <text
                        x={r(x + (bw - 20) / 2)}
                        y={r(y(Math.max(row.start, row.end)) - 8)}
                        textAnchor="middle"
                        fill="currentColor"
                        fontSize="11"
                        className="pointer-events-none"
                      >
                        {trillions(Math.abs(row.v), 2)}
                      </text>
                      <text
                        x={r(x + (bw - 20) / 2)}
                        y={h - 16}
                        textAnchor="middle"
                        fill="currentColor"
                        opacity="0.55"
                        fontSize="11"
                        className="pointer-events-none"
                      >
                        {row.label}
                      </text>
                    </g>
                  );
                })}
              </ChartSvg>
              {active ? (
                <ChartTip visible xPct={((pad.l + (active.i + 0.5) * bw) / w) * 100}>
                  <p className="font-medium">{active.label}</p>
                  <p className="mt-1 tabular">{trillions(Math.abs(active.v), 2)}</p>
                  <p className="mt-1 text-muted-foreground">{NOTES[active.label]}</p>
                </ChartTip>
              ) : null}
            </>
          );
        }}
      </ChartFrame>
    </Panel>
  );
}
