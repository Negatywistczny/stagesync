import type { FormaClip } from "../schema.js";
import { sectionStartFromVocalTicks } from "../ug-pipe-bars.js";
import type {
  FreezeFormaContainersInput,
  FreezeFormaContainersResult,
  SectionContainer,
} from "./types.js";
import { sectionLengthBarsFromUg } from "./onset-grid.js";

export type { FreezeFormaContainersInput, FreezeFormaContainersResult };

/**
 * Step 1 — freeze immutable Forma containers.
 *
 * Length SSOT: UG pipe **or** UltraStar section Beat 1 walls (difference of
 * successive desired starts). Chords only fill the container — never define
 * length. Instrumental / pipe sections may cap or extend to the next US vocal
 * barline (absorb pickup). Anacrusis lives in the previous section; the new
 * Forma always starts on the barline. Walls are then read-only.
 */
export function freezeFormaContainers(
  input: FreezeFormaContainersInput,
): FreezeFormaContainersResult {
  const floor = input.contentFloorTicks ?? 0;
  const prefix = input.idPrefix ?? "bridge";
  const barTicks = Math.max(1, input.barTicks);
  const warnings: string[] = [];
  let approximate = false;
  const n = input.ugSections.length;

  const ugLengthBars: number[] = [];
  const desiredStart: (number | null)[] = [];
  const anchored: boolean[] = [];
  const fromPipe: boolean[] = [];

  for (let si = 0; si < n; si++) {
    const sec = input.ugSections[si]!;
    ugLengthBars.push(sectionLengthBarsFromUg(sec));
    fromPipe.push(sec.pipeBarCount > 0);
    const ticks = input.sectionUsTicks[si] ?? [];
    if (ticks.length > 0) {
      const first = Math.min(...ticks);
      desiredStart.push(sectionStartFromVocalTicks(first, barTicks));
      anchored.push(true);
    } else {
      desiredStart.push(null);
      anchored.push(false);
      if (sec.pipeBarCount <= 0) {
        approximate = true;
        const expectedInstrumental =
          /^(Intro|Outro|Solo|Instrumental|Interlude|Break)\b/i.test(sec.name);
        warnings.push(
          expectedInstrumental
            ? `Sekcja „${sec.name}” bez słów i bez siatki |takt| — Default Grid (przybliżenie).`
            : `Sekcja „${sec.name}” bez dopasowanych słów — długość z UG / Default Grid.`,
        );
      }
    }
  }

  /** Next US-derived vocal barline after index `from`. */
  const nextDesiredAfter = (from: number): number | null => {
    for (let j = from + 1; j < n; j++) {
      const want = desiredStart[j];
      if (want != null) return want;
    }
    return null;
  };

  type Mutable = {
    start: number;
    length: number;
    anchored: boolean;
    fromPipe: boolean;
    lengthBars: number;
  };
  const placed: Mutable[] = [];
  let cursor = floor;

  for (let si = 0; si < n; si++) {
    const start = cursor;

    let bars = Math.max(1, ugLengthBars[si]!);
    const nextWant = nextDesiredAfter(si);
    const instrumental = fromPipe[si]! || !anchored[si]!;

    if (nextWant != null && nextWant > start) {
      const availBars = Math.max(1, Math.floor((nextWant - start) / barTicks));
      if (!instrumental) {
        // Vocal: UltraStar wall span is length SSOT (chords only fill).
        bars = availBars;
      } else {
        bars = Math.min(bars, availBars);
        if (availBars > bars) {
          bars = availBars;
        }
      }
    }

    const length = bars * barTicks;
    placed.push({
      start,
      length,
      anchored: anchored[si]!,
      fromPipe: fromPipe[si]!,
      lengthBars: bars,
    });
    cursor = start + length;
  }

  const containers: SectionContainer[] = [];
  const formaMusic: FormaClip[] = [];
  for (let si = 0; si < n; si++) {
    const p = placed[si]!;
    const lengthTicks = Math.max(1, p.length);
    const c: SectionContainer = Object.freeze({
      sectionIndex: si,
      name: input.ugSections[si]!.name.slice(0, 120),
      startTicks: p.start,
      lengthTicks,
      endTicks: p.start + lengthTicks,
      anchored: p.anchored,
      fromPipe: p.fromPipe,
      lengthBars: p.lengthBars,
    });
    containers.push(c);
    formaMusic.push(
      Object.freeze({
        id: `${prefix}-forma-${si + 1}`,
        name: c.name,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        kind: "section" as const,
      }),
    );
  }

  return {
    containers: Object.freeze(containers.slice()),
    formaMusic,
    warnings,
    approximate,
  };
}
