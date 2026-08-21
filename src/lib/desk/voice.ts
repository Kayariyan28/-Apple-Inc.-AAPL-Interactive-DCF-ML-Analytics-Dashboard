import { useModel } from "@/lib/store";
import type { Ticker } from "./universe";

export type MixEvent = { year: number; label: string; note: string };

export type NameVoice = {
  headline: string;
  lede: string;
  quote: string;
  mixLede: string;
  restTitle: string;
  restNote: string;
  heroNote: string;
  printTitle: string;
  printLede: string;
  liveTitle: string;
  liveLede: string;
  deckTitle: string;
  deckLede: string;
  dcfTitle: string;
  dcfLede: string;
  simTitle: string;
  simLede: string;
  pathsTitle: string;
  pathsLede: string;
  sensTitle: string;
  sensLede: string;
  forecastTitle: string;
  forecastLede: string;
  historyTitle: string;
  historyLede: string;
  riskTitle: string;
  riskLede: string;
  candlesKicker: string;
  sessionKicker: string;
  mixHint: string;
  peersHint: string;
  pnlTitle: string;
  intelTitle: string;
  competeTitle: string;
  grok: readonly [string, string, string, string];
  events: MixEvent[];
};

export const VOICE: Record<Ticker, NameVoice> = {
  AAPL: {
    headline: "The market is writing a novel. DCF is still doing arithmetic.",
    lede: "The 10-K is still a hardware company learning to be a services one.",
    quote: "Fairly valued to moderately overvalued — if you believe cash. The tape is pricing the compounder the DCF refuses to fully capitalize.",
    mixLede: "Services climbing through iPhone. Eight fiscal years of mix, not a slogan.",
    restTitle: "Hardware",
    restNote: "iPhone, Mac, iPad, Watch — the installed base.",
    heroNote: "The series that compounds.",
    printTitle: "Every Apple 10-K, against the live tape.",
    printLede: "Pick a fiscal year. iPhone mix, Services dollars, and the DCF rebase. Latest year uses trailing revenue and live shares when the feed has them.",
    liveTitle: "The open Apple feed, against the cash machine.",
    liveLede: "Nasdaq tape versus a textbook DCF on the Apple 10-K. This page is the argument between Services mix and the multiple, refreshing on its own.",
    deckTitle: "Unlock the rest of the Apple tape.",
    deckLede: "Services mix, the subscription S-curve, cash versus buybacks, the P&L funnel — wired to the Apple 10-K and the open feed.",
    dcfTitle: "A five-year cash machine, then a perpetuity.",
    dcfLede: "Apple revenue slides into EBIT, NOPAT, unlevered free cash flow. Terminal value is Gordon growth. The implied price is what remains after cash and debt.",
    simTitle: "Four knobs, ten thousand rolls on Apple.",
    simLede: "Each path redraws WACC, terminal growth, revenue growth and EBIT margin around the Apple case, then reruns the DCF.",
    pathsTitle: "Apple as a process, not a point.",
    pathsLede: "Geometric Brownian motion, calibrated on eight Apple annual log-returns, with σ blended against live realized vol. S0 is the last print.",
    sensTitle: "Two numbers decide almost everything.",
    sensLede: "Hold Apple free cash flow constant and walk WACC against terminal growth. Green cells sit above the live tape.",
    forecastTitle: "Eight Apple points. Three curves. One honest caveat.",
    forecastLede: "FY2018–FY2025, then rebased so the path starts at the live tape rather than last year’s print. n = 8 is the whole dataset.",
    historyTitle: "Apple, in public.",
    historyLede: "Services is the series that compounds. Eight fiscal years of 10-K prints, against the live tape.",
    riskTitle: "The Apple left tail, measured two ways.",
    riskLede: "Historical VaR from eight annual returns is a small-sample confession. Parametric VaR uses the live-blended σ.",
    candlesKicker: "Apple candles",
    sessionKicker: "Apple session tape",
    mixHint: "Click a year to load that Apple 10-K into the DCF",
    peersHint: "Live market cap versus Apple. Click a name to focus the desk.",
    pnlTitle: "How much of an Apple dollar survives.",
    intelTitle: "What eight Apple prints project, rebased to the tape.",
    competeTitle: "Where Apple sits among the five.",
    grok: [
      "Why is Apple rich versus the DCF?",
      "Walk the Services mix shift FY18–FY25.",
      "What WACC does the Apple tape imply?",
      "Compare Apple’s cash machine to Microsoft’s cloud.",
    ],
    events: [
      { year: 2020, label: "Services scale", note: "Installed base + COVID mix shift" },
      { year: 2021, label: "Super-cycle", note: "5G iPhone demand spike" },
      { year: 2023, label: "Services 20%+", note: "Recurring mix crosses one-fifth" },
      { year: 2025, label: "Services $109B", note: "Highest-margin engine" },
    ],
  },
  MSFT: {
    headline: "Azure is the novel. The DCF still counts Office cash.",
    lede: "Intelligent Cloud is now almost half the print.",
    quote: "The tape is paying for OpenAI distribution. The model is still a software company with a cloud overlay.",
    mixLede: "Intelligent Cloud eating Productivity and More Personal. Eight fiscal years.",
    restTitle: "Productivity + Personal",
    restNote: "Office, LinkedIn, Windows, Xbox — the installed workflow.",
    heroNote: "Azure and the server layer that compounds.",
    printTitle: "Every Microsoft 10-K, against the live tape.",
    printLede: "Pick a fiscal year. Intelligent Cloud mix, Productivity dollars, and the DCF rebase. Latest year uses trailing revenue and live shares when the feed has them.",
    liveTitle: "The open Microsoft feed, against the cash machine.",
    liveLede: "Nasdaq tape versus a textbook DCF on the Microsoft 10-K. This page is the argument between Azure growth and the multiple, refreshing on its own.",
    deckTitle: "Unlock the rest of the Microsoft tape.",
    deckLede: "Cloud mix, capex on the data-center build, the P&L funnel — wired to the Microsoft 10-K and the open feed.",
    dcfTitle: "A five-year cloud machine, then a perpetuity.",
    dcfLede: "Microsoft revenue slides into EBIT, NOPAT, unlevered free cash flow. Terminal value is Gordon growth on a 69% gross-margin stack.",
    simTitle: "Four knobs, ten thousand rolls on Microsoft.",
    simLede: "Each path redraws WACC, terminal growth, revenue growth and EBIT margin around the Microsoft case, then reruns the DCF.",
    pathsTitle: "Microsoft as a process, not a point.",
    pathsLede: "Geometric Brownian motion, calibrated on eight Microsoft annual log-returns, with σ blended against live realized vol. S0 is the last print.",
    sensTitle: "Two numbers decide almost everything.",
    sensLede: "Hold Microsoft free cash flow constant and walk WACC against terminal growth. Green cells sit above the live tape.",
    forecastTitle: "Eight Microsoft points. Three curves. One honest caveat.",
    forecastLede: "FY2018–FY2025, then rebased so the path starts at the live tape rather than last year’s print. n = 8 is the whole dataset.",
    historyTitle: "Microsoft, in public.",
    historyLede: "Intelligent Cloud is the series that compounds. Eight fiscal years of 10-K prints, against the live tape.",
    riskTitle: "The Microsoft left tail, measured two ways.",
    riskLede: "Historical VaR from eight annual returns is a small-sample confession. Parametric VaR uses the live-blended σ.",
    candlesKicker: "Microsoft candles",
    sessionKicker: "Microsoft session tape",
    mixHint: "Click a year to load that Microsoft 10-K into the DCF",
    peersHint: "Live market cap versus Microsoft. Click a name to focus the desk.",
    pnlTitle: "How much of a Microsoft dollar survives.",
    intelTitle: "What eight Microsoft prints project, rebased to the tape.",
    competeTitle: "Where Microsoft sits among the five.",
    grok: [
      "Why is Microsoft rich versus the DCF?",
      "Walk Intelligent Cloud mix FY18–FY25.",
      "What WACC does the Microsoft tape imply?",
      "Compare Azure to NVIDIA data center.",
    ],
    events: [
      { year: 2019, label: "Cloud parity", note: "Intelligent Cloud catches Productivity" },
      { year: 2020, label: "Work from home", note: "Teams and Azure pull the mix" },
      { year: 2023, label: "OpenAI overlay", note: "Copilot becomes the narrative" },
      { year: 2025, label: "Cloud 46%", note: "Almost half the print is servers" },
    ],
  },
  GOOGL: {
    headline: "Search still pays for everything. The tape is pricing Gemini.",
    lede: "Cloud is the growth the query wants. Search is still the cash.",
    quote: "Alphabet is a cash machine with an AI tax. The DCF sees Search. The tape sees Cloud.",
    mixLede: "Search still dominates. YouTube and Cloud are the mix shift. Eight fiscal years.",
    restTitle: "Search + YouTube",
    restNote: "The query and the watch — the cash that funds Cloud.",
    heroNote: "Google Cloud, still the smaller engine.",
    printTitle: "Every Alphabet 10-K, against the live tape.",
    printLede: "Pick a fiscal year. Search mix, Cloud dollars, and the DCF rebase. Latest year uses trailing revenue and live shares when the feed has them.",
    liveTitle: "The open Alphabet feed, against the cash machine.",
    liveLede: "Nasdaq tape versus a textbook DCF on the Alphabet 10-K. This page is the argument between Search cash and Cloud growth, refreshing on its own.",
    deckTitle: "Unlock the rest of the Alphabet tape.",
    deckLede: "Search mix, YouTube, Cloud, the P&L funnel — wired to the Alphabet 10-K and the open feed.",
    dcfTitle: "A five-year query machine, then a perpetuity.",
    dcfLede: "Alphabet revenue slides into EBIT, NOPAT, unlevered free cash flow. Terminal value is Gordon growth on a Search-funded stack.",
    simTitle: "Four knobs, ten thousand rolls on Alphabet.",
    simLede: "Each path redraws WACC, terminal growth, revenue growth and EBIT margin around the Alphabet case, then reruns the DCF.",
    pathsTitle: "Alphabet as a process, not a point.",
    pathsLede: "Geometric Brownian motion, calibrated on eight Alphabet annual log-returns, with σ blended against live realized vol. S0 is the last print.",
    sensTitle: "Two numbers decide almost everything.",
    sensLede: "Hold Alphabet free cash flow constant and walk WACC against terminal growth. Green cells sit above the live tape.",
    forecastTitle: "Eight Alphabet points. Three curves. One honest caveat.",
    forecastLede: "FY2018–FY2025, then rebased so the path starts at the live tape rather than last year’s print. n = 8 is the whole dataset.",
    historyTitle: "Alphabet, in public.",
    historyLede: "Cloud is the series that compounds. Search is the series that pays. Eight fiscal years of 10-K prints.",
    riskTitle: "The Alphabet left tail, measured two ways.",
    riskLede: "Historical VaR from eight annual returns is a small-sample confession. Parametric VaR uses the live-blended σ.",
    candlesKicker: "Alphabet candles",
    sessionKicker: "Alphabet session tape",
    mixHint: "Click a year to load that Alphabet 10-K into the DCF",
    peersHint: "Live market cap versus Alphabet. Click a name to focus the desk.",
    pnlTitle: "How much of an Alphabet dollar survives.",
    intelTitle: "What eight Alphabet prints project, rebased to the tape.",
    competeTitle: "Where Alphabet sits among the five.",
    grok: [
      "Why is Alphabet rich versus the DCF?",
      "Walk Search versus Cloud mix FY18–FY25.",
      "What WACC does the Alphabet tape imply?",
      "Is Cloud large enough to move the DCF?",
    ],
    events: [
      { year: 2020, label: "YouTube scale", note: "Watch time and ads in the lockdown" },
      { year: 2021, label: "Cloud inflects", note: "GCP mix crosses high-single-digits" },
      { year: 2023, label: "Gemini overlay", note: "AI is eating the query" },
      { year: 2025, label: "Cloud 13%", note: "Still a Search company with a cloud" },
    ],
  },
  AMZN: {
    headline: "AWS is the compounder the retail tape pretends not to see.",
    lede: "Stores are the surface. Third-party, ads, and AWS are the cash.",
    quote: "The DCF is an AWS model wearing a retail multiple. The tape still prices the warehouse.",
    mixLede: "Online stores shrinking. AWS, ads, and third-party taking the mix. Eight fiscal years.",
    restTitle: "Stores + ads",
    restNote: "Retail, third-party, Prime — the logistics flywheel.",
    heroNote: "AWS, the high-margin engine.",
    printTitle: "Every Amazon 10-K, against the live tape.",
    printLede: "Pick a fiscal year. AWS mix, retail dollars, and the DCF rebase. Latest year uses trailing revenue and live shares when the feed has them.",
    liveTitle: "The open Amazon feed, against the cash machine.",
    liveLede: "Nasdaq tape versus a textbook DCF on the Amazon 10-K. This page is the argument between AWS margin and the retail multiple, refreshing on its own.",
    deckTitle: "Unlock the rest of the Amazon tape.",
    deckLede: "AWS mix, ads, Prime, the P&L funnel — wired to the Amazon 10-K and the open feed.",
    dcfTitle: "A five-year AWS machine, then a perpetuity.",
    dcfLede: "Amazon revenue slides into EBIT, NOPAT, unlevered free cash flow. Terminal value is Gordon growth on a 49% gross-margin stack.",
    simTitle: "Four knobs, ten thousand rolls on Amazon.",
    simLede: "Each path redraws WACC, terminal growth, revenue growth and EBIT margin around the Amazon case, then reruns the DCF.",
    pathsTitle: "Amazon as a process, not a point.",
    pathsLede: "Geometric Brownian motion, calibrated on eight Amazon annual log-returns, with σ blended against live realized vol. S0 is the last print.",
    sensTitle: "Two numbers decide almost everything.",
    sensLede: "Hold Amazon free cash flow constant and walk WACC against terminal growth. Green cells sit above the live tape.",
    forecastTitle: "Eight Amazon points. Three curves. One honest caveat.",
    forecastLede: "FY2018–FY2025, then rebased so the path starts at the live tape rather than last year’s print. n = 8 is the whole dataset.",
    historyTitle: "Amazon, in public.",
    historyLede: "AWS is the series that compounds. Stores are the series that scale. Eight fiscal years of 10-K prints.",
    riskTitle: "The Amazon left tail, measured two ways.",
    riskLede: "Historical VaR from eight annual returns is a small-sample confession. Parametric VaR uses the live-blended σ.",
    candlesKicker: "Amazon candles",
    sessionKicker: "Amazon session tape",
    mixHint: "Click a year to load that Amazon 10-K into the DCF",
    peersHint: "Live market cap versus Amazon. Click a name to focus the desk.",
    pnlTitle: "How much of an Amazon dollar survives.",
    intelTitle: "What eight Amazon prints project, rebased to the tape.",
    competeTitle: "Where Amazon sits among the five.",
    grok: [
      "Why is Amazon rich versus the DCF?",
      "Walk AWS mix versus stores FY18–FY25.",
      "What WACC does the Amazon tape imply?",
      "How much of the DCF is really AWS?",
    ],
    events: [
      { year: 2020, label: "Lockdown retail", note: "Stores mix spikes, FCF compresses" },
      { year: 2022, label: "FCF negative", note: "Capex and inventory swallow cash" },
      { year: 2023, label: "AWS + ads", note: "Margin mix turns the P&L" },
      { year: 2025, label: "AWS 18%", note: "The compounder is still not half" },
    ],
  },
  NVDA: {
    headline: "Data center is the whole story. The DCF is catching up.",
    lede: "Eighty-nine percent of the print is accelerators. Gaming is a footnote.",
    quote: "The tape is pricing a platform. The model is still a semiconductor with a 75% gross margin.",
    mixLede: "Gaming collapsed into data center. Eight fiscal years of one mix shift.",
    restTitle: "Gaming and the rest",
    restNote: "GeForce, visualization, auto, OEM — the old NVIDIA.",
    heroNote: "Data center, now almost the entire company.",
    printTitle: "Every NVIDIA 10-K, against the live tape.",
    printLede: "Pick a fiscal year. Data-center mix, gaming dollars, and the DCF rebase. Latest year uses trailing revenue and live shares when the feed has them.",
    liveTitle: "The open NVIDIA feed, against the cash machine.",
    liveLede: "Nasdaq tape versus a textbook DCF on the NVIDIA 10-K. This page is the argument between data-center growth and the multiple, refreshing on its own.",
    deckTitle: "Unlock the rest of the NVIDIA tape.",
    deckLede: "Data-center mix, gaming collapse, the P&L funnel — wired to the NVIDIA 10-K and the open feed.",
    dcfTitle: "A five-year accelerator machine, then a perpetuity.",
    dcfLede: "NVIDIA revenue slides into EBIT, NOPAT, unlevered free cash flow. Terminal value is Gordon growth on a 75% gross-margin stack.",
    simTitle: "Four knobs, ten thousand rolls on NVIDIA.",
    simLede: "Each path redraws WACC, terminal growth, revenue growth and EBIT margin around the NVIDIA case, then reruns the DCF.",
    pathsTitle: "NVIDIA as a process, not a point.",
    pathsLede: "Geometric Brownian motion, calibrated on eight NVIDIA annual log-returns, with σ blended against live realized vol. S0 is the last print.",
    sensTitle: "Two numbers decide almost everything.",
    sensLede: "Hold NVIDIA free cash flow constant and walk WACC against terminal growth. Green cells sit above the live tape.",
    forecastTitle: "Eight NVIDIA points. Three curves. One honest caveat.",
    forecastLede: "FY2018–FY2025, then rebased so the path starts at the live tape rather than last year’s print. n = 8 is the whole dataset.",
    historyTitle: "NVIDIA, in public.",
    historyLede: "Data center is the series that compounds. Gaming is the series that used to. Eight fiscal years of 10-K prints.",
    riskTitle: "The NVIDIA left tail, measured two ways.",
    riskLede: "Historical VaR from eight annual returns is a small-sample confession. Parametric VaR uses the live-blended σ.",
    candlesKicker: "NVIDIA candles",
    sessionKicker: "NVIDIA session tape",
    mixHint: "Click a year to load that NVIDIA 10-K into the DCF",
    peersHint: "Live market cap versus NVIDIA. Click a name to focus the desk.",
    pnlTitle: "How much of an NVIDIA dollar survives.",
    intelTitle: "What eight NVIDIA prints project, rebased to the tape.",
    competeTitle: "Where NVIDIA sits among the five.",
    grok: [
      "Why is NVIDIA rich versus the DCF?",
      "Walk data-center mix versus gaming FY18–FY25.",
      "What WACC does the NVIDIA tape imply?",
      "Is 89% data center already in the model?",
    ],
    events: [
      { year: 2020, label: "Data-center lead", note: "Servers overtake gaming" },
      { year: 2022, label: "Crypto hangover", note: "Gaming mix snaps back, growth pauses" },
      { year: 2023, label: "The accelerator year", note: "Data center jumps to 78%" },
      { year: 2025, label: "Data center 89%", note: "The company is one segment" },
    ],
  },
};

export function voiceOf(ticker: Ticker) {
  return VOICE[ticker];
}

export function useVoice() {
  const ticker = useModel((s) => s.ticker);
  return VOICE[ticker];
}
