import type { HistogramBin, ModelInputs } from "@/lib/dcf/engine";
import type { Calibration } from "@/lib/dcf/calibrate";
import type { LiveMarket } from "@/lib/market/types";
import type { Ticker } from "@/lib/desk/universe";

export type CmdGroup = "tape" | "dcf" | "sim" | "risk" | "scripts";

export type TermTheme = "apple" | "phosphor" | "amber";

export type VizKind =
  | "quote"
  | "dcf"
  | "mc"
  | "paths"
  | "jump"
  | "sens"
  | "forecast"
  | "risk"
  | "measure"
  | "cal"
  | "hist"
  | "news"
  | "help"
  | "script"
  | "peers"
  | "brief"
  | "intraday"
  | "compare";

export type LatticeCell = { up: boolean; ret: number };

export type SparkSeries = { name: string; values: number[]; color?: "fg" | "accent" | "up" | "down" | "muted" };

export type VizRow = { label: string; value?: string; detail?: string; tone?: "up" | "down" | "muted" };

export type VizSpec = {
  kind: VizKind;
  kicker: string;
  title: string;
  headline: string;
  hint?: string;
  note?: string;
  rows: VizRow[];
  spark?: SparkSeries[];
  labels?: string[];
  hist?: HistogramBin[];
  heat?: number[][];
  lattice: LatticeCell[];
  latticeNote?: string;
  market?: number;
};

export type TermLine = {
  kind: "in" | "out" | "err" | "sys";
  text: string;
};

export type ModelPatch = Partial<ModelInputs> & {
  scenario?: "management" | "street";
  nSims?: number;
};

export type ScriptAction =
  | { type: "ls" }
  | { type: "cat"; name: string }
  | { type: "rm"; name: string }
  | { type: "run"; name: string }
  | { type: "new"; name: string }
  | { type: "edit"; name: string }
  | { type: "save"; name?: string; body?: string }
  | { type: "watch"; cmd: string; seconds: number }
  | { type: "unwatch" }
  | { type: "theme"; name: TermTheme }
  | { type: "reset" };

export type TermResult = {
  lines: TermLine[];
  viz: VizSpec | null;
  patch?: ModelPatch;
  script?: ScriptAction;
  clear?: boolean;
  ticker?: Ticker;
};

export type TermCtx = {
  input: ModelInputs;
  tape: number;
  market: LiveMarket | null;
  cal: Calibration;
  nSims: number;
  scenario: "management" | "street";
  env?: Record<string, string>;
  ticker: Ticker;
};

export type Parsed = {
  cmd: string;
  args: string[];
  kv: Record<string, string>;
  raw: string;
};

export type DeskScript = {
  name: string;
  body: string;
  updatedAt: number;
  builtin?: boolean;
};
