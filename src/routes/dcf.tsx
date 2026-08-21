import { createFileRoute } from "@tanstack/react-router";
import { FORECAST_LABELS } from "@/lib/dcf/constants";
import { billions, moneyShare, pct, pctPlain, trillions } from "@/lib/dcf/format";
import { useFocusedName, useLiveDcf, useModel, useStreetDcf } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { useVoice } from "@/lib/desk/voice";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { Waterfall } from "@/components/charts/Waterfall";
import { GroupedBars } from "@/components/charts/Bars";
import { MultiLine } from "@/components/charts/MultiLine";

export const Route = createFileRoute("/dcf")({ component: DcfPage });

function DcfPage() {
  const dcf = useLiveDcf();
  const name = useFocusedName();
  const voice = useVoice();
  const tape = useTapePrice();
  const growth = useModel((s) => s.growth);
  const street = useStreetDcf();
  const mid = (dcf.price + street.price) / 2;
  const vs = dcf.price / tape - 1;

  return (
    <main>
      <PageHeader
        kicker={`Module 01 · ${name.symbol} discounted cash flow`}
        title={voice.dcfTitle}
        lede={voice.dcfLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Implied price"
              value={moneyShare(dcf.price)}
              hint={pct(vs) + " vs market"}
              tone={vs >= 0 ? "up" : "down"}
            />
            <Stat label="Enterprise value" value={trillions(dcf.ev)} />
            <Stat label="FY2029E revenue" value={billions(dcf.revenue[4]!, 0)} />
            <Stat label="TV share of EV" value={pctPlain(dcf.tvPct)} hint="Most of the value is the tail" />
          </div>
        </Panel>

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">P&L and FCF build</h3>
          <table className="mt-4 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Line</th>
                {FORECAST_LABELS.map((y) => (
                  <th key={y} className="pb-3 font-medium">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["Revenue", dcf.revenue.map((v) => billions(v, 0))],
                ["Growth", growth.map((g) => pctPlain(g))],
                ["EBIT", dcf.ebit.map((v) => billions(v, 0))],
                ["EBIT margin", dcf.ebitMargin.map((v) => pctPlain(v))],
                ["NOPAT", dcf.nopat.map((v) => billions(v, 0))],
                ["UFCF", dcf.fcf.map((v) => billions(v, 0))],
                ["PV of FCF", dcf.pvFcf.map((v) => billions(v, 0))],
              ].map(([label, cells]) => (
                <tr key={String(label)} className="border-t border-border">
                  <td className="py-3 text-muted-foreground">{label}</td>
                  {(cells as string[]).map((c, i) => (
                    <td key={i} className="py-3">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <GroupedBars
            kicker="Projection"
            title="Revenue vs EBIT"
            labels={[...FORECAST_LABELS]}
            series={[
              { name: "Revenue $B", values: dcf.revenue.map((v) => v / 1000), color: "var(--color-chart-4)" },
              { name: "EBIT $B", values: dcf.ebit.map((v) => v / 1000), color: "var(--color-chart-1)" },
            ]}
          />
          <GroupedBars
            kicker="Cash"
            title="Unlevered FCF and its present value"
            labels={[...FORECAST_LABELS]}
            series={[
              { name: "UFCF $B", values: dcf.fcf.map((v) => v / 1000), color: "var(--color-up)" },
              { name: "PV $B", values: dcf.pvFcf.map((v) => v / 1000), color: "var(--color-foreground)" },
            ]}
          />
        </div>

        <MultiLine
          kicker="Margins"
          title="EBIT margin through the explicit period"
          labels={["FY2024", ...FORECAST_LABELS]}
          yPrefix=""
          ySuffix="%"
          series={[
            {
              name: "EBIT margin",
              values: [31.92, ...dcf.ebitMargin.map((m) => m * 100)],
              color: "var(--color-accent)",
              width: 2.5,
            },
          ]}
        />

        <Waterfall dcf={dcf} />

        <Panel>
          <h3 className="text-lg font-medium tracking-tight">Three readings of the same machine</h3>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            <Stat
              label="Active case"
              value={moneyShare(dcf.price)}
              hint={pct(dcf.price / tape - 1)}
              tone={dcf.price >= tape ? "up" : "down"}
            />
            <Stat
              label="Street consensus"
              value={moneyShare(street.price)}
              hint={pct(street.price / tape - 1)}
              tone="down"
            />
            <Stat label="Midpoint" value={moneyShare(mid)} hint={pct(mid / tape - 1)} tone="down" />
          </div>
        </Panel>
      </PageBody>
    </main>
  );
}
