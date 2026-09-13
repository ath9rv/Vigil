import type { NLILabel, NLIAmbiguitySignal } from '../types';

export type WorkerLifecycleState =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'READY'
  | 'BUSY'
  | 'TERMINATED'
  | 'ERROR';

export interface WorkerInitRequest {
  readonly type: 'NLI_WORKER_INIT';
  readonly modelId: string;
  readonly version: string;
  readonly checksumSha256: string;
}

export interface WorkerInitSuccessResponse {
  readonly type: 'NLI_WORKER_INIT_SUCCESS';
  readonly modelId: string;
  readonly version: string;
  readonly initDurationMs: number;
}

export interface WorkerInitErrorResponse {
  readonly type: 'NLI_WORKER_INIT_ERROR';
  readonly error: string;
}

export interface WorkerInferenceRequest {
  readonly type: 'NLI_WORKER_INFER';
  readonly requestId: string;
  readonly premise: string;
  readonly hypothesis: string;
  readonly maxBudgetMs?: number;
}

export interface WorkerInferenceSuccessResponse {
  readonly type: 'NLI_WORKER_INFER_SUCCESS';
  readonly requestId: string;
  readonly labelScores: Readonly<Record<NLILabel, number>>;
  readonly ambiguitySignal: NLIAmbiguitySignal;
  readonly rationale: string;
  readonly latencyMs: number;
  readonly coldStart: boolean;
  readonly residentMemoryMb?: number;
}

export interface WorkerInferenceErrorResponse {
  readonly type: 'NLI_WORKER_INFER_ERROR';
  readonly requestId: string;
  readonly error: string;
  readonly degradedSignal: NLIAmbiguitySignal;
  readonly latencyMs: number;
}

export interface WorkerAbortRequest {
  readonly type: 'NLI_WORKER_ABORT';
  readonly requestId: string;
}

export interface WorkerStatusRequest {
  readonly type: 'NLI_WORKER_STATUS';
}

export interface WorkerStatusResponse {
  readonly type: 'NLI_WORKER_STATUS_RESULT';
  readonly state: WorkerLifecycleState;
  readonly residentMemoryMb?: number;
  readonly totalInferences: number;
}

export type NLIWorkerRequest =
  | WorkerInitRequest
  | WorkerInferenceRequest
  | WorkerAbortRequest
  | WorkerStatusRequest;

export type NLIWorkerResponse =
  | WorkerInitSuccessResponse
  | WorkerInitErrorResponse
  | WorkerInferenceSuccessResponse
  | WorkerInferenceErrorResponse
  | WorkerStatusResponse;
