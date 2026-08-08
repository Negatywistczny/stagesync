/**
 * Sync-lead compensation — advance Client playhead by host-configured ms.
 */

import {
  DEFAULT_PPQ,
  advanceTicksAlongTempoMap,
  type TempoMapProject,
} from "@stagesync/shared";

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

/**
 * Sync-lead tick delta along project TempoMap (variable BPM).
 * Falls back to flat BPM math when maps are unusable.
 */
export function ticksFromSyncLeadAlongMap(
  leadMs: number,
  originTicks: number,
  project: TempoMapProject,
): number {
  if (!Number.isFinite(leadMs) || leadMs === 0) return 0;
  if (!Number.isFinite(originTicks)) {
    return ticksFromSyncLeadMs(leadMs, project.defaultBpm, project.ppq);
  }
  try {
    return (
      advanceTicksAlongTempoMap(originTicks, leadMs, project) - originTicks
    );
  } catch {
    return ticksFromSyncLeadMs(leadMs, project.defaultBpm, project.ppq);
  }
}
