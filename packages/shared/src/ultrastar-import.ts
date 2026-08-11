/**
 * UltraStar / USDX import → Tekst line clips (ticks) + syllable blocks + melody
 * (V6).
 *
 * Timing (ING-06 / ADR 0002 / USDX format):
 * - Wall clock (USDX): `t_ms = GAP + beat × 60000 / (BPM_header × 4)`.
 * - `#BPM` is **decode-only** (beat→ms relative to the MP3). Smart Tempo must
 *   not use the file metronome as TempoMap / Forma SSOT — audio Adapt + UG↔text.
 * - Authors usually write `#BPM` ≈ 4× musical quarter BPM (e.g. 369.2 → 92.3).
 * - File metronome = header / 4. Optional editorial **grid BPM** may differ for
 *   intermediate tick placement before remap onto the audio TempoMap.
 * - Placement recovers wall-clock → ticks; storage is integer ticks only.
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
 *
 * Thin barrel: public API re-exports. Implementation lives in `./ultrastar-import/`.
 */

export type {
  UltrastarImportOk,
  UltrastarImportErr,
  UltrastarImportResult,
  UltrastarImportOptions,
  UltrastarSyllable,
  UltrastarWord,
  ApplyUltrastarOptions,
} from "./ultrastar-import/types.js";

export {
  ultrastarHeaderBpmToMetronome,
  ultrastarBeatToMs,
  ticksPerUltrastarBeat,
  ultrastarBeatToTicks,
  suggestGridBpmFromPipeAndFirstVocal,
} from "./ultrastar-import/timing.js";

export {
  stripUltrastarMelisma,
  ultrastarLyricEndsWord,
  ultrastarLyricStartsWord,
  ultrastarSyllableDisplayText,
  groupUltrastarSyllablesIntoWords,
  ultrastarLineTextFromRawLyrics,
} from "./ultrastar-import/lyrics.js";

export { parseUltrastarNoteLine } from "./ultrastar-import/parse-note.js";

export { importUltrastarText } from "./ultrastar-import/import-text.js";

export {
  tempoMapWithImportedBpm,
  applyUltrastarImportToProject,
} from "./ultrastar-import/apply.js";
