import { createFileRoute } from "@tanstack/react-router";
import { CURRENT_PRICE, WEEK_52_HIGH, WEEK_52_LOW } from "@/lib/dcf/constants";
import { cagr } from "@/lib/dcf/engine";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { heroLabel, mixDollars } from "@/lib/desk/universe";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { Panel, Stat } from "@/components/ui/panel";
import { GroupedBars } from "@/components/charts/Bars";
import { MultiLine } from "@/components/charts/MultiLine";
import { StackedMix } from "@/components/charts/StackedMix";
import { useMarket } from "@/lib/market/use-tape";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const name = useFocusedName();
  const voice = useVoice();
  const years = name.years.map(String);
  const last = name.years.length - 1;
  const revCagr = cagr(name.revenue[0]!, name.revenue[last]!, 7);
  const market = useMarket();
  const tape = market?.aapl.price;
  const high52 = market?.aapl.high52 ?? (name.symbol === "AAPL" ? WEEK_52_HIGH : name.price[last]!);
  const low52 = market?.aapl.low52 ?? (name.symbol === "AAPL" ? WEEK_52_LOW : Math.min(...name.price));
  const hero = heroLabel(name);
  const heroSeries = name.years.map((_, i) => mixDollars(name, i, name.heroMixId));
  const restSeries = name.revenue.map((r, i) => r - heroSeries[i]!);

  return (
    <main>
      <PageHeader
        kicker={`Module 06 · ${name.symbol} FY2018–FY2025`}
        title={voice.historyTitle}
        lede={voice.historyLede}
      />
      <PageBody>
        <Panel>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label={market ? "Live tape" : "Snapshot"} value={moneyShare(tape ?? CURRENT_PRICE)} />
            <Stat label="52-week high" value={moneyShare(high52)} />
            <Stat label="52-week low" value={moneyShare(low52)} />
            <Stat label="FY2025 revenue" value={`$${name.revenue[last]!.toFixed(0)}B`} />
            <Stat label="FY2025 net income" value={`$${name.netIncome[last]!.toFixed(0)}B`} />
            <Stat label="7-year rev CAGR" value={pctPlain(revCagr)} />
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <GroupedBars
            title={`${name.symbol} revenue and net income`}
            labels={years}
            series={[
              { name: "Revenue $B", values: [...name.revenue], color: "var(--color-chart-4)" },
              { name: "Net income $B", values: [...name.netIncome], color: "var(--color-chart-1)" },
            ]}
          />
          <GroupedBars
            title={`${hero} vs the rest`}
            labels={years}
            series={[
              { name: "Rest $B", values: restSeries, color: "var(--color-chart-1)" },
              { name: `${hero} $B`, values: heroSeries, color: "var(--color-chart-2)" },
            ]}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MultiLine
            title={`${name.symbol} gross margin`}
            labels={name.years}
            yPrefix=""
            ySuffix="%"
            series={[{ name: "GM %", values: [...name.grossMargin], color: "var(--color-up)", width: 2.5 }]}
          />
          <MultiLine
            title={`${name.symbol} EPS and the stock`}
            labels={name.years}
            series={[
              { name: "EPS $", values: [...name.eps], color: "var(--color-chart-4)", width: 2.2 },
              { name: "Price $", values: [...name.price], color: "var(--color-chart-1)", width: 2.2 },
            ]}
          />
        </div>

        <StackedMix />
      </PageBody>
    </main>
  );
}
