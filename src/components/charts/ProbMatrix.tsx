import { useState } from "react";
import { Panel, Kicker } from "@/components/ui/panel";
import { pctPlain } from "@/lib/dcf/format";
import { cn } from "@/lib/utils";

export function ProbMatrix({
  bands,
  rows,
  labels,
  title,
  kicker = "GBM finish table",
}: {
  bands: number[];
  rows: number[][];
  labels: string[];
  title: string;
  kicker?: string;
}) {
  const colLabels = bands.slice(0, -1).map((b, i) => {
    const next = bands[i + 1]!;
    return `$${b}–${next === 9999 ? "∞" : next}`;
  });
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);
  const cell = focus ? rows[focus.r]?.[focus.c] : null;
  const peak = focus
    ? rows[focus.r]!.reduce((best, p, c) => (p > (rows[focus.r]![best] ?? 0) ? c : best), 0)
    : null;

  return (
    <Panel className="overflow-hidden">
      <Kicker>{kicker}</Kicker>
      <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Each cell is the share of simulated paths that finish a given year inside that price band.
      </p>

      {focus != null && cell != null ? (
        <div className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm">
          <p className="font-medium">
            {labels[focus.r]} · {colLabels[focus.c]}
          </p>
          <p className="mt-1 tabular text-2xl font-medium">{pctPlain(cell, 1)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {pctPlain(cell, 1)} of paths finish {colLabels[focus.c]} by {labels[focus.r]}.
            {peak === focus.c ? " This is the modal band for that horizon." : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card pb-2 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Horizon
              </th>
              {colLabels.map((c) => (
                <th key={c} className="pb-2 font-medium tabular text-muted-foreground">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={labels[i]}>
                <th className="sticky left-0 z-10 bg-card pr-2 text-left font-medium text-muted-foreground">{labels[i]}</th>
                {row.map((p, j) => {
                  const strong = p >= 0.18;
                  const mid = p >= 0.08;
                  const on = focus?.r === i && focus?.c === j;
                  return (
                    <td key={j}>
                      <button
                        type="button"
                        onMouseEnter={() => setFocus({ r: i, c: j })}
                        onFocus={() => setFocus({ r: i, c: j })}
                        onClick={() => setFocus({ r: i, c: j })}
                        className={cn(
                          "flex h-11 w-full items-center justify-center rounded-md tabular transition-transform duration-150",
                          strong ? "bg-accent text-accent-foreground" : mid ? "bg-accent/35 text-foreground" : "bg-secondary text-muted-foreground",
                          p >= 0.35 && "font-medium",
                          on && "ring-2 ring-foreground scale-105",
                        )}
                      >
                        {p < 0.005 ? "·" : pctPlain(p, 0)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
