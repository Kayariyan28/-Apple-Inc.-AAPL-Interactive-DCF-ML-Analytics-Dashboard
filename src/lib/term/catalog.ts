import type { CmdGroup } from "./types";

export const CHIPS = [
  { id: "all", label: "ALL" },
  { id: "tape", label: "TAPE" },
  { id: "dcf", label: "DCF" },
  { id: "sim", label: "SIM" },
  { id: "risk", label: "RISK" },
  { id: "scripts", label: "SCRIPTS" },
] as const;

export type ChipId = (typeof CHIPS)[number]["id"];

export type CatalogEntry = {
  name: string;
  aliases: string[];
  group: CmdGroup;
  usage: string;
  blurb: string;
};

export const QUICK_COMMANDS = [
  "quote",
  "dcf",
  "mc",
  "reverse",
  "capm",
  "risk",
  "paths",
  "forecast",
  "use MSFT",
  "syntax",
  "help",
] as const;

export const CATALOG: CatalogEntry[] = [
  { name: "help", aliases: ["?", "h"], group: "tape", usage: "help [cmd]", blurb: "Catalog, or detail one command." },
  { name: "quote", aliases: ["tape", "px"], group: "tape", usage: "quote", blurb: "Live print, peers, session." },
  { name: "news", aliases: ["headlines"], group: "tape", usage: "news", blurb: "Latest Google News headlines." },
  { name: "peers", aliases: ["comp"], group: "tape", usage: "peers", blurb: "Mega-cap peer tape vs the focused name." },
  { name: "intraday", aliases: ["bars", "session"], group: "tape", usage: "intraday", blurb: "Session tape bars, sparkline." },
  { name: "brief", aliases: ["story", "narrative"], group: "tape", usage: "brief", blurb: "Data-journalism read of the live tape." },
  { name: "hist", aliases: ["history"], group: "tape", usage: "hist", blurb: "FY2018–FY2025 10-K prints." },
  { name: "status", aliases: ["whoami", "info"], group: "tape", usage: "status", blurb: "Tape, model, calibration snapshot." },
  { name: "refresh", aliases: [], group: "tape", usage: "refresh", blurb: "Pull the open feed again." },
  { name: "use", aliases: ["focus", "ticker"], group: "tape", usage: "use MSFT", blurb: "Focus a name. moon → AMZN. Rebases tape, 10-K, DCF." },
  { name: "watch", aliases: [], group: "tape", usage: "watch [cmd] [sec]", blurb: "Rerun a command on an interval." },
  { name: "unwatch", aliases: ["unwatch"], group: "tape", usage: "unwatch", blurb: "Stop the live watcher." },
  { name: "dcf", aliases: ["fair"], group: "dcf", usage: "dcf", blurb: "Run the Gordon-growth DCF vs the tape." },
  { name: "reverse", aliases: ["rdcf", "implied"], group: "dcf", usage: "reverse", blurb: "WACC / TGR / growth implied by the tape." },
  { name: "capm", aliases: [], group: "dcf", usage: "capm", blurb: "Live CAPM WACC from 10-year + beta." },
  { name: "applycapm", aliases: ["apply-capm"], group: "dcf", usage: "apply-capm", blurb: "Write the live CAPM WACC into the model." },
  { name: "set", aliases: [], group: "dcf", usage: "set wacc=9 tgr=3 gm=47.5", blurb: "Patch model knobs. Percents or decimals." },
  { name: "whatif", aliases: ["if"], group: "dcf", usage: "whatif wacc=8 tgr=4", blurb: "Patch knobs and immediately reprice." },
  { name: "compare", aliases: ["vs"], group: "dcf", usage: "compare", blurb: "Management case vs street case vs tape." },
  { name: "scenario", aliases: ["sc", "case"], group: "dcf", usage: "scenario management|street", blurb: "Load the management or street case." },
  { name: "sens", aliases: ["heat", "grid"], group: "dcf", usage: "sens", blurb: "WACC × terminal-growth price grid." },
  { name: "forecast", aliases: ["ml", "ens"], group: "dcf", usage: "forecast", blurb: "OLS ensemble rebased to the live tape." },
  { name: "reset", aliases: ["defaults"], group: "dcf", usage: "reset", blurb: "Restore the management case." },
  { name: "mc", aliases: ["sim", "monte"], group: "sim", usage: "mc n=10000 seed=42", blurb: "Monte Carlo DCF. Real shocks, real prices." },
  { name: "paths", aliases: ["gbm"], group: "sim", usage: "paths n=6000", blurb: "GBM from live S0, μ annual, σ blended." },
  { name: "jump", aliases: ["merton", "jd"], group: "sim", usage: "jump n=4000 lambda=0.3", blurb: "Merton jump-diffusion on the same calibration." },
  { name: "risk", aliases: ["var", "cvar"], group: "risk", usage: "risk", blurb: "Historical + parametric VaR and CVaR." },
  { name: "cal", aliases: ["calib"], group: "risk", usage: "cal", blurb: "Show μ, σ, S0, realized vol, source." },
  { name: "measure", aliases: ["tech", "sma", "bb"], group: "risk", usage: "measure", blurb: "SMA, Bollinger, Fib, realized vol on the tape." },
  { name: "ls", aliases: ["list"], group: "scripts", usage: "ls", blurb: "List saved scripts." },
  { name: "cat", aliases: [], group: "scripts", usage: "cat <name>", blurb: "Print a script." },
  { name: "new", aliases: ["create"], group: "scripts", usage: "new <name>", blurb: "Create a script and open the editor." },
  { name: "edit", aliases: [], group: "scripts", usage: "edit <name>", blurb: "Open a script in the editor." },
  { name: "save", aliases: [], group: "scripts", usage: "save [name]", blurb: "Save the editor buffer on this device." },
  { name: "run", aliases: ["load", "exec"], group: "scripts", usage: "run <name>", blurb: "Execute a script against live engines." },
  { name: "rm", aliases: ["del"], group: "scripts", usage: "rm <name>", blurb: "Delete a user script (builtins stay)." },
  { name: "theme", aliases: [], group: "scripts", usage: "theme apple|phosphor|amber", blurb: "Phosphor / amber CRT, or Apple default." },
  { name: "keys", aliases: ["shortcuts"], group: "scripts", usage: "keys", blurb: "Keyboard map for the desk." },
  { name: "mix", aliases: ["segment"], group: "tape", usage: "mix", blurb: "FY2018–FY2025 segment mix." },
  { name: "funnel", aliases: ["pnl"], group: "dcf", usage: "funnel", blurb: "Revenue → net income conversion." },
  { name: "cash", aliases: ["buyback"], group: "dcf", usage: "cash", blurb: "Cash, FCF, buybacks, capex." },
  { name: "expo", aliases: ["base", "installed", "subs"], group: "tape", usage: "expo", blurb: "Hero mix path, or Apple paid-subscription S-curve." },
  { name: "export", aliases: ["let"], group: "scripts", usage: "export wacc=9", blurb: "Set a shell / model variable." },
  { name: "test", aliases: ["["], group: "scripts", usage: "test $WACC -gt 9", blurb: "POSIX test. Drives if/&&/||." },
  { name: "grep", aliases: [], group: "scripts", usage: "<cmd> | grep pat", blurb: "Filter piped lines." },
  { name: "syntax", aliases: ["man"], group: "scripts", usage: "syntax [shell|awk|table|pipes]", blurb: "POSIX grammar, quoting, examples." },
  { name: "table", aliases: ["tbl"], group: "scripts", usage: "table hist|mix|tape|fcf|…", blurb: "Raw numeric tables for awk." },
  { name: "awk", aliases: [], group: "scripts", usage: "<cmd> | awk '{print $1}'", blurb: "BEGIN/END, fields, arrays, arithmetic." },
  { name: "head", aliases: [], group: "scripts", usage: "<cmd> | head 8", blurb: "First N piped lines." },
  { name: "tail", aliases: [], group: "scripts", usage: "<cmd> | tail 8", blurb: "Last N piped lines." },
  { name: "sed", aliases: [], group: "scripts", usage: "<cmd> | sed s/a/b/", blurb: "Substitute on a pipe." },
  { name: "clear", aliases: ["cls"], group: "tape", usage: "clear", blurb: "Clear the scrollback." },
  { name: "echo", aliases: [], group: "scripts", usage: "echo <text>", blurb: "Print a line. Useful inside scripts." },
];

export function filterCatalog(chip: ChipId): CatalogEntry[] {
  if (chip === "all") return CATALOG;
  return CATALOG.filter((c) => c.group === chip);
}

export function findCommand(name: string): CatalogEntry | undefined {
  const n = name.toLowerCase();
  return CATALOG.find((c) => c.name === n || c.aliases.includes(n));
}

export function completeToken(partial: string, chip: ChipId, extra: string[] = []): string | null {
  const p = partial.toLowerCase();
  if (!p) return null;
  const names = [...filterCatalog(chip).flatMap((c) => [c.name, ...c.aliases]), ...extra];
  const hits = names.filter((n) => n.toLowerCase().startsWith(p));
  return hits[0] ?? null;
}

export function suggestTokens(partial: string, extra: string[] = [], limit = 8): string[] {
  const p = partial.toLowerCase();
  const names = [...new Set([...CATALOG.flatMap((c) => [c.name, ...c.aliases]), ...extra])];
  const hits = p
    ? names.filter((n) => n.toLowerCase().startsWith(p) && n.toLowerCase() !== p)
    : CATALOG.map((c) => c.name);
  return hits.slice(0, limit);
}
