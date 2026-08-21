import { createContext, useContext, useEffect, type ReactNode } from "react";
import { create } from "zustand";
import { CURRENT_PRICE } from "@/lib/dcf/constants";
import { parseTicker, type Ticker } from "@/lib/desk/universe";
import { getNameTape } from "./functions";
import type { LiveMarket } from "./types";

type TapeState = {
  market: LiveMarket | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
  hydrate: (market: LiveMarket | null) => void;
  refresh: (symbol?: string) => Promise<void>;
};

export const useTape = create<TapeState>((set, get) => ({
  market: null,
  status: "idle",
  error: null,
  hydrate: (market) => {
    if (!market) return;
    set({ market, status: "ready", error: null });
  },
  refresh: async (symbol) => {
    const ticker = parseTicker(symbol ?? get().market?.ticker ?? "AAPL");
    const current = get().status;
    if (current === "idle") set({ status: "loading" });
    try {
      const market = await getNameTape({ data: { ticker } });
      const prev = get().market;
      const isSnapshot = market.stale && prev && prev.ticker === ticker && Math.abs(market.aapl.price - prev.aapl.price) < 0.02;
      if (prev && !prev.stale && prev.ticker === ticker && (market.stale || isSnapshot)) {
        set({ status: "ready", error: null });
        return;
      }
      set({ market, status: "ready", error: null });
    } catch (err) {
      set({
        status: get().market ? "ready" : "error",
        error: err instanceof Error ? err.message : "Tape unavailable",
      });
    }
  },
}));

const TapeContext = createContext<LiveMarket | null>(null);

export function TapeProvider({
  initial,
  children,
}: {
  initial: LiveMarket | null;
  children: ReactNode;
}) {
  return <TapeContext.Provider value={initial}>{children}</TapeContext.Provider>;
}

export function useMarket(): LiveMarket | null {
  const seeded = useContext(TapeContext);
  const live = useTape((s) => s.market);
  return live ?? seeded;
}

export function useTapePrice() {
  return useMarket()?.aapl.price ?? CURRENT_PRICE;
}

export function TapePoller({ ticker }: { ticker: Ticker }) {
  const refresh = useTape((s) => s.refresh);
  const hydrate = useTape((s) => s.hydrate);
  const seeded = useContext(TapeContext);
  const session = useMarket()?.aapl.session;

  useEffect(() => {
    if (seeded && ticker === (seeded.ticker ?? "AAPL")) hydrate(seeded);
    void refresh(ticker);
    const ms = session === "open" || session === "pre" || session === "post" ? 15_000 : 45_000;
    const id = window.setInterval(() => void refresh(ticker), ms);
    const onFocus = () => void refresh(ticker);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [hydrate, refresh, seeded, session, ticker]);

  return null;
}
