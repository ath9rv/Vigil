/**
 * Vigil Test-Only Calibration Suite & Benchmarks
 *
 * Defines structured calibration cases including explicit negative controls
 * across Urgency, Consent, Tracking, and Legal domains.
 *
 * Guarantees that Vigil distinguishes strong evidence from benign signals
 * and prevents false positive interventions.
 */

export interface CalibrationCase {
  id: string;
  category: 'URGENCY' | 'CONSENT' | 'TRACKING' | 'LEGAL';
  description: string;
  expectedObservation: string[];
  expectedVerdict?: string[];
  forbiddenVerdict?: string[];
  expectedConfidence?: 'UNSUPPORTED' | 'LOW' | 'MODERATE' | 'HIGH' | 'CONFIRMED' | 'CONTESTED';
  shouldIntervene: boolean;
  expectedRollback: boolean;
}

export const CALIBRATION_BENCHMARKS: CalibrationCase[] = [
  // ─── Urgency Negative Controls (Must NOT Intervene) ───────────────────────
  {
    id: 'CAL-URG-001',
    category: 'URGENCY',
    description: 'Bank security session timeout ("Your session will expire in 05:00 for your security")',
    expectedObservation: ['COUNTDOWN_OBSERVED', 'SESSION_TIMEOUT_EXCLUSION'],
    forbiddenVerdict: ['MANUFACTURED_URGENCY', 'DECEPTIVE_COMMERCE'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },
  {
    id: 'CAL-URG-002',
    category: 'URGENCY',
    description: 'Server-synchronized ticket reservation window with data-server-time attribute',
    expectedObservation: ['COUNTDOWN_OBSERVED', 'SERVER_SYNC_EXCLUSION'],
    forbiddenVerdict: ['MANUFACTURED_URGENCY'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },
  {
    id: 'CAL-URG-003',
    category: 'URGENCY',
    description: 'Live auction bidding timer on auction item page',
    expectedObservation: ['COUNTDOWN_OBSERVED', 'AUCTION_EXCLUSION'],
    forbiddenVerdict: ['MANUFACTURED_URGENCY'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },

  // ─── Urgency Positive Interventions (Must Intervene & Be Reversible) ─────
  {
    id: 'CAL-URG-004',
    category: 'URGENCY',
    description: 'Looping countdown in checkout container resetting from 00:01 back to 02:00',
    expectedObservation: ['COUNTDOWN_OBSERVED', 'RESET_LOOP_DETECTED', 'TRANSACTIONAL_CONTEXT'],
    expectedVerdict: ['MANUFACTURED_URGENCY'],
    expectedConfidence: 'CONFIRMED',
    shouldIntervene: true,
    expectedRollback: true,
  },
  {
    id: 'CAL-URG-005',
    category: 'URGENCY',
    description: 'Artificial stock depletion ("Only 2 left!") beside Buy button without server data',
    expectedObservation: ['SCARCITY_TEXT_DETECTED', 'TRANSACTIONAL_CONTEXT'],
    expectedVerdict: ['ARTIFICIAL_SCARCITY'],
    expectedConfidence: 'HIGH',
    shouldIntervene: true,
    expectedRollback: true,
  },

  // ─── Consent Negative Controls ────────────────────────────────────────────
  {
    id: 'CAL-CNS-001',
    category: 'CONSENT',
    description: 'Balanced CMP offering equally prominent Accept and Reject buttons with high contrast',
    expectedObservation: ['CMP_PRESENT', 'REJECT_BUTTON_VISIBLE', 'HIGH_CONTRAST'],
    forbiddenVerdict: ['DECEPTIVE_CONSENT', 'DARK_PATTERN'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },

  // ─── Tracking Negative Controls ───────────────────────────────────────────
  {
    id: 'CAL-TRK-001',
    category: 'TRACKING',
    description: 'First-party same-origin operational telemetry (/api/metrics on example.com)',
    expectedObservation: ['NETWORK_REQUEST_SAME_ORIGIN', 'OPERATIONAL_METRICS'],
    forbiddenVerdict: ['CROSS_SITE_TRACKING', 'IDENTIFIER_EXFILTRATION'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },

  // ─── Legal Analysis Negative Controls ─────────────────────────────────────
  {
    id: 'CAL-LEG-001',
    category: 'LEGAL',
    description: 'Explicitly permitted first-party essential service disclosure ("We use cookies to maintain your shopping cart")',
    expectedObservation: ['ESSENTIAL_SERVICE_DISCLOSURE'],
    forbiddenVerdict: ['UNFAIR_CLAUSE', 'DATA_SALE'],
    expectedConfidence: 'LOW',
    shouldIntervene: false,
    expectedRollback: false,
  },
  {
    id: 'CAL-LEG-002',
    category: 'LEGAL',
    description: 'Explicit negation of data sale ("We will never sell or rent your personal information to any third party")',
    expectedObservation: ['EXPLICIT_NO_SALE_DISCLOSURE', 'NEGATION_DETECTED'],
    forbiddenVerdict: ['DATA_SALE'],
    expectedConfidence: 'CONFIRMED',
    shouldIntervene: false,
    expectedRollback: false,
  },
];
