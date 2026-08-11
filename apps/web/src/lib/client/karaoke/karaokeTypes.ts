import {
  syntheticCountdownDisplayFromProject,
  withTekstBlockWordSpaces,
  type FormaClip,
  type Project,
  type TekstBlock,
  type TekstBlockRole,
  type TekstClip,
  type TimeSignature,
} from "@stagesync/shared";
import { type ClientBarCell } from "@lib/timeline/clientBarCells.js";

/** Timed syllable / word token for Client Karaoke highlight. */
export type KaraokeLineBlock = {
  id: string;
  text: string;
  active: boolean;
  past: boolean;
};

export type KaraokeLine = {
  id: string;
  text: string;
  startTicks: number;
  active: boolean;
  /** Present when the clip has timed blocks (V6+). */
  blocks?: KaraokeLineBlock[];
};

/** Forma section card — v4 `.karaoke-section` with lines or progress bars. */
export type KaraokeSectionGroup = {
  id: string;
  name: string;
  kind: FormaClip["kind"];
  active: boolean;
  /**
   * v4 `sectionUsesProgressBar`: no real lyric text → bar strip instead of lines.
   * Countdown never uses progress (digits are lines).
   */
  useProgress: boolean;
  bars: ClientBarCell[];
  lines: KaraokeLine[];
};

export type KaraokeLiveContext = {
  songTitle: string;
  sectionName: string;
  bbtLabel: string;
  tempoBpm: number;
  meterLabel: string;
  hasLyricLines: boolean;
  lyricLine: string | null;
  /** Flat lyric list (compat / tests). Prefer `sections` for render. */
  lines: KaraokeLine[];
  /** v4: one card per Forma section / Countdown. */
  sections: KaraokeSectionGroup[];
  /** Active section bar strip when that section uses progress (CL-01). */
  sectionBars: ClientBarCell[];
  /** Current beat in bar (1-based) — transport only; no line scale-pulse. */
  currentBeat: number;
  /**
   * Active block within the active line (half-open window).
   * Null when the line is active but no block covers `displayTicks`.
   */
  activeBlockId: string | null;
  /** Distinct block roles in lyric data — show filter UI when length ≥ 2. */
  availableRoles: TekstBlockRole[];
};

export type KaraokeBuildOptions = {
  /** When set, keep blocks with matching role, `all`, or no role. */
  roleFilter?: TekstBlockRole | null;
};

export const ROLE_ORDER: TekstBlockRole[] = [
  "vocal_1",
  "vocal_2",
  "backing",
  "all",
];

/** Polish labels for the optional Karaoke role filter. */
export const TEKST_BLOCK_ROLE_LABELS: Record<TekstBlockRole, string> = {
  vocal_1: "Wokal 1",
  vocal_2: "Wokal 2",
  backing: "Backing",
  all: "Wszyscy",
};

/** v4 `isPlaceholderVocalLine` — empty or `[Label]` placeholders. */
export function isPlaceholderLyric(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  return /^\[[^\]]+\]$/i.test(t);
}

/** Distinct roles present on lyric blocks (stable order). */
export function collectTekstBlockRoles(
  clips: Pick<TekstClip, "blocks">[],
): TekstBlockRole[] {
  const found = new Set<TekstBlockRole>();
  for (const clip of clips) {
    for (const block of clip.blocks ?? []) {
      if (block.role) found.add(block.role);
    }
  }
  return ROLE_ORDER.filter((r) => found.has(r));
}

/** Keep untagged / `all` blocks plus those matching `roleFilter`. */
export function filterTekstBlocksByRole(
  blocks: TekstBlock[],
  roleFilter?: TekstBlockRole | null,
): TekstBlock[] {
  if (roleFilter == null) return blocks;
  return blocks.filter(
    (b) => b.role == null || b.role === "all" || b.role === roleFilter,
  );
}

/**
 * Half-open highlight window for a syllable block: hold until the next block
 * starts (fills micro-gaps / 1-tick US notes). Last block holds to `lineEndTicks`.
 */
export function highlightEndTicksForBlock(
  blocks: readonly Pick<TekstBlock, "startTicks" | "lengthTicks">[],
  index: number,
  lineEndTicks: number,
): number {
  const b = blocks[index];
  if (b == null) return lineEndTicks;
  const next = blocks[index + 1];
  if (next != null && next.startTicks > b.startTicks) {
    return next.startTicks;
  }
  const authored = b.startTicks + Math.max(1, b.lengthTicks);
  return Math.max(authored, lineEndTicks);
}

/**
 * Half-open block window: `[start, highlightEnd)`.
 * Holds each syllable until the next onset (or line end) so short/collapsed
 * UltraStar notes stay yellow instead of flashing off in one tick.
 */
export function resolveActiveBlockId(
  blocks: Pick<TekstBlock, "id" | "startTicks" | "lengthTicks">[] | undefined,
  displayTicks: number,
  lineEndTicks?: number,
): string | null {
  if (blocks == null || blocks.length === 0) return null;
  const lineEnd =
    lineEndTicks ??
    Math.max(
      ...blocks.map((b) => b.startTicks + Math.max(1, b.lengthTicks)),
      displayTicks + 1,
    );
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]!;
    const end = highlightEndTicksForBlock(blocks, i, lineEnd);
    if (displayTicks >= b.startTicks && displayTicks < end) {
      return b.id;
    }
  }
  return null;
}

/**
 * Map clip blocks → highlight tokens. `undefined` when the clip has no blocks
 * (legacy / display-only without V6 shape). Empty array = all filtered out.
 * Word gaps: restore trailing spaces from `clip.text` when blocks were trimmed.
 * Active window holds until the next syllable (see {@link highlightEndTicksForBlock}).
 */
export function mapKaraokeBlocks(
  clip: Pick<TekstClip, "blocks" | "text" | "startTicks" | "lengthTicks">,
  displayTicks: number,
  lineActive: boolean,
  roleFilter?: TekstBlockRole | null,
): KaraokeLineBlock[] | undefined {
  const raw = clip.blocks;
  if (raw == null || raw.length === 0) return undefined;
  const spaced = withTekstBlockWordSpaces(clip.text, raw);
  const filtered = filterTekstBlocksByRole(spaced, roleFilter);
  const lineEnd = clip.startTicks + Math.max(1, clip.lengthTicks);
  return filtered.map((b, i) => {
    const end = highlightEndTicksForBlock(filtered, i, lineEnd);
    return {
      id: b.id,
      text: b.text,
      active: lineActive && displayTicks >= b.startTicks && displayTicks < end,
      past: displayTicks >= end,
    };
  });
}

export function toKaraokeLine(
  clip: TekstClip,
  displayTicks: number,
  activeLineId: string | null,
  roleFilter?: TekstBlockRole | null,
): KaraokeLine | null {
  const lineActive = activeLineId != null && clip.id === activeLineId;
  const blocks = mapKaraokeBlocks(clip, displayTicks, lineActive, roleFilter);
  if (blocks != null && blocks.length === 0) return null;
  return {
    id: clip.id,
    text: clip.text,
    startTicks: clip.startTicks,
    active: lineActive,
    ...(blocks != null ? { blocks } : {}),
  };
}

/** Persisted Tekst + synthetic CD digits (display-only) when playhead in/near CD. */
export function mergeTekstWithCountdownDigits(
  project: Project,
  displayTicks: number,
): TekstClip[] {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  const cdEnd = cd != null ? cd.startTicks + cd.lengthTicks : 0;
  const includeDigits = displayTicks < cdEnd;
  const synth = includeDigits
    ? syntheticCountdownDisplayFromProject(project).tekst
    : [];
  const real = (project.tekst?.clips ?? []).filter(
    (c) => !/^vl-cd-/i.test(c.id),
  );
  return [...synth, ...real].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

export function resolveMergedTekstAt(
  clips: TekstClip[],
  atTicks: number,
): TekstClip | null {
  for (const clip of clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}
