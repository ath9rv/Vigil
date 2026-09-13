# Vigil Adversarial Validation Matrix

## Browser-level validation

Vigil's adversarial program uses real Chromium in addition to unit/integration testing.

### Primary scenarios

| Scenario | Purpose | Expected property |
|---|---|---|
| Drip pricing | Hidden mandatory fee after progression | Detect and explain without claiming intent |
| Mutation storm | 10,000 rapid DOM changes | Governor sheds contextual work and recovers |
| Countdown evasion | Timer reset/recreation/class randomization | Track behavior despite structural evasion |
| Spoofing/tampering | Forged/stale/cross-origin messages and UI probing | Reject hostile input and preserve boundaries |
| Navigation race | Late event from superseded page | Discard stale evidence |
| False-positive laboratory | Legitimate tax/shipping/layout/timer/consent | Stay below controlled false-positive threshold |

## Execution pattern

Each scenario should use:

```text
CONTROL → ATTACK → RECOVERY
```

The recovery phase verifies that surviving an attack does not leave Vigil permanently degraded.

## Telemetry

Scenario artifacts record environment, browser, build, latency, mutation rate where relevant, memory metrics, CPU/runtime metrics, governor state, evidence integrity, semantic fidelity, and notes.

## False-positive policy

The controlled false-positive suite is a laboratory acceptance criterion only. It is not a universal claim of zero false positives on the open web.
