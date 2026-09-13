# ADR-001: TrustEngine Remains Sole Verdict Authority

**Status:** Accepted
**Introduced:** V2.1 RC1
**Supersedes:** Direct Finding fabrication in live-scanner

### Context
Legacy scanners and background monitors constructed `Finding` objects directly (e.g. `M6-MALWARE`, `M6-PHISHING`, `M6-001`). This fragmented detection authority across multiple components, allowed uncalibrated heuristics to declare high-confidence verdicts, and bypassed contradiction resolution.

### Decision
Eliminate direct finding creation. All detector outputs are converted to typed `RawObservation` instances and submitted to `trustEngine.observe()`. Downstream consumers receive findings derived exclusively from finalized `TrustEngineResult.reports`.

### Consequences
- **Security:** Eliminates detector-level verdict bypass and prevents rogue or compromised scripts from injecting synthetic findings.
- **Correctness:** Contradictions (e.g. site privacy policy vs. actual network tracking) are resolved deterministically before any finding is emitted.
- **Performance:** Ingestion latency is empirically bounded to 0.009 – 0.024ms per observation.
