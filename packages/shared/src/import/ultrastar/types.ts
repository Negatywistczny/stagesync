/**
 * UltraStar / USDX import — public types.
 */

import type {
  MelodyNoteClip,
  TekstBlockRole,
  TekstClip,
} from "../../project/schema.js";
import type { TimeSignature } from "../../time-tempo/time.js";

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
  /** Local filename hint from `#MP3:` (UltraStar header). */
  mp3Hint: string | null;
  /** Raw `#VIDEO:` value (URL or id). */
  videoUrl: string | null;
  /** Parsed YouTube id when `#VIDEO` references YouTube. */
  youtubeVideoId: string | null;
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

export type NoteKind = "regular" | "golden" | "rap" | "goldenRap" | "freestyle";

export type RawNote = {
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

export type ApplyUltrastarOptions = {
  /** When true (default), set project.defaultBpm from metronome BPM. */
  applyBpm?: boolean;
};
