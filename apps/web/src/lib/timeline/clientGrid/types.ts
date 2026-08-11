import type { AkordClip } from "@stagesync/shared";

export type GridCycleStep = {
  symbol: string;
  /** Duration in bar units (may be fractional, e.g. 0.5 for a half-bar tile). */
  bars: number;
  active: boolean;
  /** Which bar within this step is current (1-based), when active. */
  activeBarInStep: number | null;
  /** True when the tile is narrower than one full bar (v4 sub-bar slot). */
  isSubBar?: boolean;
};

/** Raw chord span within a subsection — built from akord clip windows, not bar starts. */
export type ChordStepSpan = {
  symbol: string;
  startTicks: number;
  endTicks: number;
  barUnits: number;
};

export type GridLiveContext = {
  current: AkordClip | null;
  upcoming: AkordClip[];
  emptyReason: string | null;
  /** Compressed cycle for active Forma subsection (CL-04). */
  cycle: GridCycleStep[];
  /** Upcoming phrase row (next subsection / next section first band). */
  nextCycle: GridCycleStep[];
  /** Large hero chord symbol (raw, before display prefs). */
  hero: string;
  /** Hero “nast.” preview — next chord change. */
  heroNext: string | null;
  sectionName: string | null;
  /** 0-based band within the active Forma section; null when no section. */
  subsectionIndex: number | null;
  /** Number of subsection bands (1 when no interior boundaries). */
  subsectionCount: number | null;
  /** Stable key for carousel row identity (section + subsection). */
  carouselKey: string;
  /** Playhead in Countdown — current row collapsed, next holds first verse. */
  countdownPreview: boolean;
  /** Hero digit / CD styling. */
  isCountdown: boolean;
};
