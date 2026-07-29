# Fantasy Investments — Final Design Specification

This folder contains the design specification for the **production version** of Fantasy Investments, a website that gets teenagers familiar with investing before they turn 18, using virtual money and real market data.

The prototype (in the repository root) has completed testing. These documents describe the final design, which adds features that were out of scope for the prototype — most notably **self-service sign-up**, **in-app investment picking**, and **proper authentication** — while remaining compatible with the **existing Firebase Realtime Database** so current participants can continue seamlessly.

## Document Index

| Doc | Title | Contents |
|-----|-------|----------|
| [01-product-overview.md](01-product-overview.md) | Product Overview | Vision, goals, audience, feature summary, prototype → production deltas |
| [02-architecture.md](02-architecture.md) | Architecture | Tech stack, hosting, Firebase services, data flow |
| [03-authentication-and-accounts.md](03-authentication-and-accounts.md) | Authentication & Accounts | Sign-up page, login, password reset, migration of existing users |
| [04-data-model-and-migration.md](04-data-model-and-migration.md) | Data Model & Migration | Firebase schema (current + new), backwards compatibility, migration steps |
| [05-game-mechanics.md](05-game-mechanics.md) | Game Mechanics | Rules, portfolio maths, scoring, monthly portfolio editing |
| [06-ui-specification.md](06-ui-specification.md) | UI Specification | Every page/screen, components, states, responsive behaviour |
| [07-admin-panel.md](07-admin-panel.md) | Admin Panel | User management, competition management, moderation |
| [08-market-data-pipeline.md](08-market-data-pipeline.md) | Market Data Pipeline | Symbol universe, price refresh, Yahoo Finance integration |
| [09-security.md](09-security.md) | Security | Firebase security rules, threat model, data protection for minors |
| [10-non-functional-requirements.md](10-non-functional-requirements.md) | Non-Functional Requirements | Performance, accessibility, browser support, testing |
| [11-open-questions.md](11-open-questions.md) | Open Questions | Decisions still to be made before implementation |

## How to Use These Docs

1. Review each document and leave comments / edits.
2. Resolve items in [11-open-questions.md](11-open-questions.md).
3. Iterate until the design is agreed.
4. Implementation is planned only after sign-off on these specs.

## Guiding Principles

- **Continuity** — existing participants (Alpha … Tango) keep their accounts, portfolios, and history in the same Firebase project.
- **Self-service** — new users can join without an admin hand-editing CSVs or the Firebase console.
- **Education first** — every feature should help a teenager understand real investing concepts (diversification, benchmarks, risk).
- **Safe for minors** — minimal personal data, no real money, appropriate security.
- **Low-cost & simple to operate** — static hosting + Firebase free tier where possible; no server to maintain unless strictly required.
