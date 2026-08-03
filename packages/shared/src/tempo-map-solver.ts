/**
 * MultiPassTempoSolver — builds a sparse variable TempoMap (E2 pruning) from
 * (ms, targetTick) anchors. Does **not** move Forma walls (S3): only emits
 * TempoEvent[].
 *
 * Pass 1: confidence-weighted anchors → seedBpm (W ≥ 0.85).
 * Pass 2: anacrusis detection (pickup ≤ 1 bar).
 * Pass 3: per-section pristineBars (pipe / ms span @ seedBpm); contiguous
 *   Forma tick walls.
 * Pass 4–5: TempoEvent[] so secondsToTicks(ms) ≈ targetTick for each anchor;
 *   E2 prune |ΔBPM| > 0.5.
 */

import type { TempoEvent } from "./schema.js";
import {
  DEFAULT_PPQ,
  ticksPerBar,
  ticksToMs,
  type TimeSignature,
} from "./time.js";

export const TEMPO_SOLVER_HIGH_WEIGHT = 0.85;
export const TEMPO_SOLVER_SECTION_WEIGHT = 1.0;
export const TEMPO_SOLVER_CHORD_WEIGHT = 0.85;
export const TEMPO_SOLVER_SYLLABLE_WEIGHT = 0.3;
export const TEMPO_SOLVER_PRUNE_DELTA_BPM = 0.5;
/**
 * Soft bound for emitted BPM vs seed (±). Exact (ms→tick) segments may still
 * exceed this when wall-clock forces it (e.g. pipe Intro @ GAP vs metro seed).
 */
export const TEMPO_SOLVER_MAX_STEP_RATIO = 0.08;
/**
 * When Pass-1 seed diverges more than this fraction from UltraStar metronome,
 * use the file metronome as seed SSOT (Forma pristineBars sizing).
 */
export const TEMPO_SOLVER_SEED_METRO_MAX_RATIO = 0.15;
/** Pickup / anacrusis must not exceed this many bars before section Beat 1. */
export const TEMPO_SOLVER_ANACRUSIS_MAX_BARS = 1;

export type TempoAnchorKind =
  | "section"
  | "phrase"
  | "chord"
  | "syllable"
  | "instrumental";

export type TempoSolverAnchor = {
  /** Wall-clock ms from song timeline origin (same basis as UltraStar GAP+beats). */
  ms: number;
  sectionIndex: number;
  kind: TempoAnchorKind;
  weight: number;
  /** Optional UG bar count hint for this section (pipe / structure). */
  ugBarsHint?: number;
  /**
   * Structural bar index within the section (0 = section Beat 1).
   * Resolved to targetTick after Forma layout.
   */
  barOffset?: number;
  /**
   * Absolute target tick (same space as Forma walls). When set, overrides
   * barOffset. Solver matches secondsToTicks(ms) ≈ targetTick.
   */
  targetTick?: number;
};

export type TempoSolverSectionPlan = {
  sectionIndex: number;
  name: string;
  /** First non-anacrusis vocal ms (section Beat 1 wall-clock). */
  startMs: number;
  endMs: number;
  pristineBars: number;
  fromPipe: boolean;
  /** Beat-1 tick after layout (filled by solver). */
  startTicks: number;
  lengthTicks: number;
};

export type MultiPassTempoSolverInput = {
  anchors: readonly TempoSolverAnchor[];
  sections: readonly {
    name: string;
    pipeBarCount: number;
    chordCount: number;
    /** Min/max ms of US words aligned into this section (empty = instrumental). */
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  meter?: TimeSignature;
  ppq?: number;
  /** Fallback when Pass 1 cannot compute seed (e.g. UltraStar metro). */
  fallbackBpm: number;
  /**
   * UltraStar file metronome (header/4). When Pass-1 seed diverges by more
   * than {@link TEMPO_SOLVER_SEED_METRO_MAX_RATIO}, this becomes seed SSOT.
   */
  referenceMetronomeBpm?: number;
  contentFloorTicks?: number;
  idPrefix?: string;
};

export type MultiPassTempoSolverResult = {
  seedBpm: number;
  tempoMap: TempoEvent[];
  sections: TempoSolverSectionPlan[];
  warnings: string[];
};

const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 };

export function weightForTempoAnchorKind(kind: TempoAnchorKind): number {
  switch (kind) {
    case "section":
    case "phrase":
      return TEMPO_SOLVER_SECTION_WEIGHT;
    case "chord":
      return TEMPO_SOLVER_CHORD_WEIGHT;
    case "syllable":
      return TEMPO_SOLVER_SYLLABLE_WEIGHT;
    case "instrumental":
      return 0;
    default:
      return TEMPO_SOLVER_SYLLABLE_WEIGHT;
  }
}

/**
 * Pass 1 — seed BPM from high-confidence section spans with UG bar hints.
 */
export function computeSeedBpmFromAnchors(
  anchors: readonly TempoSolverAnchor[],
  fallbackBpm: number,
  meter: TimeSignature = DEFAULT_METER,
): number {
  const high = anchors
    .filter(
      (a) =>
        a.weight >= TEMPO_SOLVER_HIGH_WEIGHT &&
        a.ugBarsHint != null &&
        a.ugBarsHint > 0,
    )
    .slice()
    .sort((a, b) => a.ms - b.ms || a.sectionIndex - b.sectionIndex);
  const qpb = (meter.numerator * 4) / meter.denominator;
  const bpms: number[] = [];
  for (let i = 0; i + 1 < high.length; i++) {
    const a = high[i]!;
    const b = high[i + 1]!;
    const bars = a.ugBarsHint!;
    const sec = (b.ms - a.ms) / 1000;
    if (sec <= 0.05 || bars < 1) continue;
    const bpm = (bars * qpb * 60) / sec;
    if (Number.isFinite(bpm) && bpm >= 40 && bpm <= 300) bpms.push(bpm);
  }
  if (bpms.length === 0) {
    const bySec = new Map<number, TempoSolverAnchor[]>();
    for (const a of anchors) {
      if (a.weight < TEMPO_SOLVER_HIGH_WEIGHT) continue;
      const list = bySec.get(a.sectionIndex) ?? [];
      list.push(a);
      bySec.set(a.sectionIndex, list);
    }
    for (const list of bySec.values()) {
      list.sort((x, y) => x.ms - y.ms);
      const first = list[0]!;
      const last = list[list.length - 1]!;
      const bars = first.ugBarsHint ?? 0;
      const sec = (last.ms - first.ms) / 1000;
      if (bars >= 1 && sec > 0.05) {
        const bpm = (bars * qpb * 60) / sec;
        if (Number.isFinite(bpm) && bpm >= 40 && bpm <= 300) bpms.push(bpm);
      }
    }
  }
  if (bpms.length === 0) {
    return Math.round(fallbackBpm * 100) / 100;
  }
  const avg = bpms.reduce((s, x) => s + x, 0) / bpms.length;
  return Math.round(avg * 100) / 100;
}

/**
 * If Pass-1 seed diverges &gt; ±{@link TEMPO_SOLVER_SEED_METRO_MAX_RATIO} from
 * the UltraStar metronome, the file metronome wins for seed / pristineBars.
 */
export function applySeedMetronomeFallback(
  seedBpm: number,
  referenceMetronomeBpm: number | null | undefined,
): number {
  if (
    referenceMetronomeBpm == null ||
    !Number.isFinite(referenceMetronomeBpm) ||
    referenceMetronomeBpm <= 0
  ) {
    return seedBpm;
  }
  const ratio =
    Math.abs(seedBpm - referenceMetronomeBpm) / referenceMetronomeBpm;
  if (ratio > TEMPO_SOLVER_SEED_METRO_MAX_RATIO) {
    return Math.round(referenceMetronomeBpm * 100) / 100;
  }
  return seedBpm;
}

/** True when tick sits on Beat 1 or Beat 3 of a bar (half-bar grid). */
export function isTickOnBarOrHalf(
  tick: number,
  barTicks: number,
  origin: number = 0,
): boolean {
  if (barTicks <= 0) return false;
  const half = Math.max(1, Math.floor(barTicks / 2));
  const local = tick - origin;
  return local % half === 0;
}

/**
 * Pass 2 — true when syllable onset is pickup before section Beat 1
 * (within {@link TEMPO_SOLVER_ANACRUSIS_MAX_BARS} bars at seedBpm).
 */
export function isAnacrusisMs(
  syllableMs: number,
  sectionBeat1Ms: number,
  seedBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): boolean {
  if (syllableMs >= sectionBeat1Ms) return false;
  const barTicks = ticksPerBar(meter, ppq);
  const maxPickupMs = ticksToMs(
    TEMPO_SOLVER_ANACRUSIS_MAX_BARS * barTicks,
    seedBpm,
    meter,
    ppq,
  );
  return sectionBeat1Ms - syllableMs <= maxPickupMs + 1e-6;
}

/**
 * First strong vocal ms for a section: if first syllable is pickup before a
 * later accent, Beat 1 = accent; else vocal range start.
 */
export function sectionBeat1Ms(
  vocalStartMs: number,
  vocalEndMs: number,
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  firstAccentMs?: number | null,
): number {
  if (
    firstAccentMs != null &&
    Number.isFinite(firstAccentMs) &&
    firstAccentMs >= vocalStartMs &&
    firstAccentMs <= vocalEndMs &&
    isAnacrusisMs(vocalStartMs, firstAccentMs, seedBpm, meter, ppq)
  ) {
    return firstAccentMs;
  }
  return vocalStartMs;
}

export function pristineBarsFromMsSpan(
  startMs: number,
  endMs: number,
  seedBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): number {
  const spanMs = Math.max(0, endMs - startMs);
  if (spanMs <= 0) return 1;
  const barTicks = ticksPerBar(meter, ppq);
  const barMs = ticksToMs(barTicks, seedBpm, meter, ppq);
  if (barMs <= 0) return 1;
  // Ceil so Forma never under-covers the vocal wall-clock span.
  return Math.max(1, Math.ceil(spanMs / barMs - 1e-9));
}

/**
 * Soft clamp toward seed (± {@link TEMPO_SOLVER_MAX_STEP_RATIO}).
 * UltraStar lyric timings are orientational — do not chase them with wild BPM.
 */
export function softClampBpmToSeed(seedBpm: number, next: number): number {
  if (!(seedBpm > 0) || !Number.isFinite(next)) return seedBpm;
  const lo = seedBpm * (1 - TEMPO_SOLVER_MAX_STEP_RATIO);
  const hi = seedBpm * (1 + TEMPO_SOLVER_MAX_STEP_RATIO);
  return Math.round(Math.min(hi, Math.max(lo, next)) * 100) / 100;
}

/** Adjacent step also capped to ± {@link TEMPO_SOLVER_MAX_STEP_RATIO} of seed. */
export function softClampBpmAdjacent(
  seedBpm: number,
  prevBpm: number,
  next: number,
): number {
  const vsSeed = softClampBpmToSeed(seedBpm, next);
  if (!(seedBpm > 0) || !Number.isFinite(prevBpm)) return vsSeed;
  const step = seedBpm * TEMPO_SOLVER_MAX_STEP_RATIO;
  return Math.round(
    Math.min(prevBpm + step, Math.max(prevBpm - step, vsSeed)) * 100,
  ) / 100;
}

/**
 * Drop intermediate anchors closer than `minBarGap` bars (keep first/last).
 * Prevents a BPM kink on every approximate UltraStar syllable.
 */
export function thinMsTickAnchors(
  anchors: readonly MsTickAnchor[],
  barTicks: number,
  minBarGap: number = 2,
): MsTickAnchor[] {
  if (anchors.length <= 2) return anchors.slice();
  const minTicks = Math.max(1, Math.floor(minBarGap * barTicks));
  const sorted = anchors
    .slice()
    .sort((a, b) => a.targetTick - b.targetTick || a.ms - b.ms);
  const out: MsTickAnchor[] = [sorted[0]!];
  for (let i = 1; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    if (a.targetTick - out[out.length - 1]!.targetTick >= minTicks) {
      out.push(a);
    }
  }
  const last = sorted[sorted.length - 1]!;
  if (last.targetTick > out[out.length - 1]!.targetTick) out.push(last);
  else out[out.length - 1] = last;
  return out;
}

function bpmForTickSpan(
  lengthTicks: number,
  durationMs: number,
  meter: TimeSignature,
  ppq: number,
): number {
  if (durationMs <= 0 || lengthTicks <= 0) return 120;
  let lo = 20;
  let hi = 320;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const ms = ticksToMs(lengthTicks, mid, meter, ppq);
    if (ms > durationMs) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

export type MsTickAnchor = {
  ms: number;
  targetTick: number;
};

/**
 * Resolve barOffset → absolute targetTick after Forma layout.
 * Anchors that already have targetTick are kept as-is.
 * Never compress structural offsets into a short Forma — caller must expand
 * pristineBars to fit max(barOffset)+1 (see runMultiPassTempoSolver).
 */
export function resolveAnchorTargetTicks(
  anchors: readonly TempoSolverAnchor[],
  sections: readonly TempoSolverSectionPlan[],
  barTicks: number,
): MsTickAnchor[] {
  const out: MsTickAnchor[] = [];
  const seen = new Set<string>();
  for (const a of anchors) {
    let tick = a.targetTick;
    if (tick == null && a.barOffset != null) {
      const plan = sections[a.sectionIndex];
      if (!plan) continue;
      const off = Math.max(0, Math.trunc(a.barOffset));
      const bars = Math.max(1, plan.pristineBars);
      // Safety only: Forma should already be ≥ maxOff+1.
      const clamped = Math.min(off, bars - 1);
      tick = plan.startTicks + clamped * barTicks;
    }
    if (tick == null || !Number.isFinite(tick) || !Number.isFinite(a.ms)) {
      continue;
    }
    const key = `${Math.round(a.ms)}:${Math.round(tick)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ms: a.ms, targetTick: Math.round(tick) });
  }
  out.sort((a, b) => a.targetTick - b.targetTick || a.ms - b.ms);
  return out;
}

/**
 * Soft TempoEvent candidates from (ms, tick) guidance.
 * - `soft: true` (default): clamp to seed ±8% / adjacent ±8%; thin anchors.
 * - `soft: false`: exact segment BPM (Forma section walls → tekst↔MP3 lock).
 */
export function tempoEventsFromMsTickAnchors(
  anchors: readonly MsTickAnchor[],
  floorTicks: number,
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  barTicks?: number,
  options?: { soft?: boolean },
): { startTicks: number; bpm: number }[] {
  const soft = options?.soft !== false;
  if (anchors.length === 0) {
    return [{ startTicks: floorTicks, bpm: seedBpm }];
  }
  const bt = barTicks ?? ticksPerBar(meter, ppq);
  const sorted = soft ? thinMsTickAnchors(anchors, bt, 2) : anchors.slice().sort(
    (a, b) => a.targetTick - b.targetTick || a.ms - b.ms,
  );

  const dedup: MsTickAnchor[] = [];
  for (const a of sorted) {
    const last = dedup[dedup.length - 1];
    if (last && last.targetTick === a.targetTick) {
      if (a.ms > last.ms) last.ms = a.ms;
      continue;
    }
    dedup.push({ ...a });
  }

  const out: { startTicks: number; bpm: number }[] = [];
  let prevBpm: number;

  const first = dedup[0]!;
  if (first.targetTick > floorTicks && first.ms > 0) {
    const tickLen = first.targetTick - floorTicks;
    const raw = bpmForTickSpan(tickLen, first.ms, meter, ppq);
    prevBpm = soft ? softClampBpmToSeed(seedBpm, raw) : raw;
    out.push({ startTicks: floorTicks, bpm: prevBpm });
  } else {
    out.push({ startTicks: floorTicks, bpm: seedBpm });
    prevBpm = seedBpm;
  }

  for (let i = 0; i + 1 < dedup.length; i++) {
    const a = dedup[i]!;
    const b = dedup[i + 1]!;
    const tickLen = b.targetTick - a.targetTick;
    const durMs = b.ms - a.ms;
    if (tickLen <= 0) continue;
    const raw =
      durMs > 1 ? bpmForTickSpan(tickLen, durMs, meter, ppq) : seedBpm;
    const bpm = soft ? softClampBpmAdjacent(seedBpm, prevBpm, raw) : raw;
    prevBpm = bpm;
    const last = out[out.length - 1];
    if (last && last.startTicks === a.targetTick) {
      last.bpm = bpm;
    } else if (!last || a.targetTick > last.startTicks) {
      out.push({ startTicks: a.targetTick, bpm });
    }
  }

  return out.length > 0 ? out : [{ startTicks: floorTicks, bpm: seedBpm }];
}

/**
 * Layout Forma tick walls (S3) and sparse TempoMap from (ms, targetTick).
 * Solver does not later move `startTicks` / `lengthTicks`.
 */
export function runMultiPassTempoSolver(
  input: MultiPassTempoSolverInput,
): MultiPassTempoSolverResult {
  const meter = input.meter ?? DEFAULT_METER;
  const ppq = input.ppq ?? DEFAULT_PPQ;
  const barTicks = ticksPerBar(meter, ppq);
  const floor = input.contentFloorTicks ?? 0;
  const prefix = input.idPrefix ?? "tempo";
  const warnings: string[] = [];

  const seedBpm = applySeedMetronomeFallback(
    computeSeedBpmFromAnchors(input.anchors, input.fallbackBpm, meter),
    input.referenceMetronomeBpm,
  );

  const plans: TempoSolverSectionPlan[] = [];
  for (let si = 0; si < input.sections.length; si++) {
    const sec = input.sections[si]!;
    const fromPipe = sec.pipeBarCount > 0;
    const vr = sec.vocalMsRange;
    let startMs = 0;
    let endMs = 0;
    let pristineBars: number;

    if (fromPipe) {
      pristineBars = Math.max(1, sec.pipeBarCount);
      startMs = vr?.startMs ?? 0;
      endMs = vr?.endMs ?? startMs;
    } else if (vr) {
      const accents = input.anchors
        .filter(
          (a) =>
            a.sectionIndex === si &&
            a.weight >= TEMPO_SOLVER_HIGH_WEIGHT &&
            a.kind !== "instrumental" &&
            a.kind !== "section" &&
            a.ms >= vr.startMs &&
            a.ms <= vr.endMs,
        )
        .sort((a, b) => a.ms - b.ms);
      const accent = accents[0];
      startMs = sectionBeat1Ms(
        vr.startMs,
        vr.endMs,
        seedBpm,
        meter,
        ppq,
        accent?.ms ?? null,
      );
      endMs = Math.max(startMs, vr.endMs);
      pristineBars = pristineBarsFromMsSpan(
        startMs,
        endMs,
        seedBpm,
        meter,
        ppq,
      );
      // Phrase structure (C+B): Forma MUST cover all structural barOffsets
      // and all chords — never compress chords into a short container.
      let structBars = 1;
      for (const a of input.anchors) {
        if (a.sectionIndex !== si || a.barOffset == null) continue;
        structBars = Math.max(structBars, Math.trunc(a.barOffset) + 1);
      }
      if (sec.chordCount > 0) {
        structBars = Math.max(structBars, sec.chordCount);
      }
      pristineBars = Math.max(pristineBars, structBars);
    } else {
      // Instrumental without pipe: one bar per chord on pristine grid.
      pristineBars = Math.max(1, sec.chordCount > 0 ? sec.chordCount : 1);
      warnings.push(
        `Sekcja „${sec.name}” bez wokalu US — długość Formy z przybliżenia akordów.`,
      );
    }

    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs,
      endMs,
      pristineBars: Math.max(1, pristineBars),
      fromPipe,
      startTicks: 0,
      lengthTicks: 0,
    });
  }

  // Contiguous Forma tick layout (walls immutable afterward).
  let cursor = floor;
  for (const p of plans) {
    p.startTicks = cursor;
    p.lengthTicks = p.pristineBars * barTicks;
    cursor = p.startTicks + p.lengthTicks;
  }

  // Lock instrumental / pipe wall-clock end to the next section Beat 1 so
  // Verse Forma start aligns with the first accent in the recording.
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const next = plans[i + 1];
    if (next && next.startMs > p.startMs) {
      if (input.sections[i]!.vocalMsRange == null || p.fromPipe) {
        if (p.endMs <= p.startMs) p.endMs = next.startMs;
        else p.endMs = Math.max(p.endMs, next.startMs);
      } else {
        p.endMs = Math.max(p.startMs, p.endMs);
      }
    }
  }

  // TempoMap = exact BPM between Forma section walls only.
  // Locks first vocal ms → Verse Beat 1 (tekst↔MP3↔Forma). Phrase/chord US
  // ms stay orientational for bar counts — not hard tempo kinks (no 97→159).
  const enriched: TempoSolverAnchor[] = [];
  for (let i = 0; i < plans.length; i++) {
    const p = plans[i]!;
    const next = plans[i + 1];
    const wallEndMs =
      next && next.startMs > p.startMs
        ? next.startMs
        : Math.max(p.startMs, p.endMs);
    enriched.push({
      ms: p.startMs,
      sectionIndex: i,
      kind: "section",
      weight: TEMPO_SOLVER_SECTION_WEIGHT,
      targetTick: p.startTicks,
    });
    if (wallEndMs > p.startMs) {
      enriched.push({
        ms: wallEndMs,
        sectionIndex: i,
        kind: "section",
        weight: TEMPO_SOLVER_SECTION_WEIGHT,
        targetTick: p.startTicks + p.lengthTicks,
      });
    }
  }

  const msTick = resolveAnchorTargetTicks(enriched, plans, barTicks);
  const rawEvents = tempoEventsFromMsTickAnchors(
    msTick,
    floor,
    seedBpm,
    meter,
    ppq,
    barTicks,
    { soft: false },
  );

  if (rawEvents.length === 0 || rawEvents[0]!.startTicks > floor) {
    rawEvents.unshift({ startTicks: floor, bpm: seedBpm });
  } else {
    rawEvents[0] = { startTicks: floor, bpm: rawEvents[0]!.bpm };
  }

  rawEvents.sort((a, b) => a.startTicks - b.startTicks);
  const dedup: { startTicks: number; bpm: number }[] = [];
  for (const ev of rawEvents) {
    const last = dedup[dedup.length - 1];
    if (last && last.startTicks === ev.startTicks) {
      last.bpm = ev.bpm;
    } else {
      dedup.push({ ...ev });
    }
  }

  // Soft-prune near-identical BPM at consecutive ticks (map stays sparse).
  const pruned: TempoEvent[] = [];
  for (const ev of dedup) {
    const last = pruned[pruned.length - 1];
    if (last && ev.startTicks <= last.startTicks) continue;
    if (last && Math.abs(ev.bpm - last.bpm) <= TEMPO_SOLVER_PRUNE_DELTA_BPM) {
      continue;
    }
    pruned.push({
      id: `${prefix}-te-${pruned.length + 1}`,
      startTicks: ev.startTicks,
      bpm: ev.bpm,
    });
  }
  if (pruned.length === 0) {
    pruned.push({ id: `${prefix}-te-1`, startTicks: floor, bpm: seedBpm });
  }

  return {
    seedBpm,
    tempoMap: pruned,
    sections: plans,
    warnings,
  };
}
