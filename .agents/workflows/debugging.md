---
trigger: model_decision
description: Debugging playbook. Automatically triggered when instructed to debug or fix a bug in the extension.
---

# Vigil Debugging Workflow

When tasked with debugging a problem in Vigil, follow this playbook strictly:

1. **Reproduce**: Attempt to reproduce the issue using the local test laboratory or described steps.
2. **Identify Context**: Determine which execution context the bug originates in (Background, Content Script, Main World, UI).
3. **Trace Message Flow**: Track the data from the initial observation through `message-router.ts`.
4. **Trace State Mutation**: Identify where persistent state is modified (e.g., `TrustEngine`, `navigation-state`).
5. **Find First Divergence**: Locate the earliest point where the system state diverges from expectations.
6. **Minimal Fix**: Implement the smallest possible fix. Do not refactor unrelated code.
7. **Verify**: Run the regression test suite and verify the fix in the browser.

## Artifact Generation
Conclude the workflow by outputting a structured report exactly like this:

```text
DEBUG REPORT

Symptom:
[Description of the observed problem]

Root cause:
[Technical explanation of the first divergence]

Execution context:
[e.g., BACKGROUND, CONTENT SCRIPT]

Affected modules:
[List of modified files]

Fix:
[Summary of the change]

Regression test:
[Name of the test added or updated to catch this in the future]

Verification:
Typecheck [✓/X]
Tests [✓/X]
Browser [✓/X]
```
