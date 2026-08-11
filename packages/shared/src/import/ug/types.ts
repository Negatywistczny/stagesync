/**
 * Ultimate Guitar / ChordPro-lite import — public types.
 */

import type { AkordClip, FormaClip, TekstClip } from "../../project/schema.js";
import type { TimeSignature } from "../../time-tempo/time.js";

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

/** Split raw text into named section buckets (blank line / headers). */
export type SplitUgSectionsOptions = {
  /**
   * When true (default), a blank line starts a new anonymous section — classic
   * UG import. Text-Anchor bridge sets false so blank lines inside [Verse]
   * do not invent „Sekcja N”.
   */
  splitOnBlankLines?: boolean;
};
