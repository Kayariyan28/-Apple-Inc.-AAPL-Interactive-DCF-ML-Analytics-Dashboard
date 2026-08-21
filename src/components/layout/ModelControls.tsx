import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { FORECAST_YEARS } from "@/lib/dcf/constants";
import { pctPlain } from "@/lib/dcf/format";
import { SIM_OPTIONS, useModel, type Scenario, type SimCount } from "@/lib/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

function Row({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="tabular text-sm text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

export function ModelControls() {
  const scenario = useModel((s) => s.scenario);
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  const nSims = useModel((s) => s.nSims);
  const note = useModel((s) => s.note);
  const ticker = useModel((s) => s.ticker);
  const applyScenario = useModel((s) => s.applyScenario);
  const setGrowth = useModel((s) => s.setGrowth);
  const setGrossMargin = useModel((s) => s.setGrossMargin);
  const setWacc = useModel((s) => s.setWacc);
  const setTgr = useModel((s) => s.setTgr);
  const setTaxRate = useModel((s) => s.setTaxRate);
  const setNSims = useModel((s) => s.setNSims);
  const setNote = useModel((s) => s.setNote);
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="flex flex-col">
      <div className="flex justify-center pb-2">
        <Segmented<Scenario>
          value={scenario}
          onChange={applyScenario}
          options={[
            { value: "management", label: "Management" },
            { value: "street", label: "Street" },
          ]}
        />
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {scenario === "management" ? "Internal case, higher growth." : "Consensus, more conservative."}
      </p>

      <Separator className="my-4" />

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Revenue growth</p>
      {FORECAST_YEARS.map((year, i) => (
        <Row key={year} label={`FY${year}E`} value={pctPlain(growth[i] ?? 0)}>
          <Slider
            min={0}
            max={15}
            step={0.5}
            value={[Math.round((growth[i] ?? 0) * 1000) / 10]}
            onValueChange={([v]) => setGrowth(i, (v ?? 0) / 100)}
          />
        </Row>
      ))}

      <Separator />

      <p className="pt-4 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Margin & discount
      </p>
      <Row label="Gross margin" value={pctPlain(grossMargin)}>
        <Slider
          min={40}
          max={55}
          step={0.5}
          value={[Math.round(grossMargin * 1000) / 10]}
          onValueChange={([v]) => setGrossMargin((v ?? 0) / 100)}
        />
      </Row>
      <Row label="WACC" value={pctPlain(wacc)}>
        <Slider
          min={6}
          max={14}
          step={0.5}
          value={[Math.round(wacc * 1000) / 10]}
          onValueChange={([v]) => setWacc((v ?? 0) / 100)}
        />
      </Row>
      <Row label="Terminal growth" value={pctPlain(tgr)}>
        <Slider
          min={1}
          max={6}
          step={0.5}
          value={[Math.round(tgr * 1000) / 10]}
          onValueChange={([v]) => setTgr((v ?? 0) / 100)}
        />
      </Row>
      <Row label="Tax rate" value={pctPlain(taxRate)}>
        <Slider
          min={10}
          max={25}
          step={0.5}
          value={[Math.round(taxRate * 1000) / 10]}
          onValueChange={([v]) => setTaxRate((v ?? 0) / 100)}
        />
      </Row>

      <Separator />

      <div className="pt-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Monte Carlo paths
        </p>
        <div className="flex flex-wrap gap-2">
          {SIM_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNSims(n as SimCount)}
              className={
                n === nSims
                  ? "h-9 rounded-full bg-foreground px-3 text-xs font-medium text-background"
                  : "h-9 rounded-full bg-secondary px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {(n / 1000).toFixed(0)}k
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Private note
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={`A line only you will see — the ${ticker} tape you are waiting on.`}
          className="w-full resize-y rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none shadow-[var(--shadow-border)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isPending ? (
          <p className="mt-2 h-4 w-40 animate-pulse rounded bg-secondary" />
        ) : user ? (
          <p className="mt-2 text-xs text-muted-foreground">Saved to {user.displayName ?? "your account"}.</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to keep these sliders and the note.
          </p>
        )}
      </div>
    </div>
  );
}
