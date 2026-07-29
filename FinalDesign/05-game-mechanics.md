# 05 — Game Mechanics

The core monthly buy/hold/sell cycle is **carried over from the prototype**, but scoring changes from absolute £ values to **pure percentage gain/loss**, the competition is **ongoing across multiple years** rather than a single season, and participants **edit their own next month's portfolio** directly.

## Competition Parameters (global, in `/config`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Duration | Ongoing, no end date | Data keyed by `YYYY_MM`; simply continues year after year |
| Reference capital | None stored | Scoring is percentage-only. Users may type any hypothetical amount into the UI to see what it implies in cash terms — this is **transient, never saved** (see "Reference Amount" below) |
| Benchmark | S&P 500 (SPX), always | Not configurable |
| Portfolio size | No minimum/maximum other than ≥ 1 symbol | The **only** constraint is that a portfolio cannot contain the same investment twice (enforced by storing portfolios as a map of symbol → true, not a list) |
| Monthly changes | Participants edit **next month's** portfolio themselves, any time, as many times as they like | No admin involvement, no "one swap" limit — full self-service editing of the not-yet-started month |
| Account limit | 26 by default, admin-configurable | Sign-ups blocked once reached |

## Monthly Cycle (unchanged mechanics from prototype)

1. **Buy** — on the first trading day of each month, an equal weighting is applied across all symbols in that month's portfolio (e.g. 8 symbols → 12.5% each). Growth is tracked as a ratio, not an amount.
2. **Hold** — throughout the month, each symbol's running price is tracked (weekends/holidays use the most recent known price).
3. **Sell / roll over** — on the first trading day of the following month, that month's return is finalised and the next month's (already-configured) portfolio begins.

### Formulas

For a portfolio holding symbols $s \in S$ during month $M$:

$$g_{s,M} = \frac{P_s(\text{sell})}{P_s(\text{buy})} \quad\text{(single-symbol growth factor for month } M\text{)}$$

$$G_M = \frac{1}{|S|}\sum_{s \in S} g_{s,M} \quad\text{(equal-weighted portfolio growth factor for month } M\text{)}, \qquad r_M\% = (G_M - 1) \times 100$$

Cumulative return since a user's `joinedYearMonth`, compounding every completed month $M_1 \dots M_n$:

$$G_{\text{cum}} = \prod_{i=1}^{n} G_{M_i}, \qquad \text{return\%} = (G_{\text{cum}} - 1) \times 100$$

$$\alpha = \text{return\%} - \text{SPX return\%}_{\text{(same window)}}$$

- **Ranking:** descending by cumulative `return%` since each user's own `joinedYearMonth` (this is the fairest comparison across users who joined in different months/years, and mirrors how the prototype already compared mid-season joiners to the benchmark over their own window).
- No prize amounts are modelled in the app (there's no stored reference amount to calculate a prize from) — if the organisers want a real-world prize, that's an out-of-band decision using whatever reference amount they choose.

## Reference Amount (new, transient, UI-only)

- On **My Portfolio** (and optionally the Leaderboard), the user can type any amount (e.g. "£100") into a "See this in cash" field.
- Displayed value: $\text{amount} \times G_{\text{cum}}$, recalculated live as the amount changes.
- **Never persisted** — it resets on reload and is purely an illustrative/educational tool ("if I'd put in £100, I'd have £X now").

## Editing Next Month's Portfolio (new — replaces "monthly substitution")

- From **My Portfolio**, the user sees a "Next Month" editor showing the portfolio that will take effect on the 1st of next month.
- It **defaults to a copy of the current month's portfolio** if the user hasn't touched it yet (carry-forward), so doing nothing simply continues unchanged.
- The user can add or remove any number of symbols, at any time, as often as they like, right up until that month starts. The only rule enforced is **no duplicate symbols** (the picker simply won't offer symbols already in the list).
- Because there's no server-side function, the carry-forward default and the transition from "next month" to "current month" are materialised by the admin's monthly script (see [08-market-data-pipeline.md](08-market-data-pipeline.md)): when it runs after a new calendar month begins, it (a) copies forward any user's portfolio who didn't set one, and (b) advances `/config/currentYearMonth`, which is what makes the *following* month editable in the UI.

## Joining Mid-Year / Mid-Cycle (new)

- A newly signed-up user sets up a portfolio immediately, but it only goes live from the **1st of the month after they joined** (`joinedYearMonth`).
- Their cumulative return is always computed from their own `joinedYearMonth`, so joining in, say, month 6 of a year is no different in principle to joining in month 1 — everyone's clock starts when they join. The leaderboard shows a "joined `YYYY-MM`" tag for context.

## Monthly Performance History (new)

Each user can view their own monthly performance across every year they've participated:

- **Bar chart** — x-axis: month (Jan–Dec) for a selected year (dropdown, defaulting to the most recent year with data); y-axis: that month's `r_M%`. Bars are green for a gain, red for a loss.
- **Table** — beneath the chart, a raw-numbers table with one row per year the account has been active and one column per month, showing the same `r_M%` values (blank for months before joining or not yet completed). This gives the full multi-year history at a glance, while the chart focuses on one year at a time.

See [06-ui-specification.md](06-ui-specification.md) for layout.

## Benchmark

- SPX prices are stored the same way as any other symbol — as a CSV file in the repo (`data/symbols/SPX.csv`), not in Firebase — and its own monthly growth factors are computed the same way as a single-symbol "portfolio."
- Leaderboard and My Portfolio show the S&P 500 return % over the same window as the user's participation, and the resulting alpha (vs S&P 500), as in the prototype.

## Edge Cases (carried over from prototype behaviour, adapted)

| Case | Behaviour |
|------|-----------|
| No price yet for the month's first day(s) | Use first available price on/after the 1st |
| Next month's price not yet available when the admin's script runs | Hold at latest known price until data arrives; corrected on the next script run |
| Symbol soft-deleted by admin mid-way | Existing holders keep it (frozen at last known price) for the current month, but it's excluded from the "next month" picker; users are prompted to replace it before their next-month portfolio locks in |
| User has not yet completed a full month | Not ranked on the leaderboard yet; portfolio setup and read-only browsing still available |

