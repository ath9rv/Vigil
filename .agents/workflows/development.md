---
trigger: model_decision
description: Standard development lifecycle for normal features or components. Adaptive based on risk.
---

# Vigil Development Workflow

When tasked with implementing a new feature in Vigil, adapt your process to the risk level.

## Risk Assessment
Determine if the task is SMALL, MEDIUM, or HIGH-RISK.

- **SMALL** (e.g., UI tweaks, simple refactors):
  1. Inspect affected code.
  2. Implement modification.
  3. Run targeted unit tests.

- **MEDIUM** (e.g., adding a new scanner, standard bug fixes):
  1. Run the **Blast Radius** workflow.
  2. Write a minimal plan.
  3. Implement.
  4. Run targeted tests + full regression suite.

- **HIGH-RISK** (e.g., modifying `message-router`, `TrustEngine`, manifest permissions, adding dependencies):
  1. Run the **Blast Radius** workflow.
  2. Run the **Architecture Review** workflow to prevent drift.
  3. Run the **Security Review** workflow.
  4. Write a detailed plan and await approval.
  5. Implement.
  6. Create Adversarial tests (proving failure states are safe).
  7. Run full test suite and test against the local browser laboratory.

Produce a final `DEVELOPMENT REPORT` summarizing the change, the risk level, and verification steps.
