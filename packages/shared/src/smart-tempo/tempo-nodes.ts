import type { TempoEvent } from "../schema.js";
import {
  DEFAULT_PPQ,
  localTicksPerBeat,
  ticksPerBar,
  type TimeSignature,
} from "../time.js";
import {
  SMART_TEMPO_MAX_UI_NODES,
  SMART_TEMPO_SPARSE_MAX_BPM_STEP,
  SMART_TEMPO_SPARSE_MIN_BAR_GAP,
  SMART_TEMPO_SPARSE_MIN_BPM_DELTA,
  SMART_TEMPO_SPARSE_WINDOW_BEATS,
} from "./constants.js";
import { closestBeatIndex } from "./beat-grid.js";
import type { SparsifyTempoNodesOptions, TempoNode } from "./types.js";

/** Piecewise-linear tick at `wallMs` along sorted TempoNodes (extrapolates ends). */
export function interpolateTickAtWallMs(
  nodes: readonly TempoNode[],
  wallMs: number,
): number {
  if (nodes.length === 0) return 0;
  if (nodes.length === 1) return nodes[0]!.targetTick;
  if (wallMs <= nodes[0]!.wallMs) {
    const a = nodes[0]!;
    const b = nodes[1]!;
    const span = b.wallMs - a.wallMs;
    if (span <= 0) return a.targetTick;
    return (
      a.targetTick +
      ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
    );
  }
  const last = nodes[nodes.length - 1]!;
  if (wallMs >= last.wallMs) {
    const a = nodes[nodes.length - 2]!;
    const b = last;
    const span = b.wallMs - a.wallMs;
    if (span <= 0) return b.targetTick;
    return (
      a.targetTick +
      ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
    );
  }
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]!;
    const b = nodes[i + 1]!;
    if (wallMs <= b.wallMs) {
      const span = b.wallMs - a.wallMs;
      if (span <= 0) return a.targetTick;
      return (
        a.targetTick +
        ((wallMs - a.wallMs) / span) * (b.targetTick - a.targetTick)
      );
    }
  }
  return last.targetTick;
}

function dedupeTempoNodesByWallMs(nodes: TempoNode[]): TempoNode[] {
  const sorted = nodes
    .slice()
    .sort((a, b) => a.wallMs - b.wallMs || a.targetTick - b.targetTick);
  const out: TempoNode[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && last.wallMs === n.wallMs) {
      last.targetTick = n.targetTick;
      continue;
    }
    out.push({ ...n });
  }
  return out;
}

function instantaneousBpmBetweenNodes(
  a: TempoNode,
  b: TempoNode,
  meter: TimeSignature,
  ppq: number,
): number {
  const tickLen = b.targetTick - a.targetTick;
  const durMs = b.wallMs - a.wallMs;
  if (tickLen <= 0 || durMs <= 1) return 0;
  // quarters / sec * 60 — localTicksPerBeat accounts for meter.
  const beats = tickLen / localTicksPerBeat(meter, ppq);
  if (!(beats > 0)) return 0;
  return (beats * 60_000) / durMs;
}

function medianOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

/**
 * Logic-like sparse TempoNodes from a dense beat grid.
 * Smoothed local BPM decides *where* to place nodes; wallMs/targetTick stay
 * exact so ms→tick lock is preserved between anchors (no Flex Time).
 * Also emits at least every ~2 bars (Logic Smart Tempo density) so long
 * steady stretches still track mild rubato instead of one flat seed.
 */
export function sparsifyTempoNodesFromBeatGrid(
  dense: readonly TempoNode[],
  opts: SparsifyTempoNodesOptions,
): TempoNode[] {
  if (dense.length === 0) return [];
  if (dense.length <= 2) return dense.map((n) => ({ ...n }));

  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const ppq = opts.ppq ?? DEFAULT_PPQ;
  const minDelta = opts.minBpmDelta ?? SMART_TEMPO_SPARSE_MIN_BPM_DELTA;
  const windowBeats = Math.max(
    2,
    Math.trunc(opts.windowBeats ?? SMART_TEMPO_SPARSE_WINDOW_BEATS),
  );
  const barTicks = ticksPerBar(meter, ppq);
  const minTicks = Math.max(
    1,
    Math.floor((opts.minBarGap ?? SMART_TEMPO_SPARSE_MIN_BAR_GAP) * barTicks),
  );
  /** Force a refresh node even when |ΔBPM| is tiny (Logic ~1–2 bar spacing). */
  const maxQuietTicks = Math.max(minTicks, 1 * barTicks);
  const maxStep = opts.maxBpmStep ?? SMART_TEMPO_SPARSE_MAX_BPM_STEP;
  const seed = opts.seedBpm > 0 ? opts.seedBpm : 120;

  const sorted = dense
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.wallMs - b.wallMs);

  const minAllowedBpm = seed > 0 ? seed * 0.9 : 40;
  const maxAllowedBpm = seed > 0 ? seed * 1.1 : 300;
  const clampBpm = (val: number) =>
    val > 0 ? Math.min(maxAllowedBpm, Math.max(minAllowedBpm, val)) : seed;

  const firstBpm =
    sorted.length > 1
      ? instantaneousBpmBetweenNodes(sorted[0]!, sorted[1]!, meter, ppq)
      : 0;
  const inst: number[] = [clampBpm(firstBpm)];
  for (let i = 1; i < sorted.length; i++) {
    const bpm = instantaneousBpmBetweenNodes(
      sorted[i - 1]!,
      sorted[i]!,
      meter,
      ppq,
    );
    inst.push(clampBpm(bpm));
  }

  const half = Math.floor(windowBeats / 2);
  const smoothed: number[] = [];
  for (let i = 0; i < inst.length; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(inst.length, i + half + 1);
    smoothed.push(medianOf(inst.slice(lo, hi)));
  }

  const out: TempoNode[] = [{ ...sorted[0]! }];
  let lastBpm = smoothed[0]!;
  for (let i = 1; i < sorted.length - 1; i++) {
    const n = sorted[i]!;
    const originTick = Math.floor(sorted[0]!.targetTick / barTicks) * barTicks;
    const perBeat = localTicksPerBeat(meter, ppq);
    const relTicks = Math.abs(n.targetTick - originTick);
    const modBar = relTicks % barTicks;
    const isBarStart =
      modBar <= perBeat * 0.5 || barTicks - modBar <= perBeat * 0.5;
    if (!isBarStart) continue;

    const last = out[out.length - 1]!;
    const gapTicks = n.targetTick - last.targetTick;
    if (gapTicks < minTicks) continue;
    const local = smoothed[i]!;
    const delta = Math.abs(local - lastBpm);
    const quietTooLong = gapTicks >= maxQuietTicks;
    // Always reject spikes — quiet refresh must not bypass maxStep (that
    // emitted ±10–15 BPM walls when a single IBI blip survived the median).
    if (delta > maxStep) {
      if (quietTooLong) {
        const cappedBpm = lastBpm + Math.sign(local - lastBpm) * maxStep;
        out.push({ ...n });
        lastBpm = cappedBpm;
        continue;
      }
      continue;
    }
    if (!quietTooLong && delta < minDelta) continue;
    out.push({ ...n });
    lastBpm = local;
  }
  const end = sorted[sorted.length - 1]!;
  if (end.targetTick > out[out.length - 1]!.targetTick) {
    out.push({ ...end });
  } else {
    out[out.length - 1] = { ...end };
  }
  return out;
}

/**
 * Soft-prune consecutive TempoEvents with near-identical BPM (E2).
 */
export function pruneTempoMapByBpmDelta(
  events: readonly TempoEvent[],
  seedBpm: number,
  floorTicks: number,
  idPrefix: string,
  deltaBpm: number = 0.5,
): TempoEvent[] {
  if (events.length === 0) {
    return [{ id: `${idPrefix}-te-1`, startTicks: floorTicks, bpm: seedBpm }];
  }
  const pruned: TempoEvent[] = [];
  for (const ev of events) {
    const last = pruned[pruned.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    if (last && Math.abs(ev.bpm - last.bpm) <= deltaBpm) continue;
    pruned.push({
      id: `${idPrefix}-te-${pruned.length + 1}`,
      startTicks: ev.startTicks,
      bpm: ev.bpm,
    });
  }
  if (pruned.length === 0) {
    pruned.push({
      id: `${idPrefix}-te-1`,
      startTicks: floorTicks,
      bpm: seedBpm,
    });
  } else {
    pruned[0] = { ...pruned[0]!, startTicks: floorTicks };
  }
  return pruned;
}

/**
 * Dense TempoNodes from an audio beat grid (file-absolute wallMs).
 * Content-epoch ticks: Beat 1 (`audioStartOffsetMs`) → `floorTicks` (tick 0).
 * Beats keep relative spacing from the detected grid (dynamic BPM). Leading
 * silence before Beat 1 is omitted from the tick axis (clip trim handles audio).
 */
export function tempoNodesFromBeatGrid(
  beatMs: readonly number[],
  audioStartOffsetMs: number,
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoNode[] {
  if (beatMs.length === 0) return [];
  const bpm = seedBpm > 0 ? seedBpm : 120;
  const perBeat = localTicksPerBeat(meter, ppq);
  const offset = Math.max(0, audioStartOffsetMs);

  // Prefer beats at/after Beat 1; fall back to full grid if analysis missed it.
  let source = beatMs.filter((ms) => ms >= offset - 1);
  if (source.length < 2) {
    source = beatMs.length > 0 ? [...beatMs] : [offset];
  }

  if (offset > 0) {
    // ── GAP scenario (original logic, unchanged) ──
    if (source[0]! > offset + 1) {
      source = [offset, ...source];
    }
    const originIdx = closestBeatIndex(source, offset);
    const firstBeatTicks = Math.max(0, floorTicks - originIdx * perBeat);
    let nodes: TempoNode[] = source.map((ms, i) => ({
      wallMs: i === originIdx ? offset : Math.max(0, ms),
      targetTick: firstBeatTicks + i * perBeat,
    }));
    nodes = dedupeTempoNodesByWallMs(nodes);

    // Keep pre-roll audio nodes down to wallMs=0 (targetTick=0).
    nodes = nodes.filter((n) => n.wallMs >= -1 && n.targetTick >= -1);
    if (nodes.length === 0) {
      nodes = [{ wallMs: offset, targetTick: floorTicks }];
    } else {
      nodes.push({ wallMs: offset, targetTick: floorTicks });
      nodes = dedupeTempoNodesByWallMs(nodes);
    }

    if (nodes.length === 1) {
      const period = 60_000 / bpm;
      nodes.push({
        wallMs: offset + period,
        targetTick: floorTicks + perBeat,
      });
    }

    if (nodes[0]!.targetTick > 0 && nodes[0]!.wallMs > 0) {
      nodes.unshift({ wallMs: 0, targetTick: 0 });
    }
    return dedupeTempoNodesByWallMs(nodes);
  }

  // ── Standalone audio (offset === 0): wallMs=0 = Bar 1 Beat 1 ──
  let nodes: TempoNode[] = [];

  // Each detected beat in the Viterbi grid corresponds to exactly 1 beat (perBeat ticks),
  // preserving section-level tempo changes (rubato intro, verse/chorus transitions).
  for (let i = 0; i < source.length; i++) {
    const ms = source[i]!;
    const tick = floorTicks + i * perBeat;
    nodes.push({ wallMs: Math.max(0, ms), targetTick: tick });
  }

  nodes = dedupeTempoNodesByWallMs(nodes);

  if (nodes.length === 1) {
    const period = 60_000 / bpm;
    nodes.push({
      wallMs: period,
      targetTick: floorTicks + perBeat,
    });
  }

  if (nodes[0]!.targetTick !== floorTicks) {
    const lift = floorTicks - nodes[0]!.targetTick;
    for (const n of nodes) n.targetTick += lift;
  }

  return dedupeTempoNodesByWallMs(nodes);
}

/**
 * Bar-boundary TempoNodes for Beat Mapper UI (file-absolute, sparser markers).
 */
export function tempoNodesAtBarBoundaries(
  beatMs: readonly number[],
  audioStartOffsetMs: number,
  seedBpm: number,
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoNode[] {
  const dense = tempoNodesFromBeatGrid(
    beatMs,
    audioStartOffsetMs,
    seedBpm,
    floorTicks,
    meter,
    ppq,
  );
  const beatsPerBar = Math.max(
    1,
    Math.round((meter.numerator * 4) / meter.denominator),
  );
  const out: TempoNode[] = [];
  if (dense.length > 0 && dense[0]!.wallMs < (dense[1]?.wallMs ?? 1) - 1) {
    out.push({ ...dense[0]! });
  }
  const firstBeatIdx = dense.findIndex((n) => n.targetTick >= floorTicks);
  const start = firstBeatIdx >= 0 ? firstBeatIdx : 0;
  for (let i = start; i < dense.length; i += beatsPerBar) {
    if (out.length >= SMART_TEMPO_MAX_UI_NODES) break;
    if (out.length > 0 && out[out.length - 1]!.wallMs === dense[i]!.wallMs)
      continue;
    out.push({ ...dense[i]! });
  }
  const last = dense[dense.length - 1];
  if (
    last &&
    out.length < SMART_TEMPO_MAX_UI_NODES &&
    out[out.length - 1]?.wallMs !== last.wallMs
  ) {
    out.push({ ...last });
  }
  return out;
}
