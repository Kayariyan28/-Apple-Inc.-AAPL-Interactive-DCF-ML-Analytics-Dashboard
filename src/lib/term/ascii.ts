/** Braille / block glyphs for in-terminal sparklines and area charts. */

const BLOCKS = " ▁▂▃▄▅▆▇█";

function finite(values: number[]): number[] {
  return values.filter((v) => Number.isFinite(v));
}

function sample(values: number[], width: number): number[] {
  const src = finite(values);
  if (!src.length) return [];
  if (src.length <= width) return src;
  const out: number[] = [];
  const step = (src.length - 1) / (width - 1);
  for (let i = 0; i < width; i++) {
    const a = i * step;
    const lo = Math.floor(a);
    const hi = Math.min(src.length - 1, lo + 1);
    const t = a - lo;
    out.push(src[lo]! * (1 - t) + src[hi]! * t);
  }
  return out;
}

export function sparkline(values: number[], width = 48): string {
  const sampled = sample(values, width);
  if (!sampled.length) return "";
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const span = max - min || 1;
  return sampled
    .map((v) => BLOCKS[Math.round(((v - min) / span) * (BLOCKS.length - 1))]!)
    .join("");
}

export function asciiArea(values: number[], cols = 44, rows = 5): string[] {
  const sampled = sample(values, cols);
  if (!sampled.length) return [];
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const span = max - min || 1;
  const heights = sampled.map((v) => ((v - min) / span) * rows);
  const lines: string[] = [];
  for (let r = rows; r >= 1; r--) {
    let row = "";
    for (const h of heights) {
      if (h >= r) row += "█";
      else if (h >= r - 0.5) row += "▄";
      else row += " ";
    }
    lines.push(row.replace(/\s+$/, ""));
  }
  return lines.filter((l) => l.length > 0);
}

export function asciiBar(frac: number, width = 22): string {
  const f = Math.max(0, Math.min(1, frac));
  const filled = Math.round(f * width);
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}

export function asciiHist(shares: number[], width = 42, height = 6): string[] {
  if (!shares.length) return [];
  const sampled = sample(shares, width);
  const max = Math.max(...sampled, 1e-9);
  const heights = sampled.map((s) => (s / max) * height);
  const lines: string[] = [];
  for (let r = height; r >= 1; r--) {
    let row = "";
    for (const h of heights) {
      if (h >= r) row += "█";
      else if (h >= r - 0.5) row += "▄";
      else row += " ";
    }
    lines.push(row.replace(/\s+$/, ""));
  }
  return lines.filter((l) => l.length > 0);
}

export function padRow(left: string, right: string, width = 52): string {
  const gap = Math.max(1, width - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`;
}
