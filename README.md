# ETF Performance Screener

ETF Performance Screener is a personal Next.js research dashboard for comparing ETFs with Yahoo Finance market data. It combines technical indicators, long-term risk context, seasonal analysis, profile-based status ratings, a local watchlist, and a relative market-rotation dashboard.

The application is for education and personal research. It is not investment advice, a brokerage service, or a source of certified fund-flow data.

## Main features

- Screens a curated ETF universe by ticker, name, category, AUM, TER, seasonal success rate, and per-column numeric or categorical filters.
- Sorts all available columns and lets users choose the visible table columns.
- Saves the watchlist and investment profile in one-year technical browser cookies.
- Opens TradingView charts using exchange-aware links for supported Yahoo ticker suffixes.
- Provides a future-seasonality page for active or upcoming favorable seasonal windows.

## Metrics

Market calculations use Yahoo Finance adjusted close when it is available. Therefore returns, SMAs, drawdowns, and price ranges are dividend-adjusted total-return-style measures; they can differ from a price-only chart.

### Short and medium term

- `RSI 14`: simple-average RSI over 14 sessions.
- `Positive 10D` and `Positive 20D`: number of positive closes in the recent window.
- `Streak 20D`: current consecutive run of positive sessions.
- `Dist SMA20`: $((Price / SMA20) - 1) * 100$.
- `RVOL`: current volume divided by average 20-session volume.
- `Vol 20D`: annualized standard deviation of 20 daily returns.
- `1D`, `3D`, `1W`, `1M`, `1Y`, `3Y`, `5Y`, `10Y`: cumulative adjusted-close returns.

### Long-term structure and risk

- `Dist SMA200`: $((Price / SMA200) - 1) * 100$, the price distance from the 200-session simple moving average.
- `Cross SMA50/200`: Golden regime when $SMA50 > SMA200$, Death regime when $SMA50 < SMA200$. An asterisk marks a cross detected in the latest five trading sessions.
- `DD da ATH`: $((CurrentPrice / AvailableATH) - 1) * 100$, the current decline from the highest available adjusted-close price.
- `Posizione 52W`: $((Price - Low52W) / (High52W - Low52W)) * 100$ over roughly 252 sessions.
- `52W High`: distance from the 52-week high.
- `Max DD 52W`: worst peak-to-trough drawdown observed inside the last 52 weeks.
- `AUM`: assets under management reported by the provider when available.

Click a column label for its short description. `Visiona metriche` opens formula, purpose, and example cards for every metric.

## Trend, Score, and Status dialogs

The Trend badge opens a row-specific dialog. It lists price, SMA20, SMA50, and SMA200 and evaluates the exact rules:

- Strong: $Price > SMA20 > SMA50 > SMA200$
- Weak: $Price \le SMA20$, $Price \le SMA50$, and $SMA20 \le SMA50$
- Neutral: every other combination

The Score badge opens a row-specific scorecard. It shows each backend component and its contribution: price/SMA20, SMA alignment, RSI, positive sessions, RVOL, volatility, SMA20 distance, and fund-quality points. Score is capped at 100 and does not include seasonality.

The Status badge opens a detailed rating dialog. It shows the active profile, score thresholds, actual metric values, each profile rule, contribution, SMA50/200 regime, last cross date, and recent-cross warning.

## Term profiles

The `Term` button controls how `Strong Buy`, `Buy`, `Hold`, and `Sell` are calculated.

- `Long term` uses Dist SMA200, SMA50/200 regime, drawdown from ATH, 52-week range position, 1-year return, and fund quality.
- `Short term` uses trend, RSI, positive 20-day sessions, Dist SMA20, RVOL, 20-day volatility, and 1-month return.
- `Custom` lets the user choose from all supported trend, momentum, risk, return, and long-term inputs.

The normalized status score maps to Strong Buy at $\ge 75$, Buy at $\ge 55$, Hold at $\ge 35$, and Sell below 35.

## Watchlist

Use the star beside a ticker to add or remove it from the watchlist. The `Solo watchlist` control in the filters panel shows only saved ETFs. The watchlist is stored in the `etf_watchlist` technical cookie for one year and survives page refreshes in the same browser.

## Capital flows and rotation

The Capital Flows dialog is a relative rotation dashboard, not an observation of actual subscriptions, redemptions, or transfers between funds. Yahoo Finance does not provide certified ETF net-flow or investor-transfer data.

It shows:

- ETF strength and weakness rankings by actual approximately one-month observation dates, return, category, and RVOL.
- Categories currently showing stronger relative demand, ranked by average 1-month return, average RVOL, average score, and number of ETFs.
- Candidate rotations from weaker to stronger ETFs as analytical comparisons only, never as confirmed investor transactions.

## Seasonality and Bull/Bear context

The seasonal engine examines daily and monthly ETF returns across 10, 15, and 20 years where available. It identifies favorable windows containing the current date using positive average return and a configurable minimum success rate.

Historical daily and monthly samples are additionally classified with SPY:

- `Bull`: SPY adjusted close is at or above its SMA200 on that sample date.
- `Bear`: SPY adjusted close is below its SMA200 on that sample date.

The seasonality dialog displays the current SPY regime and Bull/Bear averages and sample counts. These classifications provide context for the market environment; they do not predict outcomes and are not universal across every asset class.

## Project structure

- `app/page.js`: main screener UI, filters, dialogs, profiles, watchlist, and rotation dashboard.
- `app/api/etfs/route.js`: Yahoo data aggregation, return, trend, score, risk, and long-term metric payload.
- `app/api/seasonality/route.js`: seasonality endpoint and SPY benchmark retrieval.
- `app/future-seasonality/page.js`: future seasonality view.
- `lib/technical-metrics.js`: SMA200 distance, ATH drawdown, range position, and SMA cross calculations.
- `lib/investment-status.js`: profile-based status engine.
- `lib/seasonality.js`: seasonal statistics and Bull/Bear sample separation.
- `lib/visible-columns.js`: visible-column preference migration.

## Setup

Requires Node.js 22 or later.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm run start
```

## Verification

```bash
node --test lib/*.test.js
npm run build
npm run verify
```

## Disclaimer

All metrics, ratings, seasonal windows, and rotation signals are informational. Past performance, technical signals, historical seasonal behavior, and relative strength do not guarantee future results. Review fund documentation, trading costs, currency exposure, liquidity, tax treatment, and personal risk tolerance before acting.

## License

This project is licensed for personal, educational, and hobby use only. Commercial use, resale, monetized deployment, and commercial integration require written permission. See [LICENSE](LICENSE).