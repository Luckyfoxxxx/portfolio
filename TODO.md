# TODO

- [x] **Upgrade dependencies** — Bump Next.js and all other deps across all packages to latest stable versions. Run typecheck, lint, and tests after each major bump.
- [x] **Prune dependencies** — Audit every `package.json`. Remove anything not strictly required. Goal: minimal footprint.
- [x] **Security review** — Audit auth flow, session handling, rate limiting, input validation on all API routes, cookie settings, and dependency CVEs.
- [x] **UX review** — Review all pages (login, dashboard, holdings, transactions) for usability, accessibility, loading/error/empty states, and mobile responsiveness.
## UX Review — 2026-03-07

> Reviewed visually in Chrome at ~707px and desktop widths. Server started via `pnpm dev:testdb` (seed data: dev user, 7 holdings).

### Bug found during review
- [x] **`dev:testdb` script uses a relative DB path that breaks** — `DATABASE_URL=data/test.db` resolves relative to `packages/web/` CWD, not the repo root; fixed to `DATABASE_URL=$(pwd)/data/test.db` equivalent — use `file:../../data/test.db` or absolute path. Fixed in `package.json`.

### Login page
- [x] **No visible focus ring on inputs** — `outline-none` removes the browser default with no replacement; keyboard users can't see which field is focused; add `focus:ring-2 focus:ring-gray-500`
- [x] **Error message not announced to screen readers** — dynamically rendered `<p>` has no `role="alert"` or `aria-live`; confirmed visually: error appears in red below password field but will be silent for screen reader users
- [x] **Wrong error shown for bad credentials** — "Network error. Please try again." appeared instead of "Invalid credentials" when the DB path was misconfigured; the generic catch masks real errors

### Navigation
- [x] **Active nav link uses only color** — "Transactions" is visually lighter gray vs "Dashboard" white; no underline/weight secondary indicator for color-blind users
- [x] **"Sign out" hit target is too small** — `px-1 py-2` is smaller than 44×44px minimum touch target; easy to misclick on mobile
- [x] **Username `text-xs text-gray-500` on gray-950** — very low contrast; fails WCAG AA for small text

### Dashboard
- [x] **Holding rows have no hover background highlight** — only `hover:opacity-80` on the link text; at ~707px the rows feel non-interactive until you know to click them
- [x] **"Edit" button is too small** — `px-2 py-1 text-xs` renders as a tiny 30×20px target; minimum touch target is 44×44px
- [x] **No "Add Holding" entry point** — no button or link anywhere in the UI to add a new holding; only way is via Transactions, which isn't obvious
- [x] **Quantity shown as `45 sh`** — "sh" is ambiguous; the holding detail page says "shares"; use consistent terminology
- [x] **`formatCurrency` / `formatPercent` duplicated** in 4 files — extract to `packages/web/lib/format.ts`

### Holdings detail (`/holdings/[symbol]`)
- [x] **No back navigation** — confirmed visually: no "← Back" or breadcrumb; users must use browser back or click a nav link
- [x] **`+19.27%` in header is unrealized total return, not daily change** — visually looks like a day-change ticker; label it "vs cost" or "unrealized"
- [x] **Chart crash risk on empty timeframe** — `Math.min(...[])` = `Infinity` if a timeframe filter returns no data points; add an empty-state guard
- [x] **News items have no external-link indicator** — links open in `target="_blank"` with no icon or visual cue

### Transactions page
- [x] **Add Transaction form: no `<label htmlFor>` / `id` pairing** — labels are not programmatically associated with inputs; screen readers won't announce field names
- [x] **3-column Date/Qty/Price row gets tight at ~400px** — at 707px it's workable but "Price per share" label barely fits; breaks badly below ~400px; consider `grid-cols-1 sm:grid-cols-3`
- [x] **Focus not moved to first field when accordion opens** — keyboard users must Tab past the toggle button to reach inputs
- [ ] **Transaction list is view-only** — no edit or delete; correcting a wrong price/quantity requires direct DB access
- [x] **Transaction total excludes fees** — `quantity * price` shown; add "(excl. fees)" label or include fees

### Edit Holding modal
- [x] **Modal clips at small viewport heights** — at ~354px tall viewport the modal header and close button scroll off screen; modal needs `max-h-[90vh] overflow-y-auto`
- [x] **Focus not trapped / moved on open** — confirmed: focus stays on the "Edit" button behind the backdrop; should move to first input
- [x] **Body scrolls behind modal** — no `overflow: hidden` on `<body>` when modal is open
- [x] **Symbol field is editable** — changing it orphans all price snapshots and news for the old symbol; make it read-only or add a warning
- [x] **No delete/archive holding action** — no way to remove a closed-out position

### Accessibility — global
- [x] **No custom focus rings anywhere** — `outline-none` used globally on inputs/buttons with only faint border-color changes; fails WCAG 2.1 AA focus visibility
- [x] **No skip-to-main-content link** — keyboard users tab through the full nav on every page load
- [x] **`text-gray-400` on `bg-gray-900`** — the quantity "shares" label may still fall short of WCAG AA at small text sizes; verified: `gray-400` on `gray-900` is ~5.7:1 (passes); also fixed `text-xs text-gray-500` occurrences (~3.4:1, fails) → bumped to `text-gray-400` across holdings-list, portfolio-summary, transaction-list, holdings detail page, and admin page

- [x] **Edit holdings from GUI** — Add UI to update an existing holding (name, quantity, avg cost basis, currency, exchange) with a tRPC mutation on the backend.
- [x] **Test DB with dev seed data** — Add `packages/db/scripts/seed-dev.ts` (non-interactive, deterministic) that runs migrations on `data/test.db` and populates it with a dev user, 7 holdings (VTI, VOO, VXUS, AAPL, MSFT, NVDA, GOOGL), ~2 years of transactions, 30 days of price snapshots, and news items. Add root scripts `db:seed-dev` and `dev:testdb` (points Next.js at `data/test.db`). Credentials defined in the seed script.

## Agent Findings — Security (2026-03-08)

- **No HTTP security headers** — `next.config.ts` sent no `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `Content-Security-Policy` headers; all responses were vulnerable to clickjacking and MIME sniffing.
- **tRPC error responses could leak stack traces** — `initTRPC` had no `errorFormatter`; unhandled server errors would include `shape.data.stack` in all environments, exposing internal file paths and code structure.
- **Login endpoint accepted unbounded-length credentials** — no maximum length on `username` or `password`; an attacker could send a multi-MB password string that would be passed directly to argon2, causing a CPU spike (application-layer DoS).
- **Rate-limiter `store` Map leaked memory indefinitely** — expired buckets were only removed when the same IP reappeared; under sustained low-volume traffic from many distinct IPs the Map would grow without bound.
- **`x-forwarded-for` header trusted without proxy allowlist** — the rate limiter reads the first IP from `x-forwarded-for`, which any client can forge; an attacker can trivially rotate spoofed IPs to bypass the 5-attempt limit. Not fixed (requires knowing the trusted proxy CIDR at deploy time).
- **Holdings have no `userId` foreign key** — any authenticated user can read, mutate, or delete every other user's holdings and transactions by iterating integer IDs. Not fixed (requires a DB migration and router changes; current app is single-user by design).
- **tRPC route has no CSRF origin check** — the `/api/trpc` POST endpoint accepts mutations from any origin. Practically mitigated by `sameSite=strict` on the session cookie, but no defense-in-depth origin check. Not fixed.

## Agent Findings — Engineering (2026-03-08)

- **`deleteTransaction` / `delete` procedures have no ownership check** — any authenticated user can delete any transaction or holding by guessing an integer ID; add a join/check that the record belongs to the current user before deleting.
- **`updateHoldingSchema` allows mutating `symbol`** — changing the symbol orphans all `priceSnapshots` and `newsItems` keyed on the old symbol; either make symbol immutable in the schema, or cascade-update those tables in the router.
- **`addTransactionSchema` had no `currency` inference from holding** — the schema accepts a `currency` field from the client that may mismatch the holding's own currency; consider defaulting to the holding's currency server-side (same pattern as the symbol fix done this session).
- **No tests for tRPC router procedures** — `packages/core/src/router/holdings.ts` is fully untested; consider adding integration tests with an in-memory SQLite DB.

## Principal Engineer Report — 2026-03-08
### Completed
- **Removed duplicate `formatPrice` from `price-chart.tsx`** — the local function was identical to `formatCurrency` in `lib/format.ts`; replaced with an import, eliminating the DRY violation. All 5 consumer files now use the shared utility.
- **Checked off `formatCurrency`/`formatPercent` extraction TODO** — the extraction was already done; the only remaining duplicate (price-chart) is now fixed.
- **Fixed `addTransaction` symbol derivation** — removed `symbol` from `addTransactionSchema` and from the client form payload; the router now derives symbol server-side from the fetched holding record, preventing client-supplied symbol mismatches. TypeScript passes; 39 core tests pass.

### Found but not fixed
- `deleteTransaction` and `delete` holding procedures lack ownership checks (security concern — out of scope for this pass).
- `updateHoldingSchema` allows mutating `symbol`, which orphans price snapshots and news items keyed to the old symbol.
- `addTransactionSchema` still accepts `currency` from the client; could be derived server-side from the holding record for consistency.
- No integration tests for tRPC router procedures in `packages/core/src/router/holdings.ts`.

## Security Agent Report — 2026-03-08
### Completed
- **tRPC error formatter added** — `packages/core/src/router/trpc.ts`: `initTRPC` now strips `shape.data.stack` from all non-development responses, preventing internal file paths and code structure from leaking to clients.
- **Login credential max-length enforced** — `packages/core/src/schemas/index.ts`: `loginSchema` now caps `username` at 100 chars and `password` at 1000 chars. `packages/web/app/api/auth/login/route.ts`: hard-coded guard rejects oversized inputs before they reach argon2, preventing CPU-exhaustion via oversized payloads.
- **Rate-limiter memory leak fixed** — `packages/web/lib/auth/rate-limit.ts`: `setInterval`-driven `purgeExpired()` runs hourly to evict expired IP buckets; timer is `unref()`-ed so it doesn't keep the Node.js process alive.
- **HTTP security headers added** — `packages/web/next.config.ts`: all routes now send `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo disabled), and a `Content-Security-Policy` restricting resource origins to `'self'`.
### Found but not fixed
- **`x-forwarded-for` IP spoofing in rate limiter** — without a trusted proxy allowlist, clients can rotate forged IPs to bypass rate limiting entirely; fix requires knowing the deployment proxy CIDR.
- **Holdings lack `userId` column** — all authenticated users share the same holdings/transactions namespace; multi-user deployments are fully cross-contaminated. Requires a DB migration.
- **tRPC route lacks CSRF origin check** — `/api/trpc` POST mutations accept requests from any origin; practically mitigated by `sameSite=strict` session cookies but no belt-and-suspenders origin validation.

## Agent Findings — UX (2026-03-08)

- **Sign out button touch target still ~38px** — `px-3 py-3` with 14px text gives ~38px total height, short of the 44px WCAG 2.5.5 minimum; increase to `py-3.5` or wrap the text in a larger invisible hit area.
- **Transaction list is view-only** — no edit or delete on individual transaction rows; correcting a wrong price or quantity requires direct DB access; needs new tRPC procedures + inline row UI.
- **`text-gray-400` on `bg-gray-900` for small quantity label** — improved from the original `text-gray-600` but small text at this contrast ratio may still fall below WCAG AA (4.5:1); verify with a tool such as the WebAIM contrast checker.
- **Wrong error message on login fetch failure** — the `catch` block emits "Network error. Please try again." even for non-network errors that somehow reach the catch boundary; the server-error path already extracts the real message via `res.json()`, so this is a cosmetic/DX issue but worth a code comment.

## Agent Findings — UX (20260328-1357)

- **`text-xs text-gray-500` fails WCAG AA contrast** — `gray-500` (#6b7280) on `gray-900` (#111827) is ~3.4:1 contrast, below the 4.5:1 required for small text; found in holdings-list (holding name), portfolio-summary (stat labels), transaction-list (date), holdings detail page (tx date/fees), and admin page (dt labels). Fixed this pass.
- **Delete transaction button aria-label not unique** — all ✕ buttons announced "Delete transaction" identically; screen reader users cannot distinguish which row they are deleting. Fixed this pass.
- **Login non-JSON error body silently falls to "Network error"** — if the server returns a non-JSON 5xx (e.g. a proxy 502 HTML page), `res.json()` throws and the outer `catch` emits "Network error" rather than a status-code hint. Fixed this pass.

## Price Data & Cron Monitoring

- [x] **DB migration: `is_admin` + `cron_runs` table** — Add `is_admin INTEGER NOT NULL DEFAULT 0` to `users`; create `cron_runs` table (id, started_at, finished_at, status, symbols_attempted, symbols_refreshed, error, created_at). Run `drizzle-kit generate`. Update migration smoke tests to include the new table and default-value assertions.
- [x] **Fix cron startup via `instrumentation.ts`** — Create `packages/web/instrumentation.ts` that calls `startPriceCron()` inside a `NEXT_RUNTIME === "nodejs"` guard. The cron is currently defined but never started.
- [x] **Switch cron to Oslo Børs market hours** — Replace US hours (14:30–21:00 UTC) with Oslo Børs hours (08:00–16:30 UTC). Export `isMarketHours()` so the admin page can reuse it.
- [x] **Track cron runs in DB** — Update `refreshPrices()` to insert a `cron_runs` row at start, then update it to `success`/`partial`/`failed` + `finishedAt` on completion or error.
- [x] **Admin role in auth** — Add `isAdmin: boolean` to `getSession()` return value (`user.isAdmin === 1`). Propagate into tRPC context. Add `adminProcedure` (chains off `protectedProcedure`, throws `FORBIDDEN` if `!ctx.isAdmin`).
- [x] **adminRouter + tRPC wiring** — Create `packages/core/src/router/admin.ts` with a `cronRuns` query (last 20 runs). Mount as `admin: adminRouter` in `appRouter`.
- [x] **Admin dashboard page `/admin`** — Server component (`force-dynamic`). Redirect to `/dashboard` if not admin. Show: alert banner (last run failed or stale during market hours), status card (last run time/status/symbols/duration), recent runs table (Started At | Duration | Status | Symbols | Error).
- [x] **NavBar + layout: Admin link** — Add `isAdmin: boolean` prop to `NavBar`; render an "Admin" nav link conditionally. Pass from `app/(app)/layout.tsx`.
- [x] **Seed script: `SEED_ADMIN` flag** — Read `SEED_ADMIN=true` env var in `packages/db/scripts/seed-dev.ts` to mark the seeded user as admin.

## UX Agent Report — 2026-03-08
### Completed
- **Added skip-to-main-content link** — `app/(app)/layout.tsx`: the `.skip-to-main` CSS was already in `globals.css` and `<main>` had `id="main-content"`, but the `<a>` element was missing; added it above `<NavBar>`.
- **Added accordion focus management** — `add-transaction-form.tsx`: imported `useRef`/`useEffect`; when `open` becomes `true` a zero-delay `setTimeout` moves focus to the Holding `<select>` (first field), so keyboard users don't have to Tab past the toggle button.
- **Added fees disclosure to transaction rows** — `holdings/[symbol]/page.tsx`: when `tx.fees > 0` a "+X fees" note appears in the date line next to the subtotal, making the true transaction cost visible without changing the layout.
- **Added `focus:ring-2 focus:ring-gray-500` to all inputs/selects** in `edit-holding-modal.tsx` (via shared `inputClass` constant) and all five inputs/selects in `add-transaction-form.tsx` (global replace). Also added `role="alert"` to error `<p>` in both forms.
- **Checked off 17 previously-completed items** across Login, Nav, Dashboard, Holdings detail, Transactions, Edit modal, and Accessibility sections that were already implemented but still marked unchecked.

### Found but not fixed
- Transaction list view-only — requires backend tRPC procedures (out of UX scope for this pass).
- `text-gray-400` small-text contrast — needs contrast tool verification before acting.
- Sign out button touch target still ~38px — needs `py-3.5` or a larger hit area.
- Login wrong-error-on-catch — cosmetic/DX issue; server error path is already correct.

## Security Agent Report — 2026-03-10
### Completed
- **`isAdmin` exposed from `getSession()`** — `packages/web/lib/auth/session.ts`: `getSession()` now returns `isAdmin: boolean` by converting the DB integer (`user.isAdmin === 1`); return type updated accordingly.
- **`isAdmin` propagated into tRPC context** — `packages/core/src/router/context.ts`: added `isAdmin: boolean` to `Context`; `packages/web/lib/trpc/server.ts`: `createContext()` now populates `isAdmin: session?.isAdmin ?? false`.
- **`adminProcedure` added** — `packages/core/src/router/trpc.ts`: new middleware chain extending `protectedProcedure` that throws `FORBIDDEN` if `ctx.isAdmin` is false; ready for use by `adminRouter`.
### Found but not fixed
- `adminRouter` and `/admin` dashboard page not yet implemented (assigned to other agents).
- Seed script `SEED_ADMIN` flag not yet implemented (assigned to other agents).

## UX Agent Report — 2026-03-10
### Completed
- **NavBar `isAdmin` prop** — Added `isAdmin?: boolean` to `NavBarProps`; "Admin" link to `/admin` is appended to `navLinks` array when `isAdmin` is true, using the same active/inactive link style as existing nav items.
- **Layout wires `isAdmin`** — `app/(app)/layout.tsx` passes `isAdmin={session.isAdmin}` (boolean from the updated `getSession()`) to `<NavBar>`.
- **Admin page created** — `app/(app)/admin/page.tsx`: server component with `force-dynamic`; redirects non-admins to `/dashboard`; queries last 20 `cron_runs` rows; shows alert banner (red for never-run/failed, yellow for stale during market hours), a status card (started at, status badge, symbols refreshed/attempted, duration), and a full runs table with all required columns.
- **Exported `isMarketHours()`** — `lib/price-cron/index.ts`: made the function `export` so the admin page can import and reuse it for stale-run detection.

### Found but not fixed
- The `Switch cron to Oslo Børs market hours` task is still pending — `isMarketHours()` still uses US hours (14:30–21:00 UTC); the admin page imports and uses it as-is so the stale detection will reflect whatever hours the cron task updates it to.
- `adminRouter + tRPC wiring` not implemented (out of UX scope; admin page queries DB directly as a server component).

## Principal Engineer Report — 2026-03-10
### Completed
- **DB migration: `is_admin` + `cron_runs` table** — Schema files were already in place (`sessions.ts` with `isAdmin`, `cron-runs.ts`, exported from `schema/index.ts`). Migration SQL `0001_low_roland_deschain.sql` was already generated. Updated `migrations.test.ts`: added `cron_runs` to `EXPECTED_TABLES` (now 7 tables), added `users defaults is_admin to 0` test, added `cron_runs round-trip` test. All 11 DB tests pass.
- **Fix cron startup via `instrumentation.ts`** — Created `packages/web/instrumentation.ts` with `NEXT_RUNTIME === "nodejs"` guard calling `startPriceCron()`.
- **Switch cron to Oslo Børs market hours** — Updated `isMarketHours()` in `lib/price-cron/index.ts` to use 08:00–16:30 UTC. `export` keyword was already present (added by UX agent).
- **Track cron runs in DB** — Updated `refreshPrices()` to insert a pessimistic `cron_runs` row (status: "failed") at start using `.returning()` to capture the id, then update to `success`/`partial` on completion or `failed` with error message on catch; re-throws the error after recording.
- **`adminProcedure` in trpc.ts** — Already implemented by security agent. Confirmed present.
- **adminRouter + tRPC wiring** — Created `packages/core/src/router/admin.ts` with `cronRuns` query (last 20 rows ordered by `startedAt` desc). Mounted as `admin: adminRouter` in `appRouter`.
- **Seed script: `SEED_ADMIN` flag** — Added `isAdmin` derived from `SEED_ADMIN=true` env var when inserting the dev user.
### Found but not fixed
- None — all assigned tasks completed. `tsc --noEmit` passes for both `@portfolio/core` and `@portfolio/web`. All 11 DB migration tests pass.

## Cron Run Inspector UI

- [x] **Clickable cron run detail modal** — Admin runs table rows are not interactive; error column truncates at 60 chars with no way to read the full message; clicking a row should open a modal showing all fields (id, started at, finished at, duration, status, symbols refreshed/attempted, full error text).

## Agent Findings — UX (20260322-1015)

- **Transaction delete button has no touch target** — The `✕` delete button in `transaction-list.tsx` had no padding, rendering at approximately 16×16px (the glyph size at `text-xs`); confirmed well below the 44px WCAG 2.5.5 minimum. Fixed with `min-h-[44px] min-w-[44px]` and centering.
- **Transaction confirm inline buttons (No/Yes) also lack padding** — Same component: the inline "Delete? No Yes" confirmation row had bare text buttons with no padding; also below 44px. Fixed.
- **Nav links are 36px tall** — Each nav link used `py-2` (8px × 2 = 16px) + 20px line-height = 36px; below 44px minimum. Fixed with `inline-flex min-h-[44px] items-center`.
- **Sign-out button touch target** — Previous agent noted it was still ~38px; added explicit `min-h-[44px]` to guarantee the 44px minimum regardless of rendering context.

## UX Agent Report — 20260322-1015
### Completed
- **Clickable cron run detail modal** — Created `components/admin/cron-run-detail-modal.tsx` (client component: full-screen backdrop, focus trap, Escape to close, body scroll lock, full error text in a styled code block) and `components/admin/cron-runs-table.tsx` (client component: interactive table rows with keyboard support via Enter/Space, aria-label per row). Admin `page.tsx` updated to serialize `Date` objects to ISO strings before passing as props to the client table, and now renders `<CronRunsTable>` with a "Click a row to view full details" hint.
- **Transaction delete button touch target** — `transaction-list.tsx`: the bare `✕` button now has `min-h-[44px] min-w-[44px]` and flex centering. The "No"/"Yes" confirm buttons also have `min-h-[44px]` with horizontal padding. Focus rings added to all three buttons.
- **Nav link touch targets** — `nav-bar.tsx`: nav links changed from `py-2` to `inline-flex min-h-[44px] items-center` so all three navigation links meet the 44px tap target minimum.
- **Sign-out button touch target** — `nav-bar.tsx`: added `min-h-[44px]` to the sign-out button (previously only had `py-3`, which could render below 44px depending on line-height context) and added `focus:ring-2 focus:ring-gray-500 rounded` for visible focus state.
### Found but not fixed
- `text-gray-400` small-text contrast on `bg-gray-900` — still needs verification with a contrast tool before acting; ratio may be acceptable at larger sizes but fail at `text-xs`.
- Login wrong-error-on-catch — cosmetic/DX: the `catch` block shows "Network error" for non-network errors; not a blocking UX issue.
- Transaction list edit — no edit mutation exists; out of scope for a UX-only pass.
### Test status
- PASS — `@portfolio/core` 39 tests pass; `@portfolio/api-adapters` 16 tests pass. `@portfolio/db` fails with a pre-existing Node.js version mismatch (compiled for Node 22, running on Node 20) — not caused by these changes. `tsc --noEmit` for `@portfolio/web` passes with no errors.
## Agent Findings — Security (20260322-1015)

- **Admin page `notFound()` discloses route existence** — `app/(app)/admin/page.tsx:43`: a 404 for non-admins confirms the route exists; replaced with `redirect("/dashboard")` to give uniform response.
- **tRPC `INTERNAL_SERVER_ERROR.message` leaks DB schema details** — `packages/core/src/router/trpc.ts`: the `errorFormatter` stripped `stack` but not `message`; raw Drizzle/SQLite errors (e.g. `UNIQUE constraint failed: users.username`) could reach the client in production; now replaced with a generic string for `INTERNAL_SERVER_ERROR` in non-dev environments.
- **`updateHoldingSchema` allowed symbol mutation** — `packages/core/src/schemas/index.ts:27`: changing `symbol` would orphan all `priceSnapshots` and `newsItems` keyed to the old symbol; removed `symbol` from the schema entirely and removed it from the client-side `updateHolding.mutate()` call.
- **`addTransaction` used client-supplied `currency`** — `packages/core/src/router/holdings.ts:123-130`: the client could pass any 3-letter currency string, corrupting P&L calculations; now derives `currency` server-side from the fetched holding record, ignoring the client value.
- **URL validation used fragile `startsWith` prefix check** — `packages/web/lib/price-cron/index.ts:64` and `packages/web/components/holdings/news-feed.tsx:7-9`: string prefix matching can be bypassed by encoded variants; replaced with `new URL()` protocol check in both locations.
- **No session idle timeout / sliding expiry** — `packages/web/lib/auth/session.ts:10`: 30-day fixed TTL with no activity renewal; if a session cookie is stolen it remains valid for the full 30 days. Not fixed (requires sliding-expiry logic in the session middleware).
- **`__Host-` cookie silently fails over HTTP** — `packages/web/lib/auth/constants.ts`: `__Host-` prefix requires HTTPS; the cookie is silently dropped in plain HTTP dev mode causing confusing "not logged in" behaviour. Not fixed (cosmetic/DX issue; production is always HTTPS).

## Security Agent Report — 20260322-1015
### Completed
- **Removed `symbol` from `updateHoldingSchema`** — prevents clients from mutating a holding's ticker, which would orphan all price snapshots and news items keyed to the old symbol; also removed `symbol` from the `updateHolding.mutate()` call in `edit-holding-modal.tsx`.
- **Sanitised `INTERNAL_SERVER_ERROR` messages in tRPC errorFormatter** — raw DB/runtime error messages (table names, column names, file paths) are now replaced with `"An internal error occurred"` for `INTERNAL_SERVER_ERROR` codes in non-development environments.
- **Fixed admin page access control disclosure** — replaced `notFound()` (404 confirms route exists) with `redirect("/dashboard")` for non-admin users.
- **Overrode client-supplied `currency` in `addTransaction`** — currency is now derived server-side from the fetched holding record, preventing P&L corruption from mismatched currency codes.
- **Hardened URL validation with `new URL()` protocol check** — replaced `startsWith("https://")` prefix checks in `price-cron/index.ts` and `news-feed.tsx` with `new URL()` parsing; handles encoded edge cases that prefix matching misses.
### Found but not fixed
- No session idle timeout / sliding expiry — 30-day fixed TTL; if a session cookie is stolen it remains valid for the full period. Requires sliding-expiry middleware changes.
- `__Host-` cookie silently fails over HTTP in dev — cosmetic/DX issue; production is always HTTPS so no security impact.
- `x-forwarded-for` IP spoofing in rate limiter — still present from prior agent report; requires knowing the trusted proxy CIDR at deploy time.
- Holdings lack `userId` column — multi-user IDOR still present; requires a DB migration.
### Test status
- PASS — 39/39 `@portfolio/core` tests pass, 16/16 `@portfolio/api-adapters` tests pass. `@portfolio/db` tests are pre-existing failures due to Node 20 vs Node 22 binary mismatch in better-sqlite3 (unrelated to this agent's changes).
## Agent Findings — Engineering (20260322-1015)

- **`better-sqlite3` binary compiled for Node 22, test environment runs Node 20** — the shared pnpm store binary has `NODE_MODULE_VERSION 127` (Node 22) but CI/local uses Node 20 (`NODE_MODULE_VERSION 115`); `@portfolio/db` tests have been skipping since the Node 22 upgrade; fix by running `pnpm rebuild better-sqlite3` in the Node 20 environment or locking the environment to Node 22 as required by the engine constraint.
- **`edit-holding-modal.tsx` was sending `symbol` in the `updateHolding` mutation** — the field was accepted by the old loose schema and silently ignored server-side, but cluttered the wire payload and was misleading; cleaned up as part of the symbol-immutability fix.
- **`createCallerFactory` was not exported from `packages/core/src/router/trpc.ts`** — tests and any future server-side caller code had no way to create a direct caller without bypassing the configured `errorFormatter`; fixed by exporting it alongside `router` and `publicProcedure`.

## Principal Engineer Report — 20260322-1015
### Completed
- **`updateHoldingSchema` no longer allows mutating `symbol`** — removed `symbol` from `updateHoldingSchema` in `packages/core/src/schemas/index.ts` with a comment explaining why; also removed the stale `symbol: holding.symbol` payload from `edit-holding-modal.tsx`. Changing symbol would have silently orphaned all `priceSnapshots` and `newsItems` keyed on the old symbol.
- **`addTransactionSchema` no longer accepts `currency` from the client** — removed the client-supplied `currency` field; the `addTransaction` router handler now derives `currency` from the holding record server-side, consistent with the earlier `symbol` fix. This closes the class of mismatch bugs where a client could record a transaction in a different currency than its parent holding.
- **`delete` and `deleteTransaction` now return `NOT_FOUND` for missing records** — previously both procedures silently succeeded on non-existent IDs; they now do a `SELECT` first and throw `TRPCError({ code: "NOT_FOUND" })` if the record is absent, which gives callers accurate feedback and prevents ghost-delete silent failures.
- **Integration tests for `holdingsRouter` added** — `packages/core/src/__tests__/router/holdings.test.ts` covers `list`, `add`, `get`, `update`, `delete`, `addTransaction`, `transactions`, `deleteTransaction`, and `getWithPnL` (17 tests total); tests use an in-memory SQLite DB with full migrations applied per `beforeEach`; exported `createCallerFactory` from `router/trpc.ts` to enable type-safe direct callers.
### Found but not fixed
- `better-sqlite3` binary mismatch (Node 22 binary vs Node 20 runtime) causes `@portfolio/db` migration tests and the new router integration tests to fail at the native module load step; this is a pre-existing environment issue that predates this run and requires either `pnpm rebuild better-sqlite3` under Node 20 or pinning the runtime to Node 22 as stated in `package.json`'s engines field.
### Test status
- FAIL — `@portfolio/db`: 11 tests skip/fail (pre-existing; `better-sqlite3` Node version mismatch). `@portfolio/core`: 39 calculation tests PASS; 17 new router integration tests FAIL for the same pre-existing `better-sqlite3` reason. `@portfolio/api-adapters`: 16 tests PASS. TypeScript strict mode passes for all packages.

## UX Agent Report — 20260328-1357
### Completed
- **Fixed sign out button touch target** — `nav-bar.tsx`: added `min-h-[44px]` to the Sign out button, guaranteeing the 44px WCAG 2.5.5 minimum touch target regardless of font/line-height variation.
- **Fixed `text-xs text-gray-500` contrast failures** — `gray-500` on `gray-900` is ~3.4:1 (fails WCAG AA 4.5:1 for small text); bumped to `text-gray-400` (~5.7:1, passes) in five files: `holdings-list.tsx`, `portfolio-summary.tsx`, `transaction-list.tsx`, `holdings/[symbol]/page.tsx`, and `admin/page.tsx`.
- **Fixed login error masking** — `login/page.tsx`: wrapped `res.json()` in its own try/catch; non-JSON error bodies (e.g. proxy 502 HTML) now surface `Login failed (502)` rather than the misleading "Network error. Please try again."
- **Fixed transaction delete button aria-labels** — `transaction-list.tsx`: changed generic `aria-label="Delete transaction"` to `` `Delete ${tx.symbol} ${tx.type} transaction` `` so each button is uniquely identifiable by screen readers.
### Found but not fixed
- Transaction edit (inline editing of price/quantity on existing transaction rows) — requires new tRPC `updateTransaction` procedure; out of UX scope.
- Sign in button `min-h-[44px]` not set (submit button on login form uses `py-3` which is ~44px with text; adequate but could be made explicit).
### Test status
- PASS — 39 core tests pass; 6 api-adapters tests pass. DB tests skipped due to pre-existing Node.js 20/22 binary mismatch (better-sqlite3 compiled for Node 22, environment is Node 20); unrelated to this change set.
## Agent Findings — Security (20260328-1357)

- **`updateHoldingSchema` allowed mutating `symbol`** — any client could rename a holding's symbol, silently orphaning all `priceSnapshots` and `newsItems` keyed on the original symbol. Fixed by removing `symbol` from the schema entirely.
- **tRPC `/api/trpc` POST handler had no CSRF origin check** — only `sameSite=strict` cookie policy stood between the mutation endpoints and cross-origin POST requests; an attacker on the same domain/subdomain (or with cookie-sharing misconfiguration) could still forge mutations. Fixed with explicit `Origin` vs. `Host` comparison.
- **Session expiry was a fixed absolute timestamp** — a user who logged in and actively used the app every day for 29 days would be suddenly logged out on day 30 with no warning. Added sliding-window renewal: if < 15 days remain on a valid session, the DB record and browser cookie are both extended by a full 30 days.
- **String inputs to tRPC were not sanitised** — `symbol`, `name`, `exchange`, `notes`, and `currency` fields in `addHoldingSchema`, `addTransactionSchema`, and `updateHoldingSchema` accepted leading/trailing whitespace and mixed-case currency codes, which could produce duplicate records (e.g., `" AAPL"` vs `"AAPL"`). Added `.trim()` to all string fields and `.toUpperCase()` to currency codes.

## Security Agent Report — 20260328-1357
### Completed
- **`symbol` made immutable in `updateHoldingSchema`** — removed `symbol` from `packages/core/src/schemas/index.ts`; added explanatory comment. Updated `packages/web/components/holdings/edit-holding-modal.tsx` to stop sending the field. Prevents orphaning of `priceSnapshots` and `newsItems`.
- **CSRF origin check added to `/api/trpc`** — `packages/web/app/api/trpc/[trpc]/route.ts` now rejects POST requests where the `Origin` header's host differs from the `Host` header; malformed `Origin` values are also rejected. Provides defence-in-depth behind `sameSite=strict` session cookies.
- **Session sliding-window renewal** — `packages/web/lib/auth/session.ts`: `validateSession()` now extends a session's `expiresAt` by a full 30-day TTL whenever < 15 days remain, and returns a `renewed: boolean` flag. `getSession()` re-sets the browser cookie when the session was renewed, keeping the client expiry in sync with the DB record.
- **Input sanitisation on tRPC schemas** — `packages/core/src/schemas/index.ts`: added `.trim()` to all user-supplied string fields (`name`, `exchange`, `notes`) and `.toUpperCase()` to currency codes across `addHoldingSchema`, `addTransactionSchema`, and `updateHoldingSchema`.

### Found but not fixed
- **`deleteTransaction` / `delete` (holding) lack ownership checks** — any authenticated user can delete any record by integer ID; requires a `userId` foreign key on holdings (DB migration out of scope for this agent).
- **`x-forwarded-for` IP spoofing in rate limiter** — without a trusted proxy allowlist, clients can rotate forged source IPs to bypass the 5-attempt login limit; fix requires knowing the deployment proxy CIDR at deploy time.
- **tRPC `addTransaction` accepts client-supplied `currency`** — could mismatch the holding's own currency; could be derived server-side from the holding record (same pattern as the `symbol` fix) for consistency.

### Test status
- PASS — `@portfolio/core`: 39 tests pass; `@portfolio/web`: 9 tests pass; `@portfolio/api-adapters`: 16 tests pass. `tsc --noEmit` clean for both `core` and `web`.
- `@portfolio/db`: 11 tests skipped/failed due to a pre-existing Node.js version mismatch (better-sqlite3 compiled against Node 22, environment runs Node 20); unrelated to this agent's changes.
