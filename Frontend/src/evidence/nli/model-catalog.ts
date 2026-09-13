export interface ModelMetadata {
  readonly modelId: string;
  readonly version: string;
  readonly sha256: string;
  readonly task: 'zero-shot-classification' | 'cross-encoder-nli';
  readonly quantization: 'q8' | 'q4' | 'fp32';
  readonly parameterCount: number;
  readonly residentMemoryCeilingMb: number;
  readonly latencyBudgetMs: { readonly p50: number; readonly p95: number };
  readonly maxInputChars: number;
}

/**
 * ModelCatalog (Step 5B)
 *
 * Maintains a strict cryptographic allowlist/checksum gate for models admitted
 * into the Vigil runtime. Unapproved, unchecksummed, or tampered models are rejected.
 */
export class ModelCatalog {
  private static readonly CERTIFIED_MODELS = new Map<string, ModelMetadata>([
    [
      'xenova-nli-deberta-v3-xsmall@1.0.0',
      Object.freeze({
        modelId: 'xenova-nli-deberta-v3-xsmall',
        version: '1.0.0',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        task: 'cross-encoder-nli',
        quantization: 'q8',
        parameterCount: 22_000_000,
        residentMemoryCeilingMb: 50,
        latencyBudgetMs: Object.freeze({ p50: 30, p95: 80 }),
        maxInputChars: 500,
      }),
    ],
  ]);

  public static getCertifiedModel(modelId: string, version: string): ModelMetadata {
    const key = `${modelId}@${version}`;
    const model = this.CERTIFIED_MODELS.get(key);
    if (!model) {
      throw new Error(`[ModelCatalog] Model ${key} is not in the certified model catalog. Unauthorized execution rejected.`);
    }
    return model;
  }

  public static isCertified(modelId: string, version: string): boolean {
    return this.CERTIFIED_MODELS.has(`${modelId}@${version}`);
  }

  /**
   * Cryptographic verification gate: validates checksum against allowlist.
   */
  public static admitModel(modelId: string, version: string, checksumSha256: string): ModelMetadata {
    const model = this.getCertifiedModel(modelId, version);
    if (model.sha256.toLowerCase() !== checksumSha256.toLowerCase()) {
      throw new Error(
        `[ModelCatalog] Checksum mismatch for ${modelId}@${version}. Expected ${model.sha256}, got ${checksumSha256}. Admission rejected.`
      );
    }
    return model;
  }
}
