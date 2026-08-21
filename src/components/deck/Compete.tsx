import { useEffect, useMemo, useState } from "react";
import { COMPETE_COPY } from "@/lib/dcf/metrics";
import type { Quote } from "@/lib/market/types";
import { moneyShare, pct } from "@/lib/dcf/format";
import { useModel } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { cn } from "@/lib/utils";

function axesFor(aapl: Quote, peers: Quote[], focused: string) {
  const all = [aapl, ...peers];
  const peMax = Math.max(...all.map((q) => q.pe ?? 20), 20);
  return all.map((q) => {
    const pe = q.pe ?? 25;
    const growth = q.changePct;
    return {
      ticker: q.symbol,
      name: q.name,
      x: Math.max(0.1, Math.min(0.9, pe / (peMax * 1.15))),
      y: Math.max(0.14, Math.min(0.86, 0.5 + growth * 8)),
      pe,
      changePct: q.changePct,
      mktCap: q.mktCap,
      highlight: q.symbol === focused,
    };
  });
}

export function Compete({ aapl, peers }: { aapl: Quote; peers: Quote[] }) {
  const ticker = useModel((s) => s.ticker);
  const voice = useVoice();
  const [focus, setFocus] = useState<string>(ticker);
  useEffect(() => setFocus(ticker), [ticker]);
  const dots = useMemo(() => axesFor(aapl, peers, ticker), [aapl, peers, ticker]);
  const active = dots.find((d) => d.ticker === focus) ?? dots[0]!;
  const aaplDot = dots.find((d) => d.highlight) ?? active;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl bg-[#0c0c0c] p-5 md:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Competitive brand analysis</p>
        <h3 className="mt-2 font-serif text-2xl font-medium tracking-tight">{voice.competeTitle}</h3>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 pr-3 font-medium">Name</th>
                <th className="pb-3 pr-3 font-medium">Strength</th>
                <th className="pb-3 pr-3 font-medium">Weakness</th>
                <th className="pb-3 font-medium">Strategy</th>
              </tr>
            </thead>
            <tbody>
              {COMPETE_COPY.map((row) => {
                const on = focus === row.ticker;
                const q = row.ticker === aapl.symbol ? aapl : peers.find((p) => p.symbol === row.ticker);
                return (
                  <tr
                    key={row.ticker}
                    onMouseEnter={() => setFocus(row.ticker)}
                    className={cn(
                      "cursor-pointer border-t border-white/10 align-top transition-colors duration-150",
                      on && "bg-white/5",
                    )}
                  >
                    <td className="py-3.5 pr-3">
                      <p className={cn("font-medium tracking-tight", row.ticker === ticker && "text-foreground")}>{row.name}</p>
                      <p className="text-xs tabular text-muted-foreground">
                        {q ? `${moneyShare(q.price)} ${pct(q.changePct)}` : row.ticker}
                      </p>
                    </td>
                    <td className="py-3.5 pr-3 text-xs leading-relaxed text-muted-foreground">{row.strength}</td>
                    <td className="py-3.5 pr-3 text-xs leading-relaxed text-muted-foreground">{row.weakness}</td>
                    <td className="py-3.5 text-xs leading-relaxed text-muted-foreground">{row.strategy}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="relative overflow-hidden rounded-2xl bg-[#0c0c0c] p-5 md:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Positioning map</p>
        <h3 className="mt-2 font-serif text-2xl font-medium tracking-tight">Multiple vs tape heat.</h3>
        <div className="relative mx-auto mt-8 aspect-square max-h-[28rem] w-full max-w-lg">
          <span className="absolute left-1/2 top-1 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Bid / momentum ↑
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Offer / lag ↓
          </span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] uppercase tracking-widest text-muted-foreground">
            ← Cheap multiple
          </span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-widest text-muted-foreground">
            Rich multiple →
          </span>
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              <radialGradient id="aapl-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#0a84ff" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#0a84ff" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#0a84ff" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="spot" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
              </linearGradient>
            </defs>
            <line x1="200" y1="28" x2="200" y2="372" stroke="rgb(255 255 255 / 0.14)" />
            <line x1="28" y1="200" x2="372" y2="200" stroke="rgb(255 255 255 / 0.14)" />
            <polygon
              points={`200,200 ${24 + aaplDot.x * 352 - 36},${376 - aaplDot.y * 352} ${24 + aaplDot.x * 352 + 36},${376 - aaplDot.y * 352}`}
              fill="url(#spot)"
            />
            {dots.map((d) => {
              const cx = 24 + d.x * 352;
              const cy = 376 - d.y * 352;
              const on = d.ticker === focus;
              return (
                <g key={d.ticker} className="cursor-pointer" onMouseEnter={() => setFocus(d.ticker)}>
                  {on || d.highlight ? <circle cx={cx} cy={cy} r="54" fill="url(#aapl-glow)" /> : null}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={d.highlight ? 32 : on ? 22 : 16}
                    fill={d.highlight ? "#f5f5f7" : "#2c2c2e"}
                    stroke={on ? "#0a84ff" : "rgb(255 255 255 / 0.22)"}
                    strokeWidth={on || d.highlight ? 2 : 1}
                    className={d.highlight ? "deck-glow" : undefined}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fontSize={d.highlight ? 10 : 8}
                    fill={d.highlight ? "#1d1d1f" : "#f5f5f7"}
                    fontWeight="600"
                  >
                    {d.ticker}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {active.ticker} · P/E {active.pe.toFixed(1)} · session {pct(active.changePct)}
        </p>
      </article>
    </div>
  );
}
