import { Page, CDPSession } from '@playwright/test';

export interface StatisticalSummary {
  min: number;
  median: number;
  p95: number;
  max: number;
  mean: number;
  stdDev: number;
  count: number;
}

export function computeStats(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return { min: 0, median: 0, p95: 0, max: 0, mean: 0, stdDev: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const min = Math.round(sorted[0] * 100) / 100;
  const max = Math.round(sorted[count - 1] * 100) / 100;

  // Median calculation
  let median: number;
  if (count % 2 === 1) {
    median = sorted[Math.floor(count / 2)];
  } else {
    median = (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
  }
  median = Math.round(median * 100) / 100;

  // P95 calculation (nearest rank with ceiling interpolation)
  const p95Index = Math.min(count - 1, Math.floor((count - 1) * 0.95));
  const p95 = Math.round(sorted[p95Index] * 100) / 100;

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round((sum / count) * 100) / 100;

  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.round(Math.sqrt(variance) * 100) / 100;

  return { min, median, p95, max, mean, stdDev, count };
}

export interface CDPMetrics {
  jsHeapUsedMb: number; // Measured via CDP JSHeapUsedSize
  taskDurationMs: number;
  scriptDurationMs: number;
  layoutDurationMs: number;
  recalcStyleDurationMs: number;
  nodes: number;
  documents: number;
}

export async function sampleCDPMetrics(page: Page): Promise<CDPMetrics> {
  const client: CDPSession = await page.context().newCDPSession(page);
  try {
    await client.send('Performance.enable');
    const response = await client.send('Performance.getMetrics');
    const raw: Record<string, number> = {};
    for (const m of response.metrics) {
      raw[m.name] = m.value;
    }

    return {
      jsHeapUsedMb: Math.round(((raw.JSHeapUsedSize || 0) / (1024 * 1024)) * 100) / 100,
      taskDurationMs: Math.round((raw.TaskDuration || 0) * 1000 * 100) / 100,
      scriptDurationMs: Math.round((raw.ScriptDuration || 0) * 1000 * 100) / 100,
      layoutDurationMs: Math.round((raw.LayoutDuration || 0) * 1000 * 100) / 100,
      recalcStyleDurationMs: Math.round((raw.RecalcStyleDuration || 0) * 1000 * 100) / 100,
      nodes: raw.Nodes || 0,
      documents: raw.Documents || 0,
    };
  } finally {
    try {
      await client.detach();
    } catch {
      // Ignore detach error if page closed
    }
  }
}

export interface NavigationTimings {
  loadEventMs: number;
  domContentLoadedMs: number;
  durationMs: number;
  domInteractiveMs: number;
}

export async function sampleNavigationTiming(page: Page): Promise<NavigationTimings> {
  return await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      return {
        loadEventMs: Math.round(Math.max(0, nav.loadEventEnd - nav.startTime) * 100) / 100,
        domContentLoadedMs: Math.round(Math.max(0, nav.domContentLoadedEventEnd - nav.startTime) * 100) / 100,
        durationMs: Math.round(Math.max(0, nav.duration) * 100) / 100,
        domInteractiveMs: Math.round(Math.max(0, nav.domInteractive - nav.startTime) * 100) / 100,
      };
    }
    const t = performance.timing;
    const start = t.navigationStart;
    return {
      loadEventMs: Math.round(Math.max(0, t.loadEventEnd - start) * 100) / 100,
      domContentLoadedMs: Math.round(Math.max(0, t.domContentLoadedEventEnd - start) * 100) / 100,
      durationMs: Math.round(Math.max(0, (t.loadEventEnd || Date.now()) - start) * 100) / 100,
      domInteractiveMs: Math.round(Math.max(0, t.domInteractive - start) * 100) / 100,
    };
  });
}

export interface ProfileMetricRow {
  name: string;
  stats?: StatisticalSummary;
  median?: number;
  p95?: number;
  target?: string;
  unit?: string;
  pass?: boolean;
}

export interface ProfileCardSection {
  title?: string;
  metrics: ProfileMetricRow[];
  notes?: string;
}

export interface VigilChromiumProfileOptions {
  benchmark: string;
  trials: number;
  browser?: string;
  extensionBuild?: string;
  sections?: ProfileCardSection[];
  metrics?: ProfileMetricRow[];
  serviceWorker?: {
    coldStartMs?: number;
    idleMemoryMb?: number;
    messageRoundtripMs?: number;
  };
  overallStatus?: 'CERTIFIED WITHIN BUDGET' | 'BUDGET EXCEEDED' | 'PASS';
  notes?: string;
}

export function formatChromiumProfileCard(opts: VigilChromiumProfileOptions): string {
  const line = '='.repeat(80);
  const lines: string[] = [];

  lines.push(line);
  lines.push('                      VIGIL CHROMIUM PERFORMANCE PROFILE');
  lines.push(line);
  lines.push(`Benchmark: ${opts.benchmark}`);
  lines.push(`Trials: ${opts.trials} repeated executions`);
  lines.push(`Browser: ${opts.browser ?? 'Chromium (Real Packaged Extension Runtime)'}`);
  lines.push(`Extension build: ${opts.extensionBuild ?? 'v5.0.0 (V5-certified)'}`);
  lines.push('');

  const renderMetric = (m: ProfileMetricRow) => {
    const med = m.stats ? m.stats.median : (m.median ?? 0);
    const p95Val = m.stats ? m.stats.p95 : (m.p95 ?? med);
    const unit = m.unit ?? 'ms';
    const targetStr = m.target ? ` | Target: ${m.target}` : '';
    const passStr = m.pass !== undefined ? (m.pass ? ' [PASS]' : ' [FAIL]') : '';
    lines.push(`  ${m.name}:`);
    lines.push(`    Median: ${med.toFixed(2)} ${unit} | P95: ${p95Val.toFixed(2)} ${unit}${targetStr}${passStr}`);
  };

  if (opts.metrics && opts.metrics.length > 0) {
    lines.push('Metrics:');
    for (const m of opts.metrics) {
      renderMetric(m);
    }
  }

  if (opts.sections) {
    for (const sec of opts.sections) {
      if (sec.title) {
        lines.push('');
        lines.push(`${sec.title}:`);
      }
      for (const m of sec.metrics) {
        renderMetric(m);
      }
      if (sec.notes) {
        lines.push(`    Note: ${sec.notes}`);
      }
    }
  }

  if (opts.serviceWorker) {
    lines.push('');
    lines.push('Service Worker:');
    const swParts: string[] = [];
    if (opts.serviceWorker.coldStartMs !== undefined) {
      swParts.push(`Cold start latency: ${opts.serviceWorker.coldStartMs.toFixed(2)} ms`);
    }
    if (opts.serviceWorker.idleMemoryMb !== undefined) {
      swParts.push(`Idle memory (performance.memory): ${opts.serviceWorker.idleMemoryMb.toFixed(2)} MB`);
    }
    if (opts.serviceWorker.messageRoundtripMs !== undefined) {
      swParts.push(`Message roundtrip: ${opts.serviceWorker.messageRoundtripMs.toFixed(2)} ms`);
    }
    lines.push(`  ${swParts.join(' | ')}`);
  }

  if (opts.notes) {
    lines.push('');
    lines.push(`Notes: ${opts.notes}`);
  }

  lines.push('');
  lines.push(`Status: ${opts.overallStatus ?? 'CERTIFIED WITHIN BUDGET'}`);
  lines.push(line);

  return lines.join('\n');
}

export interface ExecutiveCertificationOptions {
  browser: string;
  extensionBuild: string;
  chromeVersion: string;
  os: string;
  trialCount: number;
  pageLoad: { median: number; p95: number; status: 'PASS' | 'FAIL' };
  mutation: { median: number; p95: number; status: 'PASS' | 'FAIL' };
  memory: { baselineMb: number; peakMb: number; postCleanupMb: number; status: 'PASS' | 'FAIL' };
  serviceWorker: { coldStartMs: number; roundtripMs: number; status: 'PASS' | 'FAIL' };
  multiTab: { peakMb: number; postCleanupMb: number; status: 'PASS' | 'FAIL' };
  longSession: { heapDeltaMb: number; graphRetention: string; status: 'PASS' | 'FAIL' };
  overall: 'CERTIFIED' | 'CONDITIONAL' | 'NOT CERTIFIED';
}

export function formatExecutiveCertification(opts: ExecutiveCertificationOptions): string {
  const line = '='.repeat(70);
  return [
    line,
    '                VIGIL CHROMIUM PERFORMANCE CERTIFICATION',
    line,
    '',
    `Browser:         ${opts.browser}`,
    `Extension build: ${opts.extensionBuild}`,
    `Chrome version:  ${opts.chromeVersion}`,
    `OS:              ${opts.os}`,
    `Trial count:     ${opts.trialCount} repeated trials (Release Certification Tier)`,
    '',
    'Page-load overhead (Clean vs Idle vs Active):',
    `  Median:        ${opts.pageLoad.median.toFixed(2)} ms`,
    `  P95:           ${opts.pageLoad.p95.toFixed(2)} ms`,
    `  Status:        ${opts.pageLoad.status}`,
    '',
    'Mutation workload (10,000 DOM churn storm):',
    `  Median:        ${opts.mutation.median.toFixed(2)} ms`,
    `  P95:           ${opts.mutation.p95.toFixed(2)} ms`,
    `  Status:        ${opts.mutation.status}`,
    '',
    'Memory (CDP JSHeapUsedSize):',
    `  Baseline:      ${opts.memory.baselineMb.toFixed(2)} MB`,
    `  Peak:          ${opts.memory.peakMb.toFixed(2)} MB`,
    `  Post-cleanup:  ${opts.memory.postCleanupMb.toFixed(2)} MB`,
    `  Status:        ${opts.memory.status}`,
    '',
    'Service worker (MV3 Lifecycle & IPC):',
    `  Cold start:    ${opts.serviceWorker.coldStartMs.toFixed(2)} ms`,
    `  Roundtrip:     ${opts.serviceWorker.roundtripMs.toFixed(2)} ms`,
    `  Status:        ${opts.serviceWorker.status}`,
    '',
    '50-tab stress (Concurrency Scaling):',
    `  Peak:          ${opts.multiTab.peakMb.toFixed(2)} MB total runtime footprint`,
    `  Post-cleanup:  ${opts.multiTab.postCleanupMb.toFixed(2)} MB retained`,
    `  Status:        ${opts.multiTab.status}`,
    '',
    'Long-session (Sustained Navigation & Graph Lifecycle):',
    `  Heap delta:    ${opts.longSession.heapDeltaMb.toFixed(2)} MB`,
    `  Graph retention: ${opts.longSession.graphRetention}`,
    `  Status:        ${opts.longSession.status}`,
    '',
    `Overall:         ${opts.overall}`,
    line,
  ].join('\n');
}
