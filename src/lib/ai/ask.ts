import { createServerFn } from "@tanstack/react-start";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const askDesk = createServerFn({ method: "POST" })
  .validator((input: { messages: ChatTurn[]; facts: string }) => {
    if (!input || !Array.isArray(input.messages) || typeof input.facts !== "string") {
      throw new Error("Invalid chat");
    }
    if (input.facts.length > 6000) throw new Error("Snapshot too large");
    const messages = input.messages.slice(-8).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content ?? "").slice(0, 2000),
    }));
    if (!messages.length || !messages[messages.length - 1]?.content.trim()) {
      throw new Error("Empty question");
    }
    return { messages, facts: input.facts };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Grok is not available in this environment." };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 500,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content:
              "You are Grok on Data Desk, a live mega-cap valuation desk covering AAPL, MSFT, GOOGL, AMZN, and NVDA. Use only the facts JSON and the conversation. Be concrete: cite tape vs DCF, WACC, 10-K years, mix, peers. No emoji. No investment advice. Short paragraphs. If a figure is missing, say so.",
          },
          { role: "system", content: `Desk snapshot:\n${data.facts}` },
          ...data.messages,
        ],
      }),
    });
    if (!res.ok) return { ok: false as const, error: `Grok returned ${res.status}. Try again in a moment.` };
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "Empty reply." };
    return { ok: true as const, text };
  });
