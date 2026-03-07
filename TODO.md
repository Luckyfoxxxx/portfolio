# TODO

- [ ] **Upgrade dependencies** — Bump Next.js and all other deps across all packages to latest stable versions. Run typecheck, lint, and tests after each major bump.
- [ ] **Prune dependencies** — Audit every `package.json`. Remove anything not strictly required. Goal: minimal footprint.
- [x] **Security review** — Audit auth flow, session handling, rate limiting, input validation on all API routes, cookie settings, and dependency CVEs.
- [x] **UX review** — Review all pages (login, dashboard, holdings, transactions) for usability, accessibility, loading/error/empty states, and mobile responsiveness.
- [ ] **Edit holdings from GUI** — Add UI to update an existing holding (name, quantity, avg cost basis, currency, exchange) with a tRPC mutation on the backend.
