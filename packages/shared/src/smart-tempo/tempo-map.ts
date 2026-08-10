import { BPM_MAX, type TempoEvent } from "../schema.js";
import {
  tempoEventsFromMsTickAnchors,
  TEMPO_MAP_MIN_BPM,
  type MsTickAnchor,
} from "../tempo-map-solver.js";
import { ticksPerBar, type TimeSignature } from "../time.js";
import { SMART_TEMPO_MAX_BEATS } from "./constants.js";
import type { TempoNode } from "./types.js";

/**
 * Filter phrase/syllable anchors when audio ground truth is present — they orient
 * bar counts but must not author TempoMap kinks (Drift Gate).
 */
export function filterAnchorsForSmartTempo<
  T extends {
    kind: string;
    ms: number;
    targetTick?: number;
    barOffset?: number;
  },
>(anchors: readonly T[]): T[] {
  return anchors.filter(
    (a) =>
      a.kind === "section" ||
      a.kind === "chord" ||
      (a.kind === "phrase" && a.barOffset === 0),
  );
}

/**
 * Build TempoEvent[] from explicit Tempo Nodes (Beat Mapper draft apply).
 */
export function tempoMapFromTempoNodes(
  nodes: readonly TempoNode[],
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq = 480,
  idPrefix = "stm",
  opts?: { audioDurationMs?: number },
): TempoEvent[] {
  if (nodes.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  let sorted = nodes
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.wallMs - b.wallMs);
  const durationMs = opts?.audioDurationMs;
  if (durationMs != null && durationMs > 0) {
    sorted = sorted.filter((n) => n.wallMs <= durationMs + 1);
    const last = sorted[sorted.length - 1];
    // Extend to audio end by extrapolating ticks at seed BPM — never reuse the
    // last targetTick (that halved the final segment BPM on every import).
    if (last && last.wallMs < durationMs - 1) {
      const spanMs = durationMs - last.wallMs;
      const bpm = seedBpm > 0 ? seedBpm : 120;
      const extraTicks = Math.max(
        1,
        Math.round((spanMs / 1000) * (bpm / 60) * ppq),
      );
      sorted = [
        ...sorted,
        {
          wallMs: durationMs,
          targetTick: last.targetTick + extraTicks,
        },
      ];
    }
  }
  const anchors: MsTickAnchor[] = sorted.map((n) => ({
    ms: n.wallMs,
    targetTick: n.targetTick,
  }));
  const barTicks = ticksPerBar(meter, ppq);
  const raw = tempoEventsFromMsTickAnchors(
    anchors,
    floorTicks,
    seedBpm,
    meter,
    ppq,
    barTicks,
    { soft: false },
  );
  // Safety band around seed (±35%) — clips extreme octave/phase glitches while
  // preserving natural rubato, accelerando, and structural section tempo changes.
  const bandLo = Math.max(
    TEMPO_MAP_MIN_BPM,
    seedBpm > 0 ? seedBpm * 0.65 : TEMPO_MAP_MIN_BPM,
  );
  const bandHi = Math.min(BPM_MAX, seedBpm > 0 ? seedBpm * 1.45 : BPM_MAX);
  const capped = raw.map((ev) => ({
    startTicks: ev.startTicks,
    bpm: Math.min(bandHi, Math.max(bandLo, ev.bpm)),
  }));

  // ProjectSchema.tempoMap.max(2048) — keep persisted maps within limit.
  const limited = capped.slice(0, SMART_TEMPO_MAX_BEATS);
  const asEvents: TempoEvent[] = limited.map((ev, i) => ({
    id: `${idPrefix}-te-${i + 1}`,
    startTicks: ev.startTicks,
    bpm: ev.bpm,
  }));
  // Do not BPM-prune: sparsify already chose Logic-like 1–2 bar density;
  // prune@0.5 wiped quiet-stretch refresh nodes (bars 3/5/7…).
  const deduped: TempoEvent[] = [];
  for (const ev of asEvents) {
    const last = deduped[deduped.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    deduped.push(ev);
  }
  if (deduped.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  deduped[0] = { ...deduped[0]!, startTicks: floorTicks };
  return deduped;
}

/**
 * Tempo Nodes at Forma section Beat 1 walls (legacy solver layout).
 */
export function tempoNodesFromSectionPlans(
  plans: readonly {
    startMs: number;
    startTicks: number;
    lengthTicks: number;
  }[],
): TempoNode[] {
  return plans.map((p) => ({
    wallMs: Math.max(0, p.startMs),
    targetTick: p.startTicks,
  }));
}
