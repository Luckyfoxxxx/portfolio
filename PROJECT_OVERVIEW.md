# Portfolio Tracker — Project Overview

Personal investment tracking web app. Tracks international stocks, shows P&L across time periods, integrates live prices and financial news. Designed for mobile access. Single-user, security-first.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| API layer | tRPC v11 (end-to-end typed) |
| ORM | Drizzle ORM |
| DB local | SQLite via `better-sqlite3` |
| DB prod | PostgreSQL |
| Auth | Roll-your-own: argon2 password hash, DB sessions, HttpOnly cookies |
| UI | Tailwind CSS v4 |
| Charts | Recharts |
| Testing | Vitest + React Testing Library + Playwright |
| Monorepo | pnpm workspaces |
| Language | TypeScript throughout |

---

## Folder Structure

```
portfolio/
  packages/
    web/                  # Next.js 15 App Router
      app/
        (auth)/login/     # Login page (unauthenticated)
        (app)/            # Auth-guarded routes
          dashboard/      # Holdings overview + portfolio P&L
          holdings/[symbol]/  # Holding detail + chart + news
          transactions/   # Transaction ledger
        api/
          trpc/[trpc]/    # tRPC HTTP handler
          auth/login/     # POST login
          auth/logout/    # POST logout
      components/
        charts/           # PriceChart (Recharts, touch-friendly)
        holdings/         # HoldingsList, PortfolioSummary, NewsFeed
        ui/               # NavBar
      lib/
        auth/             # session.ts (create/validate/delete), rate-limit.ts
        db/               # Singleton DB connection
        trpc/             # tRPC client + TRPCProvider, server context
        price-cron/       # Background price refresh (5 min, market hours)
      middleware.ts        # Cookie presence check → redirect unauthenticated users
    db/                   # Drizzle schema + migrations
      src/schema/
        holdings.ts       # holdings table
        transactions.ts   # transactions table (immutable ledger)
        prices.ts         # price_snapshots + news_items tables
        sessions.ts       # users + sessions tables
      scripts/
        migrate.ts        # Apply migrations
        seed.ts           # Create the single user (interactive)
      drizzle.config.ts
    core/                 # Pure business logic + tRPC router
      src/
        calculations/
          cost-basis.ts   # FIFO + average cost — exhaustively tested
          pnl.ts          # Unrealized/realized P&L — exhaustively tested
          returns.ts      # Total return, TWR, annualized return
        router/           # tRPC procedures (holdings, prices, news)
        schemas/          # Shared Zod schemas (input validation)
        types/            # Shared TypeScript interfaces
    api-adapters/         # External price/news integrations
      src/
        types.ts          # PriceService interface
        yahoo-finance/    # Primary: international stocks, ETFs, news
        finnhub/          # Real-time quotes (WebSocket-capable)
        alpha-vantage/    # Fallback historical OHLCV
        price-service.ts  # PriceServiceWithFallback (tries adapters in order)
  .github/workflows/
    ci.yml                # Lint + typecheck + test + build (merge gate)
    deploy.yml            # SSH deploy on push to main
    pr-review.yml         # Claude agent advisory review
```

---

## Auth Model

**No registration endpoint.** Single user created via `pnpm db:seed` (interactive).

- Password hashed with `@node-rs/argon2`
- Sessions stored in `sessions` table with `expires_at`
- Session ID in `HttpOnly; Secure; SameSite=Strict` cookie (`portfolio_session`)
- Middleware checks cookie presence on every request; actual DB validation happens in each route/layout
- Login rate-limited: 5 attempts / 15 min, in-memory per IP
- Logout deletes the session row (immediate revocation)
- `lib/auth/session.ts` — all session logic
- `lib/auth/rate-limit.ts` — in-memory rate limiter

---

## Financial API Strategy

Primary: **yahoo-finance2** npm package (unofficial, no key needed). Best international coverage.

| Provider | Role | Limit |
|---|---|---|
| `yahoo-finance2` | Primary: quotes + history + news | Unofficial, no key |
| Finnhub | Real-time quotes fallback | 60 req/min free tier |
| Alpha Vantage | Historical OHLCV fallback | 25 req/day free tier |

`PriceServiceWithFallback` wraps multiple adapters — tries primary, falls through to fallbacks.

`lib/price-cron/` runs a 5-minute refresh loop during market hours (14:30–21:00 UTC). Writes to `price_snapshots`. UI always reads from cache — never waits for live API.

---

## Testing Rules

- **All new code must have tests. All tests must pass before merge.**
- Financial calculations (`cost-basis.ts`, `pnl.ts`, `returns.ts`) target **100% line coverage** using fixed known values — never live prices.
- tRPC procedures tested with in-memory SQLite (no HTTP).
- API adapters tested with `msw` (Mock Service Worker) — mock HTTP responses.
- React components tested with Vitest + React Testing Library.

Coverage thresholds enforced in `vitest.config.ts`:
- Branches: 80%
- Functions: 90%
- Lines: 85%

---

## CI Gates

**`ci.yml`** runs on every push/PR to `main`. All four steps must pass for merge:

1. `pnpm typecheck` — `tsc --noEmit` across all packages
2. `pnpm lint` — ESLint
3. `pnpm test` — Vitest with coverage thresholds
4. `pnpm build` — Next.js production build

**`pr-review.yml`** — Claude agent reviews PRs for financial correctness, security, type safety, coverage gaps. Advisory only (not a merge gate).

---

## Deployment

**Local dev**: `pnpm dev` — Next.js dev server, SQLite at `./data/portfolio.db`.

**Production (Phase 2)**:
- Hetzner CX22 or DigitalOcean VM
- Caddy for HTTPS (Let's Encrypt)
- pm2 for process management
- PostgreSQL on same VM
- `DATABASE_URL` env var switches Drizzle from SQLite to PostgreSQL
- GitHub Actions `deploy.yml` SSHes in on merge to main: `git pull → pnpm install → db:migrate → pm2 reload`

Required secrets in GitHub repo:
- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` — SSH deploy
- `ANTHROPIC_API_KEY` — PR review agent

---

## Database Schema Summary

| Table | Key columns |
|---|---|
| `users` | `id`, `username`, `password_hash` |
| `sessions` | `id`, `user_id`, `expires_at` |
| `holdings` | `id`, `symbol`, `name`, `quantity`, `avg_cost_basis`, `currency`, `exchange` |
| `transactions` | `id`, `holding_id`, `symbol`, `type` (buy/sell/dividend), `date`, `quantity`, `price`, `fees` |
| `price_snapshots` | `id`, `symbol`, `price`, `currency`, `source`, `timestamp` |
| `news_items` | `id`, `symbol`, `headline`, `url`, `source`, `published_at` |

---

## Key Commands

```bash
pnpm dev              # Start Next.js dev server
pnpm test             # Run all tests (all packages)
pnpm typecheck        # TypeScript check (all packages)
pnpm lint             # ESLint (all packages)
pnpm build            # Production build

pnpm db:seed          # Create the single user (run once)
pnpm db:migrate       # Apply DB migrations

pnpm --filter @portfolio/core test:coverage    # Coverage report for calculations
```
