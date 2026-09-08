# VIGIL — Market & Literature Research
### Document 1 of 4 in the pre-development set — grounds everything that follows in real prior art, real user sentiment, and the current regulatory landscape, not just internal reasoning

---

## 1. Purpose

Everything built in the earlier design rounds was reasoned from first principles. Before writing a line of code, it needs to be checked against what already exists — what similar tools' real users actually complain about, what the academic literature already found, and what regulators are already doing. This document is that check. It changes a few real decisions, most importantly Section 5.

---

## 2. Competitive & Adjacent Landscape

| Tool | Category | Status (as of research) | The lesson for Vigil |
|---|---|---|---|
| **Fakespot** | Fake-review detection (Amazon/retail) | Shut down in 2025 — no longer available | The fake-review-detection space has a live gap right now; Module 5 has real, current demand and no dominant incumbent |
| **Ghostery** | Privacy/tracker blocker, open-source | Active. Removed all user accounts entirely in October 2025, storing no personal emails, specifically to close out past controversy, and funds development through optional community contributions rather than paywalls | Confirms the free/client-side-first model is viable long-term; also a live example of a competitor *reducing* its own data footprint for trust reasons — exactly Section 11's fingerprinting decision |
| **uBlock Origin / Lite** | Ad/tracker blocker | Active, the benchmark other tools compare against | Sets the bar for "does it slow the browser down" — any perceptible performance hit is compared against this, not against nothing |
| **Web of Trust (WOT)** | Crowdsourced site-trust rating | Still exists, but never fully recovered credibility | **The single most important cautionary precedent for Vigil.** In 2016, a German investigative report found WOT — a 140-million-install crowdsourced site-trust extension, conceptually close to what Vigil's Module 6 needs to do — was selling users' browsing histories, un-anonymized, to third parties, exposing individuals' health conditions, sexual orientation, and even details of active police investigations. Mozilla and other browsers pulled the extension. The company said the data had been anonymized; the journalists re-identified real people from it anyway. This is the exact failure mode Section 11.1 flagged internally (fingerprinting for anti-Sybil purposes) and Section 10.2 warned about generally — it isn't a hypothetical, it already happened, to a tool doing almost exactly what Module 6 does |
| **Academic prototype: "Dark Pattern Detector" (2025 user study)** | Chrome extension, research prototype | Published study only, n=40 participants | Participants installed it and completed real browsing tasks; the majority found it useful, interesting, and worth having — real evidence that user reception of a detector extension is positive, not a hard sell |
| **Academic prototype: AutoBot** | Deceptive-pattern detector, ACM CCS 2025 | Research only | Runs entirely locally in the browser for privacy, analyzes screenshots + text with an ML pipeline rather than DOM rules, and — notably — ships three integrations: a browser extension, a developer-facing audit tool, and a regulator/researcher measurement tool. That three-audience split (user / business / regulator) is close to Vigil's own consumer + B2B-audit + Wall-of-Shame structure, arrived at independently |
| **Academic prototype: DarkPatternDetector** | Automated crawler, arXiv, 2026 | Research only, but directly relevant | This is the closest prior art to Vigil's core premise. It explicitly aligns its detection output with **India's DPDP Act, 2023** — the same legal anchor Module 3 uses — using UI heuristics, NLP, and behavioral signals, and reports strong precision/recall on a curated dataset. Section 6 below addresses this directly: the detection idea is not novel; Vigil's actual differentiation has to be the accountability layer, the growth loop, and the regulatory-integration angle, not the rule engine itself |

---

## 3. What Real Users Actually Say About the Closest Existing Tools

Pulled from live app-store and review-site feedback on Ghostery, the most directly comparable shipped (non-academic) tool:

- Users specifically call out **granular, per-site permission control** as the feature they value most — the ability to allow an extension's access on some sites (news) and deny it on others (their bank) by name. This is a strong signal to build Module-level, per-site opt-out into Vigil's popup UI from day one, not as a later refinement.
- A recurring complaint theme is **breakage after browser updates** — one user described the extension's menu silently stopping working after a period of use, requiring a restart to notice. Given Section 13's Manifest V3 warning about non-persistent background workers, this is exactly the failure mode to design against, not a hypothetical edge case.
- A second recurring complaint: **"no proper customer support."** This directly validates Section 13's ordinary-user-support-channel requirement (distinct from the business-dispute moderation queue) — it's not a nice-to-have, it's the single most common complaint against the closest comparable product.
- Positive sentiment consistently centers on **transparency** — users specifically praised being able to see what was being blocked and why, in plain language, rather than a tool that just silently acts. This directly supports the defamation-safe, evidence-linked language standard already built into Module 6.

---

## 4. Academic Literature, Organized by Module

### Module 1 — Deceptive Commerce Patterns
The foundational work is Mathur, Acar, Friedman, Lucherini, Mayer, Chetty, and Narayanan's **"Dark Patterns at Scale: Findings from a Crawl of 11K Shopping Websites"** (Princeton/University of Chicago, published at ACM CSCW 2019, and an award-winner in the Future of Privacy Forum's Privacy Papers for Policymakers program). Crawling roughly 11,000 shopping sites, the study found 1,818 dark-pattern instances across 15 types and 7 broader categories, and — notably — identified 22 third-party vendors that sell dark patterns as a turnkey, install-it-yourself service to retailers. That last finding matters for Vigil's own threat model: the adversary isn't only individual sites experimenting with manipulative UI, it's a small number of vendors distributing the same patterns at scale, which is exactly why a versioned, centrally-maintained rule set (Section 6 of the earlier design) is the right approach rather than per-site bespoke detection.

A separate, much more recent paper directly addresses whether automated detection tools like Vigil are actually useful to the people who'd enforce the law: Rossi and Parkin's **"What I'm Interested in is Something that Violates the Law": Regulatory Practitioner Views on Automated Detection of Deceptive Design Patterns** (CHI 2026). Interviewing nine practitioners working in or alongside regulatory bodies, the paper's central finding is blunt: most academic detection tools aren't built the way regulators actually need them. Investigations require full transparency and accountability in every step, most existing tools can't provide that, and — most relevant to Vigil specifically — a tool has to map interface elements to a specific legal violation to be useful to a regulator, not just flag "manipulative." This is direct, current, independent validation of two decisions already made: Module 6's evidence-artifact requirement, and Section 3's insistence that every flag trace to a named statute rather than a vibe.

### Module 2 — Threat & Security Shield
Phishing/domain-similarity detection has a long, well-established research line: CANTINA's content-based (TF-IDF) approach, visual-similarity-based anti-phishing strategies comparing page layout and logo placement against known-legitimate sites, and a steady stream of recent machine-learning approaches combining URL structure, domain features, and layout/visual similarity, including a 2026 paper using a Grey Wolf Optimizer–tuned classifier for real-time browser-extension phishing detection. The consistent finding across this literature: URL-only heuristics have a meaningfully higher false-positive/false-negative rate than approaches that add visual or content-based similarity checks. This is a direct, concrete argument for treating Module 2's MVP scope (Levenshtein/domain-similarity only) explicitly as a first pass, with visual-similarity checking named on the roadmap rather than assumed to be a later nice-to-have — the literature says the simple version alone will under- and over-flag more than a visually-aware version.

### Module 4 — Attention & Addictive Design Audit
The behavioral mechanism Module 4 targets has a name and a long research history predating any app: B.F. Skinner's mid-20th-century operant-conditioning work established that **variable-ratio reinforcement** — rewards delivered unpredictably rather than on a fixed schedule — produces the strongest, most persistent behavioral response of any reinforcement pattern, more than a guaranteed reward would. Recent work applies this directly to digital products (a 2025 paper, "Reinforcement Schedule in the Digital Age," analyzes exactly this mechanism across major social and productivity apps), and industry-side writing on the same mechanism is candid that products deliberately engineer it — one widely cited case study attributes roughly 60% of a major language-learning app's returning sessions to its streak mechanic alone, and documents an A/B test where a single red notification badge produced a measurable increase in daily active use with no other change. This is the literature base behind Section 14.1's catch: Vigil's own growth loop needs to be checked against this same mechanism, because the industry material describing *how* to build an engaging streak loop and the academic material describing dark-pattern-driven addictive design are, mechanically, describing the same thing.

### Module 5 — Social Proof Integrity
Fake-review detection research splits into two families: content-based methods (linguistic/stylometric analysis, increasingly LLM- and transformer-based, reporting accuracy in the 90%+ range on benchmark datasets) and behavior-based methods (posting-time clustering, reviewer-network analysis, counter patterns). The content-based approach is more accurate but requires a trained model and real compute; the behavior-based approach is what a lightweight, explainable, client-side rule engine can actually do without a backend ML service. This directly confirms the earlier MVP-scoping decision to build Module 5 on DOM/behavioral signals (review-timing clustering, monotonic counters) rather than reading review text — it's not a shortcut, it's the correct trade-off given the literature's own accuracy-vs-cost split.

---

## 5. The Regulatory Landscape Has Moved Since the Original Design — This Section Changes Something Real

This is the most consequential finding in this whole document.

**India's Central Consumer Protection Authority (CCPA) is no longer just a legal citation — it is actively enforcing, and it already has its own reporting infrastructure.** Since June 2025, the CCPA has run a formal advisory (effective through December 31, 2026) directing all e-commerce platforms to self-audit for dark patterns, and has already issued show-cause notices to roughly a dozen platforms — including quick-commerce and online transport-aggregation companies — over specific patterns including false urgency, drip pricing, subscription traps, and nagging.

More importantly for Vigil's architecture: the government has already built a citizen-facing reporting tool. The **Jagriti App**, run by the Department of Consumer Affairs, lets any consumer submit a URL they believe uses a dark pattern as a formal complaint directly to the CCPA. On the enforcement side, the CCPA is separately running the **Jagriti Dashboard**, described as a real-time monitoring tool that scans e-commerce URLs and flags suspicious activity, combined with the citizen reports coming in through the app.

**This changes something in the earlier design, not just adds context to it.** The original MVP scope named "report to the National Consumer Helpline" as a stretch feature bundling Modules 1 and 3. Given that the government now has its own live reporting channel with actual enforcement teeth behind it, Vigil's "report" action for Module 1/3 findings should **integrate with or route directly to Jagriti**, rather than build a parallel, independent reporting pipeline with none of that enforcement backing. This is strictly better for the pitch, too: "a flag in Vigil is one tap from becoming a formal CCPA complaint" is a sharper, more defensible claim than "Vigil has its own separate Wall of Shame," and it also meaningfully de-risks Section 11.5's defamation concern — routing a user's complaint to an actual regulator is a categorically safer act than Vigil publishing its own accusation.

---

## 6. What This Means for Vigil, Concretely

- **The detection idea is not novel, and the pitch should stop implying it is.** DarkPatternDetector (2026) already does DPDP-aligned automated dark-pattern detection as an academic prototype; AutoBot (2025) already ships a browser-extension + developer-audit + regulator-tool three-way split conceptually close to Vigil's own structure. Vigil's real, defensible differentiation is not "we detect dark patterns" — it's the combination nobody else has assembled: a growth loop that gets it actually installed and used (Section 1's sharpest original insight), an accountability layer built to survive its own scrutiny (Sections 6, 10, 11), and now, direct integration with India's actual live enforcement channel rather than a standalone shame list.
- **Jagriti integration belongs in the MVP conversation, not the "someday" roadmap.** It is now a stronger, safer, more credible version of a feature that was already planned.
- **The WOT precedent should be cited explicitly, by name, in the pitch when explaining Section 11.1's no-fingerprinting decision.** "We know what happens to a crowdsourced trust extension that mishandles its own data — it happened to WOT in 2016, at 140 million installs, over exactly this kind of anti-abuse telemetry" is a stronger justification than an abstract principle.
- **Module 2 should name visual-similarity checking as a specific, literature-backed near-term roadmap item**, not a vague "improve later" — the phishing-detection literature is consistent that URL-only heuristics alone under-perform.
- **Module 5 stays behavior-based for MVP, correctly** — this is now backed by the literature's own accuracy-vs-cost trade-off, not just an internal scoping call.
- **Section 14.1's self-audit catch (Vigil's own growth loop resembling Module 4) is now backed by named research**, not just internal reasoning — B.F. Skinner's variable-ratio reinforcement work and its direct modern application are exactly the mechanism a defamation-safe, addictive-design-safe growth loop needs to design around.

---

## 7. References

- Mathur et al., *Dark Patterns at Scale: Findings from a Crawl of 11K Shopping Websites*, ACM CSCW 2019 — https://arxiv.org/abs/1907.07032
- Rossi & Parkin, *"What I'm Interested in is Something that Violates the Law": Regulatory Practitioner Views on Automated Detection of Deceptive Design Patterns*, CHI 2026 — https://arxiv.org/abs/2602.16302
- *DPDGPT: Using Multimodal Large Language Models for automated detection of dark patterns*, ScienceDirect, 2025 — https://www.sciencedirect.com/science/article/abs/pii/S0950584925002757
- *Automatically Detecting Online Deceptive Patterns* (AutoBot), ACM CCS 2025 — https://dl.acm.org/doi/10.1145/3719027.3765191
- *DarkPatternDetector*, arXiv 2602.18445 — https://arxiv.org/abs/2602.18445
- *Understanding User Perceptions of Automated Dark Pattern Detection Online*, 2025 user study — https://www.computer.org/csdl/proceedings-article/vl-hcc/2025/023300a478/2cJBLbgpYZO
- Norwegian Consumer Council, *Deceived by Design*, 2018 — https://fil.forbrukerradet.no/wp-content/uploads/2018/06/2018-06-27-deceived-by-design-final.pdf
- WOT Services data-selling scandal coverage — https://en.wikipedia.org/wiki/WOT_Services ; https://www.theregister.com/2016/11/07/browsers_ban_web_of_trust_addon_after_biz_is_caught_selling_its_users_browsing_histories
- Ghostery account-removal / open-source model — https://getblockify.com/blog/ghostery-review/
- Fakespot shutdown, 2025 — https://tracefuse.ai/blog/best-fakespot-alternatives/
- Phishing/domain-similarity ML detection — https://www.nature.com/articles/s41598-026-35655-7 ; https://pmc.ncbi.nlm.nih.gov/articles/PMC8935623/
- Fake-review detection literature (content- vs. behavior-based) — https://www.sciencedirect.com/science/article/abs/pii/S0950705125015953
- Reinforcement-schedule / variable-reward design research — https://www.researchgate.net/publication/395115230_Reinforcement_Schedule_in_the_Digital_Age ; https://www.smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/
- CCPA dark-pattern enforcement and the Jagriti App/Dashboard — https://www.mondaq.com/india/dodd-frank-consumer-protection-act/1686226/ ; https://neetiniyaman.com/dark-patterns-digital-platforms/ ; https://law.asia/dark-pattern-enforcement-india/
- DPDP Rules, 2025, notification and phased implementation — referenced in Document 3 (SRS), Section 5
