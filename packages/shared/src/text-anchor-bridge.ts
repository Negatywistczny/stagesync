import { toLiteralStorage } from "./chord-display.js";
import {
  AkordClipSchema,
  FormaClipSchema,
  type AkordClip,
  type FormaClip,
  type MelodyNoteClip,
  type Project,
  type TekstClip,
  type TempoEvent,
} from "./schema.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "./time.js";
import {
  secondsToTicks,
  ticksToSeconds,
} from "./tempo-map.js";
import {
  runMultiPassTempoSolver,
  weightForTempoAnchorKind,
  pristineBarsFromMsSpan,
  type TempoSolverAnchor,
} from "./tempo-map-solver.js";
import {
  applyUltrastarImportToProject,
  importUltrastarText,
  suggestGridBpmFromPipeAndFirstVocal,
  type UltrastarImportOk,
} from "./ultrastar-import.js";
import { splitUgSections } from "./ug-import.js";
import { cleanUgTabContent } from "./ug-content.js";
import {
  findHarmonicAccentSyllable,
  syllablesInChordScope,
  type HarmonicSyllable,
} from "./harmonic-accent.js";
import {
  isUgPipeBarLine,
  parseUgPipeBars,
  quantizeTicksToBar,
  quantizeTicksToBarOrHalf,
  sectionStartFromVocalTicks,
  type UgPipeChordEvent,
} from "./ug-pipe-bars.js";

/**
 * Text-Anchor Bridging — Różdżka 2.0 + MultiPass TempoMap (final SSOT):
 *
 * 1. **Forma S3** — immutable walls from {@link runMultiPassTempoSolver}
 *    (pipe bars OR pristineBars from vocal ms @ seedBpm, floored by structural
 *    barOffsets / chord count). No preferTwoBarGrid; no offset compress.
 * 2. **Vocals** — UltraStar wall-clock remapped via solver TempoMap
 *    (`secondsToTicks`). `sourceSection` is align-first (UG↔US).
 * 3. **Chords** — vocal onsets on structural Beat 1/3 from phrase framing
 *    (US syllable ms only orients phrase bar counts + soft TempoMap).
 *    Pipe cells = 1 bar each; instrumental without pipe = even pristineBars
 *    grid. Lengths = next onset − current (last → Forma wall).
 * 4. **Seed / TempoMap** — Pass-1 / pipe; metro fallback ±15%; map uses
 *    **exact** BPM between Forma section walls (tekst↔MP3↔Forma lock). US
 *    syllable ms only orients phrase/Forma bar counts — not per-line BPM kinks.
 *
 * Storage stays integer ticks only (ADR 0002). Fail-soft Result — never throws
 * for ordinary user input.
 */
/** Below this align ratio, import is still allowed but marked approximate. */
export const TEXT_ANCHOR_WEAK_ALIGN = 0.55;

/** Default bars per UG chord change when section has no pipe grid. */
export const DEFAULT_BARS_PER_CHORD = 2;

/** Default bars per lyric line when section has no chords and no pipe. */
export const DEFAULT_BARS_PER_LINE = 1;

const CHORD_TOKEN =
  /^[A-H](?:#|b)?(?:maj|min|m|sus|dim|aug|add|alt)?[0-9]*(?:sus[0-9]*)?(?:\/[24])?(?:(?:#|b)(?:5|9|11|13))*(?:\([^)]+\))?(?:\/[A-H](?:#|b)?)?$/i;

export type TimedWord = {
  raw: string;
  norm: string;
  startTicks: number;
  endTicks: number;
};

export type UgBridgeWord = {
  sectionIndex: number;
  sectionName: string;
  raw: string;
  norm: string;
};

export type UgBridgeChord = {
  sectionIndex: number;
  symbol: string;
  /** Global UG word index this chord attaches to; null = section-level / instrumental. */
  ugWordIndex: number | null;
  orderInSection: number;
  /** UG chord-line index within the section (harmonic cell / phrase slot). */
  chordLineIndex: number;
  /** Indented / ChordPro chord → accent; left-aligned chord-only → 2-bar grid. */
  wordAligned: boolean;
};

export type TextAnchorBridgeOk = {
  ok: true;
  alignScore: number;
  approximate: boolean;
  warnings: string[];
  matchedWords: number;
  ugWordCount: number;
  usWordCount: number;
  title: string | null;
  artist: string | null;
  /** BPM used for tick placement and project tempo (editorial grid when set). */
  metronomeBpm: number;
  /** File metronome from UltraStar #BPM/4 (before grid override). */
  ultrastarMetronomeBpm: number;
  /**
   * Suggested editorial grid BPM from first pipe section + first vocal wall-clock.
   * Null when pipe/vocal inputs are unusable.
   */
  suggestedGridBpm: number | null;
  /** Sparse TempoMap from MultiPass solver (E2-pruned). */
  tempoMap: TempoEvent[];
  /** Seed / project default BPM from solver Pass 1. */
  seedBpm: number;
  tekst: UltrastarImportOk["tekst"];
  melody: UltrastarImportOk["melody"];
  formaMusic: { clips: FormaClip[] };
  akordy: { clips: AkordClip[] };
  sections: {
    name: string;
    startTicks: number;
    lengthTicks: number;
    chordCount: number;
    anchored: boolean;
  }[];
};

export type TextAnchorBridgeErr = {
  ok: false;
  message: string;
};

export type TextAnchorBridgeResult = TextAnchorBridgeOk | TextAnchorBridgeErr;

export type TextAnchorBridgeOptions = {
  ppq?: number;
  meter?: TimeSignature;
  contentFloorTicks?: number;
  idPrefix?: string;
  /** Override weak-align threshold (default TEXT_ANCHOR_WEAK_ALIGN). */
  weakAlignThreshold?: number;
  /**
   * Place BPM for UltraStar wall-clock → ticks (and project tempo).
   * When omitted, {@link bridgeUsUgFromTexts} uses the UltraStar file metronome
   * (`#BPM/4`). Pass an explicit value for a conscious editorial grid override
   * (suggested pipe+GAP BPM is informational only — never auto-applied).
   */
  gridBpm?: number;
};

function acceptChordToken(raw: string): string | null {
  const t = raw.trim();
  if (!t || !CHORD_TOKEN.test(t)) return null;
  return toLiteralStorage(t);
}

/**
 * Canonical token for alignment: lowercase, strip diacritics & punctuation.
 */
export function normalizeLyricToken(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Split lyric text into alignable word tokens (empty norms dropped). */
export function tokenizeLyrics(text: string): { raw: string; norm: string }[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9À-ž]+|[^a-zA-Z0-9À-ž]+$/g, ""))
    .filter(Boolean)
    .map((raw) => ({ raw, norm: normalizeLyricToken(raw) }))
    .filter((t) => t.norm.length > 0);
}

/**
 * Timed words from UltraStar tekst clips (block trailing spaces = word ends).
 */
export function timedWordsFromUltrastar(us: UltrastarImportOk): TimedWord[] {
  const out: TimedWord[] = [];
  for (const clip of us.tekst.clips) {
    const blocks = clip.blocks ?? [];
    if (blocks.length === 0) {
      for (const t of tokenizeLyrics(clip.text)) {
        out.push({
          raw: t.raw,
          norm: t.norm,
          startTicks: clip.startTicks,
          endTicks: clip.startTicks + clip.lengthTicks,
        });
      }
      continue;
    }

    let buf = "";
    let startTicks = blocks[0]!.startTicks;
    let endTicks = startTicks;
    let open = false;

    const flush = () => {
      const raw = buf.trim();
      const norm = normalizeLyricToken(raw);
      if (norm) {
        out.push({ raw, norm, startTicks, endTicks });
      }
      buf = "";
      open = false;
    };

    for (const b of blocks) {
      if (!open) {
        startTicks = b.startTicks;
        open = true;
      }
      endTicks = b.startTicks + b.lengthTicks;
      const endsWord = /\s$/.test(b.text);
      buf += b.text.replace(/\s+$/g, "");
      if (endsWord) flush();
    }
    if (open && buf.trim()) flush();
  }
  return out;
}

type UgSectionChord = {
  symbol: string;
  localWordIndex: number | null;
  /**
   * 0-based UG chord-line index within the section (chord-above row or ChordPro
   * lyric line). Sequential lines map 1:1 to US phrases / 2-bar harmonic cells.
   */
  chordLineIndex: number;
  /**
   * True when the UG chord line was indented / ChordPro-inline (word-aligned
   * accent). False for left-aligned chord-only rows → rigid bars-per-line grid.
   */
  wordAligned: boolean;
};

type UgSectionParsed = {
  name: string;
  words: { raw: string; norm: string }[];
  /** Chords attached to word index in this section (local), or null = no word. */
  chords: UgSectionChord[];
  /** Pipe-bar grid events (`| G | G B7 |`); empty when section has no pipe rows. */
  pipeEvents: UgPipeChordEvent[];
  pipeBarCount: number;
  /** Lyric lines that produced words (for barsPerLine length fallback). */
  lyricLineCount: number;
  /** Raw section lines (for pipe re-parse / debug). */
  lines: string[];
};

/** Immutable Forma container produced in pipeline step 1. */
export type SectionContainer = {
  readonly sectionIndex: number;
  readonly name: string;
  readonly startTicks: number;
  readonly lengthTicks: number;
  readonly endTicks: number;
  readonly anchored: boolean;
  readonly fromPipe: boolean;
  readonly lengthBars: number;
};

function defaultSectionName(index: number, named: string | null): string {
  const n = named?.trim();
  if (n) return n.slice(0, 120);
  return `Sekcja ${index + 1}`;
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

/**
 * ChordPro lyric line: chords attach to the following word.
 * Returns stripped lyric + chords with local word indices.
 */
export function parseChordProLyricLine(line: string): {
  lyric: string;
  chords: { symbol: string; wordIndex: number }[];
} {
  const chords: { symbol: string; wordIndex: number }[] = [];
  let lyric = "";
  let pending: string[] = [];
  let wordIndex = 0;
  const parts = line.split(/(\[[^\]]+\])/);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("[") && part.endsWith("]")) {
      const sym = acceptChordToken(part.slice(1, -1));
      if (sym) pending.push(sym);
      continue;
    }
    const chunks = part.split(/(\s+)/);
    for (const chunk of chunks) {
      if (!chunk) continue;
      if (/^\s+$/.test(chunk)) {
        lyric += chunk;
        continue;
      }
      if (pending.length > 0) {
        for (const sym of pending) {
          chords.push({ symbol: sym, wordIndex });
        }
        pending = [];
      }
      lyric += chunk;
      if (normalizeLyricToken(chunk)) wordIndex += 1;
    }
  }
  if (pending.length > 0) {
    // Trailing chord(s) with no following word → section-level.
    for (const sym of pending) {
      chords.push({ symbol: sym, wordIndex: -1 });
    }
  }
  return { lyric: lyric.replace(/\s+/g, " ").trim(), chords };
}

/**
 * True for Ultimate Guitar chrome that must not become lyrics / Formy:
 * transpose notes, beat grids, multi-header blurbs, empty bar repeats alone.
 */
export function isUgBridgeNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  // [Intro] / [Chorus] and [Bridge] — not a single section header
  if (/\[[^\]]+\]\s*\/\s*\[[^\]]+\]/.test(t)) return true;
  if (/^transpose\b/i.test(t)) return true;
  if (/\bcapo\b/i.test(t) && /\b(transpose|to)\b/i.test(t)) return true;
  // "1 + 2 + 3 + 4 +" counting grids
  const compact = t.replace(/\s+/g, " ");
  if (/^(\d+\s*\+\s*)+\d*\+?$/.test(compact)) return true;
  // Bare "%"" repeat marker
  if (t === "%") return true;
  return false;
}

/**
 * Parse UG / ChordPro into section-scoped words + chords for bridging.
 * Tolerates noisy UG: blank lines inside a section, transpose/capo preamble,
 * beat grids, and `| [G] | % |` chord bars (pipe grid → `pipeEvents`).
 */
export function parseUgBridgeSections(rawInput: string): UgSectionParsed[] {
  const raw = cleanUgTabContent(rawInput.replace(/\r\n/g, "\n"));
  if (!raw) return [];

  // Headers only — blank lines keep content in the same [Verse] / [Chorus].
  const buckets = splitUgSections(raw, { splitOnBlankLines: false });
  const sections: UgSectionParsed[] = [];

  for (let si = 0; si < buckets.length; si++) {
    const bucket = buckets[si]!;
    const name = defaultSectionName(si, bucket.name);
    const words: { raw: string; norm: string }[] = [];
    const chords: UgSectionChord[] = [];
    let pendingLineChords: string[] = [];
    /** Indent on the chord-only row that produced `pendingLineChords`. */
    let pendingWordAligned = false;
    const keptLines: string[] = [];
    let lyricLineCount = 0;
    let nextChordLineIndex = 0;

    const flushPendingAsSectionLevel = () => {
      if (!pendingLineChords.length) return;
      const lineIdx = nextChordLineIndex++;
      for (const sym of pendingLineChords) {
        chords.push({
          symbol: sym,
          localWordIndex: null,
          chordLineIndex: lineIdx,
          wordAligned: pendingWordAligned,
        });
      }
      pendingLineChords = [];
      pendingWordAligned = false;
    };

    const attachPendingToNextWords = (newWordStart: number, count: number) => {
      if (!pendingLineChords.length) return;
      if (count <= 0) {
        flushPendingAsSectionLevel();
        return;
      }
      const lineIdx = nextChordLineIndex++;
      const aligned = pendingWordAligned;
      const n = pendingLineChords.length;
      for (let i = 0; i < n; i++) {
        const wi =
          count === 1
            ? newWordStart
            : newWordStart + Math.min(count - 1, Math.floor((i * count) / n));
        chords.push({
          symbol: pendingLineChords[i]!,
          localWordIndex: wi,
          chordLineIndex: lineIdx,
          wordAligned: aligned || n > 1,
        });
      }
      pendingLineChords = [];
      pendingWordAligned = false;
    };

    for (const line of bucket.lines) {
      if (isUgBridgeNoiseLine(line)) continue;

      // Pipe-bar rows are the bar grid SSOT — do not flatten into pending chords.
      if (isUgPipeBarLine(line)) {
        flushPendingAsSectionLevel();
        keptLines.push(line);
        continue;
      }

      keptLines.push(line);

      if (line.includes("[")) {
        const { lyric, chords: lineChords } = parseChordProLyricLine(line);
        // Strip leftover bar junk from "| G |" lyrics after chord extract
        const cleanLyric = lyric
          .replace(/[|]+/g, " ")
          .replace(/%/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const toks = tokenizeLyrics(cleanLyric);
        const base = words.length;
        if (pendingLineChords.length) {
          attachPendingToNextWords(base, Math.max(1, toks.length));
        }
        if (toks.length > 0) lyricLineCount += 1;
        for (const t of toks) words.push(t);
        if (lineChords.length > 0) {
          const lineIdx = nextChordLineIndex++;
          for (const c of lineChords) {
            if (c.wordIndex < 0 || toks.length === 0) {
              chords.push({
                symbol: c.symbol,
                localWordIndex: null,
                chordLineIndex: lineIdx,
                wordAligned: true,
              });
            } else {
              chords.push({
                symbol: c.symbol,
                localWordIndex: base + Math.min(c.wordIndex, toks.length - 1),
                chordLineIndex: lineIdx,
                wordAligned: true,
              });
            }
          }
        }
        continue;
      }

      if (isChordOnlyLine(line)) {
        // Leading indent ⇒ chord is word-aligned (Chorus „    G”); flush any
        // prior left-aligned pending as its own line first when mixing styles.
        const indented = /^\s+\S/.test(line);
        if (pendingLineChords.length && indented !== pendingWordAligned) {
          // Shouldn't normally happen with alternating rows; keep pending style.
        }
        if (!pendingLineChords.length) pendingWordAligned = indented;
        else pendingWordAligned = pendingWordAligned || indented;
        pendingLineChords.push(...parseChordOnlyLine(line));
        continue;
      }

      const toks = tokenizeLyrics(line);
      if (toks.length === 0) continue;
      const base = words.length;
      if (pendingLineChords.length) {
        attachPendingToNextWords(base, toks.length);
      }
      lyricLineCount += 1;
      for (const t of toks) words.push(t);
    }

    flushPendingAsSectionLevel();

    const pipe = parseUgPipeBars(keptLines);

    // Drop anonymous preamble leftovers (no lyrics — only stray diagram chords).
    if (!bucket.name && words.length === 0 && pipe.barCount === 0) {
      continue;
    }

    if (words.length === 0 && chords.length === 0 && pipe.barCount === 0) {
      continue;
    }
    sections.push({
      name,
      words,
      chords,
      pipeEvents: pipe.events,
      pipeBarCount: pipe.barCount,
      lyricLineCount,
      lines: keptLines,
    });
  }

  // Re-number default „Sekcja N” after drops so indices stay dense in names only.
  let anon = 0;
  return sections.map((s) => {
    if (/^Sekcja \d+$/.test(s.name)) {
      anon += 1;
      return { ...s, name: `Sekcja ${anon}` };
    }
    return s;
  });
}

/**
 * Needleman–Wunsch word alignment. Returns for each `a` index the best `b`
 * index (or null) and a normalized score in [0, 1].
 */
export function alignWordSequences(
  a: readonly string[],
  b: readonly string[],
): { mapAtoB: (number | null)[]; score: number; matches: number } {
  const n = a.length;
  const m = b.length;
  if (n === 0 && m === 0) {
    return { mapAtoB: [], score: 1, matches: 0 };
  }
  if (n === 0 || m === 0) {
    return {
      mapAtoB: Array.from({ length: n }, () => null),
      score: 0,
      matches: 0,
    };
  }

  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -1;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  for (let i = 1; i <= n; i++) dp[i]![0] = i * GAP;
  for (let j = 1; j <= m; j++) dp[0]![j] = j * GAP;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag =
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      const up = dp[i - 1]![j]! + GAP;
      const left = dp[i]![j - 1]! + GAP;
      dp[i]![j] = Math.max(diag, up, left);
    }
  }

  const mapAtoB: (number | null)[] = Array.from({ length: n }, () => null);
  let i = n;
  let j = m;
  let matches = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const diag =
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? MATCH : MISMATCH);
      if (dp[i]![j] === diag) {
        mapAtoB[i - 1] = j - 1;
        if (a[i - 1] === b[j - 1]) matches += 1;
        i -= 1;
        j -= 1;
        continue;
      }
    }
    if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + GAP) {
      mapAtoB[i - 1] = null;
      i -= 1;
      continue;
    }
    j -= 1;
  }

  const denom = Math.max(n, m);
  const score = denom === 0 ? 1 : matches / denom;
  return { mapAtoB, score, matches };
}

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
 * Timed syllables from UltraStar tekst + melody (pitch by matching startTicks).
 */
export function timedSyllablesFromUltrastar(
  us: UltrastarImportOk,
): HarmonicSyllable[] {
  const pitchByStart = new Map<number, number>();
  for (const m of us.melody.clips) {
    pitchByStart.set(m.startTicks, m.pitchMidi);
  }
  const out: HarmonicSyllable[] = [];
  us.tekst.clips.forEach((clip, phraseIndex) => {
    for (const b of clip.blocks ?? []) {
      const raw = b.text.replace(/\s+$/g, "");
      if (!raw || !normalizeLyricToken(raw)) continue;
      const durationTicks = Math.max(1, b.lengthTicks);
      out.push({
        text: raw,
        startTicks: b.startTicks,
        endTicks: b.startTicks + durationTicks,
        durationTicks,
        pitchMidi: pitchByStart.get(b.startTicks) ?? 60,
        phraseIndex,
      });
    }
  });
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
 * Used for diagnostics; container length uses {@link sectionLengthBarsFromUg}.
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
 * Hard container length in bars from UG structure (step 1).
 * Pipe wins; else chords × {@link DEFAULT_BARS_PER_CHORD}; else lyric lines ×
 * {@link DEFAULT_BARS_PER_LINE}; else 1.
 */
export function sectionLengthBarsFromUg(sec: {
  pipeBarCount: number;
  chords: readonly unknown[];
  lyricLineCount: number;
  barsPerChord?: number;
  barsPerLine?: number;
}): number {
  if (sec.pipeBarCount > 0) return sec.pipeBarCount;
  const bpc = Math.max(1, Math.trunc(sec.barsPerChord ?? DEFAULT_BARS_PER_CHORD));
  if (sec.chords.length > 0) return Math.max(1, sec.chords.length * bpc);
  const bpl = Math.max(1, Math.trunc(sec.barsPerLine ?? DEFAULT_BARS_PER_LINE));
  if (sec.lyricLineCount > 0) return Math.max(1, sec.lyricLineCount * bpl);
  return 1;
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
  const snap =
    mode === "bar" ? quantizeTicksToBar : quantizeTicksToBarOrHalf;
  return onsets.map((raw) => {
    let t = snap(raw, barTicks);
    if (t < start) t = start;
    if (t >= end) t = lastLegal;
    if (t < start) t = start;
    if (t >= end) t = lastLegal;
    return t;
  });
}

export type FreezeFormaContainersInput = {
  ugSections: readonly {
    name: string;
    words: readonly unknown[];
    chords: readonly unknown[];
    pipeBarCount: number;
    lyricLineCount: number;
  }[];
  /** Per section: US word start ticks mapped into that UG section (may be empty). */
  sectionUsTicks: readonly (readonly number[])[];
  barTicks: number;
  contentFloorTicks?: number;
  idPrefix?: string;
};

export type FreezeFormaContainersResult = {
  containers: readonly SectionContainer[];
  formaMusic: FormaClip[];
  warnings: string[];
  approximate: boolean;
};

/**
 * Step 1 — freeze immutable Forma containers.
 *
 * Nominal length from UG (pipe / chords×2 / lyric lines). Starts are
 * **sequential** (`cursor += lengthTicks`) from UG structure — US first-word
 * never shoves a later Forma start (no „nachodzi” cascade). Instrumental /
 * pipe sections may **cap** or **extend** to the next US vocal barline
 * (absorb pickup). Vocal chord-grid keeps exact
 * `chords × {@link DEFAULT_BARS_PER_CHORD}` bars (no shrink). Walls are then
 * read-only — chord fill must not move them.
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
  const chordCount: number[] = [];

  for (let si = 0; si < n; si++) {
    const sec = input.ugSections[si]!;
    ugLengthBars.push(sectionLengthBarsFromUg(sec));
    fromPipe.push(sec.pipeBarCount > 0);
    chordCount.push(sec.chords.length);
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

  /** Next US-derived vocal barline after index `from` (for instrumental absorb). */
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
    // Sequential Forma from UG — US timing annotates vocals later, never
    // shoves this start when a prior chords×2 container overruns the US word.
    const start = cursor;

    let bars = Math.max(1, ugLengthBars[si]!);
    const nextWant = nextDesiredAfter(si);
    const instrumental = fromPipe[si]! || !anchored[si]!;
    // Vocal chord-grid: keep exact chords×2 (no shrink). Pipe / other
    // instrumentals may cap or absorb pickup up to the next US vocal.
    const vocalChordGrid =
      !instrumental && chordCount[si]! > 0 && !fromPipe[si]!;

    if (nextWant != null && nextWant > start) {
      const availBars = Math.max(1, Math.floor((nextWant - start) / barTicks));
      if (!vocalChordGrid) {
        bars = Math.min(bars, availBars);
        if (instrumental && availBars > bars) {
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

export type PristineSectionChord = {
  symbol: string;
  ugWordIndex: number | null;
  orderInSection: number;
  chordLineIndex: number;
  wordAligned: boolean;
};

export type BuildPristineSectionGridInput = {
  containerStart: number;
  containerEnd: number;
  barTicks: number;
  sectionName: string;
  chords: readonly PristineSectionChord[];
  pipeEvents: readonly UgPipeChordEvent[];
  pipeBarCount: number;
  usSyllables: readonly HarmonicSyllable[];
  /** Resolve UG word index → US word startTicks (null if unmatched). */
  resolveWordStartTicks: (ugWordIndex: number) => number | null;
  barsPerChord?: number;
  idPrefix?: string;
  seqStart?: number;
};

export type BuildPristineSectionGridResult = {
  clips: AkordClip[];
  warnings: string[];
  approximate: boolean;
  /** true when word-align / S1 used (not pure left-aligned Beat-1 grid). */
  usedWordAlign: boolean;
  nextSeq: number;
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
  const bpc = Math.max(1, Math.trunc(input.barsPerChord ?? DEFAULT_BARS_PER_CHORD));
  const cellTicks = bpc * barTicks;
  const prefix = input.idPrefix ?? "bridge";
  let seq = input.seqStart ?? 0;
  const warnings: string[] = [];
  let approximate = false;
  let usedWordAlign = false;

  const paired: { startTicks: number; symbol: string; isRest?: boolean }[] =
    [];

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
    const list = input.chords.slice().sort((a, b) => a.orderInSection - b.orderInSection);
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
                phraseSyllables.length > 0 ? phraseSyllables : input.usSyllables,
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
          filled.map((_, i) =>
            chordLineGridOnset(winStart, i, barTicks, bpc),
          ),
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
      const push = fromPipe
        ? Math.max(1, Math.floor(barTicks / 2))
        : barTicks;
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

/** Wall-clock ms for a tick placed on a constant single-event tempo map. */
function ticksToWallMs(
  ticks: number,
  placeBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): number {
  const local = Math.max(0, ticks - floor);
  return ticksToSeconds(local, [{ startTicks: 0, bpm: placeBpm }], placeBpm, meter, ppq) * 1000;
}

/** Remap a tick from constant place BPM onto the solver TempoMap. */
function remapTickAlongSolverMap(
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
    return (
      secondsToTicks(ms / 1000, tempoMap, seedBpm, meter, ppq) + floor
    );
  } catch {
    return ticks;
  }
}

function remapTekstClipsAlongSolverMap(
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
  return clips.map((clip) => {
    const startTicks = mapT(clip.startTicks);
    const endTicks = mapT(clip.startTicks + clip.lengthTicks);
    const blocks = (clip.blocks ?? []).map((b) => {
      const bStart = mapT(b.startTicks);
      const bEnd = mapT(b.startTicks + b.lengthTicks);
      return {
        ...b,
        startTicks: bStart,
        lengthTicks: Math.max(1, bEnd - bStart),
      };
    });
    return {
      ...clip,
      startTicks,
      lengthTicks: Math.max(1, endTicks - startTicks),
      ...(blocks.length > 0 ? { blocks } : {}),
    };
  });
}

function remapMelodyClipsAlongSolverMap(
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
      barsPerLine?.[gi] != null ? Math.max(1, Math.trunc(barsPerLine[gi]!)) : g.orders.length,
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
function sealChordLengths(
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

/**
 * Bridge UltraStar import + UG/ChordPro text → Forma + timed akordy + US tekst.
 */
export function bridgeUsUgImport(
  us: UltrastarImportOk,
  ugText: string,
  options: TextAnchorBridgeOptions = {},
): TextAnchorBridgeResult {
  const warnings: string[] = [];
  let approximate = false;
  const prefix = options.idPrefix ?? "bridge";
  const floor = options.contentFloorTicks ?? 0;
  const weak = options.weakAlignThreshold ?? TEXT_ANCHOR_WEAK_ALIGN;
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter: TimeSignature = options.meter ?? {
    numerator: 4,
    denominator: 4,
  };
  const barTicks = ticksPerBar(meter, ppq);
  const placeBpm = us.metronomeBpm;

  const ugSections = parseUgBridgeSections(ugText);
  if (ugSections.length === 0) {
    return {
      ok: false,
      message:
        "Nie rozpoznano sekcji UG / ChordPro — wklej tab z [Verse]/[Chorus] lub akordami.",
    };
  }

  const usWords = timedWordsFromUltrastar(us);
  if (usWords.length === 0) {
    return { ok: false, message: "UltraStar nie zawiera słów do kotwiczenia." };
  }

  const ugWords: UgBridgeWord[] = [];
  const ugChords: UgBridgeChord[] = [];

  for (let si = 0; si < ugSections.length; si++) {
    const sec = ugSections[si]!;
    const start = ugWords.length;
    for (const w of sec.words) {
      ugWords.push({
        sectionIndex: si,
        sectionName: sec.name,
        raw: w.raw,
        norm: w.norm,
      });
    }
    const end = ugWords.length;
    let order = 0;
    for (const c of sec.chords) {
      const global =
        c.localWordIndex == null
          ? null
          : start + c.localWordIndex < end
            ? start + c.localWordIndex
            : null;
      ugChords.push({
        sectionIndex: si,
        symbol: c.symbol,
        ugWordIndex: global,
        orderInSection: order++,
        chordLineIndex: c.chordLineIndex,
        wordAligned: c.wordAligned,
      });
    }
  }

  const align = alignWordSequences(
    ugWords.map((w) => w.norm),
    usWords.map((w) => w.norm),
  );

  if (align.score < weak) {
    approximate = true;
    warnings.push(
      `Słabe dopasowanie tekstu UG↔UltraStar (${Math.round(align.score * 100)}%). Akordy bez kotwicy rozłożono na siatce taktów — sprawdź Formę i Tap.`,
    );
  }

  /** Per UG section: wall-clock ms of aligned US words. */
  const sectionUsMs: number[][] = ugSections.map(() => []);
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = align.mapAtoB[gi];
    if (bj == null) continue;
    const uw = usWords[bj];
    const gw = ugWords[gi];
    if (!uw || !gw) continue;
    sectionUsMs[gw.sectionIndex]!.push(
      ticksToWallMs(uw.startTicks, placeBpm, meter, ppq, floor),
    );
  }

  const solverSections = ugSections.map((sec, si) => {
    const msList = sectionUsMs[si] ?? [];
    const vocalMsRange =
      msList.length > 0
        ? {
            startMs: Math.min(...msList),
            endMs: Math.max(...msList),
          }
        : null;
    return {
      name: sec.name,
      pipeBarCount: sec.pipeBarCount,
      chordCount: sec.chords.length,
      vocalMsRange,
    };
  });

  const anchors: TempoSolverAnchor[] = [];
  for (let si = 0; si < ugSections.length; si++) {
    const sec = ugSections[si]!;
    const vr = solverSections[si]!.vocalMsRange;
    const ugBarsHint =
      sec.pipeBarCount > 0
        ? sec.pipeBarCount
        : null;
    if (vr) {
      anchors.push({
        ms: vr.startMs,
        sectionIndex: si,
        kind: "section",
        weight: weightForTempoAnchorKind("section"),
        ...(ugBarsHint != null ? { ugBarsHint } : {}),
        barOffset: 0,
      });
    } else if (sec.pipeBarCount > 0) {
      anchors.push({
        ms: 0,
        sectionIndex: si,
        kind: "section",
        weight: weightForTempoAnchorKind("section"),
        ugBarsHint: sec.pipeBarCount,
        barOffset: 0,
      });
    }
  }

  // Phrase / line anchors: first US syllable of each tekst clip → structural
  // barOffset within its UG section (C+B phrase framing for TempoMap).
  const usIndexToSection = new Map<number, number>();
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = align.mapAtoB[gi];
    if (bj == null) continue;
    const gw = ugWords[gi];
    if (!gw) continue;
    usIndexToSection.set(bj, gw.sectionIndex);
  }

  /** Per section: ordered phrase start ms (US line / tekst clip). */
  const phraseMsBySection = new Map<number, number[]>();
  /** Per section: UltraStar phraseIndex values (tekst clip order). */
  const phraseIndicesBySection = new Map<number, number[]>();
  us.tekst.clips.forEach((clip, phraseIndex) => {
    const end = clip.startTicks + clip.lengthTicks;
    const votes = new Map<number, number>();
    for (let wi = 0; wi < usWords.length; wi++) {
      const w = usWords[wi]!;
      if (w.startTicks < clip.startTicks || w.startTicks >= end) continue;
      const si = usIndexToSection.get(wi);
      if (si == null) continue;
      votes.set(si, (votes.get(si) ?? 0) + 1);
    }
    let bestSi: number | undefined;
    let bestN = 0;
    for (const [si, n] of votes) {
      if (n > bestN) {
        bestSi = si;
        bestN = n;
      }
    }
    if (bestSi == null) {
      for (let wi = 0; wi < usWords.length; wi++) {
        const w = usWords[wi]!;
        if (w.startTicks < clip.startTicks) continue;
        const si = usIndexToSection.get(wi);
        if (si != null) {
          bestSi = si;
          break;
        }
      }
    }
    if (bestSi == null) return;
    const ms = ticksToWallMs(clip.startTicks, placeBpm, meter, ppq, floor);
    const list = phraseMsBySection.get(bestSi) ?? [];
    list.push(ms);
    phraseMsBySection.set(bestSi, list);
    const idxs = phraseIndicesBySection.get(bestSi) ?? [];
    idxs.push(phraseIndex);
    phraseIndicesBySection.set(bestSi, idxs);
  });

  // Resolve each vocal chord’s locked syllable ms + structural barOffset BEFORE
  // the solver — same (ms → N) pairs drive TempoMap and placement (no snap).
  const usSyllablesEarly = timedSyllablesFromUltrastar(us);
  const wallMsFromPlaceTicks = (ticks: number): number =>
    ticksToWallMs(ticks, placeBpm, meter, ppq, floor);

  type ChordMsPlan = {
    sectionIndex: number;
    symbol: string;
    orderInSection: number;
    barOffset: number;
    ms: number;
    /** Same-word follow-up: place on structural N (no unique syllable ms). */
    structuralOnly: boolean;
  };
  const chordMsPlans: ChordMsPlan[] = [];

  for (let si = 0; si < ugSections.length; si++) {
    if (ugSections[si]!.pipeBarCount > 0) continue;
    if (solverSections[si]!.vocalMsRange == null) continue;
    const secChords = (chordsBySectionEarly(ugChords, si) ?? []).slice();
    if (secChords.length === 0) continue;
    type LineGroup = { lineIndex: number; chords: UgBridgeChord[] };
    const groups: LineGroup[] = [];
    for (const c of [...secChords].sort(
      (a, b) => a.orderInSection - b.orderInSection,
    )) {
      const last = groups[groups.length - 1];
      if (last && last.lineIndex === c.chordLineIndex) last.chords.push(c);
      else groups.push({ lineIndex: c.chordLineIndex, chords: [c] });
    }

    const phraseMs = phraseMsBySection.get(si) ?? [];
    const vr0 = solverSections[si]!.vocalMsRange;
    const bpmEst =
      us.ultrastarMetronomeBpm > 0 ? us.ultrastarMetronomeBpm : placeBpm;
    const barsPerLine = groups.map((g, gi) => {
      const start = phraseMs[gi] ?? vr0?.startMs ?? 0;
      const end =
        phraseMs[gi + 1] ??
        (gi === groups.length - 1 ? (vr0?.endMs ?? start) : start);
      const fromMs = pristineBarsFromMsSpan(start, end, bpmEst, meter, ppq);
      return Math.max(g.chords.length, fromMs);
    });
    const offsets = structuralBarOffsetsForChordLines(secChords, barsPerLine);
    const offsetByOrder = new Map(
      offsets.map((o) => [o.orderInSection, o.barOffset]),
    );
    const sectionPhrases = phraseIndicesBySection.get(si) ?? [];

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]!;
      const phraseIndex =
        sectionPhrases.length > 0
          ? sectionPhrases[Math.min(gi, sectionPhrases.length - 1)]!
          : null;
      const phraseSyllables =
        phraseIndex == null
          ? []
          : usSyllablesEarly.filter((s) => s.phraseIndex === phraseIndex);
      const linePhraseMs =
        phraseMs.length > 0
          ? phraseMs[Math.min(gi, phraseMs.length - 1)]!
          : null;

      for (let ci = 0; ci < group.chords.length; ci++) {
        const c = group.chords[ci]!;
        const barOffset = offsetByOrder.get(c.orderInSection) ?? 0;
        if (ci > 0 && sameWordPrev(group.chords, ci)) {
          chordMsPlans.push({
            sectionIndex: si,
            symbol: c.symbol,
            orderInSection: c.orderInSection,
            barOffset,
            ms: linePhraseMs ?? phraseMs[0] ?? 0,
            structuralOnly: true,
          });
          continue;
        }

        let scopeStart: number | null = null;
        if (c.ugWordIndex != null) {
          const bj = align.mapAtoB[c.ugWordIndex];
          if (bj != null) scopeStart = usWords[bj]?.startTicks ?? null;
        }
        if (scopeStart == null) {
          scopeStart = phraseSyllables[0]?.startTicks ?? null;
        }
        let scopeEnd: number | null = null;
        for (let nj = ci + 1; nj < group.chords.length; nj++) {
          const n = group.chords[nj]!;
          if (n.ugWordIndex == null) continue;
          const bj = align.mapAtoB[n.ugWordIndex];
          if (bj != null && usWords[bj]) {
            scopeEnd = usWords[bj]!.startTicks;
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
          scopeStart != null
            ? syllablesInChordScope(
                phraseSyllables.length > 0
                  ? phraseSyllables
                  : usSyllablesEarly,
                scopeStart,
                sameWordNext
                  ? null
                  : scopeEnd != null && scopeEnd > scopeStart
                    ? scopeEnd
                    : null,
              )
            : [];
        const accent = findHarmonicAccentSyllable(scoped);
        const ms: number | null = accent
          ? wallMsFromPlaceTicks(accent.startTicks)
          : scopeStart != null
            ? wallMsFromPlaceTicks(scopeStart)
            : linePhraseMs;
        if (ms == null) continue;
        chordMsPlans.push({
          sectionIndex: si,
          symbol: c.symbol,
          orderInSection: c.orderInSection,
          barOffset,
          ms,
          structuralOnly: false,
        });
      }
    }

    // Forma Beat 1 ms = first chord (barOffset 0); end covers last chord.
    const vr = solverSections[si]!.vocalMsRange;
    if (vr) {
      const planned = chordMsPlans.filter((p) => p.sectionIndex === si);
      const first = planned.find((p) => p.barOffset === 0) ?? planned[0];
      if (first) vr.startMs = first.ms;
      if (planned.length > 0) {
        vr.endMs = Math.max(vr.endMs, ...planned.map((p) => p.ms));
      }
    }
  }

  // Chord barOffsets → Forma struct floor; phrase ms → soft TempoMap guidance.
  // Per-chord UltraStar ms are orientational (not hard tempo kinks).
  for (const p of chordMsPlans) {
    if (p.structuralOnly) continue;
    anchors.push({
      ms: p.ms,
      sectionIndex: p.sectionIndex,
      kind: "chord",
      weight: weightForTempoAnchorKind("chord"),
      barOffset: p.barOffset,
    });
  }
  for (const [si, phraseMs] of phraseMsBySection) {
    const planned = chordMsPlans.filter((p) => p.sectionIndex === si);
    const lineStarts = [
      ...new Set(
        planned
          .filter((p) => !p.structuralOnly)
          .map((p) => p.barOffset)
          .sort((a, b) => a - b),
      ),
    ];
    for (let pi = 0; pi < phraseMs.length; pi++) {
      anchors.push({
        ms: phraseMs[pi]!,
        sectionIndex: si,
        kind: "phrase",
        weight: weightForTempoAnchorKind("phrase"),
        barOffset:
          lineStarts[Math.min(pi, Math.max(0, lineStarts.length - 1))] ?? pi,
      });
    }
  }

  // Pass 1 seed: only pipe → first vocal keeps ugBarsHint so Verse→Chorus
  // does not dilute seed when vocal ms span ≠ pipe bars.
  const pipeAnchor = anchors.find(
    (a) => (ugSections[a.sectionIndex]?.pipeBarCount ?? 0) > 0,
  );
  const firstVocalAnchor = anchors.find(
    (a) => solverSections[a.sectionIndex]?.vocalMsRange != null,
  );
  const seedAnchors: TempoSolverAnchor[] =
    pipeAnchor &&
    firstVocalAnchor &&
    pipeAnchor.sectionIndex !== firstVocalAnchor.sectionIndex
      ? anchors.map((a) =>
          a === pipeAnchor ? a : { ...a, ugBarsHint: undefined },
        )
      : anchors;

  const pipeSeed = (() => {
    const pipeSec = ugSections.find((s) => s.pipeBarCount > 0);
    if (!pipeSec || !(us.firstVocalMs > 0)) return null;
    return suggestGridBpmFromPipeAndFirstVocal({
      pipeBarCount: pipeSec.pipeBarCount,
      firstVocalMs: us.firstVocalMs,
      meter,
    });
  })();

  const solver = runMultiPassTempoSolver({
    anchors: seedAnchors,
    sections: solverSections,
    meter,
    ppq,
    fallbackBpm: pipeSeed ?? placeBpm,
    referenceMetronomeBpm: us.ultrastarMetronomeBpm,
    contentFloorTicks: floor,
    idPrefix: prefix,
  });
  warnings.push(...solver.warnings);
  if (solver.warnings.some((w) => /bez wokalu/i.test(w))) {
    approximate = true;
  }

  const formaMusic: FormaClip[] = solver.sections.map((p) =>
    Object.freeze({
      id: `${prefix}-forma-${p.sectionIndex + 1}`,
      name: p.name.slice(0, 120),
      startTicks: p.startTicks,
      lengthTicks: p.lengthTicks,
      kind: "section" as const,
    }),
  );

  const containers: SectionContainer[] = solver.sections.map((p) =>
    Object.freeze({
      sectionIndex: p.sectionIndex,
      name: p.name.slice(0, 120),
      startTicks: p.startTicks,
      lengthTicks: p.lengthTicks,
      endTicks: p.startTicks + p.lengthTicks,
      anchored: solverSections[p.sectionIndex]!.vocalMsRange != null,
      fromPipe: p.fromPipe,
      lengthBars: p.pristineBars,
    }),
  );

  const sectionPreview: TextAnchorBridgeOk["sections"] = containers.map(
    (c) => ({
      name: c.name,
      startTicks: c.startTicks,
      lengthTicks: c.lengthTicks,
      chordCount: 0,
      anchored: c.anchored,
    }),
  );

  // Align-first sourceSection on place-BPM ticks, then remap vocals AlongMap.
  const tekstAligned = annotateTekstSourceSectionsFromAlign(
    us.tekst.clips,
    usWords,
    ugWords,
    align.mapAtoB,
  );
  const tekstAnnotated = {
    clips: remapTekstClipsAlongSolverMap(
      tekstAligned,
      placeBpm,
      solver.tempoMap,
      solver.seedBpm,
      meter,
      ppq,
      floor,
    ),
  };
  const melodyRemapped = {
    clips: remapMelodyClipsAlongSolverMap(
      us.melody.clips,
      placeBpm,
      solver.tempoMap,
      solver.seedBpm,
      meter,
      ppq,
      floor,
    ),
  };

  const akordClips: AkordClip[] = [];
  let seq = 0;
  const chordsBySection = new Map<number, UgBridgeChord[]>();
  for (const c of ugChords) {
    const list = chordsBySection.get(c.sectionIndex) ?? [];
    list.push(c);
    chordsBySection.set(c.sectionIndex, list);
  }

  for (let si = 0; si < ugSections.length; si++) {
    const win = containers[si]!;
    const sec = ugSections[si]!;
    const list = (chordsBySection.get(si) ?? [])
      .slice()
      .sort((a, b) => a.orderInSection - b.orderInSection);

    if (sec.pipeBarCount > 0 && sec.pipeEvents.length > 0) {
      const paired: { startTicks: number; symbol: string; isRest?: boolean }[] =
        [];
      for (const ev of sec.pipeEvents) {
        // Pipe cell = 1 full bar; mid-cell offsetInBar kept as authored.
        const local =
          ev.barIndex * barTicks + Math.round(ev.offsetInBar * barTicks);
        const t = win.startTicks + local;
        if (t >= win.endTicks) continue;
        paired.push({
          startTicks: Math.max(win.startTicks, t),
          symbol: ev.symbol,
          isRest: ev.isRest,
        });
      }
      paired.sort((a, b) => a.startTicks - b.startTicks);
      const unique: { startTicks: number; symbol: string }[] = [];
      for (const p of paired) {
        if (p.isRest) continue;
        const last = unique[unique.length - 1];
        if (last && last.symbol === p.symbol) continue;
        unique.push({ startTicks: p.startTicks, symbol: p.symbol });
      }
      const sealed = sealChordLengths(
        unique.map((p) => p.startTicks),
        win.endTicks,
      );
      for (let i = 0; i < unique.length && i < sealed.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: unique[i]!.symbol,
        });
      }
    } else if (list.length > 0 && solverSections[si]!.vocalMsRange == null) {
      // Instrumental without pipe: even pristineBars grid.
      const onsets = evenlySpaceOnsetsOnBarGrid(
        list.length,
        win.startTicks,
        win.endTicks,
        barTicks,
      );
      const sealed = sealChordLengths(onsets, win.endTicks);
      for (let i = 0; i < sealed.length && i < list.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: list[i]!.symbol,
        });
      }
      if (onsets.length < list.length) {
        approximate = true;
      }
    } else if (list.length > 0) {
      // Vocal: structural Beat 1/3 from phrase framing. US syllable ms only
      // oriented Forma/barOffsets + soft TempoMap — not hard onset chase.
      const plans = chordMsPlans
        .filter((p) => p.sectionIndex === si)
        .sort((a, b) => a.orderInSection - b.orderInSection);
      const paired: { startTicks: number; symbol: string }[] = [];
      let usedApprox = false;

      for (const p of plans) {
        const targetTick = Math.min(
          win.endTicks - 1,
          win.startTicks + p.barOffset * barTicks,
        );
        if (p.structuralOnly) usedApprox = true;
        paired.push({ startTicks: targetTick, symbol: p.symbol });
      }

      if (plans.length < list.length) {
        usedApprox = true;
        // Fallback leftovers on remaining structural slots.
        const usedOrders = new Set(plans.map((p) => p.orderInSection));
        const offsets = structuralBarOffsetsForChordLines(list);
        const offsetByOrder = new Map(
          offsets.map((o) => [o.orderInSection, o.barOffset]),
        );
        for (const c of list) {
          if (usedOrders.has(c.orderInSection)) continue;
          const barOffset = offsetByOrder.get(c.orderInSection) ?? 0;
          paired.push({
            startTicks: Math.min(
              win.endTicks - 1,
              win.startTicks + barOffset * barTicks,
            ),
            symbol: c.symbol,
          });
        }
      }

      if (usedApprox) {
        approximate = true;
        warnings.push(
          `Sekcja „${sec.name}”: akord bez sylaby w zasięgu — pozycja strukturalna / interpolacja (przybliżenie).`,
        );
      }

      // Chronological order; min gap 1 tick. Never half-bar crush / even reflow.
      paired.sort((a, b) => a.startTicks - b.startTicks);
      const lastLegal = Math.max(win.startTicks, win.endTicks - 1);
      const unique: { startTicks: number; symbol: string }[] = [];
      for (const p of paired) {
        let t = Math.min(lastLegal, Math.max(win.startTicks, p.startTicks));
        const last = unique[unique.length - 1];
        if (last && t <= last.startTicks) {
          t = Math.min(lastLegal, last.startTicks + 1);
        }
        unique.push({ startTicks: t, symbol: p.symbol });
      }
      const sealed = sealChordLengths(
        unique.map((u) => u.startTicks),
        win.endTicks,
      );
      for (let i = 0; i < unique.length && i < sealed.length; i++) {
        akordClips.push({
          id: `${prefix}-akord-${++seq}`,
          startTicks: sealed[i]!.startTicks,
          lengthTicks: sealed[i]!.lengthTicks,
          symbol: unique[i]!.symbol,
        });
      }
    }
    sectionPreview[si]!.chordCount = akordClips.filter(
      (c) =>
        c.startTicks >= win.startTicks && c.startTicks < win.endTicks,
    ).length;
  }

  try {
    for (const c of formaMusic) FormaClipSchema.parse(c);
    for (const c of akordClips) AkordClipSchema.parse(c);
  } catch {
    return {
      ok: false,
      message: "Wynik mostka US+UG nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    alignScore: align.score,
    approximate,
    warnings,
    matchedWords: align.matches,
    ugWordCount: ugWords.length,
    usWordCount: usWords.length,
    title: us.title,
    artist: us.artist,
    metronomeBpm: solver.seedBpm,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
    suggestedGridBpm: null,
    tempoMap: solver.tempoMap,
    seedBpm: solver.seedBpm,
    tekst: tekstAnnotated,
    melody: melodyRemapped,
    formaMusic: { clips: formaMusic },
    akordy: { clips: akordClips },
    sections: sectionPreview,
  };
}

function chordsBySectionEarly(
  ugChords: readonly UgBridgeChord[],
  si: number,
): UgBridgeChord[] {
  return ugChords.filter((c) => c.sectionIndex === si);
}

function sameWordPrev(
  chords: readonly UgBridgeChord[],
  ci: number,
): boolean {
  if (ci <= 0) return false;
  const cur = chords[ci]!;
  const prev = chords[ci - 1]!;
  return (
    cur.ugWordIndex != null &&
    prev.ugWordIndex === cur.ugWordIndex
  );
}

/**
 * Suggest editorial grid BPM from UltraStar wall-clock + first UG pipe section.
 */
export function suggestGridBpmFromUsUgTexts(
  ultrastarText: string,
  ugText: string,
  options: Pick<TextAnchorBridgeOptions, "meter"> = {},
): number | null {
  const us = importUltrastarText(ultrastarText, { meter: options.meter });
  if (!us.ok) return null;
  const pipeSec = parseUgBridgeSections(ugText).find((s) => s.pipeBarCount > 0);
  if (!pipeSec) return null;
  return suggestGridBpmFromPipeAndFirstVocal({
    pipeBarCount: pipeSec.pipeBarCount,
    firstVocalMs: us.firstVocalMs,
    meter: options.meter,
  });
}

/**
 * Convenience: parse UltraStar + UG strings then bridge.
 * Syllables always wall-clock at place BPM. Default place BPM = UltraStar
 * file metronome (`#BPM/4`). Suggested pipe+GAP BPM is returned for UI only.
 */
export function bridgeUsUgFromTexts(
  ultrastarText: string,
  ugText: string,
  options: TextAnchorBridgeOptions = {},
): TextAnchorBridgeResult {
  const suggested = suggestGridBpmFromUsUgTexts(ultrastarText, ugText, {
    meter: options.meter,
  });
  const placeBpm =
    options.gridBpm != null &&
    Number.isFinite(options.gridBpm) &&
    options.gridBpm > 0
      ? options.gridBpm
      : undefined;

  const us = importUltrastarText(ultrastarText, {
    ppq: options.ppq,
    meter: options.meter,
    contentFloorTicks: options.contentFloorTicks,
    idPrefix: options.idPrefix ? `${options.idPrefix}-us` : "us",
    ...(placeBpm != null ? { gridBpm: placeBpm } : {}),
  });
  if (!us.ok) return us;

  const bridged = bridgeUsUgImport(us, ugText, options);
  if (!bridged.ok) return bridged;
  return {
    ...bridged,
    suggestedGridBpm: suggested,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
  };
}

export type ApplyUsUgBridgeOptions = {
  applyBpm?: boolean;
};

/**
 * Merge bridge result into Project: US tekst/melody/BPM, UG-named Forma (keep
 * Countdown), anchored akordy, MultiPass TempoMap. Does not touch audio / cue.
 */
export function applyUsUgBridgeToProject(
  project: Project,
  bridged: TextAnchorBridgeOk,
  options: ApplyUsUgBridgeOptions = {},
): Project {
  const applyBpm = options.applyBpm !== false;
  const countdown = project.forma.clips.filter((c) => c.kind === "countdown");
  // sourceSection already align-first from bridge — do not re-annotate geometrically.
  const tekst = bridged.tekst.clips;
  const withUs = applyUltrastarImportToProject(
    project,
    {
      ok: true,
      title: bridged.title,
      artist: bridged.artist,
      metronomeBpm: bridged.metronomeBpm,
      ultrastarBpm: bridged.ultrastarMetronomeBpm * 4,
      ultrastarMetronomeBpm: bridged.ultrastarMetronomeBpm,
      gapMs: 0,
      firstVocalMs: 0,
      tekst: { clips: tekst },
      melody: bridged.melody,
      noteCount: bridged.melody.clips.length,
      syllableCount: tekst.reduce((n, c) => n + (c.blocks?.length ?? 0), 0),
      wordCount: bridged.usWordCount,
    },
    { applyBpm: false },
  );
  return {
    ...withUs,
    forma: { clips: [...countdown, ...bridged.formaMusic.clips] },
    akordy: bridged.akordy,
    ...(applyBpm
      ? {
          defaultBpm: bridged.seedBpm,
          tempoMap: bridged.tempoMap.length > 0
            ? bridged.tempoMap
            : [{ id: "bridge-tempo-0", startTicks: 0, bpm: bridged.seedBpm }],
        }
      : {}),
  };
}

/** Annotate tekst clips with sourceSection from forma affinity (onset).
 * Vocal pickups that start in the previous section window still belong to the
 * upcoming section (within one bar before its start).
 * Membership uses each container's own `[start, start+length)` — not next.start.
 *
 * @deprecated Prefer {@link annotateTekstSourceSectionsFromAlign} for US+UG.
 */
export function annotateTekstSourceSections(
  tekstClips: TekstClip[],
  formaMusic: FormaClip[],
  barTicks: number = ticksPerBar({ numerator: 4, denominator: 4 }, DEFAULT_PPQ),
): TekstClip[] {
  const sections = [...formaMusic].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  return tekstClips.map((clip) => {
    let name: string | undefined;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]!;
      const end = s.startTicks + s.lengthTicks;
      if (clip.startTicks >= s.startTicks && clip.startTicks < end) {
        name = s.name;
        break;
      }
    }
    // Pickup: lyric starts just before the next section barline.
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i]!;
      if (
        clip.startTicks < s.startTicks &&
        s.startTicks - clip.startTicks <= barTicks &&
        clip.startTicks + clip.lengthTicks > s.startTicks - barTicks
      ) {
        name = s.name;
        break;
      }
    }
    return name ? { ...clip, sourceSection: name } : clip;
  });
}
