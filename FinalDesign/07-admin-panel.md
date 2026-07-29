# 07 — Admin Panel

The prototype admin panel only managed passwords. The production panel is a full operations console, still inside the SPA, visible only to users with `role: admin` (and enforced server-side by security rules — the UI check is cosmetic). There is **no approvals queue** — accounts are active immediately at sign-up, gated only by the account limit.

## Sections

### 1. Users (default tab)

- Table of all users: username, email (if set), role, status, legacy name (if migrated), joined `YYYY-MM`, cumulative return %.
- Actions per user:
  - **Disable / re-enable** account (temporary, reversible).
  - **Hard delete** (new, admin only) — permanently removes the account. Shown with a strong confirmation dialog explaining it's irreversible and erases the Firebase Auth record plus all of the user's RTDB data; in practice the admin runs this via the local `hard_delete_user.py` script rather than a single in-browser click (see [02-architecture.md](02-architecture.md) and [04-data-model-and-migration.md](04-data-model-and-migration.md)). Distinct from a user's own **soft delete**, which just anonymises them and keeps their history.
  - **Reset password** — runs/records the outcome of the local `reset_password.py` script (see [02-architecture.md](02-architecture.md)); the admin relays the new password to the user directly. This is the only path for "forgot password" in v1.
  - **View portfolio** (current and next month).
  - **Edit next month's portfolio on a user's behalf** — useful for helping younger users who need support.
- Legacy section during migration: unclaimed prototype accounts with a **Claim on behalf** action (see [03-authentication-and-accounts.md](03-authentication-and-accounts.md)).

### 2. Competition Settings (new)

- **Account limit** — number input (default 26); sign-ups are blocked once the active user count reaches this value.
- **Current year/month pointer** (`config/currentYearMonth`) — shown read-only, with the date it was last advanced; can be manually overridden if the monthly script wasn't run (see [08-market-data-pipeline.md](08-market-data-pipeline.md)).
- Benchmark is fixed to SPX and not editable.

### 3. Symbols (new, repo-backed)

Since the symbol catalogue and price history now live in `data/symbols/` in the repo rather than Firebase (see [04](04-data-model-and-migration.md) and [08-market-data-pipeline.md](08-market-data-pipeline.md)), this tab is primarily a **read-only view** fetched from the deployed `index.json`, plus instructions for the script-driven workflow:

- Table of the symbol universe: symbol, name, category, sector, Yahoo ticker, deleted flag, last price date — read directly from `data/symbols/index.json` and each CSV's latest row.
- To **add a symbol**: the admin adds an entry to `index.json` and runs `refresh_prices.py --full-history`, then commits and pushes.
- To **soft-delete a symbol**: the admin sets `"deleted": true` in `index.json` and pushes. Price history and any past portfolios that included it remain fully intact and computable, so historical performance figures never change.
- To **restore** a soft-deleted symbol: clear the flag and push.
- Data-health warnings: symbols whose latest price is stale are flagged, prompting the admin to run the refresh script.

### 4. Data Refresh (manual, admin-run)

- Status card: `meta/lastRefresh`, per-symbol freshness.
- This tab is purely informational — the actual refresh happens by the admin running `refresh_prices.py` from a terminal (see [08-market-data-pipeline.md](08-market-data-pipeline.md)); there is no in-browser trigger, since Yahoo Finance cannot be called reliably from client-side JavaScript and there are no Cloud Functions.

## Audit & Safety

- All admin actions are appended to `/audit/{pushId}: {actorUid, action, targetUid, detail, at}` (write-only from admin clients, readable by admins).
- Destructive actions (disable, hard delete, soft-delete symbol) require a confirmation dialog stating the consequence; hard delete additionally requires running the local script rather than a single click, as a deliberate extra safeguard.
- Admin role can only be granted via the Firebase console / CLI, never from the panel itself.
