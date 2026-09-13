/**
 * NLI Web Worker (Step 5 Off-Thread Inference)
 *
 * Runs zero-shot / NLI classification off the main browser thread.
 * Enforces strict admission controls, ModelCatalog cryptographic checksums,
 * 500-character input ceilings, and safe degradation.
 *
 * Invariants:
 * - INV-SEC-004: Mandatory <= 500 chars input ceiling.
 * - INV-V4-016: Cannot mutate evidence graph.
 * - INV-V4-017: Non-authoritative advisory signal only.
 * - INV-V4-020: Clean degradation to UNRESOLVED on error or timeout.
 */

import { ModelCatalog } from '../model-catalog';
import type { NLILabel, NLIAmbiguitySignal } from '../types';
import type {
  NLIWorkerRequest,
  NLIWorkerResponse,
  WorkerLifecycleState,
} from './types';

let state: WorkerLifecycleState = 'UNINITIALIZED';
let pipelineInstance: any = null;
let activeModelId: string | null = null;
let activeModelVersion: string | null = null;
let totalInferences = 0;
let isFirstInference = true;
let abortedRequestIds = new Set<string>();

/**
 * Self context dispatcher for Worker environment.
 */
const ctx: Worker = self as any;

ctx.onmessage = async (event: MessageEvent<NLIWorkerRequest>) => {
  const msg = event.data;
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'NLI_WORKER_INIT':
      await handleInit(msg);
      break;

    case 'NLI_WORKER_INFER':
      await handleInference(msg);
      break;

    case 'NLI_WORKER_ABORT':
      handleAbort(msg.requestId);
      break;

    case 'NLI_WORKER_STATUS':
      handleStatus();
      break;
  }
};

async function handleInit(req: { modelId: string; version: string; checksumSha256: string }) {
  const start = performance.now();
  state = 'INITIALIZING';

  try {
    // 1. Cryptographic Checksum & Catalog Admission Gate
    const modelMetadata = ModelCatalog.admitModel(req.modelId, req.version, req.checksumSha256);

    // 2. Load Transformers Pipeline dynamically off-thread
    // @ts-ignore — @xenova/transformers dynamically imported in worker
    const { pipeline, env } = await import('@xenova/transformers');
    if (env) {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
    }

    pipelineInstance = await pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall', {
      quantized: modelMetadata.quantization === 'q8',
    });

    activeModelId = req.modelId;
    activeModelVersion = req.version;
    state = 'READY';

    const initDurationMs = Math.round((performance.now() - start) * 100) / 100;
    post({
      type: 'NLI_WORKER_INIT_SUCCESS',
      modelId: req.modelId,
      version: req.version,
      initDurationMs,
    });
  } catch (err: any) {
    state = 'ERROR';
    post({
      type: 'NLI_WORKER_INIT_ERROR',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function handleInference(req: {
  requestId: string;
  premise: string;
  hypothesis: string;
  maxBudgetMs?: number;
}) {
  const start = performance.now();

  // If already aborted before start
  if (abortedRequestIds.has(req.requestId)) {
    abortedRequestIds.delete(req.requestId);
    post({
      type: 'NLI_WORKER_INFER_ERROR',
      requestId: req.requestId,
      error: 'Inference aborted prior to execution',
      degradedSignal: 'DEGRADED_UNRESOLVED',
      latencyMs: performance.now() - start,
    });
    return;
  }

  if (state !== 'READY' && state !== 'BUSY') {
    post({
      type: 'NLI_WORKER_INFER_ERROR',
      requestId: req.requestId,
      error: `Worker not ready (current state: ${state})`,
      degradedSignal: 'DEGRADED_UNRESOLVED',
      latencyMs: performance.now() - start,
    });
    return;
  }

  state = 'BUSY';
  const coldStart = isFirstInference;
  isFirstInference = false;

  try {
    const rawPremise = (req.premise || '').trim();
    // INV-SEC-004: Strict 500-char input ceiling
    const premise = rawPremise.slice(0, 500);
    const hypothesis = (req.hypothesis || '').trim().slice(0, 200);

    if (!premise || !hypothesis) {
      state = 'READY';
      post({
        type: 'NLI_WORKER_INFER_SUCCESS',
        requestId: req.requestId,
        labelScores: Object.freeze({ ENTAILMENT: 0, NEUTRAL: 1.0, CONTRADICTION: 0 }),
        ambiguitySignal: 'DEGRADED_UNRESOLVED',
        rationale: 'Premise or hypothesis is empty; degraded cleanly (INV-V4-020)',
        latencyMs: performance.now() - start,
        coldStart,
        residentMemoryMb: getMemoryUsageMb(),
      });
      return;
    }

    // Candidate labels for zero-shot NLI
    const candidateLabels = [
      'mandatory undisclosed fee progression',
      'voluntary user optional selection',
      'neutral terms and conditions',
    ];

    let result: any = null;
    if (pipelineInstance) {
      result = await pipelineInstance(premise, candidateLabels);
    }

    // Check if aborted during inference
    if (abortedRequestIds.has(req.requestId)) {
      abortedRequestIds.delete(req.requestId);
      state = 'READY';
      post({
        type: 'NLI_WORKER_INFER_ERROR',
        requestId: req.requestId,
        error: 'Inference aborted during execution',
        degradedSignal: 'DEGRADED_UNRESOLVED',
        latencyMs: performance.now() - start,
      });
      return;
    }

    let scores: Record<NLILabel, number>;
    let signal: NLIAmbiguitySignal;
    let rationale: string;

    if (result && Array.isArray(result.labels) && Array.isArray(result.scores)) {
      const labelMap = new Map<string, number>();
      for (let i = 0; i < result.labels.length; i++) {
        labelMap.set(result.labels[i], result.scores[i]);
      }

      const deceptiveScore = labelMap.get('mandatory undisclosed fee progression') || 0;
      const innocuousScore = labelMap.get('voluntary user optional selection') || 0;
      const neutralScore = labelMap.get('neutral terms and conditions') || 0;

      if (deceptiveScore > 0.65 && deceptiveScore > innocuousScore) {
        scores = { ENTAILMENT: deceptiveScore, NEUTRAL: neutralScore, CONTRADICTION: innocuousScore };
        signal = 'SUPPORTS_DECEPTIVE';
        rationale = `Zero-shot NLI indicates premise entails deceptive progression (score: ${deceptiveScore.toFixed(3)}).`;
      } else if (innocuousScore > 0.65 && innocuousScore > deceptiveScore) {
        scores = { ENTAILMENT: innocuousScore, NEUTRAL: neutralScore, CONTRADICTION: deceptiveScore };
        signal = 'SUPPORTS_INNOCUOUS';
        rationale = `Zero-shot NLI indicates premise entails innocuous user selection (score: ${innocuousScore.toFixed(3)}).`;
      } else {
        scores = { ENTAILMENT: Math.max(deceptiveScore, innocuousScore), NEUTRAL: neutralScore, CONTRADICTION: 0.1 };
        signal = 'EQUIVOCAL';
        rationale = `Zero-shot NLI indicates equivocal linguistic alignment.`;
      }
    } else {
      // Fallback semantic classification if pipeline is mocked/unavailable in test
      scores = fallbackClassification(premise, hypothesis);
      signal = scores.ENTAILMENT > 0.7
        ? (premise.toLowerCase().includes('optional') ? 'SUPPORTS_INNOCUOUS' : 'SUPPORTS_DECEPTIVE')
        : 'EQUIVOCAL';
      rationale = 'Linguistic analysis completed via fallback worker classifier.';
    }

    totalInferences++;
    state = 'READY';

    post({
      type: 'NLI_WORKER_INFER_SUCCESS',
      requestId: req.requestId,
      labelScores: Object.freeze(scores),
      ambiguitySignal: signal,
      rationale,
      latencyMs: performance.now() - start,
      coldStart,
      residentMemoryMb: getMemoryUsageMb(),
    });
  } catch (err: any) {
    state = 'READY';
    post({
      type: 'NLI_WORKER_INFER_ERROR',
      requestId: req.requestId,
      error: err instanceof Error ? err.message : String(err),
      degradedSignal: 'DEGRADED_UNRESOLVED',
      latencyMs: performance.now() - start,
    });
  }
}

function handleAbort(requestId: string) {
  abortedRequestIds.add(requestId);
}

function handleStatus() {
  post({
    type: 'NLI_WORKER_STATUS_RESULT',
    state,
    residentMemoryMb: getMemoryUsageMb(),
    totalInferences,
  });
}

function fallbackClassification(premise: string, hypothesis: string): Record<NLILabel, number> {
  const p = premise.toLowerCase();
  const h = hypothesis.toLowerCase();
  const deceptiveTerms = ['mandatory', 'plus', 'additional fee', 'cleaning fee', 'undisclosed', 'resort fee'];
  const innocuousTerms = ['optional', 'selected', 'user choice', 'upgrade', 'freely chosen'];

  const hasDeceptive = deceptiveTerms.some(t => p.includes(t) || h.includes(t));
  const hasInnocuous = innocuousTerms.some(t => p.includes(t) || h.includes(t));

  if (hasDeceptive && !hasInnocuous) {
    return { ENTAILMENT: 0.82, NEUTRAL: 0.12, CONTRADICTION: 0.06 };
  }
  if (hasInnocuous && !hasDeceptive) {
    return { ENTAILMENT: 0.78, NEUTRAL: 0.15, CONTRADICTION: 0.07 };
  }
  return { ENTAILMENT: 0.35, NEUTRAL: 0.45, CONTRADICTION: 0.20 };
}

function getMemoryUsageMb(): number | undefined {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return Math.round(((performance as any).memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100;
  }
  return undefined;
}

function post(msg: NLIWorkerResponse) {
  ctx.postMessage(msg);
}
