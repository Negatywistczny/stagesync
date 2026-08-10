import type {
  AkordClip,
  FormaClip,
  TempoEvent,
} from "../schema.js";
import type { TimeSignature } from "../time.js";
import type { UltrastarImportOk } from "../ultrastar-import.js";
import type {
  AudioAnalysisResult,
  SmartTempoAudioRef,
  TempoNode,
} from "../smart-tempo.js";
import type { UgPipeChordEvent } from "../ug-pipe-bars.js";

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
  /** Tempo Nodes for Beat Mapper (wallMs ↔ targetTick). */
  tempoNodes: TempoNode[];
  /** When Smart Tempo audio was used for this bridge. */
  smartTempoAudio?: SmartTempoAudioRef;
  mp3Hint?: string | null;
  youtubeVideoId?: string | null;
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
  /** Smart Tempo: backing audio ground truth (duration + peaks). */
  smartTempoAudio?: SmartTempoAudioRef;
  /** Precomputed onset/beat analysis from apps/web (required for audio SSOT tempo). */
  audioAnalysis?: AudioAnalysisResult;
  /** Beat Mapper draft nodes — override solver map only when user-edited. */
  draftTempoNodes?: readonly TempoNode[];
  /** True when Beat Mapper nodes were dragged by the user (not auto-seeded). */
  draftTempoNodesUserEdited?: boolean;
  /**
   * True when Beat Mapper Audio Start Offset was set by the user.
   * Skips chord↔syllable Beat 1 auto-nudge so the manual offset sticks.
   */
  audioStartOffsetUserEdited?: boolean;
};

export type UgSectionChord = {
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

export type UgSectionParsed = {
  name: string;
  words: { raw: string; norm: string }[];
  /** Chords attached to word index in this section (local), or null = no word. */
  chords: UgSectionChord[];
  /** Pipe-bar grid events (`| G | G B7 |`); empty when section has no pipe rows. */
  pipeEvents: UgPipeChordEvent[];
  pipeBarCount: number;
  /** Optional structural bar count from UG layout. */
  structuralBars?: number;
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
  usSyllables: readonly import("../harmonic-accent.js").HarmonicSyllable[];
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

export type ApplyUsUgBridgeOptions = {
  applyBpm?: boolean;
  smartTempoAudio?: SmartTempoAudioRef;
};

export type ChordMsPlan = {
  sectionIndex: number;
  symbol: string;
  orderInSection: number;
  barOffset: number;
  ms: number;
  /** Same-word follow-up: place on structural N (no unique syllable ms). */
  structuralOnly: boolean;
};
