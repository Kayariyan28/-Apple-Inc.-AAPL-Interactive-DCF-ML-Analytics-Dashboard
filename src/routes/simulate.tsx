import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { EXCEL_MC } from "@/lib/dcf/constants";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { runMonteCarlo } from "@/lib/dcf/engine";
import { useLiveBooks, useModel, useFocusedName } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { useVoice } from "@/lib/desk/voice";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { DottedHistogram } from "@/components/charts/DottedHistogram";
import { CdfChart } from "@/components/charts/CdfChart";

export const Route = createFileRoute("/simulate")({ component: SimulatePage });

function SimulatePage() {
  const nSims = useModel((s) => s.nSims);
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  const tape = useTapePrice();
  const name = useFocusedName();
  const voice = useVoice();
  const books = useLiveBooks();
  const mc = useMemo(
    () => runMonteCarlo({ growth, grossMargin, wacc, tgr, taxRate }, nSims, 42, tape, books),
    [growth, grossMargin, wacc, tgr, taxRate, nSims, tape, books],
  );
  const cdf = useMemo(() => {
    const step = Math.max(1, Math.floor(mc.sorted.length / 240));
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < mc.sorted.length; i += step) {
      pts.push({ x: mc.sorted[i]!, y: (i + 1) / mc.sorted.length });
    }
    return pts;
  }, [mc]);

  return (
    <main>
      <PageHeader
        kicker={`Module 02 · ${name.symbol} Monte Carlo`}
        title={voice.simTitle}
        lede={voice.simLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Mean" value={moneyShare(mc.mean)} />
            <Stat label="Median" value={moneyShare(mc.median)} />
            <Stat label="P5" value={moneyShare(mc.p5)} hint="Very bear" />
            <Stat label="P25" value={moneyShare(mc.p25)} />
            <Stat label="P75" value={moneyShare(mc.p75)} />
            <Stat label="P95" value={moneyShare(mc.p95)} hint="Very bull" />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            {pctPlain(mc.probBelowMarket)} of {nSims.toLocaleString()} paths price below the {name.symbol} {moneyShare(tape)} tape.
            Shocks: WACC ±1.0%, TGR ±0.5%, growth ±2.5%, margin ±1.5%.
          </p>
        </Panel>

        <DottedHistogram
          bins={mc.bins}
          median={mc.median}
          marketPrice={tape}
          title={`Live distribution · ${nSims.toLocaleString()} paths`}
          marks={[
            { x: mc.p5, label: "P5" },
            { x: mc.median, label: "P50" },
            { x: mc.p95, label: "P95" },
          ]}
        />

        <CdfChart points={cdf} market={tape} />

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">Excel workbook reference</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The original model’s 10,000-path print — a cross-check, not a live rerun.
          </p>
          <table className="mt-4 w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Statistic</th>
                <th className="pb-3 font-medium">Excel</th>
                <th className="pb-3 font-medium">This desk</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["Mean", EXCEL_MC.mean, mc.mean],
                ["Median", EXCEL_MC.median, mc.median],
                ["P5", EXCEL_MC.p5, mc.p5],
                ["P25", EXCEL_MC.p25, mc.p25],
                ["P75", EXCEL_MC.p75, mc.p75],
                ["P95", EXCEL_MC.p95, mc.p95],
              ].map(([k, a, b]) => (
                <tr key={String(k)} className="border-t border-border">
                  <td className="py-3 text-muted-foreground">{k}</td>
                  <td className="py-3">{moneyShare(a as number)}</td>
                  <td className="py-3">{moneyShare(b as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </PageBody>
    </main>
  );
}
