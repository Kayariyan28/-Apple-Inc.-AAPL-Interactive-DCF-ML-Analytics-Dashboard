import type { TapeBar } from "@/lib/market/types";

export type Candle = {
  t: number;
  label: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number | null;
  /** True when high/low come from the feed, not successive closes. */
  ohlc: boolean;
};

export function withLivePrint(bars: TapeBar[], tape: number, asOf: number): TapeBar[] {
  if (!bars.length || !Number.isFinite(tape) || tape <= 0) return bars;
  const last = bars[bars.length - 1]!;
  if (Math.abs(last.close - tape) < 0.005) return bars;
  if (asOf && last.t && asOf + 60_000 < last.t) return bars;
  return [...bars, { t: asOf || Date.now(), close: tape, label: "Live" }];
}

export function sliceBars(bars: TapeBar[], days: number): TapeBar[] {
  if (bars.length <= 3) return bars;
  const lastT = bars[bars.length - 1]!.t;
  if (!lastT) return bars.slice(-Math.max(8, days));
  const cut = lastT - days * 86_400_000;
  const sliced = bars.filter((b) => b.t >= cut);
  return sliced.length > 3 ? sliced : bars;
}

function candleFromPair(prev: TapeBar, cur: TapeBar): Candle {
  const open = cur.open ?? prev.close;
  const close = cur.close;
  const high = cur.high ?? Math.max(open, close);
  const low = cur.low ?? Math.min(open, close);
  const ohlc = cur.open != null && cur.high != null && cur.low != null;
  return {
    t: cur.t,
    label: cur.label,
    open,
    close,
    high: Math.max(high, open, close),
    low: Math.min(low, open, close),
    volume: cur.volume ?? null,
    ohlc,
  };
}

export function candlesFromCloses(bars: TapeBar[]): Candle[] {
  const out: Candle[] = [];
  for (let i = 1; i < bars.length; i++) {
    out.push(candleFromPair(bars[i - 1]!, bars[i]!));
  }
  if (!out.length && bars.length === 1) {
    const b = bars[0]!;
    const open = b.open ?? b.close;
    out.push({
      t: b.t,
      label: b.label,
      open,
      close: b.close,
      high: b.high ?? Math.max(open, b.close),
      low: b.low ?? Math.min(open, b.close),
      volume: b.volume ?? null,
      ohlc: b.open != null,
    });
  }
  return out;
}

/** Bucket a dense tape (intraday) into ~target candles. High/low are max/min of prints in the window. */
export function bucketCandles(bars: TapeBar[], target = 56): Candle[] {
  if (bars.length < 4) return candlesFromCloses(bars);
  if (bars.length <= target + 1) return candlesFromCloses(bars);
  const span = Math.max(1, bars[bars.length - 1]!.t - bars[0]!.t);
  const bucketMs = Math.max(60_000, Math.round(span / target));
  const out: Candle[] = [];
  let i = 0;
  while (i < bars.length) {
    const seed = bars[i]!;
    const endT = seed.t + bucketMs;
    const open = i > 0 ? bars[i - 1]!.close : (seed.open ?? seed.close);
    let high = Math.max(open, seed.high ?? seed.close);
    let low = Math.min(open, seed.low ?? seed.close);
    let vol = seed.volume ?? 0;
    let hasVol = seed.volume != null;
    let j = i + 1;
    while (j < bars.length && bars[j]!.t < endT) {
      const row = bars[j]!;
      high = Math.max(high, row.high ?? row.close);
      low = Math.min(low, row.low ?? row.close);
      if (row.volume != null) {
        vol += row.volume;
        hasVol = true;
      }
      j += 1;
    }
    const last = bars[j - 1] ?? seed;
    out.push({
      t: last.t,
      label: last.label,
      open,
      close: last.close,
      high: Math.max(high, last.close),
      low: Math.min(low, last.close),
      volume: hasVol ? vol : null,
      ohlc: true,
    });
    i = Math.max(j, i + 1);
  }
  return out;
}
