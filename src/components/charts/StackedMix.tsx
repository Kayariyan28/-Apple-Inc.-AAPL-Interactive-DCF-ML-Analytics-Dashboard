import { useMemo, useState } from "react";
import { billions, pctPlain } from "@/lib/dcf/format";
import { mixFill } from "@/lib/desk/universe";
import { useVoice } from "@/lib/desk/voice";
import { useFocusedName } from "@/lib/store";
import { Panel, Kicker } from "@/components/ui/panel";
import { ChartFrame, ChartSvg, ChartTip, Crosshair, ToolBar, ToolChip } from "@/components/charts/chart-kit";
import { xAt, yAt } from "@/lib/charts/math";
import { cn, r } from "@/lib/utils";

export function StackedMix() {
  const name = useFocusedName();
  const voice = useVoice();
  const keys = name.mixKeys;
  const hero = name.heroMixId;
  const heroLabel = keys.find((k) => k.id === hero)?.label ?? hero;
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState<"dollars" | "share">("dollars");
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const active = keys.filter((s) => !hidden[s.id]);
  const pad = { l: 12, r: 12, t: 28, b: 28 };
  const n = name.mix.length;
  const events = voice.events;

  const layers = useMemo(() => {
    return name.mix.map((row, i) => {
      let y0 = 0;
      const bands = active.map((s) => {
        const share = row.shares[s.id] ?? 0;
        const mag = mode === "share" ? share : name.revenue[i]! * share;
        const band = { key: s.id, label: s.label, color: mixFill(keys, s.id, hero), share, mag, y0, y1: y0 + mag };
        y0 += mag;
        return band;
      });
      return { year: row.year, total: y0, bands };
    });
  }, [active, mode, name, keys, hero]);

  const max = Math.max(...layers.map((l) => l.total), 1);
  const idx = hover ?? pinned ?? n - 1;
  const i = Math.max(0, Math.min(n - 1, idx));
  const layer = layers[i]!;

  function layerPath(key: string, w: number, h: number) {
    const x = (ii: number) => xAt(ii, n, pad.l, pad.r, w);
    const y = (v: number) => yAt(v, 0, max, pad.t, pad.b, h);
    const tops: string[] = [];
    const bots: string[] = [];
    layers.forEach((l, ii) => {
      const b = l.bands.find((band) => band.key === key);
      if (!b) return;
      tops.push(`${ii === 0 ? "M" : "L"}${x(ii)},${y(b.y1)}`);
      bots.push(`${x(ii)},${y(b.y0)}`);
    });
    if (!tops.length) return "";
    return `${tops.join(" ")} ${bots
      .reverse()
      .map((p) => `L${p}`)
      .join(" ")} Z`;
  }

  const heroNow = name.mix[i]!.shares[hero] ?? 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Kicker>{name.symbol} revenue mix</Kicker>
          <h3 className="mt-1 text-lg font-medium tracking-tight">{name.name}: {heroLabel} through the stack</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {voice.mixLede}
          </p>
        </div>
      </div>

      <ToolBar className="mt-4">
        <ToolChip on={mode === "dollars"} onClick={() => setMode("dollars")}>
          Dollars
        </ToolChip>
        <ToolChip on={mode === "share"} onClick={() => setMode("share")}>
          100% mix
        </ToolChip>
      </ToolBar>

      <ChartFrame className="mt-4" heightClass="h-56 md:h-72">
        {({ w, h }) => {
          const x = (ii: number) => xAt(ii, n, pad.l, pad.r, w);
          const xi = x(i);
          return (
            <>
              <ChartSvg
                viewW={w}
                viewH={h}
                n={n}
                pad={pad}
                index={hover}
                label="Segment stacked area"
                onIndex={setHover}
                onCommit={setPinned}
              >
                {active.map((s) => (
                  <path
                    key={s.id}
                    d={layerPath(s.id, w, h)}
                    fill={mixFill(keys, s.id, hero)}
                    opacity={s.id === hero ? 0.95 : 0.88}
                    className="pointer-events-none"
                  />
                ))}
                {events.map((ev) => {
                  const ei = name.mix.findIndex((row) => row.year === ev.year);
                  if (ei < 0) return null;
                  return (
                    <g key={ev.year} className="pointer-events-none">
                      <line
                        x1={x(ei)}
                        x2={x(ei)}
                        y1={pad.t}
                        y2={h - pad.b}
                        stroke="currentColor"
                        strokeOpacity="0.25"
                        strokeDasharray="2 4"
                      />
                      <text key={ev.year} x={x(ei)} y={pad.t - 10} textAnchor="middle" fill="currentColor" fontSize="9" opacity="0.55">
                        {ev.label}
                      </text>
                    </g>
                  );
                })}
                {name.mix.map((row, ii) => (
                  <text key={row.year} x={x(ii)} y={h - 6} textAnchor="middle" fill="currentColor" fontSize="11" opacity="0.5">
                    {row.year}
                  </text>
                ))}
                <Crosshair x={xi} y={pad.t + 8} x1={pad.l} x2={w - pad.r} y1={pad.t} y2={h - pad.b} />
              </ChartSvg>
              <ChartTip visible={hover != null || pinned != null} xPct={(xi / w) * 100}>
                <p className="font-medium">FY{layer.year}</p>
                {layer.bands.map((b) => (
                  <p key={b.key} className="mt-0.5 flex justify-between gap-4 tabular">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span>{mode === "share" ? pctPlain(b.share) : billions(b.mag * 1000, 0)}</span>
                  </p>
                ))}
              </ChartTip>
            </>
          );
        }}
      </ChartFrame>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {keys.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setHidden((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
            className={cn("inline-flex h-9 items-center gap-2 rounded-full bg-secondary px-3 text-xs", hidden[s.id] && "opacity-40")}
          >
            <span className="size-2 rounded-full" style={{ background: mixFill(keys, s.id, hero) }} />
            <span className={hidden[s.id] ? "text-muted-foreground line-through" : "text-foreground"}>{s.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        FY{layer.year} · {heroLabel} {pctPlain(heroNow)}
        {mode === "dollars" ? ` · ${r(layer.total).toFixed(0)}B total` : ""}.
      </p>
    </Panel>
  );
}
