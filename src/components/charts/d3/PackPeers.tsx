import { moneyShare, pct } from "@/lib/dcf/format";
import type { Quote } from "@/lib/market/types";
import { cn } from "@/lib/utils";

export function PackPeers({
  names,
  selected,
  onSelect,
  focus,
}: {
  names: Quote[];
  heightClass?: string;
  selected?: string | null;
  onSelect?: (symbol: string) => void;
  focus?: string | null;
}) {
  const lead = names.find((n) => n.symbol === (focus ?? selected)) ?? names[0];
  const maxCap = Math.max(...names.map((n) => n.mktCap ?? 0), 1);
  const rows = [...names].sort((a, b) => (b.mktCap ?? 0) - (a.mktCap ?? 0));
  const current = names.find((n) => n.symbol === selected) ?? lead;
  const rel = current && lead && current.symbol !== lead.symbol ? current.changePct - lead.changePct : null;

  return (
    <div>
      <ul className="flex flex-col gap-1">
        {rows.map((q) => {
          const on = selected === q.symbol;
          const share = Math.max(4, ((q.mktCap ?? 0) / maxCap) * 100);
          const fill =
            q.symbol === lead?.symbol ? "bg-accent" : q.changePct >= 0 ? "bg-up" : "bg-down";
          return (
            <li key={q.symbol}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect?.(q.symbol)}
                className={cn(
                  "grid min-h-11 w-full grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 rounded-md px-2 text-left transition-colors duration-150",
                  on ? "bg-secondary" : "hover:bg-secondary/60",
                )}
              >
                <span className="text-sm font-medium tabular">{q.symbol}</span>
                <span className="h-2 overflow-hidden rounded-full bg-secondary">
                  <span className={cn("block h-full rounded-full", fill)} style={{ width: `${share}%` }} />
                </span>
                <span
                  className={cn(
                    "text-right text-sm tabular",
                    q.changePct >= 0 ? "text-up" : "text-down",
                  )}
                >
                  {pct(q.changePct)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {current ? (
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular sm:grid-cols-4">
          <Read k={current.symbol} v={moneyShare(current.price)} />
          <Read k="Today" v={pct(current.changePct)} tone={current.changePct >= 0 ? "up" : "down"} />
          <Read k="P/E" v={current.pe != null ? current.pe.toFixed(1) : "—"} />
          <Read
            k={rel != null ? `vs ${lead?.symbol}` : "Mkt cap"}
            v={rel != null ? pct(rel) : current.mktCap != null ? `$${(current.mktCap / 1e12).toFixed(2)}T` : "—"}
          />
        </div>
      ) : null}
    </div>
  );
}

function Read({ k, v, tone }: { k: string; v: string; tone?: "up" | "down" }) {
  return (
    <div>
      <p className="text-muted-foreground">{k}</p>
      <p className={cn("font-medium", tone === "up" && "text-up", tone === "down" && "text-down")}>{v}</p>
    </div>
  );
}
