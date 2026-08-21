import { createFileRoute } from "@tanstack/react-router";
import { EXCEL_HEATMAP, STREET_REV_MM } from "@/lib/dcf/constants";
import { sensitivityGrid } from "@/lib/dcf/engine";
import { billions } from "@/lib/dcf/format";
import { useFocusedName, useLiveBooks, useLiveDcf, useModel } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { useVoice } from "@/lib/desk/voice";
import { PageHeader, PageBody } from "@/components/ui/page-header";
import { HeatGrid } from "@/components/charts/HeatGrid";
import { GroupedBars } from "@/components/charts/Bars";
import { FORECAST_LABELS } from "@/lib/dcf/constants";

export const Route = createFileRoute("/sensitivity")({ component: SensitivityPage });

function SensitivityPage() {
  const dcf = useLiveDcf();
  const name = useFocusedName();
  const voice = useVoice();
  const books = useLiveBooks();
  const tape = useTapePrice();
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const setWacc = useModel((s) => s.setWacc);
  const setTgr = useModel((s) => s.setTgr);
  const live = sensitivityGrid(dcf.fcf, books.cash, books.debt, books.shares);

  return (
    <main>
      <PageHeader
        kicker={`Module 04 · ${name.symbol} sensitivity`}
        title={voice.sensTitle}
        lede={voice.sensLede}
      />
      <PageBody>
        <HeatGrid
          grid={live}
          wacc={wacc}
          tgr={tgr}
          marketPrice={tape}
          kicker="Live FCFs"
          title={`${name.symbol} implied price · WACC × terminal growth`}
          onSelect={(w, t) => {
            setWacc(w);
            setTgr(t);
          }}
        />
        <HeatGrid
          grid={EXCEL_HEATMAP.grid}
          marketPrice={tape}
          kicker="Workbook"
          title="Excel reference grid — the original 11 × 8 print"
        />
        <GroupedBars
          kicker="Revenue cases"
          title="Management (your live DCF) vs Street"
          labels={[...FORECAST_LABELS]}
          series={[
            { name: "Active DCF $B", values: dcf.revenue.map((v) => v / 1000), color: "var(--color-chart-4)" },
            { name: "Street $B", values: STREET_REV_MM.map((v) => v / 1000), color: "var(--color-muted-foreground)" },
          ]}
        />
        <p className="text-sm text-muted-foreground">
          Street FY2029E {billions(STREET_REV_MM[4]!, 0)} versus your case {billions(dcf.revenue[4]!, 0)}. The gap is
          the entire bull argument in one chart.
        </p>
      </PageBody>
    </main>
  );
}
