import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ONNXWorkerClient } from '../onnx-worker-client';
import { mockEscalation } from './test-fixtures';
import type { NLIWorkerRequest, NLIWorkerResponse } from '../worker/types';

/**
 * Mock Worker implementation for hermetic unit testing of the client protocol.
 */
class MockWorker {
  public onmessage: ((event: MessageEvent<any>) => void) | null = null;
  private listeners: Map<string, Array<(e: MessageEvent<any>) => void>> = new Map();
  public simulatedDelayMs = 5;
  public forceTimeout = false;
  public forceInitFail = false;
  public terminated = false;

  public addEventListener(type: string, listener: (e: MessageEvent<any>) => void): void {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  public removeEventListener(type: string, listener: (e: MessageEvent<any>) => void): void {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(l => l !== listener));
  }

  public postMessage(msg: NLIWorkerRequest): void {
    if (this.terminated) return;

    if (msg.type === 'NLI_WORKER_INIT') {
      setTimeout(() => {
        if (this.forceInitFail) {
          this.emit({ type: 'NLI_WORKER_INIT_ERROR', error: 'Simulated init failure' });
        } else {
          this.emit({
            type: 'NLI_WORKER_INIT_SUCCESS',
            modelId: msg.modelId,
            version: msg.version,
            initDurationMs: 45,
          });
        }
      }, 5);
      return;
    }

    if (msg.type === 'NLI_WORKER_INFER') {
      if (this.forceTimeout) {
        // Do not respond; let AbortController fire
        return;
      }
      setTimeout(() => {
        const isDeceptive = msg.premise.toLowerCase().includes('mandatory') || msg.premise.toLowerCase().includes('fee');
        const isOpt = msg.premise.toLowerCase().includes('optional');
        const scores = isDeceptive
          ? { ENTAILMENT: 0.88, NEUTRAL: 0.08, CONTRADICTION: 0.04 }
          : isOpt
          ? { ENTAILMENT: 0.82, NEUTRAL: 0.12, CONTRADICTION: 0.06 }
          : { ENTAILMENT: 0.35, NEUTRAL: 0.45, CONTRADICTION: 0.20 };

        this.emit({
          type: 'NLI_WORKER_INFER_SUCCESS',
          requestId: msg.requestId,
          labelScores: scores,
          ambiguitySignal: isDeceptive ? 'SUPPORTS_DECEPTIVE' : isOpt ? 'SUPPORTS_INNOCUOUS' : 'EQUIVOCAL',
          rationale: 'Mock inference complete',
          latencyMs: this.simulatedDelayMs,
          coldStart: true,
          residentMemoryMb: 24.5,
        });
      }, this.simulatedDelayMs);
      return;
    }
  }

  public terminate(): void {
    this.terminated = true;
    this.listeners.clear();
  }

  private emit(response: NLIWorkerResponse): void {
    const event = { data: response } as MessageEvent<any>;
    const list = this.listeners.get('message') || [];
    for (const l of list) l(event);
    if (this.onmessage) this.onmessage(event);
  }
}

describe('V4 Milestone 4: ONNX Web Worker Client Protocol & Invariant Enforcement', () => {
  let mockWorker: MockWorker;
  let client: ONNXWorkerClient;

  beforeEach(() => {
    mockWorker = new MockWorker();
    client = new ONNXWorkerClient({
      workerFactory: () => mockWorker as any,
      hardTimeoutMs: 100,
    });
  });

  afterEach(() => {
    client.terminate();
  });

  it('Admission Gate: Initializes worker and completes ModelCatalog cryptographic admission', async () => {
    const ok = await client.initialize();
    expect(ok).toBe(true);

    const telemetry = client.getTelemetry();
    expect(telemetry.isReady).toBe(true);
    expect(telemetry.workerInitDurationMs).toBe(45);
  });

  it('INV-V4-017 / Epistemic Non-Authority: Output contains no Verdict or Finding properties', async () => {
    const input = {
      premise: 'Mandatory $15 service charge added at payment',
      hypothesis: 'Hidden fee',
      escalationRequest: mockEscalation('nav-test-1'),
    };

    const assessment = await client.evaluate(input);

    expect(assessment.modelId).toBe('xenova-nli-deberta-v3-xsmall');
    expect(assessment.ambiguitySignal).toBe('SUPPORTS_DECEPTIVE');
    expect(assessment.modelAssessmentConfidence).toBeGreaterThan(0.8);
    expect((assessment as any).verdict).toBeUndefined();
    expect((assessment as any).finding).toBeUndefined();
  });

  it('Provenanced Audit Trail: Assessment carries complete cryptographic and provenance metadata', async () => {
    const input = {
      premise: 'Mandatory processing fee',
      hypothesis: 'Fee',
      escalationRequest: mockEscalation('nav-provenance'),
    };

    const assessment = await client.evaluate(input);

    expect(assessment.sha256).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    expect(assessment.quantization).toBe('q8');
    expect(assessment.adapterVersion).toBe('1.0.0-onnx-worker');
    expect(assessment.executionMode).toBe('WORKER_ONNX');
    expect(assessment.sourceObservationIds).toEqual(['obs-1', 'obs-2']);
    expect(assessment.inferenceTimestamp).toBeGreaterThan(0);
    expect(assessment.coldStart).toBe(true);
  });

  it('Admission Budget / Mutex: Concurrency limit = 1; rejects burst inference', async () => {
    mockWorker.simulatedDelayMs = 50; // Slow down to simulate in-flight work

    const input1 = {
      premise: 'Mandatory fee 1',
      hypothesis: 'Fee',
      escalationRequest: mockEscalation('nav-burst-1'),
    };

    const input2 = {
      premise: 'Mandatory fee 2',
      hypothesis: 'Fee',
      escalationRequest: mockEscalation('nav-burst-2'),
    };

    // Fire two parallel evaluations simultaneously
    const p1 = client.evaluate(input1);
    const p2 = client.evaluate(input2);

    const [res1, res2] = await Promise.all([p1, p2]);

    // One succeeds, the second is rejected by the concurrency mutex
    const rejected = res1.ambiguitySignal === 'DEGRADED_UNRESOLVED' ? res1 : res2;
    const accepted = res1.ambiguitySignal !== 'DEGRADED_UNRESOLVED' ? res1 : res2;

    expect(rejected.ambiguitySignal).toBe('DEGRADED_UNRESOLVED');
    expect(rejected.rationale).toContain('Concurrency violation');
    expect(accepted.ambiguitySignal).toBe('SUPPORTS_DECEPTIVE');
  });

  it('Admission Budget / 100ms Abort: Hard abort fires on timeout and returns DEGRADED_UNRESOLVED', async () => {
    mockWorker.forceTimeout = true; // Never responds

    const shortTimeoutClient = new ONNXWorkerClient({
      workerFactory: () => mockWorker as any,
      hardTimeoutMs: 30, // 30ms hard timeout for test speed
    });

    const input = {
      premise: 'Slow query text',
      hypothesis: 'Slow hypothesis',
      escalationRequest: mockEscalation('nav-timeout'),
    };

    const assessment = await shortTimeoutClient.evaluate(input);

    expect(assessment.ambiguitySignal).toBe('DEGRADED_UNRESOLVED');
    expect(assessment.modelAssessmentConfidence).toBe(0);
    expect(assessment.rationale).toContain('hard-aborted: exceeded 30ms budget ceiling');
    expect(assessment.executionMode).toBe('DEGRADED');

    shortTimeoutClient.terminate();
  });

  it('INV-V4-021: Worker init failure cleanly degrades with zero mutation', async () => {
    mockWorker.forceInitFail = true;

    const failingClient = new ONNXWorkerClient({
      workerFactory: () => mockWorker as any,
    });

    const input = {
      premise: 'Test premise',
      hypothesis: 'Test hyp',
      escalationRequest: mockEscalation('nav-fail'),
    };

    const assessment = await failingClient.evaluate(input);

    expect(assessment.ambiguitySignal).toBe('DEGRADED_UNRESOLVED');
    expect(assessment.modelAssessmentConfidence).toBe(0);
    expect(assessment.rationale).toContain('safe fallback');

    failingClient.terminate();
  });
});
