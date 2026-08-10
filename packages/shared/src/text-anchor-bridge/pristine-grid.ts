import type { AkordClip } from "../schema.js";
import {
  findHarmonicAccentSyllable,
  syllablesInChordScope,
} from "../harmonic-accent.js";
import { quantizeTicksToBar } from "../ug-pipe-bars.js";
import { DEFAULT_BARS_PER_CHORD } from "./constants.js";
import type {
  BuildPristineSectionGridInput,
  BuildPristineSectionGridResult,
  PristineSectionChord,
} from "./types.js";
import {
  chordLineGridOnset,
  enforceMinChordGap,
  evenlySpaceOnsetsOnBarGrid,
  interpolateMissingOnsets,
  phraseIndicesInSectionWindow,
  quantizeChordOnsets,
  sectionHasUsSyllables,
} from "./onset-grid.js";

export type {
  BuildPristineSectionGridInput,
  BuildPristineSectionGridResult,
  PristineSectionChord,
};

/**
 * Fill akordy inside a frozen Forma container on the pristine bar grid.
 *
 * - Pipe: absolute bar/half from UG cells (mid-bar OK).
 * - Left-aligned vocal / instrumental prefer-2: Beat 1 every
 *   {@link DEFAULT_BARS_PER_CHORD} bars — no US accent ticks.
 * - Word-aligned / ChordPro: accent → snap to **Beat 1 only** (min gap 1 bar).
 */
export function buildPristineSectionGrid(
  input: BuildPristineSectionGridInput,
): BuildPristineSectionGridResult {
  const barTicks = Math.max(1, input.barTicks);
  const winStart = input.containerStart;
  const winEnd = input.containerEnd;
  const bpc = Math.max(
    1,
    Math.trunc(input.barsPerChord ?? DEFAULT_BARS_PER_CHORD),
  );
  const cellTicks = bpc * barTicks;
  const prefix = input.idPrefix ?? "bridge";
  let seq = input.seqStart ?? 0;
  const warnings: string[] = [];
  let approximate = false;
  let usedWordAlign = false;

  const paired: { startTicks: number; symbol: string; isRest?: boolean }[] = [];

  if (input.pipeBarCount > 0 && input.pipeEvents.length > 0) {
    for (const ev of input.pipeEvents) {
      const local =
        ev.barIndex * barTicks + Math.round(ev.offsetInBar * barTicks);
      const t = winStart + local;
      if (t >= winEnd) continue;
      paired.push({
        startTicks: Math.max(winStart, t),
        symbol: ev.symbol,
        isRest: ev.isRest,
      });
    }
  } else if (!sectionHasUsSyllables(input.usSyllables, winStart, winEnd)) {
    const list = input.chords;
    if (list.length > 0) {
      approximate = true;
      const preferTwo = list.length * cellTicks <= winEnd - winStart;
      const gridOnsets = preferTwo
        ? list.map((_, i) => chordLineGridOnset(winStart, i, barTicks, bpc))
        : evenlySpaceOnsetsOnBarGrid(list.length, winStart, winEnd, barTicks);
      const q = quantizeChordOnsets(
        gridOnsets.filter((t) => t < winEnd),
        winStart,
        winEnd,
        barTicks,
        "bar",
      );
      for (let i = 0; i < list.length && i < q.length; i++) {
        paired.push({ startTicks: q[i]!, symbol: list[i]!.symbol });
      }
    }
  } else {
    const list = input.chords
      .slice()
      .sort((a, b) => a.orderInSection - b.orderInSection);
    const sectionPhrases = phraseIndicesInSectionWindow(
      input.usSyllables,
      winStart,
      winEnd,
      barTicks,
    );

    type LineGroup = { lineIndex: number; chords: PristineSectionChord[] };
    const groups: LineGroup[] = [];
    for (const c of list) {
      const last = groups[groups.length - 1];
      if (last && last.lineIndex === c.chordLineIndex) {
        last.chords.push(c);
      } else {
        groups.push({ lineIndex: c.chordLineIndex, chords: [c] });
      }
    }

    const rawOnsets: (number | null)[] = [];
    const symbols: string[] = [];
    let usedS1 = false;
    const forceGrid: boolean[] = [];
    let gridSlot = 0;

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]!;
      const phraseIndex =
        sectionPhrases.length > 0
          ? sectionPhrases[Math.min(gi, sectionPhrases.length - 1)]!
          : null;
      const phraseSyllables =
        phraseIndex == null
          ? []
          : input.usSyllables.filter((s) => s.phraseIndex === phraseIndex);

      if (group.chords.length === 1 && !group.chords[0]!.wordAligned) {
        const cellStart = chordLineGridOnset(winStart, gridSlot, barTicks, bpc);
        gridSlot += 1;
        if (cellStart >= winEnd) continue;
        symbols.push(group.chords[0]!.symbol);
        forceGrid.push(true);
        rawOnsets.push(Math.max(winStart, cellStart));
        continue;
      }

      usedWordAlign = true;
      for (let ci = 0; ci < group.chords.length; ci++) {
        const c = group.chords[ci]!;
        symbols.push(c.symbol);
        forceGrid.push(false);

        let scopeStart: number | null = null;
        if (c.ugWordIndex != null) {
          scopeStart = input.resolveWordStartTicks(c.ugWordIndex);
        }
        if (scopeStart == null) {
          scopeStart = phraseSyllables[0]?.startTicks ?? winStart;
        }

        let scopeEnd: number | null = null;
        for (let nj = ci + 1; nj < group.chords.length; nj++) {
          const n = group.chords[nj]!;
          if (n.ugWordIndex == null) continue;
          const t = input.resolveWordStartTicks(n.ugWordIndex);
          if (t != null) {
            scopeEnd = t;
            break;
          }
        }
        if (scopeEnd == null) {
          const lastSyl = phraseSyllables[phraseSyllables.length - 1];
          scopeEnd = lastSyl != null ? lastSyl.endTicks + 1 : null;
        }

        const sameWordNext =
          ci + 1 < group.chords.length &&
          c.ugWordIndex != null &&
          group.chords[ci + 1]!.ugWordIndex === c.ugWordIndex;

        const scoped =
          sameWordNext || (scopeEnd != null && scopeEnd <= scopeStart)
            ? []
            : syllablesInChordScope(
                phraseSyllables.length > 0
                  ? phraseSyllables
                  : input.usSyllables,
                scopeStart,
                scopeEnd != null && scopeEnd > scopeStart ? scopeEnd : null,
              );
        const accent = findHarmonicAccentSyllable(scoped);

        if (accent) {
          rawOnsets.push(accent.startTicks);
        } else {
          usedS1 = true;
          rawOnsets.push(null);
        }
      }
    }

    if (symbols.length > 0 && rawOnsets.length > 0) {
      if (usedS1) {
        approximate = true;
        warnings.push(
          `Sekcja „${input.sectionName}”: akord bez sylaby w zasięgu — interpolacja (przybliżenie).`,
        );
      }
      const keptSymbols = symbols.slice(0, rawOnsets.length);
      const keptForce = forceGrid.slice(0, rawOnsets.length);
      const filled = interpolateMissingOnsets(rawOnsets, winStart, winEnd);
      const allGrid = keptForce.every(Boolean);
      let q: number[];
      if (allGrid) {
        q = quantizeChordOnsets(
          filled.map((_, i) => chordLineGridOnset(winStart, i, barTicks, bpc)),
          winStart,
          winEnd,
          barTicks,
          "bar",
        ).filter((t) => t < winEnd);
      } else {
        // Word-align: accent → Beat 1 only (no half-bar 20.3 product path).
        q = enforceMinChordGap(
          quantizeChordOnsets(filled, winStart, winEnd, barTicks, "bar"),
          winStart,
          winEnd,
          barTicks,
        );
        let g = 0;
        for (let i = 0; i < q.length; i++) {
          if (!keptForce[i]) continue;
          q[i] = Math.min(
            Math.max(winStart, chordLineGridOnset(winStart, g, barTicks, bpc)),
            Math.max(winStart, winEnd - 1),
          );
          g += 1;
        }
        for (let i = 1; i < q.length; i++) {
          if (q[i]! < q[i - 1]! + barTicks) {
            q[i] = q[i - 1]! + barTicks;
          }
        }
        q = q.filter((t) => t < winEnd);
      }
      for (let i = 0; i < keptSymbols.length && i < q.length; i++) {
        paired.push({ startTicks: q[i]!, symbol: keptSymbols[i]! });
      }
    }
  }

  paired.sort((a, b) => a.startTicks - b.startTicks);

  const fromPipe = input.pipeBarCount > 0;
  const lastLegal = Math.max(winStart, winEnd - 1);
  const unique: { startTicks: number; symbol: string; isRest: boolean }[] = [];
  for (const p of paired) {
    let startTicks = Math.min(lastLegal, Math.max(winStart, p.startTicks));
    // Non-pipe: snap onto Beat 1 only. Pipe keeps authored bar/half.
    if (!fromPipe) {
      startTicks = quantizeTicksToBar(startTicks, barTicks);
      if (startTicks < winStart) startTicks = winStart;
      if (startTicks >= winEnd) continue;
    }
    const last = unique[unique.length - 1];
    if (p.isRest) {
      unique.push({ startTicks, symbol: p.symbol, isRest: true });
      continue;
    }
    if (fromPipe && last && !last.isRest && last.symbol === p.symbol) {
      continue;
    }
    if (last && startTicks < last.startTicks) continue;
    if (last && startTicks === last.startTicks && !last.isRest) {
      // Push to next Beat 1 (vocal) or half-bar (pipe) — never 1-tick.
      const push = fromPipe ? Math.max(1, Math.floor(barTicks / 2)) : barTicks;
      startTicks = last.startTicks + push;
      if (startTicks >= winEnd) continue;
      unique.push({ startTicks, symbol: p.symbol, isRest: false });
    } else {
      unique.push({ startTicks, symbol: p.symbol, isRest: false });
    }
  }

  const clips: AkordClip[] = [];
  const sounding = unique.filter((u) => !u.isRest);
  for (let i = 0; i < unique.length; i++) {
    const cur = unique[i]!;
    if (cur.isRest) continue;
    const soundIdx = sounding.indexOf(cur);
    const nextSound = sounding[soundIdx + 1];
    let lengthTicks: number;
    if (nextSound) {
      lengthTicks = Math.max(1, nextSound.startTicks - cur.startTicks);
    } else {
      const toEnd = winEnd - cur.startTicks;
      const relativeEnd = winEnd - winStart;
      const endOnBarline = relativeEnd % barTicks === 0;
      if (endOnBarline && toEnd >= cellTicks && toEnd % cellTicks === 0) {
        lengthTicks = Math.max(1, toEnd);
      } else if (endOnBarline && toEnd >= 1) {
        lengthTicks = Math.max(1, toEnd);
      } else {
        lengthTicks = Math.max(1, Math.min(cellTicks, toEnd));
      }
    }
    clips.push({
      id: `${prefix}-akord-${++seq}`,
      startTicks: cur.startTicks,
      lengthTicks,
      symbol: cur.symbol,
    });
  }

  return {
    clips,
    warnings,
    approximate,
    usedWordAlign,
    nextSeq: seq,
  };
}
