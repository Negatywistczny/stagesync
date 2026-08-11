import {
  layoutContiguousFormaPlans,
  type TempoSolverSectionPlan,
} from "../tempo-map-solver.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "../time.js";
import { sectionStartFromVocalTicks } from "../ug-pipe-bars.js";
import type {
  AlignedWordFormaSection,
  LayoutFormaFromUgBarCountsOpts,
  UgFormaSectionInput,
} from "./types.js";

/**
 * Layout Forma section walls from UG bar counts only — no US wall-clock sizing.
 * Legacy / no-audio path. Prefer {@link layoutFormaFromAlignedWords} with Smart Tempo.
 */
export function layoutFormaFromUgBarCounts(
  sections: readonly UgFormaSectionInput[],
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
  opts?: Pick<LayoutFormaFromUgBarCountsOpts, "layoutBpm">,
): TempoSolverSectionPlan[] {
  const barTicks = ticksPerBar(meter, ppq);
  const layoutBpm =
    opts?.layoutBpm != null &&
    Number.isFinite(opts.layoutBpm) &&
    opts.layoutBpm > 0
      ? opts.layoutBpm
      : 120;
  const plans: TempoSolverSectionPlan[] = [];
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si]!;
    const fromPipe = sec.pipeBarCount > 0;
    let pristineBars: number;
    if (fromPipe) {
      pristineBars = Math.max(1, sec.pipeBarCount);
    } else {
      // UltraStar walls / lyric fallback via structuralBars — not chord count.
      pristineBars = Math.max(1, sec.structuralBars);
    }
    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs: sec.vocalStartMs ?? 0,
      endMs: 0,
      pristineBars,
      fromPipe,
      startTicks: 0,
      lengthTicks: 0,
    });
  }
  const solverSections = sections.map((sec) => ({
    pipeBarCount: sec.pipeBarCount,
    vocalMsRange:
      sec.vocalStartMs != null && Number.isFinite(sec.vocalStartMs)
        ? { startMs: sec.vocalStartMs, endMs: sec.vocalStartMs }
        : null,
  }));
  layoutContiguousFormaPlans(
    plans,
    solverSections,
    floorTicks,
    barTicks,
    layoutBpm,
    meter,
    ppq,
  );
  return plans;
}

/**
 * Forma walls from UG↔US word links on the audio TempoMap.
 * Vocal section Beat 1 = {@link sectionStartFromVocalTicks}(first word).
 * Wordless / pipe sections take `pipeBarCount` bars at the audio seed grid and
 * absorb anacrusis so the next vocal Forma starts on a barline (no US `#BPM`).
 */
export function layoutFormaFromAlignedWords(
  sections: readonly AlignedWordFormaSection[],
  floorTicks: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): TempoSolverSectionPlan[] {
  const barTicks = ticksPerBar(meter, ppq);
  const n = sections.length;
  const beat1Ticks: (number | null)[] = sections.map((sec) => {
    if (sec.firstWordTicks == null || !Number.isFinite(sec.firstWordTicks)) {
      return null;
    }
    return sectionStartFromVocalTicks(sec.firstWordTicks, barTicks);
  });

  const endTicksExclusive: number[] = new Array(n).fill(0);
  for (let si = 0; si < n; si++) {
    let nextVocal: number | null = null;
    for (let j = si + 1; j < n; j++) {
      if (beat1Ticks[j] != null) {
        nextVocal = beat1Ticks[j]!;
        break;
      }
    }
    if (beat1Ticks[si] != null) {
      if (nextVocal != null && nextVocal > beat1Ticks[si]!) {
        endTicksExclusive[si] = nextVocal;
      } else {
        const last = sections[si]!.lastWordTicks;
        const rawEnd =
          last != null && Number.isFinite(last)
            ? Math.max(beat1Ticks[si]! + barTicks, last + 1)
            : beat1Ticks[si]! + barTicks;
        // Snap end up to a barline so Forma lengths stay integer bars.
        const rem = rawEnd % barTicks;
        endTicksExclusive[si] = rem === 0 ? rawEnd : rawEnd - rem + barTicks;
      }
    }
  }

  const plans: TempoSolverSectionPlan[] = [];
  let cursor = floorTicks;
  for (let si = 0; si < n; si++) {
    const sec = sections[si]!;
    const fromPipe = sec.pipeBarCount > 0 && beat1Ticks[si] == null;
    let startTicks: number;
    let lengthTicks: number;
    let startMs = 0;

    if (sec.structuralBars != null && sec.structuralBars > 0) {
      startTicks = cursor;
      const pristineBars = Math.max(1, Math.trunc(sec.structuralBars));
      lengthTicks = pristineBars * barTicks;
      cursor += lengthTicks;
      plans.push({
        sectionIndex: si,
        name: sec.name,
        startMs: 0,
        endMs: 0,
        pristineBars,
        fromPipe: sec.pipeBarCount > 0,
        startTicks,
        lengthTicks,
      });
      continue;
    }

    if (beat1Ticks[si] != null) {
      const vocalStart = Math.max(floorTicks, beat1Ticks[si]!);
      if (vocalStart > cursor && si > 0) {
        // Gap before vocal Beat 1 → previous section absorbs (anacrusis / pipe).
        const prev = plans[si - 1]!;
        prev.lengthTicks += vocalStart - cursor;
        prev.pristineBars = Math.max(
          1,
          Math.round(prev.lengthTicks / barTicks),
        );
        cursor = vocalStart;
      }
      startTicks = Math.max(cursor, vocalStart);
      const end = Math.max(startTicks + barTicks, endTicksExclusive[si]!);
      lengthTicks = end - startTicks;
      // Integer bars.
      const bars = Math.max(1, Math.round(lengthTicks / barTicks));
      lengthTicks = bars * barTicks;
      startMs = 0;
    } else {
      startTicks = cursor;
      const pipeBars = Math.max(1, Math.trunc(sec.pipeBarCount) || 1);
      let nextVocal: number | null = null;
      for (let j = si + 1; j < n; j++) {
        if (beat1Ticks[j] != null) {
          nextVocal = beat1Ticks[j]!;
          break;
        }
      }
      // Word-linked boundary wins: pipe ends at next vocal Beat 1 (anacrusis
      // absorbed). Do not force pipeBarCount when content-epoch puts vocals early.
      if (nextVocal != null && nextVocal > startTicks) {
        lengthTicks = nextVocal - startTicks;
      } else if (nextVocal != null && nextVocal <= startTicks) {
        // No room before the next vocal Beat 1 — keep a 1-bar coverage stub
        // (full pipeBarCount here would shove later Forma walls).
        lengthTicks = barTicks;
      } else {
        lengthTicks = pipeBars * barTicks;
      }
    }

    const pristineBars = Math.max(1, Math.round(lengthTicks / barTicks));
    lengthTicks = pristineBars * barTicks;
    plans.push({
      sectionIndex: si,
      name: sec.name,
      startMs,
      endMs: 0,
      pristineBars,
      fromPipe,
      startTicks,
      lengthTicks,
    });
    cursor = startTicks + lengthTicks;
  }

  // Final pass: ensure contiguous (no gaps/overlaps).
  cursor = floorTicks;
  for (let si = 0; si < plans.length; si++) {
    const p = plans[si]!;
    if (p.startTicks !== cursor) {
      if (p.startTicks > cursor && si > 0) {
        const prev = plans[si - 1]!;
        prev.lengthTicks += p.startTicks - cursor;
        prev.pristineBars = Math.max(
          1,
          Math.round(prev.lengthTicks / barTicks),
        );
        prev.lengthTicks = prev.pristineBars * barTicks;
      }
      p.startTicks = cursor;
    }
    p.pristineBars = Math.max(1, Math.round(p.lengthTicks / barTicks));
    p.lengthTicks = p.pristineBars * barTicks;
    cursor = p.startTicks + p.lengthTicks;
  }
  return plans;
}
