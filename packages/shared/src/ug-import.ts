/**
 * Ultimate Guitar / ChordPro-lite import → Forma sections + Tekst + Akordy (V6).
 *
 * Parity with legacy line timing:
 * - Chord line + lyric line = **barsPerLine** bars (default 1), chords in first bar
 * - Clip length = ticks until next onset (not 1 bar per chord)
 * - Each tekst line gets one whole-line block (Content Model).
 *
 * Sections: blank lines and Verse/Chorus-style headers → Forma music clips.
 * Fail-soft: returns Result — never throws for bad user input.
 */

import { z } from "zod";
import { toLiteralStorage } from "./chord-display.js";
import { withWholeLineTekstBlocks } from "./project-seed.js";
import { cleanUgTabContent } from "./ug-content.js";
import {
  AkordClipSchema,
  FormaClipSchema,
  TekstClipSchema,
  type AkordClip,
  type FormaClip,
  type Project,
  type TekstClip,
} from "./schema.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "./time.js";

const UgImportPayloadSchema = z.object({
  tekst: z.object({ clips: z.array(TekstClipSchema) }),
  akordy: z.object({ clips: z.array(AkordClipSchema) }),
  formaMusic: z.object({ clips: z.array(FormaClipSchema) }),
});

export type UgSectionPreview = {
  name: string;
  lyricLines: number;
  chordCount: number;
  estimatedBars: number;
};

export type UgImportOk = {
  ok: true;
  tekst: { clips: TekstClip[] };
  akordy: { clips: AkordClip[] };
  /** Music Forma sections only (no countdown). */
  formaMusic: { clips: FormaClip[] };
  sections: UgSectionPreview[];
  barsPerLine: number;
};

export type UgImportErr = {
  ok: false;
  /** Operator-facing reason (empty input, parse failure, validation). */
  message: string;
};

/**
 * Discriminated result of Ultimate Guitar / ChordPro-lite import.
 * Success carries Forma + Tekst + Akordy ready to merge into a Project;
 * failure never throws — use `message` for UI.
 */
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

/**
 * Pitch letter A–G plus Polish H (= B).
 * Allows sus2/4, parenthetical alterations, alt — then `toLiteralStorage` canonicalizes.
 */
const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]+\))?(?:\/[A-H](?:#|b)?)?$/i;

const SECTION_BRACKET =
  /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-?Chorus|Solo|Instrumental|Interlude|Tag|Ending|Hook|Refrain|Coda|Break|Prechorus)(?:\s*\d*)?\]$/i;

/**
 * Polish H → Western B for storage (transpose / Client hybridPolishB).
 * Root and slash-bass pitch letters only (first char of each side).
 * Prefer `toLiteralStorage` at write edges — kept for direct callers / tests.
 */
export function canonicalizePolishH(symbol: string): string {
  return toLiteralStorage(symbol);
}

function acceptChordToken(raw: string): string | null {
  const t = raw.trim();
  if (!t || !CHORD_TOKEN.test(t)) return null;
  return toLiteralStorage(t);
}

function stripBracketChords(line: string): string {
  return line.replace(/\[[^\]]*\]/g, "").replace(/\s+/g, " ").trim();
}

function extractBracketChords(line: string): string[] {
  const out: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const accepted = acceptChordToken(m[1] ?? "");
    if (accepted) out.push(accepted);
  }
  return out;
}

function isChordOnlyLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) => CHORD_TOKEN.test(t));
}

function parseChordOnlyLine(line: string): string[] {
  return line
    .split(/\s+/)
    .map((t) => acceptChordToken(t))
    .filter((t): t is string => t != null);
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
    const end =
      i + 1 < sorted.length ? sorted[i + 1]!.startTicks : fallbackEnd;
    return {
      ...c,
      lengthTicks: Math.max(1, end - c.startTicks),
    };
  });
}

type RawSection = { name: string | null; lines: string[] };

function parseSectionHeader(line: string): string | null {
  const bracket = line.match(SECTION_BRACKET);
  if (bracket?.[1]) {
    return bracket[1].replace(/prechorus/i, "Pre-Chorus");
  }
  if (/^\[[^\]]+\]$/.test(line) && !extractBracketChords(line).length) {
    const inner = line.slice(1, -1).trim();
    if (inner && !CHORD_TOKEN.test(inner)) return inner.slice(0, 120);
  }
  const meta = line.match(/^\{(?:comment|c)\s*:\s*(.+)\}$/i);
  if (meta?.[1]) return meta[1].trim().slice(0, 120);
  const startOf = line.match(/^\{start_of_([a-z_]+)(?:\s*:\s*(.+))?\}$/i);
  if (startOf?.[1]) {
    const kind = startOf[1].replace(/_/g, " ");
    const label = startOf[2]?.trim();
    const title = label || kind.replace(/\b\w/g, (c) => c.toUpperCase());
    return title.slice(0, 120);
  }
  return null;
}

function isSkipMetaDirective(line: string): boolean {
  if (!(line.startsWith("{") && line.endsWith("}"))) return false;
  if (parseSectionHeader(line)) return false;
  return true;
}

/** Split raw text into named section buckets (blank line / headers). */
export function splitUgSections(raw: string): RawSection[] {
  const out: RawSection[] = [];
  let current: RawSection = { name: null, lines: [] };

  const flush = () => {
    if (current.lines.length > 0 || current.name) {
      out.push(current);
    }
    current = { name: null, lines: [] };
  };

  for (const lineRaw of raw.split("\n")) {
    const line = lineRaw.trim();
    if (!line) {
      if (current.lines.length > 0 || current.name) flush();
      continue;
    }
    if (isSkipMetaDirective(line)) continue;
    const header = parseSectionHeader(line);
    if (header) {
      if (current.lines.length > 0 || current.name) flush();
      current = { name: header, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  flush();
  return out.filter((s) => s.lines.length > 0);
}

function defaultSectionName(index: number, named: string | null): string {
  const n = named?.trim();
  if (n) return n.slice(0, 120);
  return `Sekcja ${index + 1}`;
}

/**
 * Parse UG-style / ChordPro-lite text into Forma + Tekst + Akordy.
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
    const raw = cleanUgTabContent(text.replace(/\r\n/g, "\n"));
    if (!raw) {
      return {
        ok: false,
        message: "Pusty tekst — pobierz z UG, wklej link albo ChordPro.",
      };
    }
    if (raw.length > 524_288) {
      return {
        ok: false,
        message: "Tekst importu jest za długi (max 512 KB).",
      };
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

    const buckets = splitUgSections(raw);
    if (buckets.length === 0) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    const tekstClips: TekstClip[] = [];
    const akordClips: AkordClip[] = [];
    const formaClips: FormaClip[] = [];
    const sectionPreview: UgSectionPreview[] = [];
    let cursor = floor;
    let seq = 0;
    let sawContent = false;

    for (let si = 0; si < buckets.length; si++) {
      const bucket = buckets[si]!;
      const sectionName = defaultSectionName(si, bucket.name);
      const sectionStart = cursor;
      let pendingChords: string[] = [];
      let lyricLines = 0;
      let chordCount = 0;

      const flushChordsAtCursor = (
        symbols: string[],
        sourceLineId?: string,
      ) => {
        const list = dedupeConsecutive(symbols);
        if (!list.length) return;
        chordCount += list.length;
        const spanStart = cursor;
        const spanEnd = cursor + lineTicks;
        const onsets = chordOnsetsInBar(
          list.length,
          spanStart,
          barTicks,
          beatsPerBar,
          ticksPerBeat,
        );
        const placed = clipsFromOnsets(
          list,
          onsets,
          spanEnd,
          prefix,
          seq,
          sourceLineId,
        );
        seq = placed.nextSeq;
        akordClips.push(...placed.clips);
        cursor = spanEnd;
      };

      for (const line of bucket.lines) {
        const bracketChords = extractBracketChords(line);
        const lyric = stripBracketChords(line);

        if (bracketChords.length && lyric) {
          sawContent = true;
          lyricLines += 1;
          const chords = dedupeConsecutive([...pendingChords, ...bracketChords]);
          pendingChords = [];
          const lineStart = cursor;
          const tekstId = `${prefix}-tekst-${++seq}`;
          if (chords.length) {
            flushChordsAtCursor(chords, tekstId);
          } else {
            cursor += lineTicks;
          }
          tekstClips.push(
            withWholeLineTekstBlocks({
              id: tekstId,
              startTicks: lineStart,
              lengthTicks: lineTicks,
              text: lyric,
              sourceSection: sectionName,
            }),
          );
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
          lyricLines += 1;
          const chords = pendingChords.length
            ? dedupeConsecutive(pendingChords)
            : [];
          pendingChords = [];
          const lineStart = cursor;
          const tekstId = `${prefix}-tekst-${++seq}`;
          if (chords.length) {
            flushChordsAtCursor(chords, tekstId);
          } else {
            cursor += lineTicks;
          }
          tekstClips.push(
            withWholeLineTekstBlocks({
              id: tekstId,
              startTicks: lineStart,
              lengthTicks: lineTicks,
              text: lyric,
              sourceSection: sectionName,
            }),
          );
        }
      }

      if (pendingChords.length) {
        sawContent = true;
        flushChordsAtCursor(pendingChords);
        pendingChords = [];
      }

      if (cursor <= sectionStart) {
        continue;
      }
      formaClips.push({
        id: `${prefix}-forma-${si + 1}`,
        name: sectionName,
        startTicks: sectionStart,
        lengthTicks: Math.max(1, cursor - sectionStart),
        kind: "section",
      });
      sectionPreview.push({
        name: sectionName,
        lyricLines,
        chordCount,
        estimatedBars: Math.max(
          1,
          Math.round((cursor - sectionStart) / barTicks),
        ),
      });
    }

    if (!sawContent || (tekstClips.length === 0 && akordClips.length === 0)) {
      return {
        ok: false,
        message:
          "Nie rozpoznano akordów ani tekstu — sprawdź format UG / ChordPro.",
      };
    }

    if (formaClips.length === 0) {
      return {
        ok: false,
        message: "Nie udało się zbudować sekcji Formy z importu UG.",
      };
    }

    const sealed = sealAkordyLengths(akordClips);

    const payload = UgImportPayloadSchema.safeParse({
      tekst: { clips: tekstClips },
      akordy: { clips: sealed },
      formaMusic: { clips: formaClips },
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
      formaMusic: payload.data.formaMusic,
      sections: sectionPreview,
      barsPerLine,
    };
  } catch {
    return {
      ok: false,
      message: "Nie udało się sparsować tekstu UG.",
    };
  }
}

/**
 * Merge UG import into a Project: keep Countdown Forma clips; replace music
 * Forma sections + Tekst + Akordy.
 */
export function applyUgImportToProject(
  project: Project,
  imported: UgImportOk,
): Project {
  const countdown = project.forma.clips.filter((c) => c.kind === "countdown");
  return {
    ...project,
    forma: { clips: [...countdown, ...imported.formaMusic.clips] },
    tekst: imported.tekst,
    akordy: imported.akordy,
  };
}

/**
 * Rebuild Forma lengths from operator-edited bars-per-section and scale
 * Tekst/Akordy within each section onto the new spans (preview → apply).
 */
export function reflowUgImportSectionBars(
  imported: UgImportOk,
  sectionBars: number[],
  options: Pick<UgImportOptions, "ppq" | "meter" | "contentFloorTicks"> = {},
): UgImportResult {
  const n = imported.formaMusic.clips.length;
  if (sectionBars.length !== n || imported.sections.length !== n) {
    return {
      ok: false,
      message: "Liczba długości sekcji nie pasuje do podglądu Formy.",
    };
  }
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter = options.meter ?? { numerator: 4, denominator: 4 };
  const barTicks = ticksPerBar(meter, ppq);
  if (!Number.isFinite(barTicks) || barTicks <= 0) {
    return { ok: false, message: "Nieprawidłowe metrum przy reflow UG." };
  }
  const floor = options.contentFloorTicks ?? 0;

  const bars = sectionBars.map((b) => {
    const v = Math.trunc(Number(b));
    if (!Number.isFinite(v)) return 1;
    return Math.min(256, Math.max(1, v));
  });

  const oldClips = imported.formaMusic.clips;
  const newForma: FormaClip[] = [];
  let cursor = floor;
  for (let i = 0; i < n; i++) {
    const old = oldClips[i]!;
    const lengthTicks = bars[i]! * barTicks;
    newForma.push({
      ...old,
      startTicks: cursor,
      lengthTicks: Math.max(1, lengthTicks),
      kind: "section",
    });
    cursor += lengthTicks;
  }

  const mapClip = <T extends { startTicks: number; lengthTicks: number }>(
    clip: T,
  ): T => {
    for (let i = 0; i < n; i++) {
      const old = oldClips[i]!;
      const neu = newForma[i]!;
      const oldEnd = old.startTicks + old.lengthTicks;
      if (clip.startTicks < old.startTicks || clip.startTicks >= oldEnd) {
        continue;
      }
      const rel =
        old.lengthTicks > 0
          ? (clip.startTicks - old.startTicks) / old.lengthTicks
          : 0;
      const scale =
        old.lengthTicks > 0 ? neu.lengthTicks / old.lengthTicks : 1;
      return {
        ...clip,
        startTicks: neu.startTicks + Math.round(rel * neu.lengthTicks),
        lengthTicks: Math.max(1, Math.round(clip.lengthTicks * scale)),
      };
    }
    return clip;
  };

  const tekstClips = imported.tekst.clips.map((clip) => {
    const mapped = mapClip(clip);
    return withWholeLineTekstBlocks({
      id: mapped.id,
      startTicks: mapped.startTicks,
      lengthTicks: mapped.lengthTicks,
      text: mapped.text,
      ...(mapped.sourceSection != null
        ? { sourceSection: mapped.sourceSection }
        : {}),
    });
  });
  const akordClips = sealAkordyLengths(imported.akordy.clips.map(mapClip));
  const sections = imported.sections.map((s, i) => ({
    ...s,
    estimatedBars: bars[i]!,
  }));

  const payload = UgImportPayloadSchema.safeParse({
    tekst: { clips: tekstClips },
    akordy: { clips: akordClips },
    formaMusic: { clips: newForma },
  });
  if (!payload.success) {
    return {
      ok: false,
      message: "Reflow UG nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    tekst: payload.data.tekst,
    akordy: payload.data.akordy,
    formaMusic: payload.data.formaMusic,
    sections,
    barsPerLine: imported.barsPerLine,
  };
}
