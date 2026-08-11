import { toLiteralStorage } from "../chord-display.js";
import {
  collapseAsciiSpaces,
  isDualBracketSlashHeader,
  splitKeepingBracketSpans,
} from "../bracket-spans.js";
import { cleanUgTabContent } from "../ug-content.js";
import { splitUgSections } from "../ug-import.js";
import { isUgPipeBarLine, parseUgPipeBars } from "../ug-pipe-bars.js";
import { CHORD_TOKEN, CHORD_TOKEN_MAX } from "./constants.js";
import type { UgSectionChord, UgSectionParsed } from "./types.js";
import { normalizeLyricToken, tokenizeLyrics } from "./tokenize.js";

function acceptChordToken(raw: string): string | null {
  const t = raw.trim();
  if (!t || t.length > CHORD_TOKEN_MAX || !CHORD_TOKEN.test(t)) return null;
  return toLiteralStorage(t);
}

function defaultSectionName(index: number, named: string | null): string {
  const n = named?.trim();
  if (n) return n.slice(0, 120);
  return `Sekcja ${index + 1}`;
}

function isChordOnlyLine(line: string): boolean {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every(
    (t) => t.length <= CHORD_TOKEN_MAX && CHORD_TOKEN.test(t),
  );
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
  const parts = splitKeepingBracketSpans(line);

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
  return { lyric: collapseAsciiSpaces(lyric).trim(), chords };
}

/**
 * True for Ultimate Guitar chrome that must not become lyrics / Formy:
 * transpose notes, beat grids, multi-header blurbs, empty bar repeats alone.
 */
export function isUgBridgeNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  // [Intro] / [Chorus] and [Bridge] — not a single section header
  if (isDualBracketSlashHeader(t)) return true;
  if (/^transpose\b/i.test(t)) return true;
  if (/\bcapo\b/i.test(t) && /\b(transpose|to)\b/i.test(t)) return true;
  // "1 + 2 + 3 + 4 +" counting grids (bounded length — ReDoS)
  const compact = collapseAsciiSpaces(t);
  if (compact.length <= 64 && /^(\d+\s*\+\s*){1,16}\d*\+?$/.test(compact)) {
    return true;
  }
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
