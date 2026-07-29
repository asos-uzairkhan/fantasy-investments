# 10 — Non-Functional Requirements

## Performance

| Metric | Target |
|--------|--------|
| First contentful paint (landing) | < 1.5 s on 4G |
| Leaderboard interactive after login | < 3 s (including RTDB reads, static-file price fetches, and return-% computation) |
| Return recompute (17 → 100 users, 60 symbols, multi-year history) | < 500 ms on a mid-range phone |
| Price data payload | Lazy per-symbol fetch of static CSV files served by GitHub Pages; avoid downloading all 60 symbols' full history when only ~30 are held; browser-cacheable since these are plain static assets |

The prototype computes all portfolio values client-side with a two-pass algorithm; the production client does the equivalent with growth-factor percentages (see [05-game-mechanics.md](05-game-mechanics.md)) and must be profiled at ~100 users and several years of history before launch.

## Scalability Assumptions

- Design for **≤ 200 total participants** (bounded further by the configurable account limit, default 26) and **≤ 100 symbols**. Beyond that, leaderboard computation should move server-side (out of scope for v1).
- RTDB free tier: 1 GB storage / 10 GB-month download — now holding only accounts, portfolios, config, and audit data (no price history), its footprint is tiny and stays comfortably within the free tier indefinitely.
- Price/symbol data lives as plain-text CSV/JSON files in the repo; repo size grows slowly (a handful of rows per symbol per day) and remains trivial even after many years of history.

## Availability & Operations

- Static hosting + Firebase managed services (Spark/free plan only, no Cloud Functions); no servers to patch.
- If the admin doesn't run the price-refresh script for a while, the site still works with the last-fetched prices (degrades gracefully, as prototyped).
- Month roll-over is performed by the same manually-run script; if it's delayed, users simply see their existing "next month" portfolio remain editable for longer — no failure mode, just a later cut-over.
- RTDB backup before any migration step marked irreversible.

## Browser & Device Support

- Evergreen Chrome, Edge, Firefox, Safari (last 2 versions).
- iOS Safari and Android Chrome — primary devices for teenagers; every screen must be fully usable at 360 px width.
- No IE/legacy support.

## Accessibility

- WCAG 2.1 AA: contrast, focus states, keyboard navigation, chart alternatives (see [06-ui-specification.md](06-ui-specification.md)).
- Reduced-motion preference respected (disable chart animations).

## Localisation

- English only, GBP only (v1). Copy kept in one place to ease future translation.

## Testing Strategy

| Layer | Approach |
|-------|----------|
| Return-calculation engine | Unit tests with fixture price data; golden-master test against prototype outputs for the 17 legacy portfolios (guarantees migration doesn't change anyone's score) |
| Security rules | Firebase emulator rule tests (unauthenticated, player, admin, disabled-user matrices) |
| Admin scripts | `refresh_prices.py`'s file-writing logic (default window vs. override, CSV/JSON updates) tested locally against fixture data — no Firebase involved; its month-roll-over portion, plus `reset_password.py` and `hard_delete_user.py`, tested against the Firebase emulator |
| UI flows | Playwright smoke tests: sign-up → set up next month's portfolio → leaderboard; login → edit next month's portfolio; admin soft-delete symbol |
| Manual | Migration rehearsal against a copy of the production DB before go-live |

## Observability

- Admin script output (refresh results, roll-over summaries) reviewed by the admin in the terminal each time it's run.
- Client errors: lightweight `window.onerror` → RTDB `/clientErrors` ring buffer (admin-readable), or a free-tier error service — see Q10.

## Documentation

- Root README rewritten for the production site (operations runbook: running the refresh/roll-over script, adding/soft-deleting symbols, resetting a password, raising the account limit).
- These FinalDesign specs kept as the source of truth and updated as decisions land.
