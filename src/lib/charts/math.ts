import { r } from "@/lib/utils";

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function nearestIndex(u: number, n: number) {
  if (n <= 1) return 0;
  return clamp(Math.round(u * (n - 1)), 0, n - 1);
}

export function indexFromClientX(
  clientX: number,
  rect: DOMRect,
  n: number,
  padL: number,
  padR: number,
  viewW: number,
) {
  const svgX = ((clientX - rect.left) / Math.max(1, rect.width)) * viewW;
  const inner = Math.max(1, viewW - padL - padR);
  return nearestIndex((svgX - padL) / inner, n);
}

export function xAt(i: number, n: number, padL: number, padR: number, viewW: number) {
  return r(padL + (i / Math.max(1, n - 1)) * (viewW - padL - padR));
}

export function yAt(
  v: number,
  min: number,
  max: number,
  padT: number,
  padB: number,
  viewH: number,
  log = false,
) {
  let u: number;
  if (log && min > 0 && max > 0 && v > 0) {
    const a = Math.log(min);
    const b = Math.log(max);
    u = (Math.log(v) - a) / (b - a || 1);
  } else {
    u = (v - min) / (max - min || 1);
  }
  return r(padT + (1 - u) * (viewH - padT - padB));
}

export function linePath(xs: number[], ys: number[]) {
  return xs.map((x, i) => `${i === 0 ? "M" : "L"}${r(x)},${r(ys[i]!)}`).join(" ");
}

/** Catmull-Rom → cubic Bézier. S-curves and cash paths. */
export function curvePath(xs: number[], ys: number[]) {
  if (xs.length < 2) return linePath(xs, ys);
  if (xs.length === 2) return linePath(xs, ys);
  let d = `M${r(xs[0]!)},${r(ys[0]!)}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i - 1] ?? xs[i]!;
    const y0 = ys[i - 1] ?? ys[i]!;
    const x1 = xs[i]!;
    const y1 = ys[i]!;
    const x2 = xs[i + 1]!;
    const y2 = ys[i + 1]!;
    const x3 = xs[i + 2] ?? x2;
    const y3 = ys[i + 2] ?? y2;
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${r(x2)},${r(y2)}`;
  }
  return d;
}

export function areaPath(xs: number[], ys: number[], yBase: number) {
  if (!xs.length) return "";
  return `${linePath(xs, ys)} L${r(xs[xs.length - 1]!)},${r(yBase)} L${r(xs[0]!)},${r(yBase)} Z`;
}

export function bandPath(xs: number[], hi: number[], lo: number[]) {
  if (!xs.length) return "";
  const top = xs.map((x, i) => `${i === 0 ? "M" : "L"}${r(x)},${r(hi[i]!)}`);
  const bot = xs.map((x, i) => `${r(x)},${r(lo[i]!)}`).reverse();
  return `${top.join(" ")} ${bot.map((p) => `L${p}`).join(" ")} Z`;
}

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

export function bollinger(values: number[], period = 20, k = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    const m = mid[i];
    if (m == null) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    let ss = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const d = values[j]! - m;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / period);
    upper.push(m + k * sd);
    lower.push(m - k * sd);
  }
  return { mid, upper, lower };
}

export function windowAnalytics(closes: number[], weeks: number) {
  const start = closes[0] ?? 0;
  const end = closes[closes.length - 1] ?? 0;
  const years = Math.max(1 / 52, weeks / 52);
  const total = start ? end / start - 1 : 0;
  const cagr = start > 0 && end > 0 ? Math.pow(end / start, 1 / years) - 1 : 0;
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1]! > 0) rets.push(Math.log(closes[i]! / closes[i - 1]!));
  }
  const m = rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : 0;
  const varr = rets.length ? rets.reduce((a, b) => a + (b - m) ** 2, 0) / rets.length : 0;
  const vol = Math.sqrt(varr) * Math.sqrt(52);
  let peak = start;
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) maxDd = Math.min(maxDd, c / peak - 1);
  }
  const sharpe = vol > 0 ? cagr / vol : 0;
  return { total, cagr, vol, maxDd, sharpe };
}

function niceNum(range: number) {
  const safe = Math.max(Math.abs(range), 1e-9);
  const exp = Math.floor(Math.log10(safe));
  const f = safe / 10 ** exp;
  const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return nf * 10 ** exp;
}

export function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const step = niceNum(span / Math.max(1, count - 1));
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    ticks.push(Number(v.toPrecision(8)));
  }
  if (!ticks.length) ticks.push(min, max);
  return ticks;
}

export function fibLevels(lo: number, hi: number) {
  const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;
  return ratios.map((ratio) => ({
    ratio,
    price: hi - (hi - lo) * ratio,
  }));
}

export function definedLine(xs: number[], values: (number | null)[], y: (v: number) => number) {
  const segs: string[] = [];
  let drawing = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) {
      drawing = false;
      continue;
    }
    segs.push(`${drawing ? "L" : "M"}${xs[i]},${y(v)}`);
    drawing = true;
  }
  return segs.join(" ");
}
