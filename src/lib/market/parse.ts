/** Parse "$311.30", "4.694%", "31,000,843", "4.543T", "UNCH". */
export function parseNumber(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s === "UNCH" || s === "N/A" || s === "NA" || s === "--") return null;
  const m = s.replace(/[$,%\s]/g, "").toUpperCase().match(/^([+-]?)(\d+(?:\.\d+)?)(T|B|M|K)?$/);
  if (!m) {
    const n = Number(s.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(m[1] + m[2]);
  if (!Number.isFinite(n)) return null;
  const mul = m[3] === "T" ? 1e12 : m[3] === "B" ? 1e9 : m[3] === "M" ? 1e6 : m[3] === "K" ? 1e3 : 1;
  return n * mul;
}

/** "-1.75%" → -0.0175 */
export function parseRatio(raw: unknown): number | null {
  const n = parseNumber(raw);
  if (n == null) return null;
  if (typeof raw === "string" && raw.includes("%")) return n / 100;
  return n;
}

export function rec(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function asList(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

export function str(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return fallback;
}

export function mapSession(raw: string | undefined | null): "open" | "pre" | "post" | "closed" {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("pre")) return "pre";
  if (s.includes("after") || s.includes("post")) return "post";
  if (s.includes("open") || s === "reg_mkt") return "open";
  return "closed";
}
