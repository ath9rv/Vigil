import type { TemporalEvent } from '../v4/types';

export interface BoundedFeeItem {
  readonly name: string;
  readonly amount: number;
  readonly mandatory: boolean;
}

export interface BoundedStateSnapshot {
  readonly displayedBasePrice: number | null;
  readonly displayedTotalPrice: number | null;
  readonly fees: readonly BoundedFeeItem[];
  readonly feeTotal: number;
  readonly userSelectedShipping: boolean;
  readonly userSelectedAddon: boolean;
  readonly taxItemizedSeparately: boolean;
  readonly disclosures: readonly string[];
  readonly progressionOccurred: boolean;
  readonly rawProperties: Readonly<Record<string, unknown>>;
}

/**
 * StateSnapshotExtractor
 *
 * Pure O(N) bounded state snapshot extractor from temporal events.
 * Does NOT reconstruct full DOM. Extracts bounded commercial facts.
 * Satisfies PERF-V4-005.
 */
export class StateSnapshotExtractor {
  public static extract(events: readonly TemporalEvent[]): BoundedStateSnapshot {
    let displayedBasePrice: number | null = null;
    let displayedTotalPrice: number | null = null;
    const fees: BoundedFeeItem[] = [];
    let userSelectedShipping = false;
    let userSelectedAddon = false;
    let taxItemizedSeparately = false;
    const disclosures: string[] = [];
    let progressionOccurred = false;
    const rawProps: Record<string, unknown> = {};

    for (const e of events) {
      const p = e.payload || {};
      for (const [k, v] of Object.entries(p)) {
        rawProps[k] = v;
      }

      if (p.price !== undefined && typeof p.price === 'number') {
        if (displayedBasePrice === null) displayedBasePrice = p.price;
        displayedTotalPrice = p.price;
      }
      if (p.displayedBasePrice !== undefined && typeof p.displayedBasePrice === 'number') {
        displayedBasePrice = p.displayedBasePrice;
      }
      if (p.displayedTotalPrice !== undefined && typeof p.displayedTotalPrice === 'number') {
        displayedTotalPrice = p.displayedTotalPrice;
      }
      if (p.feeAppeared || p.mandatoryPlatformFee) {
        fees.push(Object.freeze({
          name: typeof p.feeName === 'string' ? p.feeName : 'Platform Fee',
          amount: typeof p.feeAmount === 'number' ? p.feeAmount : 0,
          mandatory: Boolean(p.mandatoryPlatformFee ?? p.feeAppeared),
        }));
      }
      if (p.userSelectedShippingTier) {
        userSelectedShipping = true;
      }
      if (p.userSelectedAddon) {
        userSelectedAddon = true;
      }
      if (p.taxItemizedSeparately) {
        taxItemizedSeparately = true;
      }
      if (typeof p.disclosureText === 'string') {
        disclosures.push(p.disclosureText);
      }
      if (p.isProgression || e.source === 'checkout-progression' || p.action === 'checkout_continue') {
        progressionOccurred = true;
      }
    }

    const feeTotal = fees.reduce((sum, f) => sum + f.amount, 0);

    return Object.freeze({
      displayedBasePrice,
      displayedTotalPrice,
      fees: Object.freeze(fees),
      feeTotal,
      userSelectedShipping,
      userSelectedAddon,
      taxItemizedSeparately,
      disclosures: Object.freeze(disclosures),
      progressionOccurred,
      rawProperties: Object.freeze(rawProps),
    });
  }

  public static extractPreProgression(events: readonly TemporalEvent[]): BoundedStateSnapshot {
    const progressionIdx = events.findIndex(
      e => e.payload?.isProgression || e.source === 'checkout-progression' || e.payload?.action === 'checkout_continue'
    );
    if (progressionIdx === -1) {
      return this.extract(events);
    }
    return this.extract(events.slice(0, progressionIdx));
  }

  public static extractWithoutEvents(
    events: readonly TemporalEvent[],
    eventIdsToRemove: ReadonlySet<string>
  ): BoundedStateSnapshot {
    const filtered = events.filter(e => !eventIdsToRemove.has(e.eventId));
    return this.extract(filtered);
  }

  public static toRecord(snapshot: BoundedStateSnapshot): Readonly<Record<string, unknown>> {
    return Object.freeze({
      displayedBasePrice: snapshot.displayedBasePrice,
      displayedTotalPrice: snapshot.displayedTotalPrice,
      feesCount: snapshot.fees.length,
      feeTotal: snapshot.feeTotal,
      userSelectedShipping: snapshot.userSelectedShipping,
      userSelectedAddon: snapshot.userSelectedAddon,
      taxItemizedSeparately: snapshot.taxItemizedSeparately,
      disclosuresCount: snapshot.disclosures.length,
      progressionOccurred: snapshot.progressionOccurred,
    });
  }
}
