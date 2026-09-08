# Vigil Empirical Calibration Corpus

The Vigil Calibration Corpus is the long-term empirical memory of the Vigil platform. It systematically catalogs real-world edge cases, false positives, false negatives, and site compatibility anomalies discovered during external field testing.

---

## 1. Directory Structure

```text
calibration/
├── urgency/           # False positives & true positives on countdowns & timers
├── consent/           # CMP variations, custom shadow DOM consent banners
├── tracking/          # CNAME cloaking, obfuscated tracker endpoints, first-party proxies
├── fingerprinting/    # Canvas, WebGL, Audio probes, and CreepJS lie vectors
├── legal/             # Terms of service clause classifications & edge cases
├── phishing/          # Lookalike domains, deceptive MFA forms, credential theft
└── compatibility/     # Framework reconciliation (React/Vue/Angular), dynamic SPA DOM shifts
```

---

## 2. Dual Review Pipeline

Every observed discrepancy is routed through one of two analytical pipelines:

```text
                       VIGIL FIELD OBSERVATION
                                 │
                   ┌─────────────┴─────────────┐
                   ▼                           ▼
            FALSE POSITIVE               FALSE NEGATIVE
      (Overly Aggressive Detection)     (Evasive / Missed Threat)
                   │                           │
                   ▼                           ▼
        1. Identify Misleading Signal    1. Extract Obfuscated Token
        2. Formulate Precision Rule      2. Broaden Multi-Signal Net
        3. Add Exemption Condition       3. Add Coverage Heuristic
                   │                           │
                   └─────────────┬─────────────┘
                                 ▼
                    CALIBRATION CORPUS CASE
                                 ▼
                     AUTOMATED REGRESSION TEST
```

---

## 3. Standard Case Schema

```json
{
  "caseId": "CASE-CATEGORY-001",
  "category": "URGENCY | CONSENT | TRACKING | FINGERPRINTING | LEGAL | PHISHING | COMPATIBILITY",
  "type": "FALSE_POSITIVE | FALSE_NEGATIVE | COMPATIBILITY_REGRESSION",
  "domain": "example.com",
  "archetype": "E-commerce | SaaS | Travel | Banking | News | WebApp",
  "observedSignals": [
    "DOM timer decreasing at 1s intervals",
    "Absence of server sync headers"
  ],
  "expectedInterpretation": "Legitimate ticketing reservation hold",
  "actualInterpretation": "Manufactured countdown urgency",
  "confidenceAssigned": "HIGH",
  "safetyClassAssigned": "CAUTIOUS",
  "rootCause": "Ticketing site uses client-side hold timer backed by session token in cookie rather than DOM attributes.",
  "calibrationRule": "Exclude timers where cookie 'hold_session' exists or endpoint /api/hold-ticket returns 200.",
  "regressionTestPath": "src/content-scripts/urgency-calibration.test.ts"
}
```

---

## 4. Operational Invariant

> **No code change is permitted in response to a field issue without a corresponding case record in this directory and a passing automated regression test.**
