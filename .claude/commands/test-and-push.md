---
description: Run all tests and, if they pass, push the current branch to GitHub
allowed-tools: Bash(pnpm:*), Bash(git push:*), Bash(git status:*), Bash(git branch:*)
---

Run all tests with `pnpm test` from the repo root.

If all tests pass:
- Show the user a brief success summary (packages tested, test count)
- Run `git push` to push the current branch to GitHub
- Report the result of the push

If any tests fail:
- Show the full failure output
- Do NOT push
- Tell the user which test files failed and stop
