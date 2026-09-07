---
trigger: model_decision
description: Blast radius review. Run this before making changes to a core module.
---

# Vigil Blast Radius Workflow

Before modifying a central module (e.g., `message-router`, `TrustEngine`, `EvidenceGraph`), determine the impact:

1. **Changed file**: What file are you changing?
2. **Imports**: What does it import?
3. **Consumers**: Who imports it? (Use `grep_search` to find imports).
4. **Message paths**: Does it affect the data format of messages passing between contexts?
5. **State owners**: Does it change how state is owned or mutated?
6. **Tests**: Which tests currently cover this module and will likely break?
7. **Execution contexts**: Does this cross boundaries (e.g., Content Script to Background)?

Produce a "Blast Radius" report (HIGH, MEDIUM, LOW) listing the affected systems before writing code.
