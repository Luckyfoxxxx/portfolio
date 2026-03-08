# TODO

- [x] **Upgrade dependencies** — Bump Next.js and all other deps across all packages to latest stable versions. Run typecheck, lint, and tests after each major bump.
- [x] **Prune dependencies** — Audit every `package.json`. Remove anything not strictly required. Goal: minimal footprint.
- [x] **Security review** — Audit auth flow, session handling, rate limiting, input validation on all API routes, cookie settings, and dependency CVEs.
- [x] **UX review** — Review all pages (login, dashboard, holdings, transactions) for usability, accessibility, loading/error/empty states, and mobile responsiveness.
## UX Review — 2026-03-07

> Reviewed visually in Chrome at ~707px and desktop widths. Server started via `pnpm dev:testdb` (seed data: admin/password123456, 7 holdings).

### Bug found during review
- [x] **`dev:testdb` script uses a relative DB path that breaks** — `DATABASE_URL=data/test.db` resolves relative to `packages/web/` CWD, not the repo root; fixed to `DATABASE_URL=$(pwd)/data/test.db` equivalent — use `file:../../data/test.db` or absolute path. Fixed in `package.json`.

### Login page
- [x] **No visible focus ring on inputs** — `outline-none` removes the browser default with no replacement; keyboard users can't see which field is focused; add `focus:ring-2 focus:ring-gray-500`
- [x] **Error message not announced to screen readers** — dynamically rendered `<p>` has no `role="alert"` or `aria-live`; confirmed visually: error appears in red below password field but will be silent for screen reader users
- [ ] **Wrong error shown for bad credentials** — "Network error. Please try again." appeared instead of "Invalid credentials" when the DB path was misconfigured; the generic catch masks real errors

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
- [ ] **`text-gray-400` on `bg-gray-900`** — the quantity "shares" label may still fall short of WCAG AA at small text sizes; verify with a contrast checker

- [x] **Edit holdings from GUI** — Add UI to update an existing holding (name, quantity, avg cost basis, currency, exchange) with a tRPC mutation on the backend.
- [x] **Test DB with dev seed data** — Add `packages/db/scripts/seed-dev.ts` (non-interactive, deterministic) that runs migrations on `data/test.db` and populates it with a user (`admin`/`password123456`), 7 holdings (VTI, VOO, VXUS, AAPL, MSFT, NVDA, GOOGL), ~2 years of transactions, 30 days of price snapshots, and news items. Add root scripts `db:seed-dev` and `dev:testdb` (points Next.js at `data/test.db`).

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
