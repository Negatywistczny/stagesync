/**
 * UltraStar / USDX import — melisma, word boundaries, line text.
 */

import type { TekstBlockRole } from "../../project/schema.js";
import type { UltrastarSyllable, UltrastarWord } from "./types.js";

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
  return stripUltrastarMelisma(rawLyric).trim();
}

/**
 * Group raw note lyrics into words using UltraStar space boundaries
 * (trailing and/or leading). Does **not** trim before deciding word ends.
 * Melisma `~` is empty content and stays inside the current word.
 */
export function groupUltrastarSyllablesIntoWords(
  notes: readonly {
    text: string;
    startBeat: number;
    lengthBeat: number;
    pitch: number;
    role?: TekstBlockRole;
  }[],
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
    .trim();
}
