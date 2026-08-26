# ETF Performance Screener

A Next.js ETF dashboard for screening large-cap, thematic, commodity, bond, crypto, and leveraged ETF exposure using Yahoo Finance data, trend metrics, seasonality windows, and filtering tools.

This project is designed as a personal research and hobby tool. It is intended for analysis and experimentation, not for commercial deployment or monetized distribution.

## Overview

The application combines:
- ETF universe filtering by category and market segment
- live quote and historical metric extraction from Yahoo Finance
- trend and momentum analysis
- seasonality analysis based on historical windows
- a main screener table optimized for rapid comparison
- a dedicated future seasonality view
- detailed modal windows with historical seasonal data

## Features

- ETF screening across a broad set of famous tickers
- category-based filtering and multi-category exclusion
- search by ticker, ETF name, ISIN, or category
- AUM and TER filtering
- ranking by score and custom sort order
- key metrics including:
  - RSI 14
  - positive trading days over 10 and 20 sessions
  - streak of consecutive positive days
  - distance from SMA20
  - relative volume (RVOL)
  - 20-day volatility
  - 52-week distance from high
  - maximum drawdown over 52 weeks
  - AUM
  - 1D / 3D / 1W / 1M returns
  - seasonality alignment
- seasonality modal showing:
  - current-day seasonal view
  - windows by historical depth
  - intersection of positive seasonal days across 10/15/20-year analyses
  - all daily and monthly seasonal tables
- future seasonality page focused on upcoming seasonal opportunities
- cache and timeout handling for Yahoo Finance requests

## Project structure

- app/
  - main UI and routes
  - api/etfs/route.js: ETF data aggregation
  - api/seasonality/route.js: seasonal analysis endpoint
  - future-seasonality/page.js: dedicated future-seasonality dashboard
- lib/
  - etfs.js: ETF ticker catalog and category mapping
  - seasonality.js: seasonal analysis engine
  - yahoo.js: Yahoo Finance wrappers and normalization
  - cache.js: request cache logic
- scripts/
  - verify-etfs.js: ticker verification helper

## Prerequisites

- Node.js 22+
- npm

## Installation

```bash
npm install
```

## Running locally

Development mode:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Environment

This project runs as a Next.js app using the App Router. It fetches data dynamically from Yahoo Finance and computes derived metrics on the server before returning data to the client.

## Data model and logic

### ETF data

The ETF endpoint aggregates multiple metrics for each ticker, including momentum, trend, price structure, seasonality alignment, and quality indicators. Each ETF row is normalized before being displayed in the screener.

### Seasonality analysis

The project builds seasonal windows around the current date and compares them with historical performance over 10, 15, and 20 years. The logic identifies whether the current date falls within a favorable seasonal window and highlights it in the UI.

### Score calculation

The screener uses a weighted score combining:
- relative trend strength
- RSI status
- number of positive sessions
- RVOL participation
- volatility balance
- distance from SMA20
- ETF quality proxy
- seasonality alignment

This score is a decision support metric, not a guarantee of future performance.

## Filtering behavior

The main screen supports:
- search by ticker, ETF name, category, or ISIN
- category-only filtering
- exclusion of categories
- minimum AUM threshold
- maximum TER threshold
- missing data inclusion/exclusion
- minimum seasonal success-rate threshold

## Seasonality interpretation

The seasonal engine is intended to provide context, not certainty. Seasonal windows can be useful for identifying recurring behaviors, but they are never a prediction of future outcomes on their own.

In practical terms:
- a positive seasonal window adds context to a broader trend
- a strong score and favorable seasonality together are more meaningful than either metric alone
- a weak trend with a positive seasonal pattern still needs caution

## Why this project exists

The tool is intended as a personal investment-research and hobby dashboard. It helps compare ETFs across trend, quality, volatility, and recurring historical timing behavior.

It is not provided as a financial advisor platform, commercial analytics product, or brokerage application.

## Verification

The project includes a lightweight verification script for ETF ticker validation:

```bash
npm run verify
```

## License

This project is provided under a personal-hobby license:

- free for personal, educational, and hobby use
- not permitted for commercial use
- no resale, monetization, paid SaaS deployment, or commercial integration without written permission

See the LICENSE file for the full text.

## Disclaimer

This project is for educational and personal analysis purposes only. It does not constitute financial advice, investment advice, legal advice, or trading recommendations.

Use your own judgment, run your own due diligence, and consider professional advice before making any investment decisions.

