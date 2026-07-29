# 09 — Security

## Threat Model & Posture

The prototype's rules were effectively **world-writable** (`.write: true` on symbols, investments, meta, and per-user passwords) and authentication was client-side SHA-256 comparison — acceptable for a closed prototype, not for production. The production posture:

- **Authentication:** Firebase Auth. No password hashes in our database. Firebase handles hashing and brute-force throttling. There are no Cloud Functions and no server — the client and security rules are the entire enforcement surface for Firebase-held data.
- **Authorisation:** RTDB security rules keyed on `auth.uid` and an admin flag. The client UI is never the enforcement point. Firebase now holds **only accounts and portfolios** — price/symbol data lives in the repo as plain static files and isn't subject to RTDB rules at all (its "security" is just normal GitHub repo write access).
- **Data minimisation (minors):** we store only username, an optional email, and portfolio picks. No real names, ages, addresses, or photos.
- **Login required for everything gameplay-related:** the leaderboard and all portfolio data are only visible once signed in — there is no signed-out public view (resolves [11-open-questions.md](11-open-questions.md) Q9).

## Realtime Database Rules (target state, post-migration)

```jsonc
{
  "rules": {
    ".read": false,
    ".write": false,

    "config": {
      ".read": "auth != null",
      ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },

    "users": {
      "$uid": {
        ".read": "auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        "username":  { ".write": "!data.exists() && auth.uid === $uid" },  // set once at sign-up
        "email":     { ".write": "auth.uid === $uid" },                    // owner can add/change/clear any time
        "role":      { ".write": false },   // console/CLI only
        "status":    {
          // admin can set any value (active/disabled/deleted); the owner may only self-soft-delete
          ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin' || (auth.uid === $uid && newData.val() === 'deleted')"
        }
      }
    },

    "usernames": {
      ".read": "auth != null",                // needed for uniqueness check, login, and leaderboard
      "$name": { ".write": "auth != null && (!data.exists() || data.val() === auth.uid)" }
    },

    "emails": {
      ".read": "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$emailKey": { ".write": "auth != null && (!data.exists() || data.val() === auth.uid)" }
    },

    "portfolios": {
      "$uid": {
        ".read": "auth != null",   // logged-in users only — no signed-out/public access (Q9, resolved)
        "$yearMonth": {
          ".write": "auth.uid === $uid && root.child('users').child(auth.uid).child('status').val() === 'active' && $yearMonth === (root.child('config').child('currentYearMonth').val() + 1 month)"
          // NOTE: RTDB rules can't do date arithmetic directly — in practice this is implemented as a
          // plain string-equality check against a value the client cannot forge, e.g. a companion node
          // /config/nextEditableYearMonth that the admin script keeps in sync with currentYearMonth.
          // There is no ".validate" against a symbol catalogue here, because the catalogue
          // (data/symbols/index.json) lives in the repo, not in RTDB — see 04 and 08. "No duplicate
          // symbols" is still guaranteed structurally by storing picks as a map, not a list.
        }
      }
    },

    "audit": {
      ".read":  "root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$id":    { ".write": "root.child('users').child(auth.uid).child('role').val() === 'admin' && !data.exists()" }
    }
  }
}
```

Notes:

- No Cloud Functions exist in this design, so **there is no privileged server identity** — every write, including the admin's month-roll-over, password resets, and hard deletes, is performed either from the admin panel (as an authenticated admin user) or from the admin's local Python scripts, which authenticate using a **Firebase service account** (Admin SDK), the same pattern already used by [seed_firebase.py](../scripts/seed_firebase.py). Service account credentials are never committed to the repo.
- Price/symbol data (`data/symbols/*`) is plain static content served by GitHub Pages — publicly readable like any other page asset, and not covered by these rules at all; its only "write" protection is that only people with repo push access can change it.
- The account-limit check at sign-up (`/config/accountLimit` vs. current user count) is enforced client-side before calling `createUser`; because Firebase Auth account creation itself can't be gated by RTDB rules, this is a soft limit the admin should spot-check occasionally via the Users tab count. A hard guarantee would require a server, which is out of scope while avoiding Cloud Functions.

## Migration-Window Rules

During migration, additionally:

- `/passwords`: `.read: true`, `.write: false` (claim verification only; no more client-side password changes).
- `/investments`: `.read: true`, `.write: false` (legacy bridge).
- `/migration`: readable; writable only via the admin's local migration script (Admin SDK).

Both are removed at migration step 8 (see [04-data-model-and-migration.md](04-data-model-and-migration.md)).

## Application-Level Security

- **Rate limiting:** Firebase Auth throttles login attempts natively; the legacy-claim flow limits attempts client-side (5 per name, then admin-assist).
- **Input validation:** usernames `^[A-Za-z0-9]{3,20}$`; all user-rendered strings are inserted via `textContent`/escaping (no `innerHTML` with user data) to prevent XSS.
- **No secrets in the repo:** the Firebase web config is public by design (unchanged); Yahoo access needs no key; the admin's service-account key used by local scripts is kept outside version control (e.g. `.gitignore`d, or supplied via an environment variable).
- **Audit trail:** all admin actions logged to `/audit` (see [07-admin-panel.md](07-admin-panel.md)), including hard deletes.
- **Backups:** since there's no Blaze plan, RTDB backups (now just accounts/portfolios) are done via a scheduled/manual export using the retained Python scripts; price/symbol data is already backed up implicitly by git history. A manual RTDB export is mandatory before migration step 8.

## Privacy & Compliance (minors)

- Sign-up collects a username and password only; email is optional and used solely for account recovery/contact.
- **Account deletion is soft by default:** the user's own "Delete account" action sets `status: "deleted"`, anonymises their username for display, and removes their email — but keeps their `uid` and portfolio history intact so past leaderboard results stay valid. **Only an admin can permanently erase an account** (Firebase Auth record + all RTDB nodes), via the local `hard_delete_user.py` script — deliberately not a one-click browser action, given how destructive it is.
- Privacy notice page added to the site footer.
