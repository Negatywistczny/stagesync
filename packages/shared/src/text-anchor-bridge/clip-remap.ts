import type {
  MelodyNoteClip,
  TekstBlock,
  TekstClip,
  TempoEvent,
} from "../schema.js";
import type { TimeSignature } from "../time.js";
import { secondsToTicks, ticksToSeconds } from "../tempo-map.js";
import type { TimedWord, UgBridgeWord } from "./types.js";

/** Wall-clock ms for a tick placed on a constant single-event tempo map. */
export function ticksToWallMs(
  ticks: number,
  placeBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): number {
  const local = Math.max(0, ticks - floor);
  return (
    ticksToSeconds(
      local,
      [{ startTicks: 0, bpm: placeBpm }],
      placeBpm,
      meter,
      ppq,
    ) * 1000
  );
}

/** Remap a tick from constant place BPM onto the solver TempoMap. */
export function remapTickAlongSolverMap(
  ticks: number,
  placeBpm: number,
  tempoMap: readonly TempoEvent[],
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): number {
  const ms = ticksToWallMs(ticks, placeBpm, meter, ppq, floor);
  try {
    return secondsToTicks(ms / 1000, tempoMap, seedBpm, meter, ppq) + floor;
  } catch {
    return ticks;
  }
}

/**
 * Map UltraStar place-BPM ticks → content-epoch TempoMap ticks using exact
 * wall-clock ms (no beat-grid snap). Lyrics/melody stay in sync with MP3 as
 * authored in the US file; TempoMap only converts ms→ticks.
 */
export function remapTickAlongAudioMapContinuous(
  ticks: number,
  placeBpm: number,
  tempoMap: readonly TempoEvent[],
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
  audioStartOffsetMs: number = 0,
): number {
  const wallMs = ticksToWallMs(ticks, placeBpm, meter, ppq, floor);
  const offset = Math.max(0, audioStartOffsetMs);
  const contentMs = Math.max(0, wallMs - offset);
  try {
    return (
      secondsToTicks(contentMs / 1000, tempoMap, seedBpm, meter, ppq) + floor
    );
  } catch {
    return remapTickAlongSolverMap(
      ticks,
      placeBpm,
      tempoMap,
      seedBpm,
      meter,
      ppq,
      floor,
    );
  }
}

/**
 * After tempo remap: keep UltraStar durations; only untangle inverted/duplicate
 * onsets so blocks stay ordered (no beat-grid reflow, no stretch-to-next).
 */
export function normalizeTekstBlockTimings<T extends TekstBlock>(
  blocks: readonly T[],
  clipStartTicks: number,
  clipEndTicks: number,
): T[] {
  if (blocks.length === 0) return [];
  const out = blocks
    .slice()
    .sort((a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id))
    .map((b) => ({ ...b, lengthTicks: Math.max(1, b.lengthTicks) }));

  if (out[0]!.startTicks < clipStartTicks) {
    out[0] = { ...out[0]!, startTicks: clipStartTicks };
  }
  for (let i = 1; i < out.length; i++) {
    const minStart = out[i - 1]!.startTicks + 1;
    if (out[i]!.startTicks < minStart) {
      out[i] = { ...out[i]!, startTicks: minStart };
    }
  }

  for (let i = 0; i < out.length; i++) {
    const start = out[i]!.startTicks;
    let length = Math.max(1, out[i]!.lengthTicks);
    const nextStart =
      i + 1 < out.length ? out[i + 1]!.startTicks : clipEndTicks;
    if (start + length > nextStart && nextStart > start) {
      length = Math.max(1, nextStart - start);
    }
    out[i] = { ...out[i]!, lengthTicks: length };
  }
  return out;
}

export function remapTekstClipsWithMapFn(
  clips: readonly TekstClip[],
  mapStart: (t: number) => number,
  mapEnd: (t: number) => number = mapStart,
): TekstClip[] {
  return clips.map((clip) => {
    const startTicks = mapStart(clip.startTicks);
    const endTicks = mapEnd(clip.startTicks + clip.lengthTicks);
    const clipEnd = Math.max(startTicks + 1, endTicks);
    let blocks = (clip.blocks ?? []).map((b) => {
      const bStart = mapStart(b.startTicks);
      const bEnd = mapEnd(b.startTicks + b.lengthTicks);
      return {
        ...b,
        startTicks: bStart,
        lengthTicks: Math.max(1, bEnd - bStart),
      };
    });
    if (blocks.length > 0) {
      blocks = normalizeTekstBlockTimings(blocks, startTicks, clipEnd);
    }
    return {
      ...clip,
      startTicks,
      lengthTicks: Math.max(1, clipEnd - startTicks),
      ...(blocks.length > 0 ? { blocks } : {}),
    };
  });
}

export function remapTekstClipsAlongSolverMap(
  clips: readonly TekstClip[],
  placeBpm: number,
  tempoMap: readonly TempoEvent[],
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): TekstClip[] {
  const mapT = (t: number) =>
    remapTickAlongSolverMap(t, placeBpm, tempoMap, seedBpm, meter, ppq, floor);
  return remapTekstClipsWithMapFn(clips, mapT);
}

export function remapMelodyClipsWithMapFn(
  clips: readonly MelodyNoteClip[],
  mapT: (t: number) => number,
): MelodyNoteClip[] {
  return clips.map((clip) => {
    const startTicks = mapT(clip.startTicks);
    const endTicks = mapT(clip.startTicks + clip.lengthTicks);
    return {
      ...clip,
      startTicks,
      lengthTicks: Math.max(1, endTicks - startTicks),
    };
  });
}

export function remapMelodyClipsAlongSolverMap(
  clips: readonly MelodyNoteClip[],
  placeBpm: number,
  tempoMap: readonly TempoEvent[],
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): MelodyNoteClip[] {
  const mapT = (t: number) =>
    remapTickAlongSolverMap(t, placeBpm, tempoMap, seedBpm, meter, ppq, floor);
  return remapMelodyClipsWithMapFn(clips, mapT);
}

/**
 * Align-first `sourceSection`: UG↔US word map, not Forma tick affinity.
 * Avoids labeling Verse 2 lyrics as Chorus when wall-clock ticks fall in a
 * later Forma window.
 */
export function annotateTekstSourceSectionsFromAlign(
  tekstClips: readonly TekstClip[],
  usWords: readonly TimedWord[],
  ugWords: readonly UgBridgeWord[],
  mapAtoB: readonly (number | null)[],
): TekstClip[] {
  const usIndexToSection = new Map<number, string>();
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = mapAtoB[gi];
    if (bj == null) continue;
    const gw = ugWords[gi];
    if (!gw) continue;
    usIndexToSection.set(bj, gw.sectionName);
  }

  return tekstClips.map((clip) => {
    const end = clip.startTicks + clip.lengthTicks;
    const votes = new Map<string, number>();
    for (let wi = 0; wi < usWords.length; wi++) {
      const w = usWords[wi]!;
      if (w.startTicks < clip.startTicks || w.startTicks >= end) continue;
      const name = usIndexToSection.get(wi);
      if (!name) continue;
      votes.set(name, (votes.get(name) ?? 0) + 1);
    }
    let best: string | undefined;
    let bestN = 0;
    for (const [name, n] of votes) {
      if (n > bestN) {
        best = name;
        bestN = n;
      }
    }
    // Pickup / empty vote: use nearest following mapped US word.
    if (!best) {
      for (let wi = 0; wi < usWords.length; wi++) {
        const w = usWords[wi]!;
        if (w.startTicks < clip.startTicks) continue;
        const name = usIndexToSection.get(wi);
        if (name) {
          best = name;
          break;
        }
      }
    }
    return best ? { ...clip, sourceSection: best } : clip;
  });
}
