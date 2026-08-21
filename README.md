<p align="center">
  <img src="docs/product/x-banner.jpg" alt="Data Desk — live tape, 10-K, DCF" width="100%">
</p>

<h1 align="center">Data Desk</h1>

<p align="center">
  A research surface for Apple, Microsoft, Alphabet, Amazon, and NVIDIA.<br>
  Live tape. Filed 10-Ks. A textbook DCF. Grok across the desk.
</p>

<p align="center">
  <a href="https://github.com/Kayariyan28/data-desk"><strong>Repository</strong></a>
  ·
  <a href="https://github.com/Kayariyan28/data-desk#the-desk"><strong>Product</strong></a>
  ·
  <a href="https://github.com/Kayariyan28/data-desk#about"><strong>About</strong></a>
</p>

---

**Data Desk** holds a name as a cash machine, not a ticker cartoon. Switch AAPL to NVDA and the headlines, mix events, Grok starters, cash, debt, and the entire 10-K rewrite. Sign in and the assumptions travel with you.

Formerly [Apple Inc. Interactive DCF / ML Analytics](https://github.com/Kayariyan28/Apple-Inc.-AAPL-Interactive-DCF-ML-Analytics-Dashboard) — rebuilt as a multi-name desk.

## The desk

<p align="center">
  <img src="docs/product/overview.png" alt="Overview — Apple on the live tape">
</p>

| Live tape | Microsoft voice |
| --- | --- |
| <img src="docs/product/live.png" alt="Live tape, reverse DCF, headlines"> | <img src="docs/product/microsoft.png" alt="Microsoft desk — Azure is the novel"> |

| NVIDIA print | Grok |
| --- | --- |
| <img src="docs/product/nvidia-print.png" alt="NVIDIA 10-K print and mix"> | <img src="docs/product/grok.png" alt="Ask Grok across the desk"> |

| Terminal | Sign in |
| --- | --- |
| <img src="docs/product/terminal.png" alt="Terminal on the focused name"> | <img src="docs/product/sign-in.png" alt="Per-user sign in"> |

<p align="center">
  <img src="docs/product/dcf.png" alt="Discounted cash flow bridge">
</p>

## What it does

- **Five names.** AAPL, MSFT, GOOGL, AMZN, NVDA. Each has its own 10-K mix, events, and voice. Switching a ticker is not a reskin.
- **Live tape.** Open quotes against a reverse DCF. Cash, debt, and shares overlay the latest print.
- **The print.** FY 2018–2025 on one board. Streamgraph, stacked mix, year chips, event callouts that belong to that name.
- **Operating deck.** Mix, cash machine, funnel, peer pack.
- **Models.** DCF, Monte Carlo, GBM / jump-diffusion paths, WACC × terminal-growth sensitivity, tiny-sample forecast, history, VaR / CVaR.
- **Terminal.** awk, tables, scripts, and the same engines as the charts — on this device.
- **Grok.** Chat through the quote, the books, the bridge, and the tails. Starters change with the name.
- **Your desk.** Google, X, or email. Focused ticker, scenario, growth, WACC, and notes persist per user.

## Stack

React 19 · TanStack Start / Router / Query · Tailwind v4 · d3 · Zustand · Better Auth · Postgres (Neon / PGLite)

## Quick start

```bash
git clone https://github.com/Kayariyan28/data-desk.git
cd data-desk
npm install
npm run dev
```

```bash
npm run typecheck
npm test
npm run lint
```

Sign-in is on. Desk settings are scoped to the authenticated user. Market tape stays public.

## About

<p align="center">
  <img src="docs/product/about.png" alt="About Data Desk">
</p>

Built by **Karan Chandra Dey** at [K28 Design Lab](https://k28art.space) — independent researcher and product builder.

- GitHub: [Kayariyan28](https://github.com/Kayariyan28)
- X: [K28DesignLab](https://x.com/K28DesignLab)

Educational model, not investment advice. Not affiliated with Apple, Microsoft, Alphabet, Amazon, NVIDIA, or xAI. Quotes from public market feeds; books from filed 10-Ks.

## License

MIT. See [LICENSE](LICENSE).
