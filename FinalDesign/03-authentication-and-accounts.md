# 03 — Authentication & Accounts

## Goals

- New users can create their own account via a **sign-up page** (not in the prototype), collecting the **minimum possible data**: username, password, and an optional email.
- Existing prototype users (Alpha … Tango + admin) continue with **no data loss** and a smooth first login on the new site.
- Replace the prototype's custom SHA-256-in-RTDB scheme with **Firebase Authentication**.
- No admin approval step — anyone can join, gated only by a configurable **account limit** (default 26).

## Account Model

| Field | Source | Notes |
|-------|--------|-------|
| `uid` | Firebase Auth | Primary key for all user data in RTDB |
| `username` | Sign-up form | Shown everywhere (leaderboard, portfolio). Unique, 3–20 chars, letters/numbers only. Existing users keep their names (Alpha, Bravo, …). Doubles as the login identifier |
| `email` | Sign-up form (optional) | Unique if provided. Used only for the admin to identify/contact a user — no verification emails or reset emails are sent in v1 |
| `role` | RTDB `/users/{uid}/role` | `player` or `admin` |
| `status` | RTDB `/users/{uid}/status` | `active` or `disabled` — **no `pending` state, no approval workflow** |

Firebase Authentication requires a unique identifier per account; since email is optional, the client signs the user up with Firebase Auth using a synthetic internal address of the form `{username}@users.fantasy-investments.local` when no real email is given, while the real (optional) contact email — if any — is stored separately in `/users/{uid}/email` and used for uniqueness/admin contact only. This keeps "no email" genuinely optional from the user's perspective while satisfying Firebase Auth's requirements.

## Sign-Up Flow (new)

```mermaid
flowchart LR
    A[Sign-up form: username, email?, password] --> B{Account limit reached?}
    B -->|Yes| C[Blocked: "Sign-ups are full"]
    B -->|No| D[Firebase Auth createUser]
    D --> E[/users/uid created, status=active/]
    E --> F[Set up next month's portfolio]
    F --> G[Active player on leaderboard]
```

1. **Sign-up form** — fields: username, password (min 8 chars), confirm password, email (optional, with a note that it's needed only for account recovery). Username uniqueness is checked live against `/usernames`; email uniqueness (if provided) checked against `/emails`. **One account per email** — an email already in use blocks sign-up.
2. **Account limit check** — the client checks `/config/accountLimit` against the current user count before allowing sign-up; if the limit is reached, sign-up is blocked with a message to contact the admin (who can raise the limit — see [07-admin-panel.md](07-admin-panel.md)).
3. **Account created immediately** — no approval step. `status: active` from the start.
4. **Set up next month's portfolio** — the user is taken straight into the same portfolio editor existing users use to edit next month's holdings (see [06-ui-specification.md](06-ui-specification.md)). Their portfolio becomes live from the **1st of the following calendar month** (`joinedYearMonth`).
5. The user immediately sees the full leaderboard; they simply have no results until their first month completes.

## Login Flow

- Username (or email, if set) + password via Firebase Auth.
- **"Forgot password?"** — a skeleton screen only in v1: no email is sent. It tells the user to contact the admin, who resets the password manually via a local script (see [02-architecture.md](02-architecture.md)). The UI/route exists now so a real email-based flow can be dropped in later without redesign.
- Session persistence: local (stay signed in on the device), with explicit Logout in the header as today.
- After login the SPA loads the user's profile from `/users/{uid}` and routes by `status`/`role`.

## Migration of Existing Users

Existing users have only a username and a SHA-256 password hash in `/passwords/users/{Name}` — no email, and hashes are not portable to Firebase Auth. Migration is a **one-time claim flow**:

1. Admin pre-creates a mapping node `/migration/{Name}: {claimed: false}` for each legacy participant.
2. Login page shows a link: **"Played the 2026 prototype? Claim your account."**
3. Claim form: legacy username + legacy password (verified against the existing SHA-256 hash in `/passwords`, exactly as the prototype did) + new password + email (optional).
4. On success (client-side, since there are no Cloud Functions — the claim performs a Firebase Auth `createUser` directly from the browser once the legacy password check passes):
   - Create Firebase Auth user with the username (synthetic address, as above) and new password.
   - Create `/users/{uid}` with `username` = legacy name, `status: active`, `legacyName: {Name}`.
   - Point `/usernames/{Name}` at the new uid; mark `/migration/{Name}.claimed = true`.
   - Their existing `/investments/{Name}` history is linked via `legacyName` (data is **not** moved — see [04-data-model-and-migration.md](04-data-model-and-migration.md)).
5. Once claimed, legacy login for that name is disabled. After all users have migrated (or a deadline passes), `/passwords` is deleted.

Fallback: admin can perform the claim on a user's behalf (e.g., for a user who forgot their prototype password) using the same local admin scripts used for password resets.

## Change Password / Account Settings

- **Change password** — via Firebase Auth `updatePassword` (re-authentication required), replacing the prototype's modal + RTDB hash write.
- **Account Settings page** (new) — add or change email at any time (uniqueness re-checked), change password, delete account. Username changes are **not** supported in v1 (it's the public leaderboard identity and login id) — revisit if requested.
- **Delete account** — self-service delete is a **soft delete**: sets `status: "deleted"`, clears/frees the email, and anonymises the username on the leaderboard. Portfolio history is kept intact so past results remain valid, and the account can no longer log in. **Only an admin can permanently (hard) delete** an account — see [07-admin-panel.md](07-admin-panel.md) and [04-data-model-and-migration.md](04-data-model-and-migration.md).

## Admin Account

- The prototype `admin` user is migrated the same way; `role: admin` is set manually in the Firebase console once (roles are never writable from the client).
- Multiple admins supported.

## Error States

| Case | Behaviour |
|------|-----------|
| Account limit reached | Sign-up blocked with a clear message; no waitlist in v1 |
| Username taken | Inline error with suggestions |
| Email already registered | Inline error — only one account per email |
| Legacy claim with wrong password | Error; 5 attempts then locked, admin must assist |
| Disabled account logs in | "Account disabled — contact the admin" screen |
| Deleted (soft-deleted) account logs in | "This account has been deleted" screen — no way back in without admin help |
| "Forgot password" used | Skeleton screen: "Please contact the admin to reset your password" — no email sent |
