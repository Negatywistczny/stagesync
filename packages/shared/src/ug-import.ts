/**
 * Ultimate Guitar / ChordPro-lite import → Tekst + Akordy clips (α8).
 *
 * Parity with legacy `parseUgTabLinesToGrid`:
 * - Chord line + lyric line = **one bar** (default), chords distributed inside the bar
 * - Clip length = ticks until next onset (not 1 bar per chord)
 *
 * Fail-soft: returns Result — never throws for bad user input.
 */

import { z } from "zod";
import {
  AkordClipSchema,
  TekstClipSchema,
  type AkordClip,
  type TekstClip,
} from "./schema.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "./time.js";

const UgImportPayloadSchema = z.object({
  tekst: z.object({ clips: z.array(TekstClipSchema) }),
  akordy: z.object({ clips: z.array(AkordClipSchema) }),
});

export type UgImportOk = {
  ok: true;
  tekst: { clips: TekstClip[] };
  akordy: { clips: AkordClip[] };
};

export type UgImportErr = {
  ok: false;
  message: string;
};

export type UgImportResult = UgImportOk | UgImportErr;

export type UgImportOptions = {
  ppq?: number;
  meter?: TimeSignature;
  /** Content floor (usually end of Countdown = 0). */
  contentFloorTicks?: number;
  idPrefix?: string;
  /** Bars of timeline per lyric line (legacy ugBarsPerLine, default 1). */
  barsPerLine?: number;
};

const CHORD_TOKEN =
  /^[A-G](?:#|b)?(?:maj|min|m|sus|dim|aug|add)?[0-9]*(?:(?:#|b)(?:5|9|11|13))*(?:\/[A-G](?:#|b)?)?$/i;

function stripBracketChords(line: string): string {
  return line.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function extractBracketChords(line: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const raw = m[1]!.trim();
    if (raw && CHORD_TOKEN.test(raw)) out.push(raw);
  }
  return out;
}

function isChordOnlyLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => CHORD_TOKEN.test(t));
}

function parseChordOnlyLine(line: string): string[] {
  return line.split(/\s+/).filter((t) => CHORD_TOKEN.test(t));
}

function dedupeConsecutive(chords: string[]): string[] {
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
): { clips: AkordClip[]; nextSeq: number } {
  const clips: AkordClip[] = [];
  let seq = seqStart;
  for (let i = 0; i < symbols.length; i++) {
    const start = onsets[i]!;
    const end = i + 1 < onsets.length ? onsets[i + 1]! : spanEnd;
    clips.push({
      id: `${idPrefix}-akord-${++seq}`,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
      symbol: symbols[i]!,
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
    const end =
      i + 1 < sorted.length ? sorted[i + 1]!.startTicks : fallbackEnd;
    return {
      ...c,
      lengthTicks: Math.max(1, end - c.startTicks),
    };
  });
}

/**
 * Parse UG-style / ChordPro-lite text into Tekst + Akordy clips.
 * Empty / garbage → `{ ok: false, message }` (Polish).
 */
export function importUgText(
  text: string,
  options: UgImportOptions = {},
): UgImportResult {
  try {
    if (typeof text !== "string") {
      return { ok: false, message: "Nieprawidłowy tekst UG." };
    }
    const raw = text.replace(/\r\n/g, "\n").trim();
    if (!raw) {
      return { ok: false, message: "Pusty tekst — wklej tabulaturę UG lub ChordPro." };
    }

    // eslint-disable-next-line no-control-regex -- intentional binary sniff
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(raw)) {
      return {
        ok: false,
        message: "Tekst zawiera niedozwolone znaki sterujące.",
      };
    }

    const ppq = options.ppq ?? DEFAULT_PPQ;
    const meter = options.meter ?? { numerator: 4, denominator: 4 };
    const barTicks = ticksPerBar(meter, ppq);
    const beatsPerBar = Math.max(1, meter.numerator);
    const ticksPerBeat = Math.max(1, Math.floor(barTicks / beatsPerBar));
    const barsPerLine = Math.max(1, Math.trunc(options.barsPerLine ?? 1));
    const lineTicks = barTicks * barsPerLine;
    const floor = options.contentFloorTicks ?? 0;
    const prefix = options.idPrefix ?? "ug";

    const tekstClips: TekstClip[] = [];
    const akordClips: AkordClip[] = [];
    let cursor = floor;
    let seq = 0;
    let pendingChords: string[] = [];
    let sawContent = false;

    const flushChordsAtCursor = (symbols: string[]) => {
      const list = dedupeConsecutive(symbols);
      if (!list.length) return;
      const spanStart = cursor;
      const spanEnd = cursor + lineTicks;
      // Place chord onsets in the **first** bar of the line span (legacy).
      const onsets = chordOnsetsInBar(
        list.length,
        spanStart,
        barTicks,
        beatsPerBar,
        ticksPerBeat,
      );
      const placed = clipsFromOnsets(list, onsets, spanEnd, prefix, seq);
      seq = placed.nextSeq;
      akordClips.push(...placed.clips);
      cursor = spanEnd;
    };

    const lines = raw.split("\n");
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      if (line.startsWith("{") && line.endsWith("}")) continue;
      if (/^\[[^\]]+\]$/.test(line) && !extractBracketChords(line).length) {
        continue;
      }

      const bracketChords = extractBracketChords(line);
      const lyric = stripBracketChords(line);

      if (bracketChords.length && lyric) {
        sawContent = true;
        const chords = dedupeConsecutive([...pendingChords, ...bracketChords]);
        pendingChords = [];
        const lineStart = cursor;
        if (chords.length) {
          flushChordsAtCursor(chords);
        } else {
          cursor += lineTicks;
        }
        tekstClips.push({
          id: `${prefix}-tekst-${++seq}`,
          startTicks: lineStart,
          lengthTicks: lineTicks,
          text: lyric,
        });
        continue;
      }

      if (bracketChords.length && !lyric) {
        pendingChords.push(...bracketChords);
        continue;
      }

      if (isChordOnlyLine(line)) {
        pendingChords.push(...parseChordOnlyLine(line));
        continue;
      }

      if (lyric) {
        sawContent = true;
        const chords = pendingChords.length
          ? dedupeConsecutive(pendingChords)
          : [];
        pendingChords = [];
        const lineStart = cursor;
        if (chords.length) {
          flushChordsAtCursor(chords);
        } else {
          cursor += lineTicks;
        }
        tekstClips.push({
          id: `${prefix}-tekst-${++seq}`,
          startTicks: lineStart,
          lengthTicks: lineTicks,
          text: lyric,
        });
      }
    }

    if (pendingChords.length) {
      sawContent = true;
      flushChordsAtCursor(pendingChords);
      pendingChords = [];
    }

    if (!sawContent || (tekstClips.length === 0 && akordClips.length === 0)) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    const sealed = sealAkordyLengths(akordClips);

    const payload = UgImportPayloadSchema.safeParse({
      tekst: { clips: tekstClips },
      akordy: { clips: sealed },
    });
    if (!payload.success) {
      return {
        ok: false,
        message: "Sparsowany UG nie przeszedł walidacji schematu.",
      };
    }

    return {
      ok: true,
      tekst: payload.data.tekst,
      akordy: payload.data.akordy,
    };
  } catch {
    return {
      ok: false,
      message: "Nie udało się sparsować tekstu UG.",
    };
  }
}
