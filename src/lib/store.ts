import { useMemo } from "react";
import { create } from "zustand";
import { SIM_OPTIONS } from "./dcf/constants";
import { runDcf, type ModelInputs } from "./dcf/engine";
import { booksForYear, LAST_YEAR_INDEX } from "./dcf/books";
import { TICKERS, UNIVERSE, streetOf, type Ticker } from "./desk/universe";
import { useMarket, useTape, useTapePrice } from "./market/use-tape";

export type Scenario = "management" | "street";
export type SimCount = (typeof SIM_OPTIONS)[number];

type ModelState = ModelInputs & {
  ticker: Ticker;
  scenario: Scenario;
  nSims: SimCount;
  note: string;
  setTicker: (ticker: Ticker) => void;
  applyScenario: (s: Scenario) => void;
  setGrowth: (index: number, value: number) => void;
  setGrossMargin: (v: number) => void;
  setWacc: (v: number) => void;
  setTgr: (v: number) => void;
  setTaxRate: (v: number) => void;
  setNSims: (v: SimCount) => void;
  setNote: (note: string) => void;
  hydrate: (row: {
    ticker: Ticker;
    scenario: Scenario;
    growth: number[];
    grossMargin: number;
    wacc: number;
    tgr: number;
    taxRate: number;
    nSims: SimCount;
    note: string;
  }) => void;
};

function promoteTape(ticker: Ticker) {
  const market = useTape.getState().market;
  if (!market) return;
  const names = [market.aapl, ...market.peers];
  const focus = names.find((q) => q.symbol === ticker);
  if (!focus) return;
  useTape.setState({
    market: {
      ...market,
      ticker,
      aapl: focus,
      peers: names.filter((q) => q.symbol !== ticker),
      daily: market.ticker === ticker ? market.daily : [],
      intraday: market.ticker === ticker ? market.intraday : [],
      news: market.ticker === ticker ? market.news : [],
    },
  });
}

export const useModel = create<ModelState>((set, get) => ({
  ticker: "AAPL",
  scenario: "management",
  growth: [...UNIVERSE.AAPL.defaults.growth],
  grossMargin: UNIVERSE.AAPL.defaults.grossMargin,
  wacc: UNIVERSE.AAPL.defaults.wacc,
  tgr: UNIVERSE.AAPL.defaults.tgr,
  taxRate: UNIVERSE.AAPL.defaults.taxRate,
  nSims: 10_000,
  note: "",
  setTicker: (ticker) => {
    if (!TICKERS.includes(ticker)) return;
    const src = UNIVERSE[ticker].defaults;
    promoteTape(ticker);
    set({
      ticker,
      scenario: "management",
      growth: [...src.growth],
      grossMargin: src.grossMargin,
      wacc: src.wacc,
      tgr: src.tgr,
      taxRate: src.taxRate,
    });
  },
  applyScenario: (scenario) => {
    const src = scenario === "management" ? UNIVERSE[get().ticker].defaults : streetOf(get().ticker);
    set({
      scenario,
      growth: [...src.growth],
      grossMargin: src.grossMargin,
      wacc: src.wacc,
      tgr: src.tgr,
      taxRate: src.taxRate,
    });
  },
  setGrowth: (index, value) =>
    set((s) => {
      const growth = [...s.growth];
      growth[index] = value;
      return { growth };
    }),
  setGrossMargin: (grossMargin) => set({ grossMargin }),
  setWacc: (wacc) => set({ wacc }),
  setTgr: (tgr) => set({ tgr }),
  setTaxRate: (taxRate) => set({ taxRate }),
  setNSims: (nSims) => set({ nSims }),
  setNote: (note) => set({ note: note.slice(0, 2000) }),
  hydrate: (row) => {
    if (!TICKERS.includes(row.ticker)) return;
    promoteTape(row.ticker);
    set({
      ticker: row.ticker,
      scenario: row.scenario,
      growth: [...row.growth],
      grossMargin: row.grossMargin,
      wacc: row.wacc,
      tgr: row.tgr,
      taxRate: row.taxRate,
      nSims: row.nSims,
      note: row.note.slice(0, 2000),
    });
  },
}));

export function useFocusedName() {
  const ticker = useModel((s) => s.ticker);
  return UNIVERSE[ticker];
}

export function useLiveBooks() {
  const ticker = useModel((s) => s.ticker);
  const market = useMarket();
  return useMemo(() => booksForYear(LAST_YEAR_INDEX, market, ticker), [ticker, market]);
}

export function useModelInput(): ModelInputs {
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  return useMemo(
    () => ({ growth, grossMargin, wacc, tgr, taxRate }),
    [growth, grossMargin, wacc, tgr, taxRate],
  );
}

export function useLiveDcf() {
  const input = useModelInput();
  const tape = useTapePrice();
  const books = useLiveBooks();
  return useMemo(() => runDcf(input, tape, books), [input, tape, books]);
}

export function useStreetDcf() {
  const ticker = useModel((s) => s.ticker);
  const tape = useTapePrice();
  const books = useLiveBooks();
  return useMemo(() => runDcf(streetOf(ticker), tape, books), [ticker, tape, books]);
}

export { SIM_OPTIONS };
