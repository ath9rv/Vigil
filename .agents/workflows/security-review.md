---
trigger: model_decision
description: Security review playbook. Triggered automatically for security tasks or via /security.
---

# Vigil Security Review Workflow

When performing a security review, execute these steps:

1. **Identify changed files**
2. **Identify trust boundaries**: Where does untrusted data enter?
3. **Identify attacker-controlled inputs**: How could a malicious page manipulate this?
4. **Identify privileged APIs**: Are we exposing browser extension APIs to the page?
5. **Identify state transitions**: Are state changes isolated by `navigationId`?
6. **Check navigation/lifecycle races**: What happens if the page navigates away during an async operation?
7. **Check permission changes**: Did we increase the manifest permissions?
8. **Add/verify negative tests**: Ensure we have tests proving failure modes are safe.
9. **Run tests**

## Artifact Generation
Conclude the workflow by outputting a structured report exactly like this:

```text
SECURITY REPORT

Attack surface:
[Description of the exposed attack surface]

Trust boundaries:
[List of boundaries crossed]

Potential vulnerabilities:
[List of potential threats identified, e.g., Message Spoofing, Race Conditions]

Mitigations:
[How the code mitigates the vulnerabilities]

Negative tests:
[List of adversarial tests covering the mitigations]

Residual risk:
[Assessment of remaining risk]
```
