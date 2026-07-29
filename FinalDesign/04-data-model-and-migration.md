# 04 — Data Model & Migration

## Principles

- **Same Firebase project and Realtime Database** as the prototype (`fantasy-investments-2026`, europe-west1), but its scope is now **narrow: accounts and portfolios only**.
- **Investment price history and the symbol catalogue are not stored in Firebase.** They live as version-controlled files in this repo (`data/symbols/`) and are fetched by the client directly from the deployed static site — see [08-market-data-pipeline.md](08-market-data-pipeline.md).
- **Additive changes first**: new nodes are added alongside prototype nodes; prototype nodes are only removed after migration completes.
- **No seasons** — the competition runs indefinitely across multiple years. All time-based data is keyed by **year/month** (`YYYY_MM`), so the same schema works forever.
- Keyed by **uid** for new data; legacy name-keyed data is bridged via `legacyName`.

## Full Schema (Production, Firebase)

```
/config
    accountLimit: 26                   # configurable by admin; blocks sign-up once reached
    currentYearMonth: "2026_07"        # the latest month considered "current"; advanced by the
                                       # admin's monthly script. Only the NEXT month after this
                                       # value is writable by portfolio owners.

/users/{uid}
    username: string                   # unique, 3-20 chars, shown everywhere, doubles as login id
    email: string | null               # optional; unique if present; contact/recovery only
    role: "player" | "admin"
    status: "active" | "disabled" | "deleted"   # "deleted" = soft delete, see below
    joinedYearMonth: "2026_08"         # first month this user's portfolio is live (signup month + 1)
    legacyName: string | null          # e.g. "Alpha" — links prototype history
    createdAt: ISO date

/usernames/{username}: uid             # uniqueness index + username → uid lookup
/emails/{emailKey}: uid                 # uniqueness index for optional emails
                                       # (emailKey = lowercased email, "." replaced with ",")

/portfolios/{uid}/{YYYY_MM}
    /{symbol}: true                    # map, not array — a symbol can only appear once per
                                       # month, which is what makes "no duplicate investments"
                                       # a property of the data shape itself. Only the entry for
                                       # (config/currentYearMonth + 1) is writable by the owner;
                                       # all other months are immutable once reached.

/migration/{legacyName}
    claimed: boolean
    uid: string | null

/audit/{pushId}: {actorUid, action, detail, at}

# ── Legacy prototype nodes (read-only during migration, deleted after) ──
/passwords/...                         # SHA-256 hashes — used only by the claim flow
/investments/{Name}/{YYYY_MM}: [...]   # 2026 history for legacy users (array format, prototype-era)
```

Note there is **no `/symbols` node** in production — this differs from the prototype, where `/symbols` held both prices and (implicitly, in JS) metadata. See "Symbol & Price Data" below.

## Symbol & Price Data (repo, not Firebase)

```
data/symbols/index.json                # array/map of symbol metadata:
    {
      "AAPL": { "name": "Apple Inc.", "category": "stock", "sector": "Technology",
                 "yahooTicker": "AAPL", "deleted": false },
      ...
    }

data/symbols/{SYMBOL}.csv               # date,value — unchanged format from the prototype
```

- Maintained by the admin's `refresh_prices.py` script and committed to the repo (see [08-market-data-pipeline.md](08-market-data-pipeline.md)).
- Soft-deleting a symbol sets `"deleted": true` in `index.json` — price history and any past portfolios that used it remain fully intact and computable; it's simply excluded from future "next month" pickers.
- Because this data isn't in Firebase, RTDB security rules **cannot** validate that a symbol a user picks actually exists or isn't deleted — that check is enforced **client-side only**, trusting the repo-fetched catalogue. The only structural rule Firebase itself can still guarantee is "no duplicate symbols in a month" (via the map shape).

## Account Deletion: Soft vs. Hard

- **Self-service delete** (Account Settings) — sets `status: "deleted"`, clears `email` from `/users/{uid}` and removes the `/emails/{emailKey}` index entry (freeing the email for reuse), and anonymises `username` for display purposes (e.g., "Retired player"). The Firebase Auth record and `/portfolios/{uid}` history are **kept** so past leaderboard results remain valid and computable. The account can no longer log in (status check blocks it) and no longer counts toward the account limit... **counting rule: see Q-equivalent note in [11-open-questions.md](11-open-questions.md)**.
- **Hard delete** (admin only, via the local `hard_delete_user.py` script — see [02-architecture.md](02-architecture.md)) — permanently removes the Firebase Auth record, `/users/{uid}`, the `/usernames/*` and `/emails/*` index entries, and `/portfolios/{uid}`. Irreversible; requires the admin to run it locally with the Firebase Admin SDK, deliberately outside the browser UI to avoid an accidental destructive click.

## Legacy Data Bridge

Rather than rewriting `/investments/{Name}` under uids (risky while the prototype is still live), the client resolves a user's pre-migration history as:

```
portfolio(user, YYYY_MM) =
    /portfolios/{uid}/{YYYY_MM}         if it exists
    else /investments/{legacyName}/{YYYY_MM}   (read-only legacy bridge, array format)
```

A one-time admin migration script (extension of [seed_firebase.py](../scripts/seed_firebase.py)) copies each claimed user's `/investments/{Name}/*` entries into `/portfolios/{uid}/*` (converting the array format to the new map-of-symbols format). After all copies are verified, `/investments` is deleted and the bridge code removed.

## Migration Plan (Ordered)

| Step | Action | Reversible? |
|------|--------|-------------|
| 1 | Enable Firebase Auth on the existing project | Yes |
| 2 | Deploy new security rules that keep `/passwords` readable, `/investments` read-only, and add the new nodes above | Yes |
| 3 | Generate `data/symbols/index.json` from the `SYMBOL_METADATA` map currently hard-coded in [script.js](../script.js), and commit it to the repo | Yes |
| 4 | Create `/config` (accountLimit=26, currentYearMonth = current real month) and `/migration/{Name}` entries | Yes |
| 5 | Deploy the new site; both prototype and new site can run simultaneously against the same DB | Yes |
| 6 | Users claim accounts; script copies claimed users' history to `/portfolios/{uid}` | Yes |
| 7 | After deadline: admin-assist remaining users, verify copies | Yes |
| 8 | Delete `/passwords`, `/investments`; remove legacy bridge; retire prototype URL | **No — take DB backup first** |

## Validation Rules (enforced by security rules)

- `/portfolios/{uid}/{month}`: at least one symbol required; no maximum; no category-mix requirement — the **only** structural constraint Firebase can enforce is "no duplicates," which the map shape already guarantees. Whether a symbol genuinely exists / isn't soft-deleted is a **client-side** check against `data/symbols/index.json` (see above).
- Only the single month equal to `config/currentYearMonth + 1` is writable by the owning uid; earlier and later months are read-only from the client.
- `/usernames/{username}` and `/emails/{emailKey}`: written only via the uniqueness-index pattern (a name/email can only be claimed if not already taken).
- `role` and `config/*` are writable only by admins; `status` writable by admins (disable/re-enable, or hard-delete via script) and by the owner only to set `"deleted"` (self-service soft delete) — never back out of it without admin help.

## Data Volumes (for rule/perf sanity)

- RTDB now stores only accounts and portfolios — tens of users × a handful of small fields each, plus a few symbol keys per month. This is a tiny fraction of the prototype's footprint and stays well within the free tier indefinitely.
- Price history lives as plain-text CSVs in git; ~60 symbols × ~250 trading-day rows per year is a trivial amount of repo size, even accumulated over many years.
- Leaderboard load = 1 read of `/portfolios` (RTDB) + a handful of `fetch()` calls for the relevant symbols' CSVs (static files, cached by the browser/CDN) — the client only needs price history back to each user's `joinedYearMonth`, not the whole file.
