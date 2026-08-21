import { createServerFn } from "@tanstack/react-start";
import { parseTicker } from "@/lib/desk/universe";
import { fetchLiveMarket } from "./live.server";

export const getLiveMarket = createServerFn({ method: "GET" }).handler(async () => {
  return fetchLiveMarket("AAPL");
});

export const getNameTape = createServerFn({ method: "POST" })
  .validator((input: { ticker?: string }) => ({ ticker: parseTicker(input?.ticker) }))
  .handler(async ({ data }) => {
    return fetchLiveMarket(data.ticker);
  });

const briefCache = new Map<string, { at: number; text: string }>();

export const briefLiveTape = createServerFn({ method: "POST" })
  .validator((input: { facts: string }) => {
    if (!input || typeof input.facts !== "string" || input.facts.length > 4000) {
      throw new Error("Invalid snapshot");
    }
    return { facts: input.facts };
  })
  .handler(async ({ data }) => {
    const hit = briefCache.get(data.facts);
    if (hit && Date.now() - hit.at < 10 * 60_000) return { ok: true as const, text: hit.text };

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "AI briefing is not available here." };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 280,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are the editor of Data Desk, a live mega-cap valuation letter covering AAPL, MSFT, GOOGL, AMZN, and NVDA. Three short sentences, no bullets, no emoji, no advice. Compare the live tape to a textbook DCF. Mention WACC, the 10-year, or VIX only if present in the facts JSON.",
          },
          { role: "user", content: data.facts },
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Briefing failed (${res.status}).` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty briefing." };
    briefCache.set(data.facts, { at: Date.now(), text });
    return { ok: true as const, text };
  });
