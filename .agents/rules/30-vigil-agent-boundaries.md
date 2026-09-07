---
description: Protects the codebase from the coding agent itself. Always active.
---

# Vigil Agent Boundaries

These rules prevent the autonomous coding agent from silently degrading the codebase.

1. **Never silently modify architecture decisions**: If an ADR is LOCKED, do not change the architecture it protects without explicit user approval. Propose the change and wait.
2. **Never weaken tests to make them pass**: If a test fails after your change, the change is wrong — not the test. Fix the implementation, not the assertion.
3. **Never remove a failing test without justification**: A failing test is evidence. Explain why it is obsolete before deleting it.
4. **Never change security-sensitive thresholds without explicit rationale**: Confidence thresholds, budget limits, and eligibility gates exist for documented reasons. Changing them requires stating the reason and getting approval.
5. **Never add permissions or dependencies without review**: New entries in `manifest.json` permissions, new npm packages, or new browser API usage must be explicitly justified.
6. **Never treat generated output as authoritative without verification**: Run tests, check types, and inspect diffs. Do not assume code is correct because you wrote it.
7. **Never introduce silent side effects**: If a function currently has no side effects, do not add logging, telemetry, storage writes, or network calls without explicit justification.
8. **Prefer existing abstractions**: Before creating a new utility, type, observer, or state manager, search the codebase for an existing implementation. Check `shared/types.ts`, `shared/constants.ts`, and existing modules first.
