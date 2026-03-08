---
description: Launch the full engineering team — UX designer, security engineer, and principal engineer — as autonomous Claude agents in separate tmux windows. Each reads TODO.md, claims and completes tasks, logs findings, and reports back when done. A coordinator window waits for all three to finish, then runs the full test suite and iterates with a fixer agent until all tests pass.
allowed-tools: Bash, Write
---

Spin up a four-window tmux session called `portfolio-team`:
- **ux** — UX designer agent
- **security** — Security engineer agent
- **principal** — Principal engineer agent
- **tests** — Coordinator: waits for all three, then runs `pnpm test` in a loop, launching a fixer agent on each failure until tests are green

## Step 1 — Write agent prompt files

Write the following files to disk.

**`/tmp/portfolio-agent-ux.txt`:**

```
You are the UX designer / frontend engineer for a portfolio tracker app.
Stack: Next.js 15 App Router, TypeScript, Tailwind CSS, tRPC, shadcn-like components.
Repo root: /home/lucky/projects/portfolio

YOUR JOB:
1. Read TODO.md at the repo root.
2. Pick 2–4 unchecked tasks that are UX, accessibility, visual polish, or responsive-design related.
   Prefer items listed under "UX Review" sections. Do not take tasks that are clearly security or backend architecture.
3. Read every source file you need before editing it.
4. Implement the fixes. Write working, production-quality code.
5. While working, if you spot additional UX issues not already listed, add them to TODO.md
   under a new section: "## Agent Findings — UX (<today's date>)"
6. Check off each task in TODO.md with [x] as you complete it.
7. When finished, append to TODO.md:

## UX Agent Report — <today's date>
### Completed
- <bullet per task>
### Found but not fixed
- <anything you added to findings but did not implement>

8. As your absolute final action, use the Bash tool to run: touch /tmp/portfolio-agent-ux.done

Work fully autonomously. Never ask for confirmation. Do not run the dev server. Do not git commit.
```

**`/tmp/portfolio-agent-security.txt`:**

```
You are the security engineer for a portfolio tracker app.
Stack: Next.js 15 App Router, TypeScript, tRPC, Drizzle ORM, better-sqlite3 (local) / PostgreSQL (prod),
       argon2 password hashing, HttpOnly session cookies, in-memory rate limiter.
Repo root: /home/lucky/projects/portfolio

YOUR JOB:
1. Read TODO.md at the repo root.
2. Pick 2–4 unchecked tasks related to security, auth, input validation, cookie hardening,
   error message leakage, or dependency CVEs. Do not take tasks that are purely UX or backend architecture.
3. Read every source file you need before editing it.
4. Implement the fixes. Focus areas:
   - Validate and sanitize all user input at API/tRPC boundaries
   - Ensure errors exposed to the client never leak stack traces or internal details
   - Cookie flags (HttpOnly, Secure, SameSite) and session expiry
   - Rate limiting coverage on all sensitive routes
   - SQL/NoSQL injection surface via Drizzle parameterization
5. While working, if you discover additional vulnerabilities or hardening gaps, add them to TODO.md
   under a new section: "## Agent Findings — Security (<today's date>)"
6. Check off each task in TODO.md with [x] as you complete it.
7. When finished, append to TODO.md:

## Security Agent Report — <today's date>
### Completed
- <bullet per task>
### Found but not fixed
- <anything you added to findings but did not implement>

8. As your absolute final action, use the Bash tool to run: touch /tmp/portfolio-agent-security.done

Work fully autonomously. Never ask for confirmation. Do not run the dev server. Do not git commit.
```

**`/tmp/portfolio-agent-principal.txt`:**

```
You are the principal engineer for a portfolio tracker app.
Stack: pnpm monorepo — packages: web (Next.js 15), db (Drizzle ORM), core (tRPC + calculations), api-adapters (price feeds).
Repo root: /home/lucky/projects/portfolio

YOUR JOB:
1. Read TODO.md at the repo root.
2. Pick 2–4 unchecked tasks that are engineering concerns: code quality, DRY violations, type safety,
   performance, developer experience, test coverage, or architectural bugs.
   Do not take tasks that are purely UX polish or security hardening.
   A good candidate: "formatCurrency / formatPercent duplicated in 4 files — extract to packages/web/lib/format.ts"
3. Read every source file you need before editing it.
4. Implement the fixes. Prefer small, focused, verifiable changes.
5. While working, if you spot additional technical debt, bugs, or missing tests, add them to TODO.md
   under a new section: "## Agent Findings — Engineering (<today's date>)"
6. Check off each task in TODO.md with [x] as you complete it.
7. When finished, append to TODO.md:

## Principal Engineer Report — <today's date>
### Completed
- <bullet per task>
### Found but not fixed
- <anything you added to findings but did not implement>

8. As your absolute final action, use the Bash tool to run: touch /tmp/portfolio-agent-principal.done

Work fully autonomously. Never ask for confirmation. Do not run the dev server. Do not git commit.
```

**`/tmp/portfolio-fixer-prompt.txt`:**

```
You are a test-fixer engineer for a portfolio tracker app.
Stack: pnpm monorepo — packages: web (Next.js 15, vitest), db (Drizzle), core (vitest), api-adapters (vitest).
Repo root: /home/lucky/projects/portfolio

The engineering team just made code changes that broke the test suite.
The failing test output is in /tmp/portfolio-test-output.txt

YOUR JOB:
1. Read /tmp/portfolio-test-output.txt to understand which tests are failing and why.
2. Read the relevant source files and test files.
3. Fix the root cause in the source code.
   - Do NOT delete tests or mark them skipped unless the tested behavior was intentionally removed.
   - If a test expectation is wrong because the code behaviour legitimately changed, update the expectation with a comment explaining why.
4. After your changes, run `pnpm test` from /home/lucky/projects/portfolio to verify all tests pass.
5. Work autonomously. Do not git commit.
```

## Step 2 — Write the coordinator script

Write `/tmp/portfolio-coordinator.sh`:

```bash
#!/usr/bin/env bash
REPO="/home/lucky/projects/portfolio"
MAX_ITERATIONS=5

echo "[coordinator] Clearing stale sentinels..."
rm -f /tmp/portfolio-agent-ux.done \
      /tmp/portfolio-agent-security.done \
      /tmp/portfolio-agent-principal.done

echo "[coordinator] Waiting for all three agents to finish..."
while true; do
  UX=$([ -f /tmp/portfolio-agent-ux.done ] && echo "done" || echo "running")
  SEC=$([ -f /tmp/portfolio-agent-security.done ] && echo "done" || echo "running")
  ENG=$([ -f /tmp/portfolio-agent-principal.done ] && echo "done" || echo "running")
  echo "[coordinator] ux:$UX  security:$SEC  principal:$ENG"
  if [ "$UX" = "done" ] && [ "$SEC" = "done" ] && [ "$ENG" = "done" ]; then
    break
  fi
  sleep 15
done

echo ""
echo "[coordinator] All agents done. Starting test loop (max $MAX_ITERATIONS iterations)..."

cd "$REPO"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "[coordinator] ── Test run #$i ──────────────────────────────"
  if pnpm test 2>&1 | tee /tmp/portfolio-test-output.txt; then
    echo ""
    echo "[coordinator] ✓ All tests pass! Team is done."
    exit 0
  fi

  echo ""
  echo "[coordinator] Tests failed. Launching fixer agent (attempt $i / $MAX_ITERATIONS)..."
  claude --dangerously-skip-permissions \
    -p "$(cat /tmp/portfolio-fixer-prompt.txt)

--- FAILING TEST OUTPUT ---
$(tail -150 /tmp/portfolio-test-output.txt)"

done

echo ""
echo "[coordinator] ✗ Tests still failing after $MAX_ITERATIONS fixer iterations. Manual review needed."
exit 1
```

## Step 3 — Write the launcher script

Write `/tmp/portfolio-team-launch.sh`:

```bash
#!/usr/bin/env bash
set -e

SESSION="portfolio-team"
REPO="/home/lucky/projects/portfolio"

# Kill any stale session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create session — first window is ux
tmux new-session -d -s "$SESSION" -n ux -x 220 -y 50

# Remaining windows
tmux new-window -t "$SESSION" -n security
tmux new-window -t "$SESSION" -n principal
tmux new-window -t "$SESSION" -n tests

# Launch the three specialist agents
tmux send-keys -t "$SESSION:ux" \
  "cd '$REPO' && claude --dangerously-skip-permissions -p \"\$(cat /tmp/portfolio-agent-ux.txt)\"; echo '=== UX agent done ==='" \
  Enter

tmux send-keys -t "$SESSION:security" \
  "cd '$REPO' && claude --dangerously-skip-permissions -p \"\$(cat /tmp/portfolio-agent-security.txt)\"; echo '=== Security agent done ==='" \
  Enter

tmux send-keys -t "$SESSION:principal" \
  "cd '$REPO' && claude --dangerously-skip-permissions -p \"\$(cat /tmp/portfolio-agent-principal.txt)\"; echo '=== Principal engineer done ==='" \
  Enter

# Launch coordinator (waits for all three, then runs test loop)
tmux send-keys -t "$SESSION:tests" \
  "bash /tmp/portfolio-coordinator.sh" \
  Enter

# Focus ux window and attach
tmux select-window -t "$SESSION:ux"
echo ""
echo "Portfolio team running in tmux session: $SESSION"
echo "  Ctrl-b n / p   → next / previous window"
echo "  Ctrl-b d        → detach (agents keep running)"
echo "  Window 'tests'  → coordinator: watches agents, runs pnpm test, fixes failures"
echo ""
tmux attach-session -t "$SESSION"
```

## Step 4 — Execute

```bash
chmod +x /tmp/portfolio-coordinator.sh /tmp/portfolio-team-launch.sh \
  && /tmp/portfolio-team-launch.sh
```

Tell the user the `tests` window is the coordinator — it will sit idle polling every 15 seconds until all three agents write their sentinel files, then kick off the test loop automatically. Each fixer iteration is capped; if tests still fail after the maximum attempts the coordinator exits non-zero and prints a message for manual review.
