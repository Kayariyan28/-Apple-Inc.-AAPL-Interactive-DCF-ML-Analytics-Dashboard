import { CASH, HIST, SEGMENT_MIX } from "./constants";

/** 10-K cash + marketable securities, buybacks, capex, FCF. $ billions. */
export const CASH_SERIES = {
  years: HIST.years,
  cash: [237.1, 205.9, 191.8, 189.0, 165.4, 162.1, 151.3, CASH / 1000],
  buybacks: [72.7, 67.1, 72.5, 85.5, 89.4, 77.6, 94.9, 99.2],
  capex: [13.3, 10.5, 7.3, 11.1, 10.7, 10.9, 9.4, 9.6],
  fcf: [64.1, 58.9, 73.4, 92.9, 111.4, 99.6, 108.8, 108.9],
} as const;

export const INSTALLED_BASE = {
  labels: ["FY18", "FY19", "FY20", "FY21", "FY22", "FY23", "FY24", "FY25", "FY26E"],
  years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  devices: [1.3, 1.4, 1.5, 1.65, 1.8, 2.0, 2.2, 2.35, 2.5],
  eras: [
    { i: 0, title: "iPhone installed base", note: "The hardware flywheel" },
    { i: 5, title: "Services attach", note: "Recurring mix crosses 20%" },
    { i: 8, title: "The subscription machine", note: "Base > 2.5B devices" },
  ],
} as const;

/**
 * Paid subscriptions, billions.
 * Apple disclosed the count through 1.0B (2023). FY24–FY28E are desk estimates:
 * Services growth plus Apple Intelligence attach on the installed base.
 */
export const S_CURVE = {
  labels: ["FY14", "FY15", "FY16", "FY17", "FY18", "FY19", "FY20", "FY21", "FY22", "FY23", "FY24", "FY25", "FY26E", "FY27E", "FY28E"],
  years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028],
  subs: [0.02, 0.04, 0.08, 0.15, 0.27, 0.39, 0.52, 0.7, 0.86, 1.0, 1.18, 1.38, 1.85, 2.45, 3.15],
  disclosedThrough: 2023,
  eras: [
    { i: 2, title: "Services word of mouth", note: "Music, iCloud, App Store paid" },
    { i: 9, title: "Subscriptions become mainstream", note: "1B paid relationships, 2023" },
    { i: 14, title: "Intelligence becomes the default", note: "Attach on the installed base" },
  ],
  milestones: [
    { i: 4, label: "270M" },
    { i: 9, label: "1B" },
    { i: 12, label: "1.85B" },
    { i: 14, label: "3.15B" },
  ],
} as const;

export const PIPELINE = [
  {
    family: "iPhone",
    rows: [
      { name: "iPhone 16 cycle", start: 0, end: 0.52, tone: "done" as const },
      { name: "iPhone 17 production", start: 0.38, end: 0.82, tone: "now" as const },
      { name: "Next silicon + camera", start: 0.68, end: 1, tone: "next" as const },
    ],
  },
  {
    family: "Silicon",
    rows: [
      { name: "M4 in market", start: 0, end: 0.58, tone: "done" as const },
      { name: "M5 design / tape-out", start: 0.36, end: 0.88, tone: "now" as const },
    ],
  },
  {
    family: "Intelligence",
    rows: [
      { name: "Apple Intelligence 1.0", start: 0.12, end: 0.68, tone: "now" as const },
      { name: "On-device models 2.x", start: 0.54, end: 1, tone: "next" as const },
    ],
  },
  {
    family: "Vision / spatial",
    rows: [
      { name: "Vision Pro 1", start: 0, end: 0.44, tone: "done" as const },
      { name: "Vision line expansion", start: 0.48, end: 0.94, tone: "next" as const },
    ],
  },
] as const;

export const STAGES = ["Research", "Design", "Production", "Launch"] as const;

export const SECTOR_MARGINS = {
  gross: 0.381,
  ebitda: 0.214,
  ebit: 0.168,
  ebt: 0.152,
  net: 0.128,
} as const;

export function pnlAt(i: number) {
  const rev = HIST.revenue[i]!;
  const gp = rev * (HIST.grossMargin[i]! / 100);
  const ebit = HIST.opIncome[i]!;
  const ni = HIST.netIncome[i]!;
  const da = rev * 0.028;
  const ebitda = ebit + da;
  const ebt = ni / 0.838;
  return { year: HIST.years[i]!, rev, gp, ebitda, ebit, ebt, ni };
}

export const PNL = HIST.years.map((_, i) => pnlAt(i));
export const PNL_NOW = PNL[PNL.length - 1]!;

export function sequentialFunnel(p: { year: number; rev: number; gp: number; ebitda: number; ebit: number; ebt: number; ni: number }) {
  const steps = [
    { key: "rev", label: "Total revenue", value: p.rev },
    { key: "gp", label: "Gross profit", value: p.gp },
    { key: "ebitda", label: "EBITDA", value: p.ebitda },
    { key: "ebit", label: "EBIT", value: p.ebit },
    { key: "ebt", label: "EBT", value: p.ebt },
    { key: "ni", label: "Net income", value: p.ni },
  ];
  return steps.map((s, i) => ({
    ...s,
    shareOfRev: s.value / p.rev,
    conv: i === 0 ? 1 : s.value / steps[i - 1]!.value,
  }));
}

export const FUNNEL = sequentialFunnel(PNL_NOW);

export const MIX_NOW = SEGMENT_MIX[SEGMENT_MIX.length - 1]!;

/** High-contrast slices for the half-donut on paper. */
export const MIX_LAYERS = [
  { key: "iphone" as const, label: "iPhone", fill: "#1d1d1f" },
  { key: "mac" as const, label: "Mac", fill: "#8e8e93" },
  { key: "ipad" as const, label: "iPad", fill: "#c7c7cc" },
  { key: "wearables" as const, label: "Watch + Wearables", fill: "#636366" },
  { key: "services" as const, label: "Services", fill: "#0a84ff" },
];

/**
 * Stacked-column language from the biotech deck: black growing at the
 * baseline (Services), hardware in graphite, iPhone almost paper-white on top.
 */
export const COLUMN_LAYERS = [
  { key: "services" as const, label: "Services", fill: "#1d1d1f" },
  { key: "wearables" as const, label: "Watch + Wearables", fill: "#636366" },
  { key: "ipad" as const, label: "iPad", fill: "#8e8e93" },
  { key: "mac" as const, label: "Mac", fill: "#c7c7cc" },
  { key: "iphone" as const, label: "iPhone", fill: "#e8e8ed" },
];

export type PeerAxis = {
  ticker: string;
  name: string;
  x: number;
  y: number;
  pe: number | null;
  mktCap: number | null;
  changePct: number;
  highlight?: boolean;
};

/** Hardware ↔ software (x), local scale ↔ global platform (y). Qualitative, live-sized. */
export const COMPETE_COPY = [
  {
    ticker: "AAPL",
    name: "Apple",
    strength: "Installed base, mix shift to Services, cash machine.",
    weakness: "Hardware cycle risk. AI perceived as late.",
    strategy: "Own the device, tax the services layer.",
  },
  {
    ticker: "MSFT",
    name: "Microsoft",
    strength: "Azure + Office compounding. OpenAI distribution.",
    weakness: "Consumer hardware still a hobby.",
    strategy: "Sit in the enterprise workflow.",
  },
  {
    ticker: "GOOGL",
    name: "Alphabet",
    strength: "Search cash, YouTube, Android reach.",
    weakness: "AI is eating the query. Regulation.",
    strategy: "Defend the query, sell the cloud.",
  },
  {
    ticker: "AMZN",
    name: "Amazon",
    strength: "AWS + retail logistics flywheel.",
    weakness: "Retail margin is thin. Ads are the patch.",
    strategy: "Cloud funds everything else.",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA",
    strength: "The pick-and-shovel of the AI buildout.",
    weakness: "Customer concentration. Cycle risk.",
    strategy: "Sell the factory that makes intelligence.",
  },
] as const;
