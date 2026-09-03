import type { Rule, Finding, ScanCompleteMessage } from '../shared/types';
import { KNOWN_DOMAINS } from '../shared/constants';
import { getStorageValue, setStorageValue } from '../shared/storage';
import { loadM1Rules, loadM2Rules, loadM3Rules, loadM4Rules, loadM5Rules } from './rules-loader';
import { isRelevantForM2 } from './relevance-gate';
import { showAmbientAlert } from './ambient-shield';
import {
  extractActivityCounter,
  hasCommerceContext,
  isFakeCaptchaNotificationScam,
  isRecognizedIdentityProvider,
  isVisuallySuppressedComparedToAccept,
  sameSiteOrSubdomain
} from './finding-quality';

// ─── Levenshtein for M2-001 ─────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function calculateSimilarity(domain: string, knownDomain: string): number {
  const distance = levenshtein(domain, knownDomain);
  const maxLength = Math.max(domain.length, knownDomain.length);
  return Math.round(((maxLength - distance) / maxLength) * 100);
}

// ─── Deep DOM Traversal (Shadow DOM Piercing) ─────────────────────────────

/**
 * Searches the DOM deeply, piercing through Shadow DOM boundaries.
 * Standard querySelectorAll cannot see inside Web Components. This ensures
 * no dark patterns can hide inside shadow roots.
 */
function querySelectorAllDeep(selector: string, root: Document | Element | ShadowRoot = document): Element[] {
  const results: Element[] = [];
  const queue: (Document | Element | ShadowRoot)[] = [root];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    if ('querySelectorAll' in node) {
      try {
        // Find matches in the current light DOM / root
        results.push(...Array.from(node.querySelectorAll(selector)));
      } catch {
        // Invalid selector syntax - safely proceed without crashing
        return results;
      }
      
      // Find all elements that might have a shadow root and queue them
      try {
        const allElements = node.querySelectorAll('*');
        for (let i = 0; i < allElements.length; i++) {
          if (allElements[i].shadowRoot) {
            queue.push(allElements[i].shadowRoot!);
          }
        }
      } catch {}
    }
  }
  // Deduplicate array
  return Array.from(new Set(results));
}

const repeatedModals = new WeakSet<Element>();
const activityCounterHistory = new WeakMap<Element, number>();

// ─── Main Scanner ───────────────────────────────────────────────────────────

/**
 * Scans the current page for dark patterns and security threats.
 * 
 * KEY DESIGN DECISIONS to prevent false positives:
 * 1. Per-rule deduplication: each rule produces at most ONE finding per page
 * 2. Tight algorithms: Rules target precise structural patterns (e.g., pre-checked 
 *    boxes specifically inside cart containers) rather than loose text matching.
 */
export async function scanPage(): Promise<void> {
  const startTime = performance.now();
  const domain = window.location.hostname;
  
  const m1Rules = await loadM1Rules();
  const m2Rules = await loadM2Rules();
  const m3Rules = await loadM3Rules();
  const m4Rules = await loadM4Rules();
  const m5Rules = await loadM5Rules();
  
  const findings: Finding[] = [];
  const matchedRuleIds = new Set<string>(); // ONE finding per rule per page
  const findingElements = new Map<string, Element>(); // Map finding ID to actual DOM element for console

  const addFinding = (
    rule: Rule,
    element: Element,
    extras: Record<string, string> = {},
    confidenceState: Finding['confidenceState'] = 'under_review',
    reviewStatus: Finding['reviewStatus'] = 'REVIEW_NEEDED'
  ) => {
    // Per-rule dedup: only the FIRST match for each rule gets reported
    if (matchedRuleIds.has(rule.id)) return;
    matchedRuleIds.add(rule.id);

    const selectorPath = generateSelector(element);
    const rect = element.getBoundingClientRect();
    
    let explanation = rule.explanation_template;
    for (const [k, v] of Object.entries(extras)) {
      explanation = explanation.replace(`{${k}}`, v);
    }

    const id = crypto.randomUUID();
    findingElements.set(id, element);

    findings.push({
      id,
      ruleId: rule.id,
      ruleName: rule.name,
      module: rule.module,
      severity: rule.severity,
      confidenceState,
      reviewStatus,
      statuteRef: rule.statute_ref,
      explanation,
      elementSelector: selectorPath,
      elementRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
      pageUrl: window.location.href,
      detectedAt: new Date().toISOString()
    });
  };

  // ─── General Rules (M1, M3, M4, M5) ───────────────────────────────────────
  const customEvidenceRules = new Set(['M1-001', 'M1-004', 'M1-005', 'M1-007', 'M1-008', 'M4-002', 'M5-001']);
  const generalRules = [...m1Rules, ...m3Rules, ...m4Rules, ...m5Rules]
    .filter(rule => !customEvidenceRules.has(rule.id));
  for (const rule of generalRules) {
    if (matchedRuleIds.has(rule.id)) continue;

    if (rule.selector_strategy === 'text_pattern' && rule.match.text_patterns) {
      const elements = querySelectorAllDeep(rule.match.target);
      const regexes = rule.match.text_patterns.map(
        p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
      );
      
      for (const el of elements) {
        if (matchedRuleIds.has(rule.id)) break;
        const text = el.textContent || '';
        if (text.length > 0 && text.length < 500 && regexes.some(r => r.test(text))) {
          addFinding(rule, el);
        }
      }
    } else if (rule.selector_strategy === 'structural' && rule.match.structural_check) {
      const elements = querySelectorAllDeep(rule.match.target);
      const check = rule.match.structural_check;
      
      for (const el of elements) {
        if (matchedRuleIds.has(rule.id)) break;

        if (check.type === 'pre_checked_checkbox') {
          if ((el as HTMLInputElement).checked && check.reference_selector) {
            const containers = querySelectorAllDeep(check.reference_selector);
            for (const c of containers) {
              if (c.contains(el)) {
                if (rule.match.text_patterns) {
                  const text = el.parentElement?.textContent || '';
                  const regexes = rule.match.text_patterns.map(
                    p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
                  );
                  if (regexes.some(r => r.test(text))) {
                    addFinding(rule, el);
                  }
                } else {
                  addFinding(rule, el);
                }
                break;
              }
            }
          }
        } else if (check.type === 'missing_nearby_element') {
          let textMatch = true;
          if (rule.match.text_patterns) {
            const text = el.textContent || '';
            const regexes = rule.match.text_patterns.map(
              p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
            );
            textMatch = regexes.some(r => r.test(text));
          }
          
          if (textMatch && check.expected_nearby) {
            const nearby = querySelectorAllDeep(check.expected_nearby);
            if (nearby.length === 0) {
              addFinding(rule, el);
            }
          }
        } else if (check.type === 'visibility_suppressed') {
          let textMatch = true;
          if (rule.match.text_patterns) {
            const text = (el.textContent || '').trim();
            const regexes = rule.match.text_patterns.map(
              p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
            );
            textMatch = regexes.some(r => r.test(text));
          }
          
          if (textMatch) {
            const container = el.closest('[role="dialog"], [class*="modal"], [class*="cookie"], [class*="consent"]');
            const buttons = container ? querySelectorAllDeep('button, [role="button"], input[type="button"]', container) : [];
            if (buttons.length > 0 && isVisuallySuppressedComparedToAccept(el, buttons)) {
              addFinding(rule, el, {}, 'confirmed', 'CONFIRMED');
            }
          }
        } else if (check.type === 'repeated_modal') {
          let textMatch = true;
          if (rule.match.text_patterns) {
            const text = el.textContent || '';
            const regexes = rule.match.text_patterns.map(
              p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
            );
            textMatch = regexes.some(r => r.test(text));
          }
          if (textMatch) {
            if (repeatedModals.has(el)) {
              addFinding(rule, el);
            } else {
              repeatedModals.add(el);
            }
          }
        }
      }
    }
  }

  // ─── Evidence-gated behavioural signals ────────────────────────────────
  // These signals are useful nitpicks, but the DOM cannot prove intent or
  // whether an earlier price was disclosed. Keep them out of the trust score.
  const urgencyRule = m1Rules.find(rule => rule.id === 'M1-001');
  if (urgencyRule) {
    const candidates = querySelectorAllDeep(urgencyRule.match.target);
    const matchesUrgency = urgencyRule.match.text_patterns?.map(pattern => new RegExp(pattern, 'i')) || [];
    const element = candidates.find(candidate =>
      hasCommerceContext(candidate) && matchesUrgency.some(pattern => pattern.test(candidate.textContent || ''))
    );
    if (element) addFinding(urgencyRule, element, {}, 'under_review', 'REVIEW_NEEDED');
  }

  const autoplayRule = m4Rules.find(rule => rule.id === 'M4-002');
  if (autoplayRule && document.querySelector('video[autoplay], audio[autoplay]')) {
    const patterns = autoplayRule.match.text_patterns?.map(pattern => new RegExp(pattern, 'i')) || [];
    const element = querySelectorAllDeep(autoplayRule.match.target)
      .find(candidate => patterns.some(pattern => pattern.test(candidate.textContent || '')));
    if (element) addFinding(autoplayRule, element, {}, 'under_review', 'REVIEW_NEEDED');
  }

  const activityRule = m5Rules.find(rule => rule.id === 'M5-001');
  if (activityRule) {
    const element = querySelectorAllDeep('span, div, p').find(candidate => {
      const count = extractActivityCounter(candidate.textContent || '');
      if (count === null) return false;
      const previous = activityCounterHistory.get(candidate);
      activityCounterHistory.set(candidate, count);
      return previous !== undefined && previous !== count;
    });
    if (element) addFinding(activityRule, element, {}, 'under_review', 'REVIEW_NEEDED');
  }

  // ─── M2: Always runs (security threats matter everywhere) ─────────────
  let m2001Match = false;
  if (isRelevantForM2()) {
    for (const rule of m2Rules) {
      if (matchedRuleIds.has(rule.id)) continue;

      // Script presence alone cannot establish that processing happened before
      // consent: a banner may be decorative, consent may be persisted, and a
      // content script cannot reconstruct an earlier navigation.  We retain a
      // clearly-labelled review observation below instead of alleging a breach.
      if (rule.id === 'M2-002') continue;

      if (rule.id === 'M2-001') {
        // Skip if we're ON a known domain (exact match = legit)
        let isKnown = false;
        for (const known of KNOWN_DOMAINS) {
          if (domain === known || domain === 'www.' + known || domain.endsWith('.' + known)) {
            isKnown = true;
            break;
          }
        }
        if (isKnown) continue;

        let maxSim = 0;
        let similarDomain = '';
        for (const known of KNOWN_DOMAINS) {
          const sim = calculateSimilarity(domain.replace('www.', ''), known);
          if (sim > 85 && sim < 100) {
            if (sim > maxSim) {
              maxSim = sim;
              similarDomain = known;
            }
          }
        }
        if (maxSim > 85) {
          m2001Match = true;
          addFinding(rule, document.documentElement, {
            similar_domain: similarDomain,
            score: maxSim.toString()
          });
        }
      } else if (rule.id === 'M2-002') {
        const scripts = querySelectorAllDeep(rule.match.target);
        if (rule.match.text_patterns) {
          const regexes = rule.match.text_patterns.map(
            p => new RegExp(p, rule.match.case_insensitive ? 'i' : '')
          );
          for (const script of scripts) {
            if (matchedRuleIds.has(rule.id)) break;
            const src = script.getAttribute('src') || '';
            if (regexes.some(r => r.test(src))) {
              addFinding(rule, script, { script_name: src.split('/').pop() || src });
            }
          }
        }
      } else if (rule.id === 'M2-003') {
        if (m2001Match) {
          const forms = querySelectorAllDeep('form');
          for (const form of forms) {
            if (matchedRuleIds.has(rule.id)) break;
            const hasPasswordField = form.querySelector('input[type="password"]');
            const hasCardField = form.querySelector('input[name*="card"], input[autocomplete="cc-number"]');
            if (hasPasswordField || hasCardField) {
              addFinding(rule, form);
            }
          }
        }
      }
    }

    // M2-004: Insecure or Lookalike Phishing Login Form
    const passwordInputs = querySelectorAllDeep('input[type="password"]');
    if (passwordInputs.length > 0) {
      const isPlainHttp = window.location.protocol === 'http:';
      const isRawIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(domain);
      const isLookalikePhishing = m2001Match;

      // Only flag if there is an objective cryptographic or homoglyph risk
      if ((isPlainHttp || isRawIp || isLookalikePhishing) && !matchedRuleIds.has('M2-004')) {
        matchedRuleIds.add('M2-004');
        let explanation = 'Insecure Login: Form transmits credentials over unencrypted HTTP, vulnerable to network packet sniffing.';
        if (isLookalikePhishing) {
          explanation = 'Phishing Threat: Password form detected on a brand lookalike mimicking a trusted service.';
        } else if (isRawIp) {
          explanation = 'Suspicious Login: Password form hosted directly on a raw numeric IP address without a verified domain certificate.';
        }

        findings.push({
          id: crypto.randomUUID(),
          ruleId: 'M2-004',
          ruleName: isPlainHttp ? 'insecure_http_login' : 'login_on_suspicious_domain',
          module: 'M2',
          severity: 'high',
          confidenceState: 'confirmed',
          statuteRef: '',
          explanation,
          elementSelector: generateSelector(passwordInputs[0]),
          elementRect: passwordInputs[0].getBoundingClientRect(),
          pageUrl: window.location.href,
          detectedAt: new Date().toISOString()
        });
      }
    }

    // M2-005: Form Action Mismatch (Credential Theft)
    const forms = querySelectorAllDeep('form');
    for (const form of forms) {
      if (matchedRuleIds.has('M2-005')) break;
      const hasPasswordField = form.querySelector('input[type="password"]');
      if (hasPasswordField) {
        const action = form.getAttribute('action');
        if (action && action.startsWith('http')) {
          try {
            const actionUrl = new URL(action);
            if (!sameSiteOrSubdomain(window.location.hostname, actionUrl.hostname)
              && !isRecognizedIdentityProvider(actionUrl.hostname)) {
              matchedRuleIds.add('M2-005');
              const corroborated = m2001Match || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(actionUrl.hostname) || actionUrl.protocol === 'http:';
              if (corroborated) {
                showAmbientAlert({
                  id: 'm2-005-alert', type: 'CRITICAL_SECURITY', title: 'Credential submission warning',
                  message: `This password form submits to ${actionUrl.hostname}, which is not part of ${window.location.hostname}.`,
                  details: `Action URL: ${actionUrl.href}`
                });
              }
              findings.push({
                id: crypto.randomUUID(),
                ruleId: 'M2-005',
                ruleName: 'form_action_mismatch',
                module: 'M2',
                severity: corroborated ? 'severe' : 'medium',
                confidenceState: corroborated ? 'confirmed' : 'under_review',
                reviewStatus: corroborated ? 'CONFIRMED' : 'REVIEW_NEEDED',
                statuteRef: '',
                explanation: corroborated
                  ? 'A password form submits to an unrelated, insecure, or lookalike host. This is a strong credential-theft indicator.'
                  : 'This password form submits to a different organisation. Review the destination before entering credentials; some legitimate services use an external identity provider.',
                elementSelector: generateSelector(form),
                elementRect: form.getBoundingClientRect(),
                pageUrl: window.location.href,
                detectedAt: new Date().toISOString()
              });
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        }
      }
    }

    // M2-006: Urgency Language Detector
    if (!matchedRuleIds.has('M2-006') && passwordInputs.length > 0 && m2001Match) {
      const text = document.body.textContent || '';
      const urgencyPatterns = [
        /your account (has been|will be|is) (suspended|locked|compromised|restricted)/i,
        /verify (your|immediately|now|within \d+)/i,
        /unusual (activity|sign.?in|login)/i,
        /unauthorized (access|transaction|payment)/i,
        /click here (immediately|now|to verify|to confirm)/i,
        /failure to (verify|respond|act|update) (will|may) result/i
      ];
      
      let matchCount = 0;
      for (const pattern of urgencyPatterns) {
        if (pattern.test(text)) matchCount++;
      }
      
      if (matchCount >= 2) {
        matchedRuleIds.add('M2-006');
        findings.push({
          id: crypto.randomUUID(),
          ruleId: 'M2-006',
          ruleName: 'urgency_language_detector',
          module: 'M2',
          severity: 'high',
          confidenceState: 'confirmed',
          reviewStatus: 'CONFIRMED',
          statuteRef: '',
          explanation: 'Urgency language detected alongside a login form. Phishing sites often use urgency to manipulate users.',
          elementSelector: 'body',
          elementRect: { top: 0, left: 0, width: 0, height: 0 },
          pageUrl: window.location.href,
          detectedAt: new Date().toISOString()
        });
      }
    }

    // M2-007: Fake CAPTCHA / Notification Scam
    if (!matchedRuleIds.has('M2-007')) {
      const text = document.body.textContent || '';
      if (isFakeCaptchaNotificationScam(text)) {
        matchedRuleIds.add('M2-007');
        findings.push({
          id: crypto.randomUUID(),
          ruleId: 'M2-007',
          ruleName: 'fake_captcha_notification',
          module: 'M2',
          severity: 'high',
          confidenceState: 'under_review',
          statuteRef: '',
          explanation: 'CAPTCHA copy is paired with instructions to grant notifications or run a command, a known notification-scam pattern.',
          elementSelector: 'body',
          elementRect: { top: 0, left: 0, width: 0, height: 0 },
          pageUrl: window.location.href,
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  // ─── Tracking while consent UI is visible ─────────────────────────────────
  const trackers = ['_ga', '_fbp', '_gid', '_tt_enable_cookie', 'fr', 'tr', 'ads'];
  const hasTrackers = trackers.some(t => document.cookie.includes(t + '='));
  const hasBanner = querySelectorAllDeep('[id*="cookie"], [class*="cookie"], [id*="consent"], [class*="consent"]').length > 0;
  
  if (hasTrackers && hasBanner) {
    const id = crypto.randomUUID();
    findings.push({
      id,
      ruleId: 'M3-003',
      ruleName: 'tracking_with_visible_consent_ui',
      module: 'M3',
      severity: 'low',
      confidenceState: 'under_review',
      reviewStatus: 'REVIEW_NEEDED',
      statuteRef: 'DPDP Act 2023 §6 — consent timing requires verification',
      explanation: 'Tracking cookies are present while a consent interface is visible. This scan cannot establish whether they were set before consent or persisted from an earlier visit.',
      elementSelector: 'html',
      elementRect: { top: 0, left: 0, width: 0, height: 0 },
      pageUrl: window.location.href,
      detectedAt: new Date().toISOString()
    });
  }

  // ─── Policy URL Extraction (For Background M7 Audit) ───────────────────
  let termsUrl: string | undefined;
  let privacyUrl: string | undefined;
  
  const allLinks = querySelectorAllDeep('a[href]');
  for (const link of allLinks) {
    const href = (link as HTMLAnchorElement).href.toLowerCase();
    const text = (link.textContent || '').toLowerCase();
    
    if (!termsUrl && (href.includes('terms') || href.includes('legal') || text.includes('terms of service') || text.includes('terms and conditions'))) {
      termsUrl = (link as HTMLAnchorElement).href;
    }
    if (!privacyUrl && (href.includes('privacy') || text.includes('privacy policy'))) {
      privacyUrl = (link as HTMLAnchorElement).href;
    }
  }

  // ─── Finalize & DevTools Logging ──────────────────────────────────────
  const duration = performance.now() - startTime;
  
  // Developer Console Integration
  if (findings.length > 0) {
    console.group(`%c🛡️ Vigil Deep Scan Results (${findings.length} issues found)`, 'color: white; background: #2563eb; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log(`Scan completed in ${duration.toFixed(1)}ms using Shadow DOM traversal.`);
    
    findings.forEach(f => {
      const color = f.severity === 'severe' ? '#dc2626' : f.severity === 'high' ? '#ea580c' : '#d97706';
      console.log(
        `%c[${f.severity.toUpperCase()}] %c${f.ruleName} %c(${f.module})`, 
        `color: ${color}; font-weight: bold;`,
        'color: inherit; font-weight: bold;',
        'color: #6b7280; font-size: 10px;'
      );
      console.log('Description:', f.explanation);
      console.log('Legal Ref:', f.statuteRef);
      // Log the exact live DOM node so the user can hover/inspect it natively
      const liveNode = findingElements.get(f.id);
      console.log('DOM Element:', liveNode || f.elementSelector);
      console.log('---');
    });
    console.groupEnd();
  } else {
    console.log(`%c🛡️ Vigil Scan: Clean (${duration.toFixed(1)}ms)`, 'color: #16a34a; font-weight: bold;');
  }

  const cache = await getStorageValue('findings_cache');
  cache[domain] = findings;
  await setStorageValue('findings_cache', cache);

  const msg: ScanCompleteMessage = {
    type: 'SCAN_COMPLETE',
    findings,
    pageUrl: window.location.href,
    scanDurationMs: duration,
    termsUrl,
    privacyUrl
  };
  chrome.runtime.sendMessage(msg).catch(() => {});
}

/**
 * Generate a reasonable CSS selector for an element for later re-highlighting.
 */
function generateSelector(el: Element): string {
  if (el === document.documentElement) return 'html';
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${classes}`;
}

/** Initialize scanner */
export function initScanner(): void {
  scanPage();
}
