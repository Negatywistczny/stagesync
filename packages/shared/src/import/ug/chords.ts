/**
 * Ultimate Guitar / ChordPro-lite import — chord tokens, onsets, clip sealing.
 */

import {
  collapseAsciiSpaces,
  forEachBracketSpan,
  stripBracketSpans,
} from "../../ui-helpers/bracket-spans.js";
import { toLiteralStorage } from "../../music/chord-display.js";
import type { AkordClip } from "../../project/schema.js";

/**
 * Pitch letter A–G plus Polish H (= B).
 * Allows sus2/4, parenthetical alterations, alt — then `toLiteralStorage` canonicalizes.
 */
const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]{0,32}\))?(?:\/[A-H](?:#|b)?)?$/i;

/** Reject pathological tokens before CHORD_TOKEN (ReDoS bound). */
export const CHORD_TOKEN_MAX = 64;

/**
 * Polish H → Western B for storage (transpose / Client hybridPolishB).
 * Root and slash-bass pitch letters only (first char of each side).
 * Prefer `toLiteralStorage` at write edges — kept for direct callers / tests.
 */
export function canonicalizePolishH(symbol: string): string {
  return toLiteralStorage(symbol);
}

export function acceptChordToken(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > CHORD_TOKEN_MAX || !CHORD_TOKEN.test(t)) return null;
  return toLiteralStorage(t);
}

export function stripBracketChords(line: string): string {
  return collapseAsciiSpaces(stripBracketSpans(line)).trim();
}

export function extractBracketChords(line: string): string[] {
  const out: string[] = [];
  forEachBracketSpan(line, (inner) => {
    const accepted = acceptChordToken(inner);
    if (accepted) out.push(accepted);
  });
  return out;
}

export function isChordOnlyLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(
    (t) => t.length <= CHORD_TOKEN_MAX && CHORD_TOKEN.test(t),
  );
}

export function parseChordOnlyLine(line: string): string[] {
  return line
    .split(/\s+/)
    .map((t) => acceptChordToken(t))
    .filter((t): t is string => t != null);
}

export function dedupeConsecutive(chords: string[]): string[] {
  return chords.filter((c, i) => i === 0 || c !== chords[i - 1]);
}

/** Legacy `distributeChordBeats` — 1-based beat indices in a bar. */
function distributeChordBeatIndices(
  chordCount: number,
  beatsPerBar: number,
): number[] {
  if (chordCount <= 0) return [];
  if (chordCount === 1) return [1];
  const beats: number[] = [];
  for (let i = 0; i < chordCount; i++) {
    beats.push(
      Math.min(beatsPerBar, Math.floor((i * beatsPerBar) / chordCount) + 1),
    );
  }
  return beats;
}

/**
 * Onsets inside `[barStart, barStart + barTicks)` — unique & increasing.
 * Dense lines (> beatsPerBar) use even fractional ticks (legacy scrub note).
 */
export function chordOnsetsInBar(
  chordCount: number,
  barStart: number,
  barTicks: number,
  beatsPerBar: number,
  ticksPerBeat: number,
): number[] {
  if (chordCount <= 0) return [];
  if (chordCount === 1) return [barStart];

  let onsets: number[];
  if (chordCount <= beatsPerBar) {
    const beats = distributeChordBeatIndices(chordCount, beatsPerBar);
    onsets = beats.map((b) => barStart + (b - 1) * ticksPerBeat);
  } else {
    onsets = [];
    for (let i = 0; i < chordCount; i++) {
      onsets.push(barStart + Math.floor((i * barTicks) / chordCount));
    }
  }

  const minStep = Math.max(1, Math.floor(ticksPerBeat / 4));
  for (let i = 1; i < onsets.length; i++) {
    if (onsets[i]! <= onsets[i - 1]!) {
      onsets[i] = onsets[i - 1]! + minStep;
    }
  }
  const barEnd = barStart + barTicks;
  for (let i = 0; i < onsets.length; i++) {
    if (onsets[i]! >= barEnd) {
      onsets[i] = Math.max(barStart, barEnd - (onsets.length - i) * minStep);
    }
  }
  for (let i = 1; i < onsets.length; i++) {
    if (onsets[i]! <= onsets[i - 1]!) {
      onsets[i] = onsets[i - 1]! + minStep;
    }
  }
  return onsets;
}

/** Length = next onset − this (last → spanEnd). No overlaps. */
export function clipsFromOnsets(
  symbols: string[],
  onsets: number[],
  spanEnd: number,
  idPrefix: string,
  seqStart: number,
  sourceLineId?: string,
): { clips: AkordClip[]; nextSeq: number } {
  const clips: AkordClip[] = [];
  let seq = seqStart;
  const lineId = sourceLineId?.trim() || undefined;
  for (let i = 0; i < symbols.length; i++) {
    const start = onsets[i]!;
    const end = i + 1 < onsets.length ? onsets[i + 1]! : spanEnd;
    clips.push({
      id: `${idPrefix}-akord-${++seq}`,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
      symbol: symbols[i]!,
      ...(lineId ? { sourceLineId: lineId } : {}),
    });
  }
  return { clips, nextSeq: seq };
}

/** Shorten each clip so it ends at the next onset (sorted). */
export function sealAkordyLengths(clips: AkordClip[]): AkordClip[] {
  if (clips.length === 0) return clips;
  const sorted = [...clips].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
  const last = sorted[sorted.length - 1]!;
  const fallbackEnd = last.startTicks + Math.max(1, last.lengthTicks);
  return sorted.map((c, i) => {
    const end = i + 1 < sorted.length ? sorted[i + 1]!.startTicks : fallbackEnd;
    return {
      ...c,
      lengthTicks: Math.max(1, end - c.startTicks),
    };
  });
}

/** Shared with section header parsing (ChordPro / bracket headers). */
export function isChordToken(token: string): boolean {
  return token.length <= CHORD_TOKEN_MAX && CHORD_TOKEN.test(token);
}
