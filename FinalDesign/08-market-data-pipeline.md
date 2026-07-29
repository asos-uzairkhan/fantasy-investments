# 08 — Market Data Pipeline

## Symbol Universe

- ~60 symbols across four categories (unchanged from prototype): 40+ stocks, 6 crypto, 6 commodities, 7 funds/ETFs (incl. SPX benchmark and Islamic ETFs HLAL/UMMA/ISWD).
- **All price history and symbol metadata live in this repo, not in Firebase** — a deliberate change from earlier drafts of this design. Concretely:
  - `data/symbols/{SYMBOL}.csv` — daily prices, unchanged `date,value` format from the prototype.
  - `data/symbols/index.json` — metadata per symbol: name, category, sector, Yahoo ticker, and a `deleted` flag for soft-deletion. This replaces the `SYMBOL_METADATA` map currently hard-coded in [script.js](../script.js).
- All prices stored in **GBP** (crypto fetched as `-GBP` pairs; USD instruments converted — same approach as prototype).

## Refresh Model: Manual, Admin-Run Script (no Cloud Functions, no Firebase writes for prices)

Everything stays on Firebase's free Spark plan, and price data is **never written to Firebase at all**. Instead, the admin runs `scripts/refresh_prices.py` (an evolution of [generate_symbols.py](../scripts/generate_symbols.py)) locally, whenever convenient:

```bash
# default: refreshes the last 60 days through yesterday, for every non-deleted symbol
uv run python scripts/refresh_prices.py

# override the start date — e.g. after adding a brand-new symbol that needs full history
uv run python scripts/refresh_prices.py --start 2024-01-01

# or an explicit full-history backfill flag for convenience
uv run python scripts/refresh_prices.py --full-history
```

1. Read active (non-`deleted`) symbols + tickers from `data/symbols/index.json`.
2. Fetch prices for the requested window (default **today − 60 days → yesterday**) from Yahoo Finance via `yfinance`.
3. **Append/update rows directly in `data/symbols/{SYMBOL}.csv`** — plain local file edits, no network call to Firebase.
4. **Month roll-over pass against Firebase** (the one part of this script that *does* touch the database, since there's no other trigger for it): if the real-world current month has advanced past `/config/currentYearMonth`, then for every user missing a portfolio entry for the new month, copy their most recent month's portfolio forward, then advance `/config/currentYearMonth`.
5. Print a summary (symbols updated, users rolled over, any errors) to the terminal.
6. **The admin reviews the git diff, then commits and pushes.** GitHub Pages redeploys automatically, publishing the updated prices — until this push happens, the live site keeps serving the previously-published prices.

There is no in-browser refresh trigger and no multi-tab locking — the prototype's client-side refresh logic is retired entirely, since a human is now always the one initiating it, and the data change only takes effect once committed to the repo.

## Historical Backfill & New Symbols

- Adding a symbol means adding an entry to `data/symbols/index.json` (via the script or by hand), then running `refresh_prices.py --full-history` (or `--start <date>`) to create its CSV from scratch.
- The existing Python utility [generate_symbols.py](../scripts/generate_symbols.py) remains as the basis for `refresh_prices.py`; [seed_firebase.py](../scripts/seed_firebase.py) is retained only for the one-time legacy migration (it no longer seeds `/symbols` in production).

## Data Quality Rules

| Rule | Handling |
|------|----------|
| Missing weekend/holiday prices | Expected; valuation uses most recent price (unchanged) |
| Zero/negative/NaN price from source | Rejected, previous value retained, warning printed |
| Price moves > 50% day-over-day | Written but flagged in the script's summary output for admin review before committing (split/data-error detection) |
| Stale symbol (no new data for a while) | Flagged in the admin panel's Symbols tab (which reads `index.json` and the CSVs' latest dates) so the admin knows to investigate or soft-delete it |

## Client Consumption

- The client fetches `data/symbols/index.json` once per session, then fetches each held symbol's CSV lazily (leaderboard needs all symbols held by the users being displayed; Explore fetches on demand) — plain `fetch()` requests against the same static host, cacheable by the browser.
- All % returns are computed locally with the growth-factor formulas in [05-game-mechanics.md](05-game-mechanics.md) — no server-side calculation engine, and no Firebase involvement for this part of the app at all.
- Because price history accumulates indefinitely (multi-year, no season boundary), the client only needs to fetch back to the **earliest `joinedYearMonth`** among the users currently being displayed, not the symbol's entire history — though since these are static files, over-fetching is cheap and cacheable compared to a database read.
