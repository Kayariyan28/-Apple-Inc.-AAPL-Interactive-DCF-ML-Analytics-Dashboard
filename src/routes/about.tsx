import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { TICKERS, UNIVERSE } from "@/lib/desk/universe";
import { Button } from "@/components/ui/button";
import { Kicker, Panel } from "@/components/ui/panel";

export const Route = createFileRoute("/about")({ component: About });

const SHOTS = [
  { src: "/product/microsoft.png", alt: "Microsoft desk — Azure is the novel", caption: "Microsoft" },
  { src: "/product/nvidia-print.png", alt: "NVIDIA 10-K print with mix events", caption: "The print" },
  { src: "/product/grok.png", alt: "Grok asking across the desk", caption: "Grok" },
  { src: "/product/terminal.png", alt: "Data Desk terminal on the focused name", caption: "Terminal" },
] as const;

const SURFACES = [
  { name: "Live", copy: "Open quotes, reverse DCF, cash and debt from the latest print, headlines that refresh." },
  { name: "Print", copy: "FY 2018–2025 on one board. Mix events rewrite themselves when you change the name." },
  { name: "Deck", copy: "Operating mix, cash machine, funnel, and peer pack — the same books, a different lens." },
  { name: "Terminal", copy: "awk, tables, scripts, and the same engines as the charts. On this device." },
  { name: "DCF", copy: "Five-year cash build, terminal value, equity bridge. Street vs. desk, vs. tape." },
  { name: "Monte Carlo", copy: "Shock WACC, growth, margins. Paths, sensitivity, forecast, history, risk." },
] as const;

const PRINCIPLES = [
  {
    name: "The object is the name",
    copy: "A watchlist is a list. A desk is one company. The ticker strip is the primary control — everything else rewrites.",
  },
  {
    name: "Copy is a design material",
    copy: "Headlines, mix events, and Grok starters belong to the focused name. Apple copy on an NVIDIA chart is a defect.",
  },
  {
    name: "The print is a document",
    copy: "FY 2018–2025 as a board you can page. Events sit on the year they happened. Type, not a tooltip maze.",
  },
  {
    name: "Color is reserved for the tape",
    copy: "Up and down are the only moral colors. The rest is black, hairline, and type. Accent blue is a pointer, not a wash.",
  },
  {
    name: "Assumptions stay in reach",
    copy: "WACC, growth, and margins live in one sheet. Every chart re-prices when a slider moves. No apply button.",
  },
  {
    name: "Terminal is a surface",
    copy: "If the engines are honest, they should be callable. Same type, same books — not a debug console bolted on.",
  },
] as const;

function About() {
  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 md:px-6 md:pt-16">
        <div className="stagger-in max-w-3xl">
          <Kicker>Product design · K28 Design Lab</Kicker>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight md:text-6xl">
            A desk for the 10-K and the live tape.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Data Desk is a research surface for five mega-cap names. It reads the printed books, prices a textbook
            discounted-cash-flow model, and holds that number against the open market — then lets Grok talk through
            all of it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">Open the desk</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-16 md:px-6">
        <figure className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)]">
          <img
            src="/product/overview.png"
            alt="Data Desk home — Apple headline against the live tape"
            className="block w-full"
          />
        </figure>

        <div className="grid gap-6 md:grid-cols-2">
          {SHOTS.map((shot) => (
            <figure key={shot.src} className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-border)]">
              <img src={shot.src} alt={shot.alt} className="block w-full" />
              <figcaption className="px-5 py-3 text-xs uppercase tracking-widest text-muted-foreground">
                {shot.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        <Panel>
          <Kicker>The names</Kicker>
          <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight">Switch the ticker. The desk rewrites.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Headlines, mix events, Grok starters, cash, debt, and the 10-K all belong to the focused name. Apple is
            not a skin on Microsoft.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TICKERS.map((t) => {
              const n = UNIVERSE[t];
              return (
                <div key={t} className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{n.symbol}</p>
                  <p className="mt-2 font-serif text-xl font-medium">{n.name}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {n.mixKeys.map((k) => k.label).join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <Kicker>Product design</Kicker>
          <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight">Predesign before chrome.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Finance products split in two: terminals that are hostile, consumer apps that are thin. Data Desk was
            designed as a place you sit with a name — the 10-K as a document, the tape as a live object, the DCF as
            arithmetic. These six decisions were locked before the first production layout.
          </p>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {PRINCIPLES.map((s) => (
              <div key={s.name}>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.copy}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Display</p>
              <p className="mt-2 font-serif text-xl font-medium">Newsreader</p>
              <p className="mt-1 text-xs text-muted-foreground">The argument</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">UI</p>
              <p className="mt-2 font-serif text-xl font-medium">Outfit</p>
              <p className="mt-1 text-xs text-muted-foreground">The instrument</p>
            </div>
            <div className="rounded-2xl bg-secondary/60 p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Tape</p>
              <p className="mt-2 font-serif text-xl font-medium">Up / down only</p>
              <p className="mt-1 text-xs text-muted-foreground">Green and red, tape only</p>
            </div>
          </div>
        </Panel>

        <Panel>
          <Kicker>Surfaces</Kicker>
          <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight">One set of books. Every lens.</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {SURFACES.map((s) => (
              <div key={s.name}>
                <p className="text-sm font-medium">{s.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.copy}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-6 md:grid-cols-2">
          <Panel>
            <Kicker>Your desk</Kicker>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight">Sign in. Keep the assumptions.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Google, X, or email. The focused name, scenario, growth path, WACC, and notes save to your account so
              the next session opens where you left it.
            </p>
            <Button asChild className="mt-6" variant="secondary">
              <Link to="/login">
                Create an account
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </Panel>
          <Panel>
            <Kicker>Grok</Kicker>
            <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight">Ask across the whole tape.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Grok reads the live quote, the 10-K mix, the DCF bridge, and the Monte Carlo tails for the name on the
              desk. Starters change with the ticker. The answer is an insight, not a screenshot of a chart.
            </p>
          </Panel>
        </div>

        <Panel>
          <Kicker>Built by</Kicker>
          <div className="mt-4 grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="font-serif text-3xl font-medium tracking-tight">Karan Chandra Dey</h2>
              <p className="mt-2 text-sm text-muted-foreground">K28 Design Lab · San Francisco</p>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Product designer and builder. Data Desk is a UI/UX exploration made into a working desk: the
                successor to a single-name Apple DCF notebook, designed so a name change is a rewrite, not a reskin.
              </p>
            </div>
            <div className="flex flex-col justify-end gap-2 text-sm">
              <a
                href="https://github.com/Kayariyan28/data-desk"
                className="text-foreground hover:text-accent"
                target="_blank"
                rel="noreferrer"
              >
                github.com/Kayariyan28/data-desk
              </a>
              <a href="https://k28art.space" className="text-muted-foreground hover:text-foreground" target="_blank" rel="noreferrer">
                k28art.space
              </a>
              <a
                href="https://x.com/K28DesignLab"
                className="text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                @K28DesignLab
              </a>
            </div>
          </div>
        </Panel>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Educational model, not investment advice. Past returns do not guarantee future results. Not affiliated
          with Apple, Microsoft, Alphabet, Amazon, NVIDIA, or xAI. Quotes via public market feeds; books from
          filed 10-Ks.
        </p>
      </div>
    </main>
  );
}
