import { createFileRoute } from "@tanstack/react-router";
import { useModel } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { useMarket, useTapePrice } from "@/lib/market/use-tape";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { PrintBoard } from "@/components/print/Board";

export const Route = createFileRoute("/print")({ component: PrintPage });

function PrintPage() {
  const market = useMarket();
  const tape = useTapePrice();
  const ticker = useModel((s) => s.ticker);
  const voice = useVoice();
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);

  return (
    <main>
      <PageHeader
        kicker={`Module 11 · ${ticker} print`}
        title={voice.printTitle}
        lede={voice.printLede}
      />
      <PageBody>
        <PrintBoard market={market} tape={tape} input={{ growth, grossMargin, wacc, tgr, taxRate }} />
      </PageBody>
    </main>
  );
}