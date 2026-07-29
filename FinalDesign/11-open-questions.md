# 11 — Open Questions

Decisions to resolve before implementation. Each has a recommendation to accept, amend, or reject during design iteration.

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| **Q10** | Client error reporting | (a) None; (b) RTDB ring buffer; (c) free-tier Sentry | **(b)** — zero cost, adequate at this scale |
| **Q11** | Migration deadline: how long do legacy users have to claim accounts before `/passwords` is deleted? | e.g. 4, 8, 12 weeks; admin-assist after | **8 weeks**, with reminders via the prototype site banner |
| **Q12** | Do we keep the 2026 prototype live during migration? | (a) Yes, read-only banner pointing to new site; (b) redirect immediately | **(a)** — safer, both run off the same DB by design |
| **Q13** | Account limit reached at sign-up: hard block, or a waitlist? | (a) Hard block with "contact the admin" message; (b) waitlist form that emails/notifies the admin | **(a)** for v1 — simplest, matches "new users can not sign up if the limit is hit" |
| **Q14** | Exact mechanism for admin-driven password resets | (a) Local Python script using the Firebase Admin SDK (`reset_password.py`) to set a new password directly; (b) admin manually deletes and recreates the Firebase Auth user | **(a)** — non-destructive, keeps the same uid and history intact |
| **Q15** | Should the account-limit check be a hard server-side guarantee? | (a) Client-side check only (can theoretically be raced by concurrent sign-ups); (b) accept occasional slight overshoot as acceptable at this scale | **(b)** — a proper guarantee needs a server, which conflicts with the "no Cloud Functions" constraint; the admin can just disable an account if the limit is exceeded by a rare race |

## Resolved

- **Frontend tech (Q1)** — **React**, via Vite. Charts continue to use Chart.js, wrapped with `react-chartjs-2`, so existing chart specs carry over unchanged.
- **Hosting (Q2)** — **GitHub Pages**, continuing unchanged from the prototype.
- **Portfolio/leaderboard visibility (Q9)** — **Login required for everything.** There is no signed-out teaser or public view of the leaderboard or any portfolio; the landing page is marketing copy only.
- **Investment price/symbol data storage** — Moved entirely **out of Firebase and into the repo** (`data/symbols/*.csv` + `data/symbols/index.json`), fetched by the client as plain static files served by GitHub Pages. Firebase RTDB now stores only accounts, portfolios, config, and audit data. See [02-architecture.md](02-architecture.md), [04-data-model-and-migration.md](04-data-model-and-migration.md), and [08-market-data-pipeline.md](08-market-data-pipeline.md).
- **Account deletion (Q6)** — Self-service delete is a **soft delete**: anonymises the username, clears the email, but keeps the uid and portfolio history intact so past leaderboard results stay valid. **Hard delete is admin-only**, performed via a dedicated local `hard_delete_user.py` script (Firebase Admin SDK) that permanently removes the Auth record and all associated RTDB data — deliberately kept out of the browser UI given how destructive it is. See [03-authentication-and-accounts.md](03-authentication-and-accounts.md), [04-data-model-and-migration.md](04-data-model-and-migration.md), [07-admin-panel.md](07-admin-panel.md), and [09-security.md](09-security.md).
- **Cloud Functions / Blaze plan** — **Rejected.** The project stays entirely on Firebase's free Spark plan. All scheduled work (price refresh, month roll-over) is done by the admin manually running `scripts/refresh_prices.py`, with a default window of the last 60 days, overridable for full-history backfills.
- **Monthly roll-over mechanism** — Performed by the same manual script the admin already runs for price refreshes, not a separate scheduled job.
- **Minors & consent at sign-up** — Resolved by minimising data collection instead of adding consent flows: sign-up only asks for a username, password, and an optional email. No age/guardian consent checkbox is included in v1.
- **Prize configuration** — Not modelled in the app. Since there's no stored reference amount, any real-world prize is an out-of-band decision by the organisers.
- **Mid-year/mid-cycle joiners** — Each user's cumulative return is computed from their own `joinedYearMonth`, so there's no special pro-rating logic needed; everyone's "clock" simply starts when they join.
- **Seasons** — Removed entirely. The competition is ongoing across multiple years, with data keyed by `YYYY_MM`.
- **Portfolio constraints** — Reduced to a single rule: no duplicate symbols in the same month's portfolio (no size minimum/maximum, no category-mix requirement).
- **Admin approval of new accounts** — Removed. Accounts are active immediately; the only gate is the configurable account limit (default 26).
