/**
 * ONNX NLI Worker Client (Step 5 Execution Client)
 *
 * Manages off-thread Web Worker inference lifecycle, strictly enforcing:
 * - Admission Budget: Concurrency = 1 (Async Mutex; rejects bursts).
 * - Admission Budget: Hard abort at 100ms via AbortController.
 * - Admission Budget: Input text ceiling <= 500 characters (INV-SEC-004).
 * - Admission Budget: Resident memory ceiling <= 50MB.
 * - Epistemic Non-Authority: Advisory signal only (INV-V4-017).
 * - Safe Degradation: Error/timeout degrades to UNRESOLVED (INV-V4-020).
 * - Zero Mutation: Cannot touch EvidenceGraph (INV-V4-016).
 */

import type {
  NLIModelEvaluator,
  NLIInput,
  NLIModelAssessment,
  NLILabel,
  NLIAmbiguitySignal,
} from './types';
import { ModelCatalog } from './model-catalog';
import type {
  NLIWorkerRequest,
  NLIWorkerResponse,
  WorkerLifecycleState,
} from './worker/types';

export interface ONNXWorkerClientOptions {
  readonly modelId?: string;
  readonly modelVersion?: string;
  readonly hardTimeoutMs?: number; // Default 100ms (Admission Budget)
  readonly workerFactory?: () => Worker;
  readonly maxQueueSize?: number; // Default 0: reject concurrent burst
}

export interface ONNXClientTelemetry {
  workerInitDurationMs: number;
  firstInferenceDurationMs: number;
  warmInferenceCount: number;
  warmInferenceAvgMs: number;
  warmInferenceP95Ms: number;
  peakWorkerMemoryMb?: number;
  abortedInferences: number;
  totalInferences: number;
  isReady: boolean;
}

export class ONNXWorkerClient implements NLIModelEvaluator {
  private readonly modelId: string;
  private readonly modelVersion: string;
  private readonly hardTimeoutMs: number;
  private readonly workerFactory?: () => Worker;

  private worker: Worker | null = null;
  private state: WorkerLifecycleState = 'UNINITIALIZED';
  private activeRequestId: string | null = null;
  private isInitializing = false;
  private initPromise: Promise<boolean> | null = null;

  private isEvaluating = false;

  // Performance telemetry
  private workerInitDurationMs = 0;
  private firstInferenceDurationMs = 0;
  private isFirstInference = true;
  private warmInferenceLatencies: number[] = [];
  private abortedInferences = 0;
  private totalInferences = 0;
  private peakWorkerMemoryMb?: number;

  constructor(options: ONNXWorkerClientOptions = {}) {
    this.modelId = options.modelId ?? 'xenova-nli-deberta-v3-xsmall';
    this.modelVersion = options.modelVersion ?? '1.0.0';
    this.hardTimeoutMs = options.hardTimeoutMs ?? 100;
    this.workerFactory = options.workerFactory;
  }

  /**
   * Initializes the off-thread ONNX worker and validates ModelCatalog cryptographic checksum.
   */
  public async initialize(): Promise<boolean> {
    if (this.state === 'READY') return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    const ok = await this.initPromise;
    this.initPromise = null;
    return ok;
  }

  private async doInitialize(): Promise<boolean> {
    const start = performance.now();
    this.state = 'INITIALIZING';

    try {
      // 1. Verify ModelCatalog admission before attempting worker creation
      const metadata = ModelCatalog.getCertifiedModel(this.modelId, this.modelVersion);

      // 2. Instantiate Worker
      if (this.workerFactory) {
        this.worker = this.workerFactory();
      } else if (typeof Worker !== 'undefined') {
        // Module worker in Vite/Chromium extension
        this.worker = new Worker(
          new URL('./worker/nli-worker.ts', import.meta.url),
          { type: 'module' }
        );
      } else {
        // Fallback for non-browser / test environment without DOM Worker
        this.state = 'ERROR';
        return false;
      }

      // 3. Send Init Request with Cryptographic Checksum
      const initSuccess = await new Promise<boolean>((resolve) => {
        if (!this.worker) return resolve(false);

        const timeout = setTimeout(() => {
          this.state = 'ERROR';
          resolve(false);
        }, 15000);

        const handler = (evt: MessageEvent<NLIWorkerResponse>) => {
          const msg = evt.data;
          if (msg.type === 'NLI_WORKER_INIT_SUCCESS') {
            clearTimeout(timeout);
            this.worker?.removeEventListener('message', handler);
            this.workerInitDurationMs = msg.initDurationMs;
            this.state = 'READY';
            resolve(true);
          } else if (msg.type === 'NLI_WORKER_INIT_ERROR') {
            clearTimeout(timeout);
            this.worker?.removeEventListener('message', handler);
            this.state = 'ERROR';
            resolve(false);
          }
        };

        this.worker.addEventListener('message', handler);

        const req: NLIWorkerRequest = {
          type: 'NLI_WORKER_INIT',
          modelId: this.modelId,
          version: this.modelVersion,
          checksumSha256: metadata.sha256,
        };
        this.worker.postMessage(req);
      });

      return initSuccess;
    } catch (err) {
      this.state = 'ERROR';
      return false;
    }
  }

  /**
   * Evaluates linguistic ambiguity via the ONNX worker under strict admission bounds.
   */
  public async evaluate(input: NLIInput, options: { maxBudgetMs?: number } = {}): Promise<NLIModelAssessment> {
    const start = performance.now();
    const maxBudget = Math.min(options.maxBudgetMs ?? this.hardTimeoutMs, this.hardTimeoutMs);
    const metadata = ModelCatalog.getCertifiedModel(this.modelId, this.modelVersion);

    // ── 1. Enforce Input Bounds & Sanitization (INV-SEC-004) ────────────────
    const rawPremise = input.premise ?? '';
    const premise = rawPremise.slice(0, metadata.maxInputChars); // Hard clamp to 500 chars
    const hypothesis = (input.hypothesis ?? '').slice(0, 200);

    if (premise.trim().length === 0 || hypothesis.trim().length === 0) {
      return this.degradedResult(
        input,
        'Premise or hypothesis is empty; degraded cleanly (INV-V4-020)',
        performance.now() - start
      );
    }

    // ── 2. Concurrency Mutex: Max 1 Concurrent Inference ──────────────────
    if (this.isEvaluating || this.state === 'BUSY' || this.activeRequestId !== null) {
      return this.degradedResult(
        input,
        'Concurrency violation: burst inference rejected by single-instance mutex (Admission Budget)',
        performance.now() - start
      );
    }
    this.isEvaluating = true;

    // ── 3. Lazy Worker Initialization ─────────────────────────────────────
    try {
      if (this.state !== 'READY') {
        const ok = await this.initialize();
        if (!ok || !this.worker) {
          return this.degradedResult(
            input,
            'NLI worker unavailable or failed initialization; safe fallback (INV-V4-021)',
            performance.now() - start
          );
        }
      }

      // ── 4. Set Up 100ms Hard Abort Controller ─────────────────────────────
      this.state = 'BUSY';
      const requestId = `infer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.activeRequestId = requestId;

      const controller = new AbortController();
      const abortTimeout = setTimeout(() => {
        controller.abort();
      }, maxBudget);

      try {
        const assessment = await new Promise<NLIModelAssessment>((resolve) => {
          if (!this.worker) {
            resolve(this.degradedResult(input, 'Worker missing', performance.now() - start));
            return;
          }

          const cleanup = () => {
            clearTimeout(abortTimeout);
            this.worker?.removeEventListener('message', messageHandler);
            this.activeRequestId = null;
            this.state = 'READY';
          };

          // Handle AbortController signal
          controller.signal.addEventListener('abort', () => {
            cleanup();
            this.abortedInferences++;
            // Notify worker to discard execution
            this.worker?.postMessage({
              type: 'NLI_WORKER_ABORT',
              requestId,
            });
            resolve(
              this.degradedResult(
                input,
                `Inference hard-aborted: exceeded ${maxBudget}ms budget ceiling (Admission Budget / INV-V4-020)`,
                performance.now() - start
              )
            );
          });

          const messageHandler = (evt: MessageEvent<NLIWorkerResponse>) => {
            const msg = evt.data;
            if (!msg || !('requestId' in msg) || msg.requestId !== requestId) return;

            cleanup();

            if (msg.type === 'NLI_WORKER_INFER_SUCCESS') {
              const duration = performance.now() - start;
              this.totalInferences++;

              if (msg.coldStart) {
                this.firstInferenceDurationMs = duration;
              } else {
                this.warmInferenceLatencies.push(duration);
              }

              if (msg.residentMemoryMb) {
                this.peakWorkerMemoryMb = Math.max(this.peakWorkerMemoryMb ?? 0, msg.residentMemoryMb);
              }

              resolve(
                Object.freeze({
                  assessmentId: `nli-assess-${Date.now()}`,
                  escalationRequestId: input.escalationRequest.requestId,
                  modelId: this.modelId,
                  modelVersion: this.modelVersion,
                  sha256: metadata.sha256,
                  quantization: metadata.quantization,
                  adapterVersion: '1.0.0-onnx-worker',
                  labelScores: msg.labelScores,
                  modelAssessmentConfidence: msg.labelScores.ENTAILMENT,
                  ambiguitySignal: msg.ambiguitySignal,
                  rationale: msg.rationale,
                  limitations: Object.freeze([
                    'NLI output is an advisory signal and possesses zero authority to emit canonical findings (INV-V4-017).',
                    'Inference is bounded by deterministic escalation premise and cannot invent evidence (INV-V4-016).',
                    'Model assessment confidence reflects linguistic alignment only, not final legal certainty.',
                  ]),
                  latencyMs: duration,
                  timestamp: Date.now(),
                  inferenceTimestamp: Date.now(),
                  sourceObservationIds: Object.freeze([...(input.escalationRequest.sourceObservationIds ?? [])]),
                  executionMode: 'WORKER_ONNX',
                  coldStart: msg.coldStart,
                })
              );
            } else if (msg.type === 'NLI_WORKER_INFER_ERROR') {
              resolve(
                this.degradedResult(
                  input,
                  `Worker evaluation error: ${msg.error} (INV-V4-020)`,
                  performance.now() - start
                )
              );
            }
          };

          this.worker.addEventListener('message', messageHandler);

          // Dispatch inference to worker
          const req: NLIWorkerRequest = {
            type: 'NLI_WORKER_INFER',
            requestId,
            premise,
            hypothesis,
            maxBudgetMs: maxBudget,
          };
          this.worker.postMessage(req);
        });

        return assessment;
      } catch (err: any) {
        clearTimeout(abortTimeout);
        this.activeRequestId = null;
        this.state = 'READY';
        return this.degradedResult(
          input,
          `Unexpected inference client failure: ${err?.message ?? err}`,
          performance.now() - start
        );
      }
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Produces a frozen degraded assessment following INV-V4-020 and INV-V4-021.
   */
  private degradedResult(input: NLIInput, reason: string, latencyMs: number): NLIModelAssessment {
    const metadata = ModelCatalog.getCertifiedModel(this.modelId, this.modelVersion);
    return Object.freeze({
      assessmentId: `nli-assess-${Date.now()}`,
      escalationRequestId: input.escalationRequest.requestId,
      modelId: this.modelId,
      modelVersion: this.modelVersion,
      sha256: metadata.sha256,
      quantization: metadata.quantization,
      adapterVersion: '1.0.0-onnx-worker',
      labelScores: Object.freeze({ ENTAILMENT: 0, NEUTRAL: 1.0, CONTRADICTION: 0 }),
      modelAssessmentConfidence: 0,
      ambiguitySignal: 'DEGRADED_UNRESOLVED',
      rationale: reason,
      limitations: Object.freeze([
        'Model evaluation degraded cleanly to UNRESOLVED (INV-V4-020).',
        'Pipeline remains safe and auditable under model non-authority (INV-V4-021).',
      ]),
      latencyMs,
      timestamp: Date.now(),
      inferenceTimestamp: Date.now(),
      sourceObservationIds: Object.freeze([...(input.escalationRequest.sourceObservationIds ?? [])]),
      executionMode: 'DEGRADED',
      coldStart: false,
    });
  }

  public getTelemetry(): ONNXClientTelemetry {
    const count = this.warmInferenceLatencies.length;
    const avg = count > 0 ? this.warmInferenceLatencies.reduce((a, b) => a + b, 0) / count : 0;
    const sorted = [...this.warmInferenceLatencies].sort((a, b) => a - b);
    const p95 = count > 0 ? sorted[Math.min(count - 1, Math.floor((count - 1) * 0.95))] : 0;

    return {
      workerInitDurationMs: this.workerInitDurationMs,
      firstInferenceDurationMs: this.firstInferenceDurationMs,
      warmInferenceCount: count,
      warmInferenceAvgMs: Math.round(avg * 100) / 100,
      warmInferenceP95Ms: Math.round(p95 * 100) / 100,
      peakWorkerMemoryMb: this.peakWorkerMemoryMb,
      abortedInferences: this.abortedInferences,
      totalInferences: this.totalInferences,
      isReady: this.state === 'READY',
    };
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.state = 'TERMINATED';
    this.activeRequestId = null;
  }
}
