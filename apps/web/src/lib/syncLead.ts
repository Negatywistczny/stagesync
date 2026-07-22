/**
 * Sync-lead compensation — advance Client playhead by host-configured ms.
 */

import { DEFAULT_PPQ } from "@stagesync/shared";

/** Positive leadMs → Client shows ahead of host (network compensation). */
export function ticksFromSyncLeadMs(
  leadMs: number,
  bpm: number,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(leadMs) || leadMs === 0) return 0;
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  const safePpq = Number.isFinite(ppq) && ppq > 0 ? ppq : DEFAULT_PPQ;
  return Math.round((leadMs / 60_000) * safeBpm * safePpq);
}
