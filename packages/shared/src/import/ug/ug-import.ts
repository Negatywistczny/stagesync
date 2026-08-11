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
 *
 * Thin barrel: public API re-exports. Implementation lives in `./ug-import/`.
 */

export type {
  UgSectionPreview,
  UgImportOk,
  UgImportErr,
  UgImportResult,
  UgImportOptions,
  SplitUgSectionsOptions,
} from "./types.js";

export {
  canonicalizePolishH,
  chordOnsetsInBar,
  clipsFromOnsets,
  sealAkordyLengths,
} from "./chords.js";

export { splitUgSections } from "./sections.js";

export { importUgText } from "./import-text.js";

export { applyUgImportToProject, reflowUgImportSectionBars } from "./apply.js";
