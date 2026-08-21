import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { moneyShare, pct } from "@/lib/dcf/format";
import { TICKERS } from "@/lib/desk/universe";
import { useMarket, useTapePrice, TapePoller } from "@/lib/market/use-tape";
import { useFocusedName, useModel } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ModelControls } from "@/components/layout/ModelControls";
import { TapeStatus } from "@/components/layout/TapeStatus";
import { GrokSheet } from "@/components/layout/GrokSheet";
import { AuthSlot } from "@/components/layout/AuthSlot";
import { DeskSync } from "@/components/layout/DeskSync";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { to: "/", label: "Overview" },
  { to: "/live", label: "Live" },
  { to: "/print", label: "Print" },
  { to: "/deck", label: "Deck" },
  { to: "/term", label: "Terminal" },
] as const;

const MODELS = [
  { to: "/dcf", label: "DCF" },
  { to: "/simulate", label: "Monte Carlo" },
  { to: "/paths", label: "Paths" },
  { to: "/sensitivity", label: "Sensitivity" },
  { to: "/forecast", label: "Forecast" },
  { to: "/history", label: "History" },
  { to: "/risk", label: "Risk" },
] as const;

const MORE = [{ to: "/about", label: "About" }] as const;
const NAV = [...PRIMARY, ...MODELS, ...MORE];

function TickerStrip() {
  const ticker = useModel((s) => s.ticker);
  const setTicker = useModel((s) => s.setTicker);
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-secondary p-0.5" role="tablist" aria-label="Name">
      {TICKERS.map((t) => {
        const on = t === ticker;
        return (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setTicker(t)}
            className={cn(
              "h-11 min-w-11 rounded-full px-2.5 text-xs font-medium tabular transition-colors duration-150",
              on ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tape = useTapePrice();
  const market = useMarket();
  const name = useFocusedName();
  const ticker = useModel((s) => s.ticker);
  const isTerm = pathname === "/term";
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground",
        isTerm ? "h-dvh overflow-hidden" : "min-h-dvh",
      )}
    >
      <TapePoller ticker={ticker} />
      <DeskSync />
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-end justify-center gap-0.5 rounded-lg bg-secondary pb-1.5">
              <span className="h-2 w-1 rounded-sm bg-foreground" />
              <span className="h-3.5 w-1 rounded-sm bg-foreground" />
              <span className="h-2.5 w-1 rounded-sm bg-accent" />
            </span>
            <span className="leading-none">
              <span className="block text-sm font-medium tracking-tight">Data Desk</span>
              <span className="block text-xs uppercase tracking-widest text-muted-foreground">{name.symbol}</span>
            </span>
          </Link>

          <div className="hidden sm:block">
            <TickerStrip />
          </div>

          <nav className="no-scrollbar ml-2 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {PRIMARY.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition-colors duration-150",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="mx-1 h-4 w-px shrink-0 bg-border" />
            {MODELS.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3 py-2 text-sm transition-colors duration-150",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <TapeStatus
                session={market?.aapl.session ?? "closed"}
                stale={market?.stale ?? true}
                className="justify-end"
              />
              <p className="tabular text-sm font-medium">
                {moneyShare(tape)}
                {market ? (
                  <span className={cn("ml-2 text-xs", market.aapl.changePct >= 0 ? "text-up" : "text-down")}>
                    {pct(market.aapl.changePct)}
                  </span>
                ) : null}
              </p>
            </div>
            <Link
              to="/about"
              className={cn(
                "hidden rounded-full px-3 py-2 text-sm lg:inline",
                pathname === "/about" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              About
            </Link>
            <GrokSheet />
            <AuthSlot />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm" className="gap-2">
                  <SlidersHorizontal className="size-3.5" />
                  Assumptions
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Model assumptions</SheetTitle>
                  <SheetDescription>
                    Every chart on this desk re-prices when you move a slider. Switching a name loads that 10-K.
                  </SheetDescription>
                </SheetHeader>
                <div className="px-6 pb-10">
                  <ModelControls />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="px-4 pb-3 sm:hidden">
          <TickerStrip />
        </div>
        <nav className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "shrink-0 rounded-full px-3 py-2 text-sm",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className={isTerm ? "flex min-h-0 flex-1 flex-col" : ""}>{children}</div>
      {isTerm ? null : (
        <footer className="border-t border-border/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-xs leading-relaxed text-muted-foreground md:flex-row md:items-center md:justify-between md:px-6">
            <p>
              Educational model, not investment advice. The DCF is a 10-K snapshot for the focused name, rebased to the
              live tape (CNBC, Nasdaq) and headlines (Google News). Past returns do not guarantee future results. Not
              affiliated with Apple, Microsoft, Alphabet, Amazon, or NVIDIA.
            </p>
            <Link to="/about" className="shrink-0 text-foreground hover:text-accent">
              About
            </Link>
          </div>
        </footer>
      )}
    </div>
  );
}
