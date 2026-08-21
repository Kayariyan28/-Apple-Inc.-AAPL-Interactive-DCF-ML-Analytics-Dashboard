import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { useCalibration } from "@/lib/dcf/use-cal";
import { moneyShare, pctPlain } from "@/lib/dcf/format";
import { useMarket, useTape, useTapePrice } from "@/lib/market/use-tape";
import { useModel } from "@/lib/store";
import { CATALOG, QUICK_COMMANDS, findCommand, suggestTokens } from "@/lib/term/catalog";
import { parseLine } from "@/lib/term/parse";
import { getScript, listScripts, saveScript, scriptNames } from "@/lib/term/scripts";
import { asciiBar } from "@/lib/term/ascii";
import { runScriptBody, runText } from "@/lib/term/run";
import type { DeskScript, ModelPatch, TermLine, TermTheme, VizSpec } from "@/lib/term/types";
import { VizPane } from "./VizPane";
import { cn } from "@/lib/utils";

const HEAVY = new Set(["mc", "paths", "jump"]);
const TAB_SEED: Record<string, string> = { dcf: "dcf", mc: "mc n=10000", live: "quote" };

type Tab = {
  id: string;
  title: string;
  log: TermLine[];
  viz: VizSpec | null;
  history: string[];
  seeded: boolean;
};

type Draft = { name: string; body: string };
type Watch = { cmd: string; seconds: number };
type Busy = { label: string; pct: number };

function applyPatch(patch: ModelPatch) {
  const s = useModel.getState();
  if (patch.scenario) s.applyScenario(patch.scenario);
  if (patch.growth) patch.growth.forEach((g, i) => s.setGrowth(i, g));
  if (patch.grossMargin != null) s.setGrossMargin(patch.grossMargin);
  if (patch.wacc != null) s.setWacc(patch.wacc);
  if (patch.tgr != null) s.setTgr(patch.tgr);
  if (patch.taxRate != null) s.setTaxRate(patch.taxRate);
  if (patch.nSims != null) s.setNSims(patch.nSims as 5000 | 10000 | 25000 | 50000);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function lastLoginStamp() {
  return new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function freshTabs(): Tab[] {
  return [
    { id: "main", title: "main", log: [], viz: null, history: [], seeded: false },
    { id: "dcf", title: "dcf", log: [], viz: null, history: [], seeded: false },
    { id: "mc", title: "mc", log: [], viz: null, history: [], seeded: false },
    { id: "live", title: "live", log: [], viz: null, history: [], seeded: false },
  ];
}

export function Desk() {
  const market = useMarket();
  const tape = useTapePrice();
  const cal = useCalibration();
  const refresh = useTape((s) => s.refresh);
  const growth = useModel((s) => s.growth);
  const grossMargin = useModel((s) => s.grossMargin);
  const wacc = useModel((s) => s.wacc);
  const tgr = useModel((s) => s.tgr);
  const taxRate = useModel((s) => s.taxRate);
  const nSims = useModel((s) => s.nSims);
  const scenario = useModel((s) => s.scenario);
  const ticker = useModel((s) => s.ticker);
  const setTicker = useModel((s) => s.setTicker);
  const setWacc = useModel((s) => s.setWacc);
  const setTgr = useModel((s) => s.setTgr);
  const applyScenario = useModel((s) => s.applyScenario);
  const ctx = useMemo(
    () => ({
      input: { growth, grossMargin, wacc, tgr, taxRate },
      tape,
      market,
      cal,
      nSims,
      scenario,
      ticker,
    }),
    [growth, grossMargin, wacc, tgr, taxRate, tape, market, cal, nSims, scenario, ticker],
  );
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const [tabs, setTabs] = useState<Tab[]>(freshTabs);
  const [activeId, setActiveId] = useState("main");
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [scripts, setScripts] = useState<DeskScript[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [booted, setBooted] = useState(false);
  const [minned, setMinned] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQ, setPaletteQ] = useState("");
  const [theme, setTheme] = useState<TermTheme>("apple");
  const [watch, setWatch] = useState<Watch | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [caret, setCaret] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [suggestOn, setSuggestOn] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const execRef = useRef<(raw: string, opts?: { echo?: boolean }) => Promise<void>>(async () => undefined);
  const tab = tabs.find((t) => t.id === activeId) ?? tabs[0]!;
  const log = tab.log;
  const viz = tab.viz;
  const history = tab.history;
  const suggestions = useMemo(() => {
    const last = value.split(/\s+/).pop() ?? "";
    if (!value.trim()) return suggestTokens("", scriptNames(), 8);
    return suggestTokens(last, scriptNames(), 8);
  }, [value]);

  useEffect(() => {
    setScripts(listScripts());
  }, []);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log, busy]);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const patchTab = useCallback((id: string, fn: (t: Tab) => Tab) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const exec = useCallback(
    async (raw: string, opts: { echo?: boolean } = {}) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      const echo = opts.echo !== false;
      const live = ctxRef.current;
      const tabId = activeId;
      if (echo) {
        patchTab(tabId, (t) => ({
          ...t,
          log: [...t.log, { kind: "in", text: trimmed }],
          history: t.history[t.history.length - 1] === trimmed ? t.history : [...t.history, trimmed],
        }));
        setHistIdx(null);
      }
      const parsed = parseLine(trimmed);
      if (parsed?.cmd === "refresh" || (parsed?.cmd === "run" && parsed.args[0] === "__refresh__")) {
        await refresh();
        const after = runText("quote; status", {
          ...ctxRef.current,
          tape: useTape.getState().market?.aapl.price ?? live.tape,
          market: useTape.getState().market ?? live.market,
        });
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...after.lines], viz: after.viz ?? t.viz }));
        return;
      }
      if (parsed && HEAVY.has(parsed.cmd)) {
        setBusy({ label: `running ${parsed.cmd}…`, pct: 0 });
        for (let i = 1; i <= 8; i++) {
          await sleep(45);
          setBusy({ label: `running ${parsed.cmd}…`, pct: i / 8 });
        }
        setBusy(null);
      }
      const res = runText(trimmed, ctxRef.current);
      if (res.clear) {
        patchTab(tabId, (t) => ({ ...t, log: [] }));
        return;
      }
      if (res.script?.type === "watch") {
        setWatch({ cmd: res.script.cmd, seconds: res.script.seconds });
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...res.lines] }));
        return;
      }
      if (res.script?.type === "unwatch") {
        setWatch(null);
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...res.lines] }));
        return;
      }
      if (res.script?.type === "theme") {
        setTheme(res.script.name);
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...res.lines] }));
        return;
      }
      if (res.script?.type === "run" && res.script.name && res.script.name !== "__refresh__") {
        const scriptName = res.script.name;
        const s = getScript(scriptName);
        if (!s) {
          patchTab(tabId, (t) => ({
            ...t,
            log: [...t.log, { kind: "err", text: `No script '${scriptName}'.` }],
          }));
          return;
        }
        const ran = runScriptBody(s.name, s.body, ctxRef.current);
        if (ran.patch) applyPatch(ran.patch);
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...ran.lines], viz: ran.viz ?? t.viz }));
        return;
      }
      if (res.script?.type === "new" && res.script.name) setDraft({ name: res.script.name, body: "" });
      if (res.script?.type === "edit" && res.script.name) {
        const s = getScript(res.script.name);
        if (s) setDraft({ name: s.name, body: s.body });
      }
      if (res.script?.type === "save") {
        const name = res.script.name || draft?.name;
        const body = res.script.body ?? draft?.body;
        if (name && body != null) {
          const saved = saveScript(name, body);
          setDraft({ name: saved.name, body: saved.body });
          setScripts(listScripts());
        }
      }
      if (res.script?.type === "ls" || res.script?.type === "rm") setScripts(listScripts());
      if (res.patch) applyPatch(res.patch);
      if (res.ticker) setTicker(res.ticker);
      if (res.lines.length > 12) {
        patchTab(tabId, (t) => ({ ...t, log: [...t.log, ...res.lines], viz: res.viz ?? t.viz }));
      } else {
        for (const line of res.lines) {
          patchTab(tabId, (t) => ({ ...t, log: [...t.log, line], viz: res.viz ?? t.viz }));
          await sleep(16);
        }
        if (res.viz) patchTab(tabId, (t) => ({ ...t, viz: res.viz }));
      }
    },
    [activeId, draft?.body, draft?.name, patchTab, refresh, setTicker],
  );
  execRef.current = exec;

  useEffect(() => {
    if (booted) return;
    setBooted(true);
    let cancelled = false;
    (async () => {
      const boot: TermLine[] = [
        { kind: "sys", text: `last login: ${lastLoginStamp()} on ttys000` },
        { kind: "sys", text: "Data Desk · five names · zsh 5.9" },
        { kind: "sys", text: "Type help · use MSFT · syntax awk · Tab completes · F1 catalog · ⌘K palette" },
      ];
      for (const line of boot) {
        if (cancelled) return;
        patchTab("main", (t) => ({ ...t, log: [...t.log, line], seeded: true }));
        await sleep(70);
      }
      await sleep(140);
      if (cancelled) return;
      await execRef.current("quote");
    })();
    return () => {
      cancelled = true;
    };
  }, [booted, patchTab]);

  useEffect(() => {
    if (!watch) return;
    const id = window.setInterval(() => {
      void execRef.current(watch.cmd, { echo: false });
    }, watch.seconds * 1000);
    return () => window.clearInterval(id);
  }, [watch]);

  const selectTab = useCallback(async (id: string) => {
    setActiveId(id);
    setHistIdx(null);
    setTabs((prev) => {
      const next = prev.find((t) => t.id === id);
      if (next && !next.seeded && TAB_SEED[id]) {
        window.setTimeout(() => {
          void execRef.current(TAB_SEED[id]!);
        }, 0);
        return prev.map((t) => (t.id === id ? { ...t, seeded: true } : t));
      }
      return prev;
    });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  function addTab() {
    const id = `t${Date.now().toString(36)}`;
    setTabs((prev) => [...prev, { id, title: `sh-${prev.length}`, log: [], viz: null, history: [], seeded: true }]);
    setActiveId(id);
  }

  function closeTab(id: string) {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(next[0]!.id);
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        void execRef.current("help");
      }
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        setPaletteQ("");
      }
      if (e.key === "l" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        patchTab(activeId, (t) => ({ ...t, log: [] }));
      }
      if (e.key === "c" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !value) {
        if (watch) {
          e.preventDefault();
          setWatch(null);
          patchTab(activeId, (t) => ({
            ...t,
            log: [...t.log, { kind: "sys", text: "^C watcher stopped." }],
          }));
        }
      }
      if (e.altKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        const t = tabs[idx];
        if (t) void selectTab(t.id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, patchTab, selectTab, tabs, value, watch]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (searching) {
      if (searchHit) {
        setSearching(false);
        setSearchQ("");
        setValue(searchHit);
      }
      return;
    }
    const v = value;
    setValue("");
    setSuggestOn(false);
    void exec(v);
  }

  const searchHit = searching
    ? [...history].reverse().find((h) => h.toLowerCase().includes(searchQ.toLowerCase())) ?? ""
    : "";

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setSearching(true);
      setSearchQ(value);
      return;
    }
    if (searching) {
      if (e.key === "Escape") {
        setSearching(false);
        setSearchQ("");
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setSearching(false);
        const hit = searchHit;
        setSearchQ("");
        setValue("");
        if (hit) void exec(hit);
      }
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (suggestOn && suggestions.length) {
        setSuggestIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (!history.length) return;
      const next = histIdx == null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setValue(history[next]!);
      setCaret(history[next]!.length);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (suggestOn && suggestions.length) {
        setSuggestIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (histIdx == null) return;
      const next = histIdx + 1;
      if (next >= history.length) {
        setHistIdx(null);
        setValue("");
        setCaret(0);
      } else {
        setHistIdx(next);
        setValue(history[next]!);
        setCaret(history[next]!.length);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const pick = suggestions[suggestIdx] ?? suggestions[0];
      if (!pick) return;
      const parts = value.split(/\s+/);
      if (parts.length <= 1) setValue(pick + " ");
      else {
        parts[parts.length - 1] = pick;
        setValue(parts.join(" ") + " ");
      }
      setSuggestOn(false);
    } else if (e.key === "Escape") {
      setDraft(null);
      setSuggestOn(false);
      setPaletteOpen(false);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      window.setTimeout(() => setCaret(inputRef.current?.selectionStart ?? value.length), 0);
    }
  }

  function saveDraft() {
    if (!draft) return;
    const saved = saveScript(draft.name, draft.body);
    setDraft({ name: saved.name, body: saved.body });
    setScripts(listScripts());
    patchTab(activeId, (t) => ({
      ...t,
      log: [...t.log, { kind: "sys", text: `Saved '${saved.name}' on this device.` }],
    }));
  }

  function runDraft() {
    if (!draft) return;
    void exec(`run ${draft.name}`);
  }

  const clock = now
    ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—:—:—";
  const live = !(market?.stale ?? true);
  const session = market?.aapl.session ?? "closed";

  const dock = (
    <Dock
      scripts={scripts}
      draftName={draft?.name ?? null}
      wacc={wacc}
      tgr={tgr}
      scenario={scenario}
      watching={watch}
      onCommand={(c) => void exec(c)}
      onRunScript={(name) => void exec(`run ${name}`)}
      onEditScript={(s) => setDraft({ name: s.name, body: s.body })}
      onNewScript={() => setDraft({ name: "untitled", body: "quote\ndcf\n" })}
      onWacc={setWacc}
      onTgr={setTgr}
      onScenario={applyScenario}
      onApplyCapm={() => void exec("apply-capm")}
      onRefresh={() => void exec("refresh")}
      onWatchToggle={() => {
        if (watch) void exec("unwatch");
        else void exec("watch quote 12");
      }}
    />
  );

  const termBody = (
    <LogPane
      log={log}
      busy={busy}
      value={value}
      caret={caret}
      searching={searching}
      searchQ={searchQ}
      searchHit={searchHit}
      suggestOn={suggestOn}
      suggestions={suggestions}
      suggestIdx={suggestIdx}
      inputRef={inputRef}
      logRef={logRef}
      onSubmit={onSubmit}
      onChange={(v) => {
        setValue(v);
        setSuggestOn(true);
        setSuggestIdx(0);
        setCaret(v.length);
        if (searching) setSearchQ(v);
      }}
      onKeyDown={onKeyDown}
      onCaret={() => setCaret(inputRef.current?.selectionStart ?? value.length)}
      onPickSuggest={(s) => {
        const parts = value.split(/\s+/);
        if (parts.length <= 1) setValue(s + " ");
        else {
          parts[parts.length - 1] = s;
          setValue(parts.join(" ") + " ");
        }
        setSuggestOn(false);
        inputRef.current?.focus();
      }}
      draft={draft}
      onDraft={setDraft}
      onSaveDraft={saveDraft}
      onRunDraft={runDraft}
      onCloseDraft={() => setDraft(null)}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background p-2 md:p-4">
      <div
        className="term-window relative flex min-h-0 flex-1 flex-col overflow-hidden"
        data-theme={theme}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="term-scan pointer-events-none absolute inset-0 z-20" />
        <header className="term-titlebar relative z-10 flex h-11 shrink-0 items-center px-3">
          <div className="flex items-center gap-2">
            <TrafficLights onClose="/" onMin={() => setMinned((v) => !v)} onMax={() => setDockOpen((v) => !v)} />
            <button
              type="button"
              className="ml-1 flex size-7 items-center justify-center rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
              onClick={(e) => {
                e.stopPropagation();
                setDockOpen((v) => !v);
              }}
              aria-label="Toggle commands"
            >
              ⌘
            </button>
          </div>
          <p className="pointer-events-none absolute inset-x-0 text-center text-[13px] font-medium tracking-tight text-foreground/80">
            {ticker} · Data Desk — zsh
          </p>
          <button
            type="button"
            className="relative z-10 ml-auto h-7 rounded-md px-2 font-mono text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setPaletteOpen(true);
              setPaletteQ("");
            }}
            aria-label="Command palette"
          >
            ⌘K
          </button>
        </header>
        <div className="relative z-10 flex h-9 shrink-0 items-end gap-1 border-b border-border px-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => void selectTab(t.id)}
              data-tab={t.id}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(t.id);
                }
              }}
              className={cn(
                "relative h-8 px-3 text-[13px] transition-colors duration-150",
                t.id === activeId ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.title}
              {t.id === activeId ? <span className="absolute inset-x-2 bottom-0 h-px bg-foreground" /> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={addTab}
            className="mb-1 size-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="New tab"
          >
            +
          </button>
        </div>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside
            className={cn(
              "shrink-0 overflow-y-auto lg:h-full lg:w-[11.75rem]",
              dockOpen ? "max-h-[42vh] border-b border-border lg:max-h-none lg:border-b-0" : "hidden lg:block",
            )}
          >
            {dock}
          </aside>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{termBody}</section>
          {minned ? null : (
            <aside className="min-h-0 max-h-[28vh] shrink-0 overflow-hidden border-t border-border lg:max-h-none lg:w-[32%] lg:border-l lg:border-t-0">
              <VizPane viz={viz} />
            </aside>
          )}
        </div>
        <footer className="relative z-10 flex h-8 shrink-0 items-center justify-between gap-3 border-t border-border px-3 text-[11px] tabular text-muted-foreground">
          <p>
            <span className="text-foreground">{pctPlain(wacc)}</span> WACC
            <span className="mx-2">·</span>
            <span className="text-foreground">{pctPlain(tgr)}</span> TGR
            <span className="mx-2">·</span>
            {watch ? (
              <span className="text-accent">
                WATCH {watch.cmd}/{watch.seconds}s
              </span>
            ) : (
              <span className={live ? "text-up" : "text-warn"}>
                {live ? "LIVE" : "STALE"} {session}
              </span>
            )}
          </p>
          <p>
            {clock}
            <span className="mx-2">·</span>
            <span className="text-foreground">{moneyShare(tape)}</span>
          </p>
        </footer>
        {paletteOpen ? (
          <Palette
            query={paletteQ}
            onQuery={setPaletteQ}
            onClose={() => setPaletteOpen(false)}
            onRun={(cmd) => {
              setPaletteOpen(false);
              setPaletteQ("");
              void exec(cmd);
            }}
            scripts={scripts}
          />
        ) : null}
      </div>
    </div>
  );
}

function TrafficLights({ onClose, onMin, onMax }: { onClose: "/"; onMin: () => void; onMax: () => void }) {
  return (
    <div className="term-lights flex items-center gap-[8px]">
      <Link to={onClose} className="term-light term-light-close" aria-label="Close terminal" onClick={(e) => e.stopPropagation()}>
        <span>×</span>
      </Link>
      <button
        type="button"
        className="term-light term-light-min"
        aria-label="Hide visualization"
        onClick={(e) => {
          e.stopPropagation();
          onMin();
        }}
      >
        <span>−</span>
      </button>
      <button
        type="button"
        className="term-light term-light-max"
        aria-label="Toggle sidebar"
        onClick={(e) => {
          e.stopPropagation();
          onMax();
        }}
      >
        <span>+</span>
      </button>
    </div>
  );
}

function Userhost() {
  const ticker = useModel((s) => s.ticker);
  return (
    <span className="select-none whitespace-nowrap">
      <span className="text-up">kayariyan</span>
      <span className="text-foreground">@{ticker.toLowerCase()}-desk</span>{" "}
      <span className="text-accent">~</span>
      <span className="text-foreground"> %</span>
    </span>
  );
}

function Dock({
  scripts,
  draftName,
  wacc,
  tgr,
  scenario,
  watching,
  onCommand,
  onRunScript,
  onEditScript,
  onNewScript,
  onWacc,
  onTgr,
  onScenario,
  onApplyCapm,
  onRefresh,
  onWatchToggle,
}: {
  scripts: DeskScript[];
  draftName: string | null;
  wacc: number;
  tgr: number;
  scenario: "management" | "street";
  watching: Watch | null;
  onCommand: (c: string) => void;
  onRunScript: (name: string) => void;
  onEditScript: (s: DeskScript) => void;
  onNewScript: () => void;
  onWacc: (v: number) => void;
  onTgr: (v: number) => void;
  onScenario: (s: "management" | "street") => void;
  onApplyCapm: () => void;
  onRefresh: () => void;
  onWatchToggle: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-r border-border px-3 py-3 text-[12px]">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Commands</p>
      <div className="flex flex-col">
        {QUICK_COMMANDS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCommand(c === "mc" ? "mc n=10000" : c)}
            className="rounded-md px-1.5 py-1 text-left text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            {c}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Scripts</p>
      <div className="flex flex-col">
        {scripts.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => onRunScript(s.name)}
            onContextMenu={(e) => {
              e.preventDefault();
              onEditScript(s);
            }}
            className={cn(
              "rounded-md px-1.5 py-1 text-left transition-colors duration-150",
              draftName === s.name ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            title="Click to run · right-click to edit"
          >
            {s.name}
          </button>
        ))}
        <button type="button" onClick={onNewScript} className="rounded-md px-1.5 py-1 text-left text-muted-foreground hover:text-foreground">
          + new
        </button>
      </div>
      <p className="mb-2 mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Controls</p>
      <label className="space-y-1 px-1.5 py-2">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>WACC</span>
          <span className="tabular text-foreground">{pctPlain(wacc)}</span>
        </div>
        <input
          type="range"
          min={6}
          max={14}
          step={0.1}
          value={Math.round(wacc * 1000) / 10}
          onChange={(e) => onWacc(Number(e.target.value) / 100)}
          className="term-range"
        />
      </label>
      <label className="space-y-1 px-1.5 py-2">
        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>TGR</span>
          <span className="tabular text-foreground">{pctPlain(tgr)}</span>
        </div>
        <input
          type="range"
          min={1}
          max={6}
          step={0.1}
          value={Math.round(tgr * 1000) / 10}
          onChange={(e) => onTgr(Number(e.target.value) / 100)}
          className="term-range"
        />
      </label>
      <div className="mt-1 flex gap-1 px-1.5">
        <button
          type="button"
          onClick={() => onScenario("management")}
          className={cn(
            "h-7 flex-1 rounded-md text-[10px] uppercase tracking-widest",
            scenario === "management" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Management
        </button>
        <button
          type="button"
          onClick={() => onScenario("street")}
          className={cn(
            "h-7 flex-1 rounded-md text-[10px] uppercase tracking-widest",
            scenario === "street" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Street
        </button>
      </div>
      <button type="button" onClick={onApplyCapm} className="mt-2 h-7 rounded-md px-1.5 text-left text-muted-foreground hover:text-foreground">
        Apply CAPM
      </button>
      <button type="button" onClick={onRefresh} className="h-7 rounded-md px-1.5 text-left text-muted-foreground hover:text-foreground">
        Refresh
      </button>
      <button
        type="button"
        onClick={onWatchToggle}
        className={cn("h-7 rounded-md px-1.5 text-left hover:text-foreground", watching ? "text-accent" : "text-muted-foreground")}
      >
        {watching ? `Watching ${watching.cmd}` : "Watch tape"}
      </button>
    </div>
  );
}

function LogPane({
  log,
  busy,
  value,
  caret,
  searching,
  searchQ,
  searchHit,
  suggestOn,
  suggestions,
  suggestIdx,
  inputRef,
  logRef,
  onSubmit,
  onChange,
  onKeyDown,
  onCaret,
  onPickSuggest,
  draft,
  onDraft,
  onSaveDraft,
  onRunDraft,
  onCloseDraft,
}: {
  log: TermLine[];
  busy: Busy | null;
  value: string;
  caret: number;
  searching: boolean;
  searchQ: string;
  searchHit: string;
  suggestOn: boolean;
  suggestions: string[];
  suggestIdx: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  logRef: React.RefObject<HTMLDivElement | null>;
  onSubmit: (e: FormEvent) => void;
  onChange: (v: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLInputElement>) => void;
  onCaret: () => void;
  onPickSuggest: (s: string) => void;
  draft: Draft | null;
  onDraft: (d: Draft) => void;
  onSaveDraft: () => void;
  onRunDraft: () => void;
  onCloseDraft: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 font-mono text-[12.5px] leading-relaxed md:px-5">
        {log.map((line, i) => (
          <p
            key={i}
            className={cn(
              "whitespace-pre-wrap",
              line.kind === "sys" && "text-muted-foreground",
              line.kind === "err" && "text-down",
              line.kind === "out" && "text-foreground",
            )}
          >
            {line.kind === "in" ? (
              <>
                <Userhost /> {line.text}
              </>
            ) : (
              line.text
            )}
          </p>
        ))}
        {busy ? (
          <p className="mt-2 text-muted-foreground">
            {busy.label}
            <br />
            {asciiBar(busy.pct)} {Math.round(busy.pct * 100)}%
          </p>
        ) : null}
      </div>
      {draft ? (
        <div className="shrink-0 border-t border-border bg-card/40 px-4 py-3 md:px-5" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="mr-auto text-[10px] uppercase tracking-[0.16em] text-muted-foreground">vi {draft.name}</p>
            <button type="button" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onSaveDraft}>
              :w
            </button>
            <button type="button" className="h-7 px-2 text-xs text-foreground" onClick={onRunDraft}>
              :source
            </button>
            <button type="button" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onCloseDraft}>
              :q
            </button>
          </div>
          <input
            value={draft.name}
            onChange={(e) => onDraft({ ...draft, name: e.target.value })}
            className="mb-2 h-8 w-full border-b border-border bg-transparent font-mono text-xs outline-none focus:border-accent"
            aria-label="Script name"
          />
          <textarea
            value={draft.body}
            onChange={(e) => onDraft({ ...draft, body: e.target.value })}
            rows={5}
            spellCheck={false}
            className="w-full resize-y bg-transparent font-mono text-xs leading-relaxed outline-none"
            placeholder={"quote\ndcf\nreverse\ncapm"}
          />
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="relative shrink-0 border-t border-border px-4 py-3 font-mono text-[12.5px] md:px-5">
        {searching ? (
          <p className="text-muted-foreground">
            (reverse-i-search)`{searchQ}': <span className="text-foreground">{searchHit}</span>
          </p>
        ) : (
          <div className="flex items-baseline gap-2">
            <Userhost />
            <span className="relative min-w-0 flex-1">
              <span className="whitespace-pre text-foreground">{value.slice(0, caret)}</span>
              <span className="term-caret" />
              <span className="whitespace-pre text-foreground">{value.slice(caret)}</span>
              <input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                onSelect={onCaret}
                onClick={onCaret}
                onFocus={() => onCaret()}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="absolute inset-0 cursor-text bg-transparent text-transparent caret-transparent outline-none"
                aria-label="Command"
                autoFocus
              />
            </span>
          </div>
        )}
        {suggestOn && value && suggestions.length ? (
          <ul className="absolute bottom-[calc(100%-2px)] left-4 right-4 z-10 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg md:left-5 md:right-5">
            {suggestions.map((s, i) => {
              const entry = findCommand(s);
              return (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onPickSuggest(s);
                    }}
                    className={cn(
                      "flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-xs",
                      i === suggestIdx ? "bg-secondary text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="font-mono">{s}</span>
                    <span className="truncate text-[11px]">{entry?.blurb ?? "script"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </form>
    </div>
  );
}

function Palette({
  query,
  onQuery,
  onClose,
  onRun,
  scripts,
}: {
  query: string;
  onQuery: (q: string) => void;
  onClose: () => void;
  onRun: (cmd: string) => void;
  scripts: DeskScript[];
}) {
  const q = query.toLowerCase();
  const cmds = CATALOG.filter(
    (c) => !q || c.name.includes(q) || c.blurb.toLowerCase().includes(q) || c.aliases.some((a) => a.includes(q)),
  );
  const sc = scripts.filter((s) => !q || s.name.toLowerCase().includes(q));
  const items = [
    ...cmds.slice(0, 10).map((c) => ({ id: c.name, label: c.name, detail: c.blurb, run: c.name })),
    ...sc.map((s) => ({
      id: `s-${s.name}`,
      label: `run ${s.name}`,
      detail: s.builtin ? "builtin script" : "user script",
      run: `run ${s.name}`,
    })),
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [query]);
  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/50 pt-[12%] backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="w-[min(36rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_80px_rgb(0_0_0/0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const hit = items[idx];
            if (hit) onRun(hit.run);
            else if (query.trim()) onRun(query.trim());
          }}
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(items.length - 1, i + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(0, i - 1));
              }
            }}
            placeholder="Run a command or script…"
            className="h-12 w-full border-b border-border bg-transparent px-4 font-mono text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>
        <ul className="max-h-72 overflow-y-auto py-1">
          {items.map((item, i) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onRun(item.run)}
                className={cn(
                  "flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm",
                  i === idx ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="font-mono">{item.label}</span>
                <span className="truncate text-xs">{item.detail}</span>
              </button>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="px-4 py-3 text-xs text-muted-foreground">No matches. Enter runs the query raw.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
