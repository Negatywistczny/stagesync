import type { TempoEvent } from "../schema.js";
import { DEFAULT_PPQ, type TimeSignature } from "../time.js";
import { secondsToTicks } from "../tempo-map.js";
import { pristineBarsFromMsSpan, sectionBeat1Ms } from "../tempo-map-solver.js";
import type { HarmonicSyllable } from "../harmonic-accent.js";
import {
  quantizeTicksToBar,
  quantizeTicksToBarOrHalf,
} from "../ug-pipe-bars.js";
import { DEFAULT_BARS_PER_CHORD, DEFAULT_BARS_PER_LINE } from "./constants.js";

/**
 * Place `count` onsets on an even *integer-bar* grid inside `[start, end)`.
 * Uses as many bars per slot as fit (`floor(availBars / count)`, min 1).
 * Never fractional tick packing.
 */
export function evenlySpaceOnsetsOnBarGrid(
  count: number,
  start: number,
  end: number,
  barTicks: number,
): number[] {
  if (count <= 0) return [];
  const bar = Math.max(1, barTicks);
  const startQ = Math.min(start, end);
  const endQ = Math.max(start, end);
  const availBars = Math.max(1, Math.floor((endQ - startQ) / bar));
  const barsPer = Math.max(1, Math.floor(availBars / count));
  const lastLegal = Math.max(startQ, endQ - 1);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = startQ + i * barsPer * bar;
    if (t >= endQ) break;
    out.push(Math.min(lastLegal, t));
  }
  return out;
}

/**
 * Fill null onsets by linear interpolation between known neighbors
 * (or container edges). Used for S1 empty accent scope.
 */
export function interpolateMissingOnsets(
  onsets: readonly (number | null)[],
  containerStart: number,
  containerEnd: number,
): number[] {
  if (onsets.length === 0) return [];
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  const out: (number | null)[] = onsets.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] != null) continue;
    let prevVal = start;
    let prevIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (out[j] != null) {
        prevVal = out[j]!;
        prevIdx = j;
        break;
      }
    }
    let nextVal = Math.max(start, end - 1);
    let nextIdx = out.length;
    for (let j = i + 1; j < out.length; j++) {
      if (out[j] != null) {
        nextVal = out[j]!;
        nextIdx = j;
        break;
      }
    }
    const span = Math.max(1, nextIdx - prevIdx);
    const pos = i - prevIdx;
    out[i] = Math.round(prevVal + ((nextVal - prevVal) * pos) / span);
  }
  return out.map((t) => t ?? start);
}

/** True when any US syllable onset falls inside the container window. */
export function sectionHasUsSyllables(
  syllables: readonly HarmonicSyllable[],
  containerStart: number,
  containerEnd: number,
): boolean {
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  return syllables.some((s) => s.startTicks >= start && s.startTicks < end);
}

/**
 * Ordered US phrase indices that belong to a Forma section window, including
 * vocal pickup up to one bar before the container start.
 */
export function phraseIndicesInSectionWindow(
  syllables: readonly HarmonicSyllable[],
  containerStart: number,
  containerEnd: number,
  barTicks: number,
): number[] {
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  const lo = start - Math.max(1, barTicks);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const s of syllables) {
    if (s.startTicks < lo || s.startTicks >= end) continue;
    if (seen.has(s.phraseIndex)) continue;
    seen.add(s.phraseIndex);
    out.push(s.phraseIndex);
  }
  return out;
}

/**
 * Harmonic cell start for UG chord-line `lineIndex` inside a Forma container.
 * Default rhythm = {@link DEFAULT_BARS_PER_CHORD} bars per chord line.
 */
export function chordLineGridOnset(
  containerStart: number,
  lineIndex: number,
  barTicks: number,
  barsPerChord: number = DEFAULT_BARS_PER_CHORD,
): number {
  const bpc = Math.max(1, Math.trunc(barsPerChord));
  const gap = bpc * Math.max(1, barTicks);
  return containerStart + Math.max(0, Math.trunc(lineIndex)) * gap;
}

/**
 * Map wall-clock onsets into a rigid container while preserving relative order.
 * Legacy helper — not used on the vocal chord hot path (accent → snap → clamp).
 */
export function mapOnsetsIntoContainer(
  onsets: readonly number[],
  containerStart: number,
  containerEnd: number,
): number[] {
  if (onsets.length === 0) return [];
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  const lastLegal = Math.max(start, end - 1);
  const span = Math.max(1, lastLegal - start);
  const srcMin = Math.min(...onsets);
  const srcMax = Math.max(...onsets);
  if (srcMax <= srcMin) {
    return onsets.map(() => start);
  }
  const srcSpan = srcMax - srcMin;
  return onsets.map((raw) => {
    const r = (raw - srcMin) / srcSpan;
    return start + Math.round(r * span);
  });
}

/**
 * Ensure onsets stay inside `[start, end)` and are strictly increasing by at
 * least one half-bar on the pristine grid. Never falls back to fractional
 * even-pack — surplus chords that cannot fit are dropped from the end.
 */
export function fitOnsetsInContainer(
  onsets: readonly number[],
  containerStart: number,
  containerEnd: number,
  barTicks?: number,
): number[] {
  if (onsets.length === 0) return [];
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  const lastLegal = Math.max(start, end - 1);
  const half = Math.max(1, Math.floor((barTicks ?? 2) / 2));
  const out: number[] = [];
  for (const raw of onsets) {
    let t = Math.min(lastLegal, Math.max(start, Math.round(raw)));
    if (out.length > 0) {
      const minAllowed = out[out.length - 1]! + half;
      if (t < minAllowed) t = minAllowed;
    }
    if (t > lastLegal) break;
    out.push(t);
  }
  return out;
}

/**
 * After bar/half quantize, dual chord-above lines (e.g. `B7 … Em`) often land on
 * the same grid point. Push later onsets by at least half a bar on the pristine
 * Beat 1/3 grid; drop trailing chords that cannot fit (no fractional pack).
 */
export function enforceMinChordGap(
  onsets: readonly number[],
  containerStart: number,
  containerEnd: number,
  minGapTicks: number,
): number[] {
  if (onsets.length <= 1 || minGapTicks <= 1) {
    return fitOnsetsInContainer(
      onsets,
      containerStart,
      containerEnd,
      minGapTicks * 2,
    );
  }
  const start = Math.min(containerStart, containerEnd);
  const end = Math.max(containerStart, containerEnd);
  const lastLegal = Math.max(start, end - 1);
  const gap = Math.max(1, Math.trunc(minGapTicks));
  const out: number[] = [];
  for (const raw of onsets) {
    let t = Math.min(lastLegal, Math.max(start, Math.round(raw)));
    // Snap push onto half-bar grid relative to section start.
    if (out.length > 0) {
      const minAllowed = out[out.length - 1]! + gap;
      if (t < minAllowed) {
        const fromStart = minAllowed - start;
        const snapped = start + Math.ceil(fromStart / gap) * gap;
        t = snapped;
      }
    }
    if (t > lastLegal) break;
    out.push(t);
  }
  return out;
}

/**
 * Even bars-per-chord when a known span already divides evenly.
 * Otherwise floor — never round up (that would require stretching Forma).
 * Used to **fill** a frozen container; length SSOT is {@link sectionLengthBarsFromUg}
 * / UltraStar walls — not chords × {@link DEFAULT_BARS_PER_CHORD}.
 */
export function barsPerChordForSection(
  spanBars: number,
  chordCount: number,
): number {
  if (chordCount <= 0) return 1;
  if (spanBars % chordCount === 0) return spanBars / chordCount;
  return Math.max(1, Math.floor(spanBars / chordCount));
}

/**
 * Fallback Forma length in bars from UG structure alone (no UltraStar walls).
 * Pipe wins; else lyric lines × {@link DEFAULT_BARS_PER_LINE}; else 1.
 * Chords never define length — they only fill the container.
 */
export function sectionLengthBarsFromUg(sec: {
  pipeBarCount: number;
  chords: readonly unknown[];
  lyricLineCount: number;
  barsPerChord?: number;
  barsPerLine?: number;
}): number {
  if (sec.pipeBarCount > 0) return sec.pipeBarCount;
  const bpl = Math.max(1, Math.trunc(sec.barsPerLine ?? DEFAULT_BARS_PER_LINE));
  if (sec.lyricLineCount > 0) return Math.max(1, sec.lyricLineCount * bpl);
  return 1;
}

/**
 * Forma length from successive UltraStar section Beat 1 walls (ms), else
 * {@link sectionLengthBarsFromUg}. Pipe unchanged. Chords ignored for length.
 */
export function structuralBarsFromUsWalls(
  ugSections: readonly {
    pipeBarCount: number;
    chords: readonly unknown[];
    lyricLineCount: number;
    barsPerLine?: number;
  }[],
  vocalMsRanges: readonly ({ startMs: number; endMs: number } | null)[],
  sizingBpm: number,
  meter: TimeSignature = { numerator: 4, denominator: 4 },
  ppq: number = DEFAULT_PPQ,
): number[] {
  const n = ugSections.length;
  const beat1Ms: (number | null)[] = [];
  for (let si = 0; si < n; si++) {
    const vr = vocalMsRanges[si] ?? null;
    if (!vr) {
      beat1Ms.push(null);
      continue;
    }
    // Wall = first strong beat: pickup syllables stay before Beat 1.
    beat1Ms.push(
      sectionBeat1Ms(vr.startMs, vr.endMs, sizingBpm, meter, ppq, null),
    );
  }
  const out: number[] = [];
  for (let si = 0; si < n; si++) {
    const sec = ugSections[si]!;
    if (sec.pipeBarCount > 0) {
      out.push(sec.pipeBarCount);
      continue;
    }
    const b1 = beat1Ms[si];
    let nextB1: number | null = null;
    for (let j = si + 1; j < n; j++) {
      if (beat1Ms[j] != null) {
        nextB1 = beat1Ms[j] ?? null;
        break;
      }
    }
    if (b1 != null && nextB1 != null && nextB1 > b1) {
      out.push(pristineBarsFromMsSpan(b1, nextB1, sizingBpm, meter, ppq));
      continue;
    }
    const vr = vocalMsRanges[si];
    if (b1 != null && vr) {
      out.push(
        pristineBarsFromMsSpan(
          b1,
          Math.max(b1, vr.endMs),
          sizingBpm,
          meter,
          ppq,
        ),
      );
      continue;
    }
    out.push(sectionLengthBarsFromUg(sec));
  }
  return out;
}

/**
 * Quantize chord onsets **within** a Forma section window.
 * - `"bar"` — Beat 1 only (vocal product path / pristine grid).
 * - `"barOrHalf"` — Beat 1 / Beat 3 (legacy helper + pipe diagnostics).
 * Never returns a tick < sectionStart or ≥ sectionEnd.
 */
export function quantizeChordOnsets(
  onsets: readonly number[],
  sectionStart: number,
  sectionEnd: number,
  barTicks: number,
  mode: "bar" | "barOrHalf" = "barOrHalf",
): number[] {
  const start = Math.min(sectionStart, sectionEnd);
  const end = Math.max(sectionStart, sectionEnd);
  const lastLegal = Math.max(start, end - 1);
  const snap = mode === "bar" ? quantizeTicksToBar : quantizeTicksToBarOrHalf;
  return onsets.map((raw) => {
    let t = snap(raw, barTicks);
    if (t < start) t = start;
    if (t >= end) t = lastLegal;
    if (t < start) t = start;
    if (t >= end) t = lastLegal;
    return t;
  });
}

/**
 * Structural bar offsets for UG chord lines inside a section.
 * Line `i` starts at cumulative bars; chord `k` within the line is
 * `N_start + k` (phrase C+B). No half-bar crush.
 *
 * Optional `barsPerLine` (one entry per chord-line group, in order) expands
 * each line to its vocal phrase length in bars @ seed — so left-aligned
 * Verse lines get ~2 bars each instead of forcing 1 bar/chord (which floors
 * local BPM to 40 and breaks secondsToTicks ≈ barline).
 */
export function structuralBarOffsetsForChordLines(
  chords: readonly { chordLineIndex: number; orderInSection: number }[],
  barsPerLine?: readonly number[],
): { orderInSection: number; barOffset: number }[] {
  const sorted = chords
    .slice()
    .sort((a, b) => a.orderInSection - b.orderInSection);
  type LineGroup = { lineIndex: number; orders: number[] };
  const groups: LineGroup[] = [];
  for (const c of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.lineIndex === c.chordLineIndex) {
      last.orders.push(c.orderInSection);
    } else {
      groups.push({ lineIndex: c.chordLineIndex, orders: [c.orderInSection] });
    }
  }
  const out: { orderInSection: number; barOffset: number }[] = [];
  let cursor = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const span = Math.max(
      g.orders.length,
      barsPerLine?.[gi] != null
        ? Math.max(1, Math.trunc(barsPerLine[gi]!))
        : g.orders.length,
    );
    for (let k = 0; k < g.orders.length; k++) {
      // Spread multi-chord lines across the phrase window; single chord at N_start.
      const inner =
        g.orders.length <= 1
          ? 0
          : Math.round((k * (span - 1)) / (g.orders.length - 1));
      out.push({ orderInSection: g.orders[k]!, barOffset: cursor + inner });
    }
    cursor += span;
  }
  return out;
}

/** Chord onset → length to next onset (last → container end). DAW standard. */
export function sealChordLengths(
  onsets: readonly number[],
  containerEnd: number,
): { startTicks: number; lengthTicks: number }[] {
  return onsets.map((start, i) => {
    const next = onsets[i + 1] ?? containerEnd;
    return {
      startTicks: start,
      lengthTicks: Math.max(1, next - start),
    };
  });
}

/**
 * Place chord symbols on a container timeline with a minimum onset gap.
 * Later chords that cannot fit are dropped (no 1-tick crush packing).
 */
export function placeChordsWithMinGap(
  paired: readonly { startTicks: number; symbol: string }[],
  containerStart: number,
  containerEnd: number,
  minGapTicks: number,
): {
  placed: { startTicks: number; lengthTicks: number; symbol: string }[];
  dropped: number;
} {
  if (paired.length === 0) return { placed: [], dropped: 0 };
  const sorted = paired
    .slice()
    .sort(
      (a, b) => a.startTicks - b.startTicks || a.symbol.localeCompare(b.symbol),
    );
  const onsets = enforceMinChordGap(
    sorted.map((p) => p.startTicks),
    containerStart,
    containerEnd,
    minGapTicks,
  );
  const n = Math.min(onsets.length, sorted.length);
  const sealed = sealChordLengths(onsets.slice(0, n), containerEnd);
  const placed = sealed.map((s, i) => ({
    startTicks: s.startTicks,
    lengthTicks: s.lengthTicks,
    symbol: sorted[i]!.symbol,
  }));
  return { placed, dropped: sorted.length - placed.length };
}

/** Wall-clock ms → tick via solver TempoMap (absolute syllable path). */
export function chordTickFromSyllableMs(
  startMs: number,
  tempoMap: readonly TempoEvent[],
  seedBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number = 0,
): number {
  try {
    return (
      secondsToTicks(startMs / 1000, tempoMap, seedBpm, meter, ppq) + floor
    );
  } catch {
    return floor;
  }
}
