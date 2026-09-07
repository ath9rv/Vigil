/**
 * Vigil Scan Context
 * 
 * Ephemeral state isolation boundary.
 * Enforces that all evidence, findings, and UI state are strictly tied
 * to a specific tab and navigation event, preventing state bleeding.
 */

export interface ScanContext {
  tabId: number;
  navigationId: string;
  origin: string;
  hostname: string;
  startedAt: number;
}

/**
 * Creates a unique identifier for ephemeral page state.
 */
export function getScanContextKey(context: ScanContext): string {
  return `${context.tabId}:${context.navigationId}`;
}

/**
 * Validates whether a provided object conforms to ScanContext.
 */
export function isValidScanContext(ctx: any): ctx is ScanContext {
  return (
    ctx &&
    typeof ctx.tabId === 'number' &&
    typeof ctx.navigationId === 'string' &&
    typeof ctx.origin === 'string' &&
    typeof ctx.hostname === 'string' &&
    typeof ctx.startedAt === 'number'
  );
}
