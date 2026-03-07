# TODO

- [x] **Upgrade dependencies** — Bump Next.js and all other deps across all packages to latest stable versions. Run typecheck, lint, and tests after each major bump.
- [x] **Prune dependencies** — Audit every `package.json`. Remove anything not strictly required. Goal: minimal footprint.
- [x] **Security review** — Audit auth flow, session handling, rate limiting, input validation on all API routes, cookie settings, and dependency CVEs.
- [x] **UX review** — Review all pages (login, dashboard, holdings, transactions) for usability, accessibility, loading/error/empty states, and mobile responsiveness.
- [x] **Edit holdings from GUI** — Add UI to update an existing holding (name, quantity, avg cost basis, currency, exchange) with a tRPC mutation on the backend.
- [x] **Test DB with dev seed data** — Add `packages/db/scripts/seed-dev.ts` (non-interactive, deterministic) that runs migrations on `data/test.db` and populates it with a user (`admin`/`password123456`), 7 holdings (VTI, VOO, VXUS, AAPL, MSFT, NVDA, GOOGL), ~2 years of transactions, 30 days of price snapshots, and news items. Add root scripts `db:seed-dev` and `dev:testdb` (points Next.js at `data/test.db`).
