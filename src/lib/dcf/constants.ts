/** FY2024 10-K snapshot used by the original DCF model. Units: $ millions unless noted. */

export const BASE_REV = 394_328;
export const CASH = 156_652;
export const DEBT = 96_842;
export const SHARES = 15_115;
export const RD_PCT = 0.077;
export const SGA_PCT = 0.063;
export const DA_PCT = 0.028;
export const CAPEX_PCT = 0.025;
export const NWC_PCT = 0.01;

export const CURRENT_PRICE = 266.18;
export const WEEK_52_HIGH = 288.62;
export const WEEK_52_LOW = 169.21;

export const FORECAST_YEARS = [2025, 2026, 2027, 2028, 2029] as const;
export const FORECAST_LABELS = ["FY2025E", "FY2026E", "FY2027E", "FY2028E", "FY2029E"] as const;

export const MANAGEMENT_DEFAULTS = {
  growth: [0.08, 0.09, 0.08, 0.07, 0.065] as number[],
  grossMargin: 0.475,
  wacc: 0.09,
  tgr: 0.035,
  taxRate: 0.162,
};

export const STREET_DEFAULTS = {
  growth: [0.06, 0.065, 0.06, 0.055, 0.05] as number[],
  grossMargin: 0.465,
  wacc: 0.095,
  tgr: 0.03,
  taxRate: 0.165,
};

export const STREET_REV_MM = [417_987.68, 445_156.88, 471_866.29, 497_818.94, 522_709.88];

export const HIST = {
  years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
  revenue: [265.6, 260.17, 274.52, 365.82, 394.33, 383.29, 391.04, 416.16],
  netIncome: [59.53, 55.26, 57.41, 94.68, 99.8, 97.0, 93.74, 112.01],
  grossMargin: [38.3, 37.8, 38.2, 41.8, 43.3, 44.1, 46.2, 46.9],
  services: [37.19, 46.29, 53.77, 68.43, 78.13, 85.2, 96.17, 109.16],
  eps: [2.98, 3.28, 3.28, 5.61, 6.11, 6.13, 6.08, 7.4],
  price: [39.5, 73.4, 132.7, 177.6, 129.9, 192.5, 254.5, 285.9],
  opIncome: [70.9, 63.93, 66.29, 108.95, 119.44, 114.3, 123.22, 133.05],
} as const;

export const HIST_PRODUCTS = HIST.revenue.map((r, i) => r - HIST.services[i]!);

/** Approximate 10-K segment mix (share of total revenue). Used for the stacked story chart. */
export const SEGMENT_MIX: { year: number; iphone: number; mac: number; ipad: number; wearables: number; services: number }[] =
  [
    { year: 2018, iphone: 0.628, mac: 0.096, ipad: 0.07, wearables: 0.066, services: 0.14 },
    { year: 2019, iphone: 0.547, mac: 0.099, ipad: 0.084, wearables: 0.094, services: 0.176 },
    { year: 2020, iphone: 0.499, mac: 0.104, ipad: 0.087, wearables: 0.111, services: 0.199 },
    { year: 2021, iphone: 0.526, mac: 0.096, ipad: 0.087, wearables: 0.105, services: 0.186 },
    { year: 2022, iphone: 0.521, mac: 0.102, ipad: 0.074, wearables: 0.105, services: 0.198 },
    { year: 2023, iphone: 0.524, mac: 0.077, ipad: 0.074, wearables: 0.104, services: 0.221 },
    { year: 2024, iphone: 0.513, mac: 0.077, ipad: 0.068, wearables: 0.095, services: 0.247 },
    { year: 2025, iphone: 0.501, mac: 0.079, ipad: 0.064, wearables: 0.094, services: 0.262 },
  ];

export const MIX_EVENTS = [
  { year: 2020, label: "Services scale", note: "Installed base + COVID mix shift" },
  { year: 2021, label: "Super-cycle", note: "5G iPhone demand spike" },
  { year: 2023, label: "Services 20%+", note: "Recurring mix crosses one-fifth" },
  { year: 2025, label: "Services $109B", note: "Highest-margin engine" },
];

export const PEERS = [
  { ticker: "MSFT", name: "Microsoft", price: 415.26, change: 0.0084 },
  { ticker: "GOOGL", name: "Alphabet", price: 172.9, change: 0.0112 },
  { ticker: "AMZN", name: "Amazon", price: 197.45, change: -0.0035 },
  { ticker: "NVDA", name: "NVIDIA", price: 131.28, change: 0.0204 },
] as const;

export const ML_REF = {
  revLinear: [429.8, 454.4, 479.0, 503.5, 528.1],
  revPoly: [415.2, 423.1, 426.8, 426.3, 421.6],
  revExp: [438.8, 472.7, 509.3, 548.7, 591.1],
  revEnsemble: [429.0, 452.3, 475.4, 498.4, 521.3],
  gmPred: [46.5, 47.7, 49.0, 50.2, 51.5],
  svcPct: [25.7, 27.3, 28.8, 30.3, 31.9],
  epsPred: [7.79, 8.93, 10.23, 11.72, 13.42],
  peImplied: [34.1, 29.8, 26.0, 22.7, 19.8],
  priceUpper: [405.4, 482.2, 573.6, 683.4, 816.2],
  priceEnsemble: [283.6, 337.3, 401.3, 478.1, 571.0],
  priceLower: [198.4, 236.0, 280.7, 334.5, 399.5],
  bayesianMean: [454.4, 478.9, 503.5, 528.1, 552.6],
  bayesianHi: [540.6, 571.4, 602.8, 634.9, 667.4],
  bayesianLo: [368.1, 386.5, 404.2, 421.3, 437.9],
  ouMedian: [473.2, 504.1, 537.0, 569.8, 605.0],
  bayesianYears: [2026, 2027, 2028, 2029, 2030],
};

export const EXCEL_MC = {
  mean: 172,
  median: 164.6,
  std: 41.1,
  p5: 122.5,
  p25: 144.0,
  p50: 164.6,
  p75: 190.2,
  p95: 246.1,
};

export const EXCEL_HEATMAP = {
  wacc: [7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0],
  tgr: [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0],
  grid: [
    [182.6, 197.4, 215.6, 238.2, 267.4, 306.3, 360.7, 442.3],
    [168.8, 181.7, 197.5, 217.0, 241.8, 274.5, 319.9, 387.3],
    [156.8, 168.2, 181.9, 199.0, 220.2, 247.8, 285.7, 342.0],
    [146.2, 156.4, 168.5, 183.3, 201.4, 224.9, 256.5, 302.2],
    [136.8, 146.0, 156.8, 169.8, 185.6, 205.6, 232.1, 270.0],
    [128.4, 136.7, 146.3, 157.8, 171.6, 189.0, 211.4, 242.6],
    [120.8, 128.3, 137.0, 147.1, 159.2, 174.0, 193.1, 218.7],
    [114.0, 120.8, 128.7, 137.8, 148.7, 161.8, 178.1, 199.5],
    [107.8, 114.0, 121.1, 129.4, 139.2, 150.8, 165.3, 183.6],
    [102.2, 107.9, 114.3, 121.8, 130.7, 141.2, 154.1, 170.1],
    [97.0, 102.3, 108.1, 114.9, 123.0, 132.5, 144.2, 158.5],
  ],
};

export const CORR_LABELS = [
  "Revenue",
  "Net income",
  "Gross margin",
  "Services",
  "Op. income",
  "EPS",
  "Price",
] as const;

export const CORR_EXCEL = [
  [1.0, 0.989, 0.956, 0.934, 0.995, 0.988, 0.835],
  [0.989, 1.0, 0.932, 0.908, 0.986, 0.989, 0.809],
  [0.956, 0.932, 1.0, 0.977, 0.97, 0.959, 0.905],
  [0.934, 0.908, 0.977, 1.0, 0.933, 0.954, 0.951],
  [0.995, 0.986, 0.97, 0.933, 1.0, 0.984, 0.836],
  [0.988, 0.989, 0.959, 0.954, 0.984, 1.0, 0.865],
  [0.835, 0.809, 0.905, 0.951, 0.836, 0.865, 1.0],
];

export const SIM_OPTIONS = [5_000, 10_000, 25_000, 50_000] as const;

export const WACC_RANGE = [0.07, 0.075, 0.08, 0.085, 0.09, 0.095, 0.1, 0.105, 0.11, 0.115, 0.12];
export const TGR_RANGE = [0.015, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.05];
