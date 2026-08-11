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
} from "./ug-import/types.js";

export {
  canonicalizePolishH,
  chordOnsetsInBar,
  clipsFromOnsets,
  sealAkordyLengths,
} from "./ug-import/chords.js";

export { splitUgSections } from "./ug-import/sections.js";

export { importUgText } from "./ug-import/import-text.js";

export {
  applyUgImportToProject,
  reflowUgImportSectionBars,
} from "./ug-import/apply.js";
