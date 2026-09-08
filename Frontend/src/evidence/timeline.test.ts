import { describe, it, expect } from 'vitest';
import { EvidenceTimeline } from './timeline';
import type { EvidenceNode } from './graph';
import type { TemporalCorrelation } from './temporal';
import type { ScanContext } from '../shared/scan-context';

describe('Vigil Phase 1: Evidence Timeline Generation', () => {
  const mockContext: ScanContext = {
    tabId: 1,
    navigationId: 'nav-timeline',
    origin: 'https://example.com',
    hostname: 'example.com',
    startedAt: 1000,
  };

  it('generates chronological timeline events from evidence nodes', () => {
    const nodes: EvidenceNode[] = [
      {
        id: 'node-net',
        type: 'NETWORK',
        navigationId: 'nav-timeline',
        tabId: 1,
        timestamp: 1004,
        source: 'network-monitor',
        strength: 1.0,
        context: mockContext,
        data: { domain: 'tracker.example', crossSite: true, trackerCount: 2 },
        provenance: {
          collector: 'network-monitor',
          collectorVersion: '1.0.0',
          observationId: 'obs-2',
          source: 'NETWORK',
          detectorId: 'network-monitor',
        },
      },
      {
        id: 'node-cookie',
        type: 'STORAGE',
        navigationId: 'nav-timeline',
        tabId: 1,
        timestamp: 1002,
        source: 'cookie-monitor',
        strength: 1.0,
        context: mockContext,
        data: { name: 'visitor_id', value: 'abc123456789' },
        provenance: {
          collector: 'cookie-monitor',
          collectorVersion: '1.0.0',
          observationId: 'obs-1',
          source: 'STORAGE',
          detectorId: 'cookie-monitor',
        },
      },
    ];

    const timeline = EvidenceTimeline.buildTimeline(nodes);

    // Sorted strictly chronologically
    expect(timeline.length).toBe(2);
    expect(timeline[0].timestamp).toBe(1002);
    expect(timeline[0].category).toBe('STORAGE');
    expect(timeline[0].title).toContain('Identifier');

    expect(timeline[1].timestamp).toBe(1004);
    expect(timeline[1].category).toBe('NETWORK');
    expect(timeline[1].title).toContain('Third-party');
  });

  it('incorporates temporal correlation patterns into timeline', () => {
    const nodes: EvidenceNode[] = [
      {
        id: 'node-c',
        type: 'STORAGE',
        navigationId: 'nav-timeline',
        tabId: 1,
        timestamp: 1000,
        source: 'cookie-monitor',
        strength: 1.0,
        context: mockContext,
        data: { name: 'uid' },
        provenance: { collector: 'c', collectorVersion: '1', observationId: 'o1' },
      },
    ];

    const correlations: TemporalCorrelation[] = [
      {
        id: 'corr-1',
        pattern: 'IDENTIFIER_READ_THEN_TRANSMITTED',
        navigationId: 'nav-timeline',
        eventIds: ['e1', 'e2'],
        startTime: 1005,
        endTime: 1055,
        durationMs: 50,
        supportingNodeIds: ['node-c'],
        score: {
          temporal: 0.9,
          entityMatch: 1.0,
          payloadSubstring: 1.0,
          repetition: 0.9,
          total: 0.95,
        },
        payloadMatch: 'EXACT_SUBSTRING',
      },
    ];

    const timeline = EvidenceTimeline.buildTimeline(nodes, correlations);

    expect(timeline.length).toBe(2);
    expect(timeline[1].category).toBe('CORRELATION');
    expect(timeline[1].title).toContain('Correlated Pattern');
    expect(timeline[1].importance).toBe('HIGH');
  });
});
