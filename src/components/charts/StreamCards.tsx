import { useId, useState } from "react";
import { heroLabel, mixDollars } from "@/lib/desk/universe";
import { useVoice } from "@/lib/desk/voice";
import { useFocusedName } from "@/lib/store";
import { Panel } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip } from "@/components/charts/chart-kit";
import { xAt } from "@/lib/charts/math";
import { r } from "@/lib/utils";

function streamPath(values: number[], w: number, h: number) {
  const max = Math.max(...values);
  const padX = 8;
  const mid = h / 2;
  const amp = h * 0.42;
  const x = (i: number) => r(padX + (i / Math.max(1, values.length - 1)) * (w - padX * 2));
  const half = (v: number) => (v / max) * amp;
  const top = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${r(mid - half(v))}`);
  const bot = values.map((v, i) => `${x(i)},${r(mid + half(v) * 0.55)}`).reverse();
  return { d: `${top.join(" ")} ${bot.map((p, i) => `${i === 0 ? "L" : "L"}${p}`).join(" ")} Z`, x };
}

function Card({
  title,
  tone,
  values,
  callouts,
  monthly,
  yearly,
  monthlyDelta,
  yearlyDelta,
  rows,
}: {
  title: string;
  tone: "warm" | "cool";
  values: number[];
  callouts: { i: number; label: string }[];
  monthly: string;
  yearly: string;
  monthlyDelta: string;
  yearlyDelta: string;
  rows: { name: string; value: string }[];
}) {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const n = values.length;
  const pad = { l: 8, r: 8, t: 8, b: 8 };
  const idx = hover ?? pinned;
  const i = idx != null ? Math.max(0, Math.min(n - 1, idx)) : n - 1;
  const c1 = tone === "warm" ? "var(--color-chart-1)" : "var(--color-chart-4)";
  const c2 = tone === "warm" ? "var(--color-warn)" : "var(--color-chart-2)";

  return (
    <Panel className="bg-foreground text-background">
      <h3 className="text-xl font-medium tracking-tight">{title}</h3>
      <ChartFrame className="mt-4" heightClass="h-40">
        {({ w, h }) => {
          const geom = streamPath(values, w, h);
          const xi = xAt(i, n, pad.l, pad.r, w);
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
                <defs>
                  <linearGradient id={`${gid}-sg`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor={c1} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={c2} stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <path d={geom.d} fill={`url(#${gid}-sg)`} className="pointer-events-none" />
                {callouts.map((c) => {
                  const xx = geom.x(c.i);
                  return (
                    <g key={c.i} className="pointer-events-none">
                      <line x1={xx} x2={xx} y1={18} y2={h - 18} stroke="currentColor" strokeOpacity="0.2" />
                      <rect x={xx - 28} y={8} width="56" height="20" rx="10" fill="var(--color-background)" />
                      <text x={xx} y={22} textAnchor="middle" fontSize="10" fill="var(--color-foreground)">
                        {c.label}
                      </text>
                    </g>
                  );
                })}
                <line x1={xi} x2={xi} y1={8} y2={h - 8} stroke="currentColor" strokeOpacity="0.35" className="pointer-events-none" />
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xi / w) * 100}>
                <p className="text-muted-foreground">FY{2018 + i}</p>
                <p className="mt-1 text-sm font-medium tabular">${values[i]!.toFixed(1)}B</p>
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-background/50">Latest year</p>
          <p className="text-2xl font-medium tracking-tight tabular">{monthly}</p>
          <p className="text-xs text-up">{monthlyDelta}</p>
        </div>
        <div>
          <p className="text-xs text-background/50">Eight-year total</p>
          <p className="text-2xl font-medium tracking-tight tabular">{yearly}</p>
          <p className="text-xs text-background/50">{yearlyDelta}</p>
        </div>
      </div>
      <ul className="mt-6 divide-y divide-background/10">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between py-3 text-sm">
            <span className="text-background/60">{row.name}</span>
            <span className="tabular">{row.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function StreamCards() {
  const name = useFocusedName();
  const voice = useVoice();
  const last = name.years.length - 1;
  const hero = name.years.map((_, i) => mixDollars(name, i, name.heroMixId));
  const rest = name.revenue.map((r, i) => r - hero[i]!);
  const products = rest;
  const services = hero;
  const pSum = products.reduce((a, b) => a + b, 0);
  const sSum = services.reduce((a, b) => a + b, 0);
  const pLast = products[products.length - 1]!;
  const sLast = services[services.length - 1]!;
  const pPrev = products[products.length - 2]!;
  const sPrev = services[services.length - 2]!;
  const heroName = heroLabel(name);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card
        title={voice.restTitle}
        tone="warm"
        values={products}
        callouts={[
          { i: 0, label: `${products[0]!.toFixed(0)}` },
          { i: 3, label: `${products[3]!.toFixed(0)}` },
          { i: 7, label: `${pLast.toFixed(0)}` },
        ]}
        monthly={`$${pLast.toFixed(0)}B`}
        yearly={`$${pSum.toFixed(0)}B`}
        monthlyDelta={`${(((pLast - pPrev) / pPrev) * 100).toFixed(1)}% vs prior year`}
        yearlyDelta={voice.restNote}
        rows={name.mixKeys.filter((k) => k.id !== name.heroMixId).slice(0, 3).map((k) => ({
          name: k.label,
          value: `${((name.mix[last]?.shares[k.id] ?? 0) * 100).toFixed(0)}% · $${mixDollars(name, last, k.id).toFixed(0)}B`,
        }))}
      />
      <Card
        title={heroName}
        tone="cool"
        values={services}
        callouts={[
          { i: 0, label: `${services[0]!.toFixed(0)}` },
          { i: 4, label: `${services[4]!.toFixed(0)}` },
          { i: 7, label: `${sLast.toFixed(0)}` },
        ]}
        monthly={`$${sLast.toFixed(0)}B`}
        yearly={`$${sSum.toFixed(0)}B`}
        monthlyDelta={`${(((sLast - sPrev) / sPrev) * 100).toFixed(1)}% vs prior year`}
        yearlyDelta={voice.heroNote}
        rows={[
          { name: "FY2018 mix", value: `${((name.mix[0]?.shares[name.heroMixId] ?? 0) * 100).toFixed(1)}%` },
          { name: "FY2025 mix", value: `${((name.mix[name.mix.length - 1]?.shares[name.heroMixId] ?? 0) * 100).toFixed(1)}%` },
          { name: "FY25 dollars", value: `$${sLast.toFixed(0)}B` },
        ]}
      />
    </div>
  );
}
