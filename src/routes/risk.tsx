import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CORR_EXCEL, CORR_LABELS, ML_REF } from "@/lib/dcf/constants";
import { corrMatrix } from "@/lib/dcf/rng";
import { historicalVar } from "@/lib/dcf/stochastic";
import { useCalibration } from "@/lib/dcf/use-cal";
import { money, pctPlain } from "@/lib/dcf/format";
import { heroLabel, mixDollars } from "@/lib/desk/universe";
import { useMarket } from "@/lib/market/use-tape";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { MultiLine } from "@/components/charts/MultiLine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/risk")({ component: RiskPage });

function cellTone(v: number) {
  if (v >= 0.95) return "bg-accent text-accent-foreground";
  if (v >= 0.9) return "bg-accent/50 text-foreground";
  if (v >= 0.85) return "bg-accent/25 text-foreground";
  return "bg-secondary text-muted-foreground";
}

function RiskPage() {
  const cal = useCalibration();
  const market = useMarket();
  const name = useFocusedName();
  const voice = useVoice();
  const daily = market?.daily.map((b) => b.close);
  const risk = useMemo(() => historicalVar(cal, daily, name.price), [cal, daily, name.price]);
  const hero = name.years.map((_, i) => mixDollars(name, i, name.heroMixId));
  const live = corrMatrix([
    [...name.revenue],
    [...name.netIncome],
    [...name.grossMargin],
    hero,
    [...name.opIncome],
    [...name.eps],
    [...name.price],
  ]);

  return (
    <main>
      <PageHeader
        kicker={`Module 07 · ${name.symbol} risk`}
        title={voice.riskTitle}
        lede={voice.riskLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Annual σ" value={pctPlain(cal.sigma)} hint={cal.source} />
            <Stat label="S0" value={money(cal.s0)} hint="Live tape" />
            <Stat label="Hist. 95% VaR" value={pctPlain(Math.max(0, risk.hist95))} hint="One-year" />
            <Stat label="CVaR 95%" value={pctPlain(Math.max(0, risk.cvar95))} hint="Expected shortfall" />
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <CorrCard title={`${name.symbol === "AAPL" ? "Workbook" : name.name} correlation`} matrix={CORR_EXCEL} labels={["Revenue", "Net income", "Gross margin", heroLabel(name), "Op. income", "EPS", "Price"]} />
          <CorrCard
            title={`Recomputed from the ${name.symbol} prints`}
            matrix={live}
            labels={["Revenue", "Net income", "Gross margin", heroLabel(name), "Op. income", "EPS", "Price"]}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {heroLabel(name)} versus the stock is the series to watch in the matrix. If you only watch the rest of the mix,
          you are watching the wrong line.
        </p>

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">Value at risk</h3>
          <table className="mt-4 w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Metric</th>
                <th className="pb-3 font-medium">Value</th>
                <th className="pb-3 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["Historical VaR 90%", pctPlain(Math.max(0, risk.hist90)), "Empirical percentile, n=7 returns"],
                ["Historical VaR 95%", pctPlain(Math.max(0, risk.hist95)), "Thin tail sample"],
                ["CVaR 95%", pctPlain(Math.max(0, risk.cvar95)), "Mean of the worst 5%"],
                ["CVaR 99%", pctPlain(Math.max(0, risk.cvar99)), "Mean of the worst 1%"],
                ["Parametric VaR 90%", pctPlain(Math.max(0, risk.par90)), "Normal, live σ"],
                ["Parametric VaR 95%", pctPlain(Math.max(0, risk.par95)), "Normal, live σ"],
                ["Parametric VaR 99%", pctPlain(Math.max(0, risk.par99)), "Normal, live σ"],
                ["Drift μ", pctPlain(risk.mu), "Mean log-return, 10-K"],
                [
                  "Live daily σ",
                  risk.dailySigma != null ? pctPlain(risk.dailySigma) : "n<8",
                  "Annualized from the open feed",
                ],
                [
                  "$1M dollar VaR 95%",
                  `$${Math.round(1_000_000 * Math.max(0, risk.hist95)).toLocaleString()}`,
                  "Position sizing",
                ],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  <td className="py-3 text-muted-foreground">{row[0]}</td>
                  <td className="py-3">{row[1]}</td>
                  <td className="py-3 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">Diagnostics (workbook)</h3>
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Test</th>
                <th className="pb-3 font-medium">Stat</th>
                <th className="pb-3 font-medium">p</th>
                <th className="pb-3 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Shapiro–Wilk", "0.910", "0.395", "Cannot reject normality"],
                ["Jarque–Bera", "0.803", "0.669", "Cannot reject normality"],
                ["Kolmogorov–Smirnov", "0.210", "0.861", "Cannot reject normality"],
                ["Lag-1 autocorrelation", "0.088", "—", "Low serial dependence"],
                ["Hurst exponent", "0.500", "—", "Random-walk-like at annual frequency"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  <td className="py-3 text-muted-foreground">{row[0]}</td>
                  <td className="py-3 tabular">{row[1]}</td>
                  <td className="py-3 tabular">{row[2]}</td>
                  <td className="py-3">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <MultiLine
          kicker={`${name.symbol} Bayesian revenue`}
          title={`${name.name} · 95% credible interval`}
          labels={ML_REF.bayesianYears}
          ySuffix="B"
          series={[
            { name: "Upper 95%", values: ML_REF.bayesianHi, color: "var(--color-up)", dash: true },
            { name: "Mean", values: ML_REF.bayesianMean, color: "var(--color-foreground)", width: 2.5 },
            { name: "Lower 95%", values: ML_REF.bayesianLo, color: "var(--color-down)", dash: true },
            { name: "OU median", values: ML_REF.ouMedian, color: "var(--color-chart-3)", dash: true },
          ]}
        />
      </PageBody>
    </main>
  );
}

function CorrCard({
  title,
  matrix,
  labels = CORR_LABELS,
}: {
  title: string;
  matrix: number[][];
  labels?: readonly string[];
}) {
  const [focus, setFocus] = useState<{ i: number; j: number } | null>(null);
  const cell = focus ? matrix[focus.i]?.[focus.j] : null;
  return (
    <Panel className="overflow-x-auto">
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      {focus && cell != null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {labels[focus.i]} vs {labels[focus.j]} · r = {cell.toFixed(3)}
          {focus.i !== focus.j ? ` · r² = ${(cell * cell).toFixed(3)} of shared variance` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Hover a cell.</p>
      )}
      <table className="mt-4 w-full min-w-[520px] border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th />
            {labels.map((l) => (
              <th key={l} className="pb-2 font-medium text-muted-foreground">
                {l.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="pr-2 text-left font-medium text-muted-foreground">{labels[i]}</th>
              {row.map((v, j) => {
                const on = focus?.i === i && focus?.j === j;
                const dim = focus != null && focus.i !== i && focus.j !== j && focus.i !== j && focus.j !== i;
                return (
                  <td key={j}>
                    <button
                      type="button"
                      onMouseEnter={() => setFocus({ i, j })}
                      onFocus={() => setFocus({ i, j })}
                      onClick={() => setFocus({ i, j })}
                      className={cn(
                        "flex h-9 w-full items-center justify-center rounded-md tabular",
                        cellTone(v),
                        on && "ring-2 ring-foreground",
                        dim && "opacity-35",
                      )}
                    >
                      {v.toFixed(2)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}