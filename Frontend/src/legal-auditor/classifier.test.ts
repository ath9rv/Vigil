import { describe, it, expect } from 'vitest';
import { executeLocalSLM } from './classifier';

describe('Legal Auditor Classifier & Negation Engine', () => {
  it('should NOT flag data sale when the policy explicitly negates it', async () => {
    const candidates = [
      { id: '1', text: 'We do not sell your personal information to third parties under any circumstances.', startOffset: 0, endOffset: 82, context: '' }
    ];

    const results = await executeLocalSLM(candidates);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('DATA_SALE');
    expect(results[0].rationale).toContain('FAIR');
    expect(results[0].rationale).toContain('DOES NOT sell');
  });

  it('should flag data sale when affirmative sale is stated', async () => {
    const candidates = [
      { id: '2', text: 'We may sell your personal information to commercial advertising partners.', startOffset: 0, endOffset: 72, context: '' }
    ];

    const results = await executeLocalSLM(candidates);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('DATA_SALE');
    expect(results[0].rationale).toContain('WARNING');
  });

  it('should detect mandatory binding arbitration with court waiver', async () => {
    const candidates = [
      { id: '3', text: 'You agree to binding arbitration and waive any right to a jury trial.', startOffset: 0, endOffset: 70, context: '' }
    ];

    const results = await executeLocalSLM(candidates);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('ARBITRATION');
    expect(results[0].rationale).toContain('TRICKY');
  });

  it('should distinguish harmless essential cookies from tracking cookies', async () => {
    const candidates = [
      { id: '4', text: 'We use strictly necessary essential cookies to maintain user session state.', startOffset: 0, endOffset: 76, context: '' },
      { id: '5', text: 'We deploy third party marketing cookies for cross-context behavioral tracking.', startOffset: 0, endOffset: 77, context: '' }
    ];

    const results = await executeLocalSLM(candidates);
    expect(results.length).toBe(2);
    expect(results[0].rationale).toContain('HARMLESS');
    expect(results[1].rationale).toContain('WARNING');
  });
});
