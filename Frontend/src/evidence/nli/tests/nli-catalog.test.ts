import { describe, it, expect } from 'vitest';
import { ModelCatalog } from '../model-catalog';

describe('V4 Step 5: Model Admission & Cryptographic Catalog (Step 5B)', () => {
  it('verifies certified model metadata and strict parameter bounds', () => {
    const model = ModelCatalog.getCertifiedModel('xenova-nli-deberta-v3-xsmall', '1.0.0');
    expect(model.modelId).toBe('xenova-nli-deberta-v3-xsmall');
    expect(model.version).toBe('1.0.0');
    expect(model.quantization).toBe('q8');
    expect(model.residentMemoryCeilingMb).toBeLessThanOrEqual(50);
    expect(model.maxInputChars).toBe(500);
  });

  it('rejects unauthorized or unlisted models with typed admission error', () => {
    expect(() => {
      ModelCatalog.getCertifiedModel('unauthorized-bert', '2.0.0');
    }).toThrow('not in the certified model catalog');
  });

  it('cryptographically validates checksum via admitModel', () => {
    const validSha = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08';
    const admitted = ModelCatalog.admitModel('xenova-nli-deberta-v3-xsmall', '1.0.0', validSha);
    expect(admitted.modelId).toBe('xenova-nli-deberta-v3-xsmall');

    // Tampered checksum rejection
    expect(() => {
      ModelCatalog.admitModel('xenova-nli-deberta-v3-xsmall', '1.0.0', 'badf00d'.repeat(8));
    }).toThrow('Checksum mismatch');
  });
});
