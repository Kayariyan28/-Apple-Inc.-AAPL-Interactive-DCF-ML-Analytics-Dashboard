import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { moneyShare, pct, pctPlain } from "@/lib/dcf/format";
import { runMonteCarlo } from "@/lib/dcf/engine";
import { gbmProbabilityMatrix, simulateGbm } from "@/lib/dcf/stochastic";
import { useCalibration } from "@/lib/dcf/use-cal";
import { useLiveBooks, useLiveDcf, useModel, useStreetDcf, useFocusedName } from "@/lib/store";
import { useTapePrice } from "@/lib/market/use-tape";
import { heroLabel } from "@/lib/desk/universe";
import { useVoice } from "@/lib/desk/voice";
import { PriceChart } from "@/components/charts/PriceChart";
import { StackedMix } from "@/components/charts/StackedMix";
import { StreamCards } from "@/components/charts/StreamCards";
import { DottedHistogram } from "@/components/charts/DottedHistogram";
import { ProbMatrix } from "@/components/charts/ProbMatrix";
import { Panel, Kicker, Stat } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

const LABS = [
  { to: "/live", label: "Live tape", copy: "Open quotes, reverse DCF, and a reading that refreshes itself." },
  { to: "/print", label: "The print", copy: "FY earnings board. 10-K tiles, live multiple, d3 streamgraph." },
  { to: "/term", label: "Terminal", copy: "Command the same engines. awk, tables, scripts on this device." },
  { to: "/deck", label: "Operating deck", copy: "Mix, cash, funnel, treemap, Sankey — live mega-cap metrics." },
  { to: "/dcf", label: "DCF engine", copy: "Five-year cash build, terminal value, equity bridge." },
  { to: "/simulate", label: "Monte Carlo", copy: "Shock WACC, growth, margins — 5k to 50k paths." },
  { to: "/paths", label: "Stochastic paths", copy: "GBM, jump-diffusion, and the fat left tail." },
  { to: "/sensitivity", label: "Sensitivity", copy: "WACC × terminal growth grid versus the tape." },
  { to: "/forecast", label: "ML forecast", copy: "Tiny-sample ensembles. Honest about the n=8 problem." },
  { to: "/history", label: "History", copy: "FY2018–FY2025: the mix shift in full." },
  { to: "/risk", label: "Risk", copy: "VaR, CVaR, correlation, Bayesian revenue bands." },
] as const;

const GBM_BANDS = [50, 150, 250, 350, 450, 650, 9999];

function Home() {
  const dcf = useLiveDcf();
  const street = useStreetDcf();
  const books = useLiveBooks();
  const name = useFocusedName();
  const voice = useVoice();
  const tape = useTapePrice();
  const cal = useCalibration();
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);

  const mc = useMemo(
    () => runMonteCarlo({ growth, grossMargin, wacc, tgr, taxRate }, 8000, 42, tape, books),
    [growth, grossMargin, wacc, tgr, taxRate, tape, books],
  );
  const gbm = useMemo(() => simulateGbm(6000, 5, 42, cal), [cal]);
  const matrix = useMemo(() => gbmProbabilityMatrix(gbm, GBM_BANDS), [gbm]);
  const vs = dcf.price / tape - 1;

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 md:px-6 md:pt-16">
        <div className="stagger-in max-w-3xl">
          <Kicker>Data Desk · {name.symbol} live tape + 10-K</Kicker>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">
            {voice.headline}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {name.name} prints at {moneyShare(tape)}. {voice.lede} A textbook discounted-cash-flow model, fed the same
            10-K, lands near {moneyShare(dcf.price)}.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 md:px-6">
        <PriceChart />

        <Panel>
          <div className="grid gap-8 md:grid-cols-4">
            <Stat
              label="Implied DCF"
              value={moneyShare(dcf.price)}
              hint={pct(vs) + " vs tape"}
              tone={vs >= 0 ? "up" : "down"}
            />
            <Stat
              label="Street case"
              value={moneyShare(street.price)}
              hint={pct(street.price / tape - 1) + " vs tape"}
              tone="down"
            />
            <Stat
              label="MC median"
              value={moneyShare(mc.median)}
              hint={`${pctPlain(mc.probBelowMarket)} of paths below market`}
              tone="down"
            />
            <Stat
              label="GBM year-5 median"
              value={moneyShare(gbm.p50[5]!)}
              hint={cal.source}
              tone="up"
            />
          </div>
          <blockquote className="mt-8 max-w-3xl font-serif text-2xl font-medium leading-snug tracking-tight md:text-3xl">
            {voice.quote}
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            {name.symbol} live {moneyShare(tape)} · DCF {moneyShare(dcf.price)} · {heroLabel(name)} is the mix that
            compounds. Ask Grok, or type use {name.symbol === "AAPL" ? "MSFT" : "AAPL"} in the terminal.
          </p>
        </Panel>

        <StackedMix />
        <StreamCards />

        <div className="grid gap-6 lg:grid-cols-2">
          <DottedHistogram
            bins={mc.bins}
            median={mc.median}
            marketPrice={tape}
            title={`${name.symbol} · eight thousand shocks to the DCF`}
            marks={[
              { x: mc.p5, label: "P5" },
              { x: mc.median, label: "P50" },
              { x: mc.p95, label: "P95" },
            ]}
          />
          <ProbMatrix
            bands={GBM_BANDS}
            rows={matrix}
            labels={["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"]}
            title={`Where the ${name.symbol} GBM finishes`}
          />
        </div>

        <section>
          <Kicker>The lab</Kicker>
          <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">Open a module</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LABS.map((lab) => (
              <Link
                key={lab.to}
                to={lab.to}
                className="group rounded-2xl bg-card p-5 shadow-[var(--shadow-border)] transition-shadow duration-150 hover:shadow-[var(--shadow-border-hover)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium">{lab.label}</h3>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{lab.copy}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/term">Open the terminal</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/live">Live tape</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/dcf">Start with the DCF</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
