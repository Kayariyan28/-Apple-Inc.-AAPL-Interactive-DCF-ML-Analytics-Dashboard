import { createFileRoute } from "@tanstack/react-router";
import { WEEKLY } from "@/lib/dcf/history";
import { useMarket, useTapePrice } from "@/lib/market/use-tape";
import { useFocusedName } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { HeroRow } from "@/components/deck/HeroRow";
import { ExpoCurve } from "@/components/deck/ExpoCurve";
import { Compete } from "@/components/deck/Compete";
import { PnlStudio } from "@/components/deck/PnlStudio";
import { OpsBoard } from "@/components/deck/OpsBoard";
import { IntelBoard } from "@/components/deck/IntelBoard";
import { StackedMix } from "@/components/charts/StackedMix";

export const Route = createFileRoute("/deck")({ component: DeckPage });

function DeckPage() {
  const market = useMarket();
  const tape = useTapePrice();
  const name = useFocusedName();
  const voice = useVoice();
  const daily = market?.daily?.length
    ? market.daily
    : name.symbol === "AAPL"
      ? WEEKLY.slice(-40).map((p) => ({ t: p.t, close: p.close, label: p.date }))
      : [];

  return (
    <main>
      <PageHeader
        kicker={`Module 10 · ${name.symbol} operating system`}
        title={voice.deckTitle}
        lede={voice.deckLede}
      />
      <PageBody>
        <HeroRow mktCap={market?.aapl.mktCap ?? null} tape={tape} />
        {name.symbol === "AAPL" ? <ExpoCurve /> : <StackedMix />}
        {market ? <Compete aapl={market.aapl} peers={market.peers} /> : null}
        <PnlStudio />
        {market ? (
          <OpsBoard
            aapl={market.aapl}
            peers={market.peers}
            daily={daily}
            intraday={market.intraday}
            vix={market.vix?.price ?? null}
            session={market.aapl.session}
          />
        ) : null}
        {market ? <IntelBoard aapl={market.aapl} peers={market.peers} tape={tape} /> : null}
      </PageBody>
    </main>
  );
}
