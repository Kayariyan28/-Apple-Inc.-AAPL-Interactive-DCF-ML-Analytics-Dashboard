import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { SIM_OPTIONS } from "@/lib/dcf/constants";
import { TICKERS, type Ticker } from "@/lib/desk/universe";

type Scenario = "management" | "street";
type SimCount = (typeof SIM_OPTIONS)[number];

export type DeskSnapshot = {
  ticker: Ticker;
  scenario: Scenario;
  growth: number[];
  grossMargin: number;
  wacc: number;
  tgr: number;
  taxRate: number;
  nSims: SimCount;
  note: string;
};

function asNumber(v: unknown, fallback: number) {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function parseGrowth(raw: unknown): number[] | null {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length !== 5) return null;
  const nums = arr.map((n) => asNumber(n, NaN));
  if (nums.some((n) => !Number.isFinite(n) || n < -0.2 || n > 0.4)) return null;
  return nums;
}

export function normalizeDesk(input: unknown): DeskSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const ticker = String(o.ticker ?? "");
  if (!TICKERS.includes(ticker as Ticker)) return null;
  const scenario = o.scenario === "street" ? "street" : o.scenario === "management" ? "management" : null;
  if (!scenario) return null;
  const growth = parseGrowth(o.growth);
  if (!growth) return null;
  const nSims = asNumber(o.nSims ?? o.n_sims, 10_000) as SimCount;
  if (!SIM_OPTIONS.includes(nSims)) return null;
  const note = typeof o.note === "string" ? o.note.slice(0, 2000) : "";
  const grossMargin = asNumber(o.grossMargin ?? o.gross_margin, 0.47);
  const wacc = asNumber(o.wacc, 0.09);
  const tgr = asNumber(o.tgr, 0.035);
  const taxRate = asNumber(o.taxRate ?? o.tax_rate, 0.16);
  if (grossMargin < 0.2 || grossMargin > 0.8) return null;
  if (wacc < 0.04 || wacc > 0.2) return null;
  if (tgr < 0 || tgr > 0.08) return null;
  if (taxRate < 0.05 || taxRate > 0.4) return null;
  return {
    ticker: ticker as Ticker,
    scenario,
    growth,
    grossMargin,
    wacc,
    tgr,
    taxRate,
    nSims,
    note,
  };
}

export const loadDesk = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{
      ticker: string;
      scenario: string;
      growth: string;
      gross_margin: number;
      wacc: number;
      tgr: number;
      tax_rate: number;
      n_sims: number;
      note: string;
    }>`
      select ticker, scenario, growth, gross_margin, wacc, tgr, tax_rate, n_sims, note
      from desk_settings
      where user_id = ${context.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return normalizeDesk(row);
  });

export const saveDesk = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const row = normalizeDesk(input);
    if (!row) throw new Error("Invalid desk");
    return row;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const growth = JSON.stringify(data.growth);
    await sql`
      insert into desk_settings (
        user_id, ticker, scenario, growth, gross_margin, wacc, tgr, tax_rate, n_sims, note, updated_at
      )
      values (
        ${context.userId}, ${data.ticker}, ${data.scenario}, ${growth},
        ${data.grossMargin}, ${data.wacc}, ${data.tgr}, ${data.taxRate}, ${data.nSims}, ${data.note}, now()
      )
      on conflict (user_id) do update set
        ticker = excluded.ticker,
        scenario = excluded.scenario,
        growth = excluded.growth,
        gross_margin = excluded.gross_margin,
        wacc = excluded.wacc,
        tgr = excluded.tgr,
        tax_rate = excluded.tax_rate,
        n_sims = excluded.n_sims,
        note = excluded.note,
        updated_at = now()
    `;
    return { ok: true as const };
  });
