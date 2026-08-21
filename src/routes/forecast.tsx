import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { FORECAST_LABELS, FORECAST_YEARS, ML_REF, STREET_REV_MM } from "@/lib/dcf/constants";
import { fitsFor, priceEnsemble } from "@/lib/dcf/regress";
import { moneyShare, pct } from "@/lib/dcf/format";
import { heroLabel } from "@/lib/desk/universe";
import { useVoice } from "@/lib/desk/voice";
import { useFocusedName, useLiveDcf, useStreetDcf } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { MultiLine } from "@/components/charts/MultiLine";
import { GroupedBars } from "@/components/charts/Bars";

export const Route = createFileRoute("/forecast")({ component: ForecastPage });

function ForecastPage() {
  const name = useFocusedName();
  const dcf = useLiveDcf();
  const tape = useTapePrice();
  const street = useStreetDcf();
  const fits = useMemo(() => fitsFor(name.symbol), [name.symbol]);
  const px = useMemo(() => priceEnsemble(tape, name.symbol), [tape, name.symbol]);
  const last = px.mid[px.mid.length - 1]!;
  const lastPrint = name.price[name.price.length - 1]!;
  const hero = heroLabel(name);
  const voice = useVoice();
  const apple = name.symbol === "AAPL";

  const revSeries = [
    { name: "Linear", values: fits.revenue.linear, color: "var(--color-chart-2)", dash: true },
    { name: "Polynomial", values: fits.revenue.polynomial, color: "var(--color-chart-1)", dash: true },
    { name: "Exponential", values: fits.revenue.exponential, color: "var(--color-chart-3)", dash: true },
    { name: "Live ensemble", values: fits.revenue.ensemble, color: "var(--color-foreground)", width: 2.6 },
    { name: "DCF (active)", values: dcf.revenue.map((v) => v / 1000), color: "var(--color-chart-5)", dash: true },
    ...(apple
      ? [
          { name: "Workbook ensemble", values: ML_REF.revEnsemble, color: "var(--color-accent)", width: 2 },
          { name: "Street", values: STREET_REV_MM.map((v) => v / 1000), color: "var(--color-muted-foreground)", dash: true },
        ]
      : []),
  ];

  return (
    <main>
      <PageHeader
        kicker={`Module 05 · ${name.symbol} ensemble`}
        title={voice.forecastTitle}
        lede={voice.forecastLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Revenue R² (lin)" value={fits.revenue.r2.linear.toFixed(2)} />
            <Stat label="EPS R² (lin)" value={fits.eps.r2.linear.toFixed(2)} />
            <Stat label="Price R² (lin)" value={fits.price.r2.linear.toFixed(2)} />
            <Stat
              label="CY2029 ensemble"
              value={moneyShare(last)}
              hint={pct(last / tape - 1) + " vs tape"}
              tone="up"
            />
          </div>
        </Panel>

        <MultiLine
          kicker="Model 1"
          title={`${name.symbol} revenue — live fit vs DCF`}
          labels={[...FORECAST_YEARS]}
          ySuffix="B"
          series={revSeries}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <GroupedBars
            kicker="Model 2"
            title={`Gross margin vs ${hero} mix`}
            labels={[...FORECAST_LABELS]}
            series={[
              { name: "GM % (fit)", values: fits.gm.ensemble, color: "var(--color-chart-4)" },
              { name: `${hero} mix %`, values: fits.heroFit.ensemble, color: "var(--color-chart-3)" },
            ]}
          />
          <GroupedBars
            kicker="Model 3"
            title="EPS and the implied P/E at the live ensemble"
            labels={[...FORECAST_LABELS]}
            series={[
              { name: "EPS $", values: fits.eps.ensemble, color: "var(--color-chart-4)" },
              { name: "Implied P/E", values: px.pePath, color: "var(--color-chart-1)" },
            ]}
          />
        </div>

        <MultiLine
          kicker="Model 4"
          title="Price ensemble — time 30% · revenue 35% · EPS 35% · live rebase"
          labels={["CY25", "CY26", "CY27", "CY28", "CY29"]}
          series={[
            { name: "Bull band", values: px.upper, color: "var(--color-up)", dash: true },
            { name: "Ensemble", values: px.mid, color: "var(--color-foreground)", width: 2.6 },
            { name: "Bear band", values: px.lower, color: "var(--color-down)", dash: true },
            ...(apple
              ? [{ name: "Workbook ensemble", values: ML_REF.priceEnsemble, color: "var(--color-accent)" }]
              : []),
            {
              name: "Live tape",
              values: FORECAST_YEARS.map(() => tape),
              color: "var(--color-down)",
              dash: true,
              width: 1.4,
            },
          ]}
        />

        <Panel className="overflow-x-auto">
          <h3 className="text-lg font-medium tracking-tight">Composite signal</h3>
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="pb-3 font-medium">Method</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">vs tape</th>
                <th className="pb-3 font-medium">Reading</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {[
                ["DCF — active case", dcf.price],
                ["DCF — street", street.price],
                ["ML ensemble CY2025", px.mid[0]!],
                ["ML ensemble CY2026", px.mid[1]!],
                ["ML ensemble CY2029", last],
                ["Market tape", tape],
              ].map(([label, price]) => {
                const p = price as number;
                const vs = p / tape - 1;
                const reading =
                  label === "Market tape" ? "—" : Math.abs(vs) < 0.08 ? "Near" : vs > 0 ? "Above" : "Below";
                return (
                  <tr key={String(label)} className="border-t border-border">
                    <td className="py-3 text-muted-foreground">{label}</td>
                    <td className="py-3">{moneyShare(p)}</td>
                    <td className="py-3">{label === "Market tape" ? "—" : pct(vs)}</td>
                    <td className="py-3">{reading}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-sm text-muted-foreground">
            Historical last print {moneyShare(lastPrint)} in FY2025 versus the {moneyShare(tape)} live tape — rebase k ={" "}
            {(tape / lastPrint).toFixed(4)}.
            {apple
              ? ` Workbook CY2029 ${moneyShare(ML_REF.priceEnsemble[4]!)} is shown on the chart as a reference, not as a live input.`
              : ` Fits are on ${name.symbol} 10-K prints, not the Apple workbook.`}
          </p>
        </Panel>
      </PageBody>
    </main>
  );
}
