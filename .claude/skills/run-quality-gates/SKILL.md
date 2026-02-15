---
name: run-quality-gates
description: Run lint, typecheck, and tests (same as pre-commit hook)
disable-model-invocation: true
---

# Run Quality Gates

Run the full quality gate suite (matches `.githooks/pre-commit`):

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`

Report pass/fail for each step. If any fail, show the error output.
