import { useState } from "react";
import { CURRENT_PRICE, TGR_RANGE, WACC_RANGE } from "@/lib/dcf/constants";
import { moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { Panel, Kicker } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFocusedName } from "@/lib/store";

export function HeatGrid({
  grid,
  wacc,
  tgr,
  title,
  kicker,
  marketPrice = CURRENT_PRICE,
  onSelect,
}: {
  grid: number[][];
  wacc?: number;
  tgr?: number;
  title: string;
  kicker?: string;
  marketPrice?: number;
  onSelect?: (wacc: number, tgr: number) => void;
}) {
  const name = useFocusedName();
  const [cell, setCell] = useState<{ i: number; j: number } | null>(() => {
    if (wacc == null || tgr == null) return null;
    const i = WACC_RANGE.findIndex((w) => Math.abs(w - wacc) < 0.001);
    const j = TGR_RANGE.findIndex((t) => Math.abs(t - tgr) < 0.001);
    return i >= 0 && j >= 0 ? { i, j } : null;
  });
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const focus = hover ?? cell;
  const fw = focus ? WACC_RANGE[focus.i] : wacc;
  const ft = focus ? TGR_RANGE[focus.j] : tgr;
  const fp = focus ? grid[focus.i]?.[focus.j] : undefined;

  return (
    <Panel className="overflow-hidden">
      {kicker ? <Kicker>{kicker}</Kicker> : null}
      <h3 className="mt-1 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Each cell is an implied share price versus the {moneyShare(marketPrice)} tape.
        {onSelect ? " Click a cell to load those assumptions into the model." : ""}
      </p>

      {fw != null && ft != null && fp != null && Number.isFinite(fp) ? (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {pctPlain(fw, 1)} WACC · {pctPlain(ft, 1)} TGR
            </p>
            <p className="mt-1 text-2xl font-medium tabular">{moneyShare(fp)}</p>
            <p className={cn("text-xs tabular", fp >= marketPrice ? "text-up" : "text-down")}>
              {pct(fp / marketPrice - 1)} vs tape
            </p>
          </div>
          {onSelect ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onSelect(fw, ft)}
            >
              Apply to model
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card pb-2 text-left text-xs font-medium uppercase tracking-widest text-muted-foreground">
                WACC \ TGR
              </th>
              {TGR_RANGE.map((t) => (
                <th key={t} className="pb-2 font-medium tabular text-muted-foreground">
                  {pctPlain(t, 1)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WACC_RANGE.map((w, i) => (
              <tr key={w}>
                <th className="sticky left-0 z-10 bg-card pr-2 text-left font-medium tabular text-muted-foreground">
                  {pctPlain(w, 1)}
                </th>
                {grid[i]!.map((price, j) => {
                  const t = TGR_RANGE[j]!;
                  const active =
                    (wacc != null && tgr != null && Math.abs(w - wacc) < 0.001 && Math.abs(t - tgr) < 0.001) ||
                    (cell?.i === i && cell?.j === j);
                  const hovered = hover?.i === i && hover?.j === j;
                  const ratio = Number.isFinite(price) ? price / marketPrice : 1;
                  const nearMkt = Number.isFinite(price) && Math.abs(price - marketPrice) / marketPrice < 0.03;
                  const tone =
                    !Number.isFinite(price)
                      ? "bg-secondary text-muted-foreground"
                      : ratio > 1.15
                        ? "bg-up/80 text-background"
                        : ratio > 1.02
                          ? "bg-up/40 text-foreground"
                          : ratio > 0.92
                            ? "bg-secondary text-foreground"
                            : ratio > 0.75
                              ? "bg-down/40 text-foreground"
                              : "bg-down/75 text-foreground";
                  return (
                    <td key={t}>
                      <button
                        type="button"
                        disabled={!Number.isFinite(price)}
                        onMouseEnter={() => setHover({ i, j })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ i, j })}
                        onClick={() => {
                          setCell({ i, j });
                          if (onSelect && Number.isFinite(price)) onSelect(w, t);
                        }}
                        title={`${pctPlain(w)} WACC · ${pctPlain(t)} TGR → ${Number.isFinite(price) ? moneyShare(price) : "n/a"}`}
                        className={cn(
                          "flex h-10 w-full items-center justify-center rounded-md tabular transition-transform duration-150",
                          tone,
                          active && "ring-2 ring-foreground",
                          hovered && "scale-105",
                          nearMkt && !active && "ring-1 ring-chart-1",
                        )}
                      >
                        {Number.isFinite(price) ? Math.round(price) : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Ringed cell is the live {name.symbol} model. Amber ring marks prices within 3% of the tape — the indifference contour.
      </p>
    </Panel>
  );
}
