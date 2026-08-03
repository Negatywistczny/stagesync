/**
 * UltraStar / USDX import → Tekst line clips (ticks) + syllable blocks + melody
 * (V6).
 *
 * Timing (ING-06 / ADR 0002 / USDX format):
 * - Wall clock (USDX): `t_ms = GAP + beat × 60000 / (BPM_header × 4)`.
 * - Authors usually write `#BPM` ≈ 4× musical quarter BPM (e.g. 369.2 → 92.3).
 * - File metronome = header / 4. Optional editorial **grid BPM** may differ.
 * - Placement is always wall-clock → ticks at place BPM:
 *   `ticks = secondsToTicks(t_ms/1000, single-event tempo map @ placeBpm)`.
 *   Same place BPM for tekst + project tempo keeps lyrics coherent with MP3.
 *   Beat-locking US beats onto a foreign grid BPM is forbidden — it splits
 *   vocals from audio (~6+ bars drift mid-song).
 * - Storage is integer ticks only (never ms).
 * - Note `startBeat` values are absolute from beat 0 (not phrase-relative),
 *   unless `#RELATIVE:yes` (unsupported — treat as absolute).
 *
 * Word boundaries: trailing **or** leading whitespace closes / opens a word
 * (USDX treats both as equivalent). Do not `.trim()` before that check.
 * Melisma marker `~` continues the previous syllable (pitch change) — strip
 * for display / line text; keep surrounding spaces for word ends.
 *
 * Timeline: one Tekst clip per UltraStar phrase (line between `-`); blocks are
 * syllables. Forma is **not** rewritten from lyrics (tekst stays on Tekst lane).
 *
 * Fail-soft: returns Result — never throws for bad user input.
 */

import {
  MelodyNoteClipSchema,
  TekstClipSchema,
  type MelodyNoteClip,
  type Project,
  type TekstBlock,
  type TekstBlockRole,
  type TekstClip,
} from "./schema.js";
import { secondsToTicks } from "./tempo-map.js";
import { DEFAULT_PPQ, type TimeSignature } from "./time.js";

export type UltrastarImportOk = {
  ok: true;
  title: string | null;
  artist: string | null;
  /**
   * BPM used for tick placement (editorial grid BPM when overridden;
   * otherwise UltraStar metronome = header/4).
   */
  metronomeBpm: number;
  /** Raw UltraStar #BPM (×4). */
  ultrastarBpm: number;
  /** Metronome BPM implied by the file alone (header/4) — before grid override. */
  ultrastarMetronomeBpm: number;
  gapMs: number;
  /** Wall-clock ms of the first note onset (GAP + beat₀). */
  firstVocalMs: number;
  tekst: { clips: TekstClip[] };
  melody: { clips: MelodyNoteClip[] };
  noteCount: number;
  syllableCount: number;
  wordCount: number;
};

export type UltrastarImportErr = {
  ok: false;
  message: string;
};

export type UltrastarImportResult = UltrastarImportOk | UltrastarImportErr;

export type UltrastarImportOptions = {
  ppq?: number;
  meter?: TimeSignature;
  /** Content floor (usually 0). */
  contentFloorTicks?: number;
  idPrefix?: string;
  /**
   * Editorial grid BPM for ms→ticks (pipe lock / PO approximation).
   * Default = UltraStar metronome (header/4).
   */
  gridBpm?: number;
};

type NoteKind = "regular" | "golden" | "rap" | "goldenRap" | "freestyle";

type RawNote = {
  kind: NoteKind;
  startBeat: number;
  lengthBeat: number;
  pitch: number;
  /** Raw lyric — trailing spaces mark word boundaries (UltraStar). */
  text: string;
  role?: TekstBlockRole;
};

/** One timed syllable after word-boundary analysis. */
export type UltrastarSyllable = {
  text: string;
  /** True when the raw lyric ended with whitespace (closes the word). */
  endsWord: boolean;
  startBeat: number;
  lengthBeat: number;
  pitch: number;
  role?: TekstBlockRole;
};

/** Word = one or more syllables until a trailing-space boundary. */
export type UltrastarWord = {
  text: string;
  syllables: UltrastarSyllable[];
};

const NOTE_KIND: Record<string, NoteKind> = {
  ":": "regular",
  "*": "golden",
  R: "rap",
  G: "goldenRap",
  F: "freestyle",
};

function parseHeaderValue(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  // `#P1` / `#P2` (no colon) — duet player switch
  const playerOnly = /^#(P[12])$/i.exec(trimmed);
  if (playerOnly) {
    return { key: (playerOnly[1] ?? "").toUpperCase(), value: "" };
  }
  const m = /^#([A-Za-z0-9]+):(.*)$/.exec(trimmed);
  if (!m) return null;
  return { key: (m[1] ?? "").toUpperCase(), value: (m[2] ?? "").trim() };
}

function playerToRole(player: number | null): TekstBlockRole | undefined {
  if (player === 1) return "vocal_1";
  if (player === 2) return "vocal_2";
  return undefined;
}

/**
 * Metronome (quarter) BPM from UltraStar `#BPM` header (×4).
 */
export function ultrastarHeaderBpmToMetronome(headerBpm: number): number {
  if (!Number.isFinite(headerBpm) || headerBpm <= 0) {
    throw new RangeError("UltraStar #BPM must be finite > 0");
  }
  return headerBpm / 4;
}

/**
 * USDX wall-clock ms: `GAP + beat × 60000 / (BPM_header × 4)`.
 */
export function ultrastarBeatToMs(
  beat: number,
  gapMs: number,
  headerBpm: number,
): number {
  if (!Number.isFinite(headerBpm) || headerBpm <= 0) {
    throw new RangeError("UltraStar #BPM must be finite > 0");
  }
  return gapMs + (beat * 60_000) / (headerBpm * 4);
}

/**
 * Ticks spanned by one UltraStar beat at the *file* metronome (header/4).
 * Prefer {@link ultrastarBeatToMs} + `secondsToTicks` when placing on an
 * editorial grid BPM that differs from the file metronome.
 */
export function ticksPerUltrastarBeat(ppq: number = DEFAULT_PPQ): number {
  return ppq / 16;
}

export function ultrastarBeatToTicks(
  beat: number,
  gapTicks: number,
  ppq: number = DEFAULT_PPQ,
): number {
  return gapTicks + Math.round(beat * ticksPerUltrastarBeat(ppq));
}

/**
 * Suggest editorial grid BPM so the first vocal lands ~`pipeBarCount + pickup`
 * bars from 0 (pickup in the bar after the pipe grid; Verse on the next line).
 * Returns null when inputs are unusable.
 */
export function suggestGridBpmFromPipeAndFirstVocal(opts: {
  pipeBarCount: number;
  firstVocalMs: number;
  meter?: TimeSignature;
  /** Extra bars after pipe for a typical anacrusis (default 0.5). */
  pickupBars?: number;
}): number | null {
  const { pipeBarCount, firstVocalMs } = opts;
  if (
    !Number.isFinite(pipeBarCount) ||
    pipeBarCount < 1 ||
    !Number.isFinite(firstVocalMs) ||
    firstVocalMs <= 0
  ) {
    return null;
  }
  const meter = opts.meter ?? { numerator: 4, denominator: 4 };
  const pickup = opts.pickupBars ?? 0.5;
  const targetBars = pipeBarCount + pickup;
  const quartersPerBar = (meter.numerator * 4) / meter.denominator;
  const seconds = firstVocalMs / 1000;
  const bpm = (targetBars * quartersPerBar * 60) / seconds;
  if (!Number.isFinite(bpm) || bpm < 40 || bpm > 300) return null;
  return Math.round(bpm * 100) / 100;
}

/**
 * Strip UltraStar melisma `~` but keep surrounding whitespace so word-boundary
 * checks still see trailing / leading spaces (`~ ` → ends word).
 */
export function stripUltrastarMelisma(rawLyric: string): string {
  return rawLyric.replace(/~/g, "");
}

/** UltraStar: trailing whitespace on a syllable closes the word. */
export function ultrastarLyricEndsWord(rawLyric: string): boolean {
  return /\s$/.test(stripUltrastarMelisma(rawLyric));
}

/** Leading whitespace starts a new word (USDX equivalent of trailing space). */
export function ultrastarLyricStartsWord(rawLyric: string): boolean {
  return /^\s/.test(stripUltrastarMelisma(rawLyric));
}

/**
 * Syllable display text — drop melisma `~`, then strip edge whitespace
 * (call only after boundary checks on the raw lyric).
 */
export function ultrastarSyllableDisplayText(rawLyric: string): string {
  return stripUltrastarMelisma(rawLyric).replace(/^\s+/, "").replace(/\s+$/, "");
}

/**
 * Group raw note lyrics into words using UltraStar space boundaries
 * (trailing and/or leading). Does **not** trim before deciding word ends.
 * Melisma `~` is empty content and stays inside the current word.
 */
export function groupUltrastarSyllablesIntoWords(
  notes: readonly { text: string; startBeat: number; lengthBeat: number; pitch: number; role?: TekstBlockRole }[],
): UltrastarWord[] {
  const words: UltrastarWord[] = [];
  let current: UltrastarSyllable[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const text = current.map((s) => s.text).join("");
    if (text.length > 0) {
      words.push({ text, syllables: current });
    }
    current = [];
  };

  for (const n of notes) {
    const startsWord = ultrastarLyricStartsWord(n.text);
    const endsWord = ultrastarLyricEndsWord(n.text);
    const display = ultrastarSyllableDisplayText(n.text);
    if (startsWord) flush();
    if (display.length === 0 && !endsWord) continue;
    if (display.length === 0 && endsWord) {
      // Lone space / `~ ` marker — close previous word if any.
      flush();
      continue;
    }
    current.push({
      text: display,
      endsWord,
      startBeat: n.startBeat,
      lengthBeat: n.lengthBeat,
      pitch: n.pitch,
      ...(n.role ? { role: n.role } : {}),
    });
    if (endsWord) flush();
  }
  flush();
  return words;
}

/**
 * Build readable line text from raw syllables (melisma `~` removed; word gaps
 * from spaces preserved; collapse runs of spaces).
 */
export function ultrastarLineTextFromRawLyrics(
  rawLyrics: readonly string[],
): string {
  return rawLyrics
    .map(stripUltrastarMelisma)
    .join("")
    .replace(/[^\S\n]+/g, " ")
    .replace(/^\s+/, "")
    .replace(/\s+$/, "");
}

/**
 * Parse a note line. Lyric is everything after pitch — **trailing spaces kept**.
 * Input should be trimStart'd but not trimEnd'd.
 */
export function parseUltrastarNoteLine(
  line: string,
): Omit<RawNote, "role"> | null {
  const src = line.trimStart();
  if (!src) return null;
  const kind = NOTE_KIND[src[0] ?? ""];
  if (!kind) return null;

  // kind + start + length + pitch + optional lyric (greedy remainder, spaces kept)
  const m =
    /^([:*RGF])\s+(\S+)\s+(\S+)\s+(\S+)(?: (.*))?$/.exec(src);
  if (!m) return null;

  const startBeat = Number((m[2] ?? "").replace(",", "."));
  const lengthBeat = Number((m[3] ?? "").replace(",", "."));
  const pitch = Number((m[4] ?? "").replace(",", "."));
  const text = m[5] ?? "";
  if (
    !Number.isFinite(startBeat) ||
    !Number.isFinite(lengthBeat) ||
    lengthBeat <= 0 ||
    !Number.isFinite(pitch)
  ) {
    return null;
  }
  return { kind, startBeat, lengthBeat, pitch, text };
}

/**
 * Parse UltraStar / USDX text into V6 tekst clips (line + syllable blocks),
 * melody, and Forma section spans.
 */
export function importUltrastarText(
  raw: string,
  options: UltrastarImportOptions = {},
): UltrastarImportResult {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.trim()) {
    return { ok: false, message: "Pusty tekst UltraStar." };
  }

  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter = options.meter ?? { numerator: 4, denominator: 4 };
  const floor = options.contentFloorTicks ?? 0;
  const prefix = options.idPrefix ?? "us";

  let title: string | null = null;
  let artist: string | null = null;
  let headerBpm: number | null = null;
  let gapMs = 0;
  let player: number | null = null;

  const notes: RawNote[] = [];
  /** Phrases: arrays of note indices; `-` starts a new phrase. */
  const phrases: number[][] = [[]];

  const lines = text.split("\n");
  for (const lineRaw of lines) {
    // Keep trailing spaces on note lyrics — only strip CR.
    const line = lineRaw.replace(/\r$/, "");
    const trimmed = line.trim();
    if (!trimmed) continue;

    const header = parseHeaderValue(trimmed);
    if (header) {
      switch (header.key) {
        case "TITLE":
          title = header.value || null;
          break;
        case "ARTIST":
          artist = header.value || null;
          break;
        case "BPM": {
          const n = Number(header.value.replace(",", "."));
          if (!Number.isFinite(n) || n <= 0) {
            return { ok: false, message: "Nieprawidłowy #BPM w UltraStar." };
          }
          headerBpm = n;
          break;
        }
        case "GAP": {
          const n = Number(header.value.replace(",", "."));
          if (!Number.isFinite(n) || n < 0) {
            return { ok: false, message: "Nieprawidłowy #GAP w UltraStar." };
          }
          gapMs = n;
          break;
        }
        case "P":
        case "P1":
          player = 1;
          break;
        case "P2":
          player = 2;
          break;
        default:
          break;
      }
      continue;
    }

    if (/^P\s*1$/i.test(trimmed)) {
      player = 1;
      continue;
    }
    if (/^P\s*2$/i.test(trimmed)) {
      player = 2;
      continue;
    }

    if (trimmed === "E" || trimmed.startsWith("E ")) break;

    if (trimmed === "-" || trimmed.startsWith("- ")) {
      const last = phrases[phrases.length - 1];
      if (last && last.length > 0) phrases.push([]);
      continue;
    }

    const parsed = parseUltrastarNoteLine(line);
    if (!parsed) {
      if (NOTE_KIND[trimmed[0] ?? ""]) {
        return {
          ok: false,
          message: `Nieprawidłowa nuta UltraStar: ${trimmed.slice(0, 40)}`,
        };
      }
      continue;
    }

    const idx = notes.length;
    notes.push({
      ...parsed,
      role: playerToRole(player),
    });
    const phrase = phrases[phrases.length - 1];
    if (phrase) phrase.push(idx);
  }

  if (headerBpm == null) {
    return { ok: false, message: "Brak nagłówka #BPM w UltraStar." };
  }
  if (notes.length === 0) {
    return { ok: false, message: "Brak nut w pliku UltraStar." };
  }

  const ultrastarMetronomeBpm = ultrastarHeaderBpmToMetronome(headerBpm);
  const placeBpm =
    options.gridBpm != null &&
    Number.isFinite(options.gridBpm) &&
    options.gridBpm > 0
      ? options.gridBpm
      : ultrastarMetronomeBpm;

  const firstVocalMs = ultrastarBeatToMs(notes[0]!.startBeat, gapMs, headerBpm);

  const placeTempoMap = [{ startTicks: 0, bpm: placeBpm }];
  const msToTicksSafe = (ms: number): number | null => {
    try {
      return secondsToTicks(ms / 1000, placeTempoMap, placeBpm, meter, ppq);
    } catch {
      return null;
    }
  };

  const melody: MelodyNoteClip[] = [];
  const tekstClips: TekstClip[] = [];
  let syllableCount = 0;
  let wordCount = 0;
  let clipSeq = 0;

  for (const phraseIdxs of phrases) {
    if (phraseIdxs.length === 0) continue;

    const phraseNotes = phraseIdxs.map((i) => notes[i]!);
    const words = groupUltrastarSyllablesIntoWords(phraseNotes);
    wordCount += words.length;

    const blocks: TekstBlock[] = [];
    let blockSeq = 0;

    for (const n of phraseNotes) {
      const startMs = ultrastarBeatToMs(n.startBeat, gapMs, headerBpm);
      const endMs = ultrastarBeatToMs(
        n.startBeat + n.lengthBeat,
        gapMs,
        headerBpm,
      );
      const startRaw = msToTicksSafe(startMs);
      const endRaw = msToTicksSafe(endMs);
      if (startRaw == null || endRaw == null) {
        return {
          ok: false,
          message: "Nie można przeliczyć nut UltraStar na ticki.",
        };
      }
      const startTicks = startRaw + floor;
      const endTicks = endRaw + floor;
      const lengthTicks = Math.max(1, endTicks - startTicks);
      const pitchMidi = Math.min(127, Math.max(0, Math.round(n.pitch) + 60));

      melody.push({
        id: `${prefix}-mel-${melody.length + 1}`,
        startTicks,
        lengthTicks,
        pitchMidi,
      });

      const sylText = ultrastarSyllableDisplayText(n.text);
      const endsWord = ultrastarLyricEndsWord(n.text);
      const startsWord = ultrastarLyricStartsWord(n.text);

      // Leading space = new word: close previous block with a trailing space.
      if (startsWord && blocks.length > 0) {
        const prev = blocks[blocks.length - 1]!;
        if (!/\s$/.test(prev.text)) {
          blocks[blocks.length - 1] = { ...prev, text: `${prev.text} ` };
        }
      }

      if (sylText.length === 0) {
        // Lone `~ ` / space marker — attach word gap to the previous syllable.
        if (endsWord && blocks.length > 0) {
          const prev = blocks[blocks.length - 1]!;
          if (!/\s$/.test(prev.text)) {
            blocks[blocks.length - 1] = { ...prev, text: `${prev.text} ` };
          }
        }
        continue;
      }

      syllableCount += 1;
      const block: TekstBlock = {
        id: `${prefix}-clip-${clipSeq + 1}-block-${blockSeq++}`,
        startTicks,
        lengthTicks,
        // Keep trailing space on word-ending syllables so Client spans do not glue.
        text: endsWord ? `${sylText} ` : sylText,
      };
      if (n.role) block.role = n.role;
      blocks.push(block);
    }

    if (blocks.length === 0) continue;

    const clipStart = blocks[0]!.startTicks;
    const last = blocks[blocks.length - 1]!;
    const clipEnd = last.startTicks + last.lengthTicks;
    const lineText = ultrastarLineTextFromRawLyrics(
      phraseNotes.map((n) => n.text),
    );

    tekstClips.push({
      id: `${prefix}-tekst-${++clipSeq}`,
      startTicks: clipStart,
      lengthTicks: Math.max(1, clipEnd - clipStart),
      text: lineText.slice(0, 2000),
      blocks,
    });
  }

  if (tekstClips.length === 0) {
    return {
      ok: false,
      message: "UltraStar nie zawiera sylab tekstowych (same nuty bez lyrics).",
    };
  }

  const payload = {
    tekst: { clips: tekstClips },
    melody: { clips: melody },
  };

  try {
    for (const c of payload.tekst.clips) TekstClipSchema.parse(c);
    for (const m of payload.melody.clips) MelodyNoteClipSchema.parse(m);
  } catch {
    return {
      ok: false,
      message: "Wynik importu UltraStar nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    title,
    artist,
    metronomeBpm: placeBpm,
    ultrastarBpm: headerBpm,
    ultrastarMetronomeBpm,
    gapMs,
    firstVocalMs,
    tekst: payload.tekst,
    melody: payload.melody,
    noteCount: notes.length,
    syllableCount,
    wordCount,
  };
}

export type ApplyUltrastarOptions = {
  /** When true (default), set project.defaultBpm from metronome BPM. */
  applyBpm?: boolean;
};

/**
 * Sync project tempo with imported metronome BPM: set `defaultBpm` and ensure
 * a tempo-map event at tick 0 carries that BPM (do not leave a stale 120 map).
 */
export function tempoMapWithImportedBpm(
  tempoMap: Project["tempoMap"],
  bpm: number,
): Project["tempoMap"] {
  const atZero = tempoMap.findIndex((e) => e.startTicks === 0);
  if (atZero >= 0) {
    return tempoMap.map((e, i) => (i === atZero ? { ...e, bpm } : e));
  }
  if (tempoMap.length === 0) {
    return [{ id: "us-tempo-0", startTicks: 0, bpm }];
  }
  return [{ id: "us-tempo-0", startTicks: 0, bpm }, ...tempoMap];
}

/**
 * Replace tekst + melody lanes. Keeps forma / akordy / audio / cue.
 * Lyrics must not become Forma section names.
 * When applyBpm (default), updates defaultBpm **and** tempoMap @ tick 0 so
 * GAP/tick placement matches transport (resolveTempoAt reads tempoMap first).
 */
export function applyUltrastarImportToProject(
  project: Project,
  imported: UltrastarImportOk,
  options: ApplyUltrastarOptions = {},
): Project {
  const applyBpm = options.applyBpm !== false;
  return {
    ...project,
    ...(applyBpm
      ? {
          defaultBpm: imported.metronomeBpm,
          tempoMap: tempoMapWithImportedBpm(
            project.tempoMap,
            imported.metronomeBpm,
          ),
        }
      : {}),
    ...(imported.title?.trim()
      ? { name: imported.title.trim().slice(0, 200) }
      : {}),
    ...(imported.artist?.trim()
      ? { artist: imported.artist.trim().slice(0, 200) }
      : {}),
    tekst: imported.tekst,
    melody: imported.melody,
  };
}
