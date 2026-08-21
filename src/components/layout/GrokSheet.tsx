import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MessageSquare } from "lucide-react";
import { askDesk } from "@/lib/ai/ask";
import { snapshotFacts } from "@/lib/market/analyze";
import { useMarket } from "@/lib/market/use-tape";
import { useFocusedName, useLiveBooks, useLiveDcf, useModelInput } from "@/lib/store";
import { useVoice } from "@/lib/desk/voice";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

export function GrokSheet() {
  const market = useMarket();
  const input = useModelInput();
  const dcf = useLiveDcf();
  const books = useLiveBooks();
  const name = useFocusedName();
  const voice = useVoice();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const facts = useMemo(() => {
    if (!market) return "";
    return snapshotFacts(market, input, dcf.price, books);
  }, [market, input, dcf.price, books]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Turn[] = [...turns, { role: "user", content: q }];
    setTurns(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await askDesk({ data: { messages: next, facts } });
      if (res.ok) setTurns([...next, { role: "assistant", content: res.text }]);
      else setError(res.error);
    } catch {
      setError("Grok could not reply.");
    } finally {
      setBusy(false);
      requestAnimationFrame(() => {
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
      });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(draft);
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(draft);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <MessageSquare className="size-3.5" />
          Ask Grok
        </Button>
      </SheetTrigger>
      <SheetContent className="flex h-full flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>Ask Grok</SheetTitle>
          <SheetDescription>
            Live tape, 10-Ks, and the DCF for {name.symbol} — and the other four names on this desk.
          </SheetDescription>
        </SheetHeader>
        <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-2">
          {turns.length === 0 ? (
            <div className="flex flex-col gap-2 pt-2">
              {voice.grok.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-xl bg-secondary px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-secondary/80"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            turns.map((t, i) => (
              <div
                key={`${t.role}-${i}`}
                className={cn(
                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  t.role === "user"
                    ? "ml-auto bg-foreground text-background"
                    : "bg-secondary text-foreground",
                )}
              >
                {t.content}
              </div>
            ))
          )}
          {busy ? <p className="text-xs uppercase tracking-widest text-muted-foreground">Thinking…</p> : null}
          {error ? <p className="text-sm text-down">{error}</p> : null}
        </div>
        <form onSubmit={onSubmit} className="border-t border-border p-4">
          <label className="sr-only" htmlFor="grok-q">
            Question
          </label>
          <textarea
            id="grok-q"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Ask about ${name.symbol}, the tape, or the model`}
            className="w-full resize-none rounded-xl bg-secondary px-3 py-3 text-sm text-foreground outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for a line</p>
            <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
              Send
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
