import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { gbmProbabilityMatrix, pathStats, simulateGbm, simulateJumpDiffusion } from "@/lib/dcf/stochastic";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { useCalibration } from "@/lib/dcf/use-cal";
import { useModel, useFocusedName } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { useVoice } from "@/lib/desk/voice";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { FanChart } from "@/components/charts/FanChart";
import { ProbMatrix } from "@/components/charts/ProbMatrix";
import { MultiLine } from "@/components/charts/MultiLine";

export const Route = createFileRoute("/paths")({ component: PathsPage });

function PathsPage() {
  const nSims = useModel((s) => s.nSims);
  const tape = useTapePrice();
  const name = useFocusedName();
  const voice = useVoice();
  const cal = useCalibration();
  const n = Math.min(nSims, 12_000);
  const gbm = useMemo(() => simulateGbm(n, 5, 42, cal), [n, cal]);
  const jd = useMemo(() => simulateJumpDiffusion(n, 5, 123, 0.3, -0.05, 0.15, cal), [n, cal]);
  const y1 = pathStats(gbm, 1);
  const y3 = pathStats(gbm, 3);
  const y5 = pathStats(gbm, 5);
  const bands = [50, 150, 250, 350, 450, 650, 9999];
  const matrix = gbmProbabilityMatrix(gbm, bands);

  return (
    <main>
      <PageHeader
        kicker={`Module 03 · ${name.symbol} stochastic paths`}
        title={voice.pathsTitle}
        lede={voice.pathsLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Drift μ" value={pctPlain(cal.mu)} hint="Annual log-return mean" />
            <Stat label="Volatility σ" value={pctPlain(cal.sigma)} hint={cal.source} />
            <Stat label="S0" value={moneyShare(cal.s0)} hint="Live tape" />
            <Stat label="Paths" value={n.toLocaleString()} />
          </div>
        </Panel>

        <FanChart bundle={gbm} title={`${name.symbol} GBM fan — five years of Wiener noise`} market={tape} />

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">GBM statistics</h3>
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Metric</th>
                <th className="pb-3 font-medium">Year 1</th>
                <th className="pb-3 font-medium">Year 3</th>
                <th className="pb-3 font-medium">Year 5</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["Mean", moneyShare(y1.mean), moneyShare(y3.mean), moneyShare(y5.mean)],
                ["Median", moneyShare(y1.median), moneyShare(y3.median), moneyShare(y5.median)],
                ["P5", moneyShare(y1.p5), moneyShare(y3.p5), moneyShare(y5.p5)],
                ["P95", moneyShare(y1.p95), moneyShare(y3.p95), moneyShare(y5.p95)],
                ["P(> $300)", pctPlain(y1.p300), pctPlain(y3.p300), pctPlain(y5.p300)],
                ["P(> $400)", pctPlain(y1.p400), pctPlain(y3.p400), pctPlain(y5.p400)],
                ["P(< $150)", pctPlain(y1.p150), pctPlain(y3.p150), pctPlain(y5.p150)],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-border">
                  {row.map((c, i) => (
                    <td key={i} className={`py-3 ${i === 0 ? "text-muted-foreground" : ""}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <ProbMatrix
          bands={bands}
          rows={matrix}
          labels={["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]}
          title={`${name.symbol} finish-position probabilities`}
        />

        <FanChart bundle={jd} kicker="Jump-diffusion" title={`${name.symbol} Merton jumps · λ = 0.3 / yr, mean jump −5%`} market={tape} />

        <MultiLine
          kicker="Median comparison"
          title="Jump-diffusion versus GBM (median path)"
          labels={["Now", "Y1", "Y2", "Y3", "Y4", "Y5"]}
          series={[
            { name: "GBM median", values: gbm.p50, color: "var(--color-foreground)", width: 2.4 },
            { name: "JD median", values: jd.p50, color: "var(--color-accent)", width: 2.4 },
            { name: "JD P5", values: jd.p5, color: "var(--color-down)", dash: true },
            { name: "GBM P5", values: gbm.p5, color: "var(--color-down)", dash: true, width: 1.4 },
          ]}
        />

        <Panel>
          <h3 className="text-lg font-medium tracking-tight">How to read this</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            GBM assumes log-returns are well-behaved. Jump-diffusion adds Poisson shocks — the model’s way of
            admitting a regulation case, a demand air-pocket, a China weekend. The medians stay close. The fifth
            percentile does not. That gap is the point. Drift is the eight-year 10-K mean; volatility is blended with
            whatever the live session has already printed.
          </p>
        </Panel>
      </PageBody>
    </main>
  );
}