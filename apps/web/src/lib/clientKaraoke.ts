import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  syntheticCountdownDisplayFromProject,
  ticksPerBar,
  ticksToBbtAlongMeterMap,
  toDisplayBar,
  withTekstBlockWordSpaces,
  type FormaClip,
  type Project,
  type TekstBlock,
  type TekstBlockRole,
  type TekstClip,
  type TimeSignature,
} from "@stagesync/shared";
import {
  buildBarCellsForClip,
  type ClientBarCell,
} from "./clientBarCells.js";
import { resolveTekstClipAt } from "./tekstEdit.js";

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

const ROLE_ORDER: TekstBlockRole[] = [
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
 * Half-open block window: `[start, start+length)`.
 * Returns null when no block covers `displayTicks`.
 */
export function resolveActiveBlockId(
  blocks: Pick<TekstBlock, "id" | "startTicks" | "lengthTicks">[] | undefined,
  displayTicks: number,
): string | null {
  if (blocks == null || blocks.length === 0) return null;
  for (const b of blocks) {
    if (
      displayTicks >= b.startTicks &&
      displayTicks < b.startTicks + b.lengthTicks
    ) {
      return b.id;
    }
  }
  return null;
}

/**
 * Map clip blocks → highlight tokens. `undefined` when the clip has no blocks
 * (legacy / display-only without V6 shape). Empty array = all filtered out.
 * Word gaps: restore trailing spaces from `clip.text` when blocks were trimmed.
 */
export function mapKaraokeBlocks(
  clip: Pick<TekstClip, "blocks" | "text">,
  displayTicks: number,
  lineActive: boolean,
  roleFilter?: TekstBlockRole | null,
): KaraokeLineBlock[] | undefined {
  const raw = clip.blocks;
  if (raw == null || raw.length === 0) return undefined;
  const spaced = withTekstBlockWordSpaces(clip.text, raw);
  return filterTekstBlocksByRole(spaced, roleFilter).map((b) => {
    const end = b.startTicks + b.lengthTicks;
    return {
      id: b.id,
      text: b.text,
      active:
        lineActive &&
        displayTicks >= b.startTicks &&
        displayTicks < end,
      past: displayTicks >= end,
    };
  });
}

function toKaraokeLine(
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
  // Show digits while playhead is still in Countdown (or before song start).
  const includeDigits = displayTicks < cdEnd;
  const synth = includeDigits
    ? syntheticCountdownDisplayFromProject(project).tekst
    : [];
  const real = (project.tekst?.clips ?? []).filter(
    (c) => !/^vl-cd-/i.test(c.id),
  );
  return [...synth, ...real].sort(
    (a, b) =>
      a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

function resolveMergedTekstAt(
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

function formaClipsForKaraoke(project: Project): FormaClip[] {
  return project.forma.clips
    .filter((c) => c.kind === "section" || c.kind === "countdown")
    .slice()
    .sort(
      (a, b) =>
        a.startTicks - b.startTicks || a.id.localeCompare(b.id),
    );
}

function formaEndExclusive(
  clip: FormaClip,
  next: FormaClip | undefined,
): number {
  return next ? next.startTicks : clip.startTicks + clip.lengthTicks;
}

/**
 * Containing Forma clip by onset only (no pickup promotion).
 * @deprecated Prefer {@link resolveFormaClipForLyric} for karaoke affiliation.
 */
export function resolveFormaClipForLyricStart(
  formaClips: FormaClip[],
  startTicks: number,
): FormaClip | null {
  for (let i = 0; i < formaClips.length; i++) {
    const clip = formaClips[i]!;
    const end = formaEndExclusive(clip, formaClips[i + 1]);
    if (startTicks >= clip.startTicks && startTicks < end) return clip;
  }
  // Past last section start with no next — keep on last.
  if (formaClips.length > 0) {
    const last = formaClips[formaClips.length - 1]!;
    if (startTicks >= last.startTicks) return last;
  }
  return null;
}

/**
 * Karaoke section affiliation (v4 `resolveVocalSectionId`).
 *
 * Przedtakt (“nachodzi na dwie części”): onset in the previous section’s
 * last bar before the next Forma start → assign to **next** section.
 * Countdown digit lines stay on Countdown even when a pickup overlaps.
 */
export function resolveFormaClipForLyric(
  project: Project,
  formaClips: FormaClip[],
  lyric: Pick<TekstClip, "startTicks" | "text">,
): FormaClip | null {
  const t = lyric.startTicks;
  const containing = resolveFormaClipForLyricStart(formaClips, t);
  if (!containing) return null;

  const containingIdx = formaClips.findIndex((c) => c.id === containing.id);
  const next =
    containingIdx >= 0 ? (formaClips[containingIdx + 1] ?? null) : null;

  const text = String(lyric.text ?? "").trim();
  const isCdDigit = /^\d+$/.test(text);
  if (containing.kind === "countdown" && isCdDigit) {
    return containing;
  }

  if (!next) return containing;

  const nextStart = next.startTicks;
  const meter = resolveMeterAt(project, nextStart);
  const barTicks = ticksPerBar(meter, project.ppq);
  // Last bar of previous section (and clip typically straddles the boundary).
  if (t < nextStart && t >= nextStart - barTicks) {
    return next;
  }

  return containing;
}

/**
 * Group lyric lines under Forma sections (v4 `buildSectionLineMap` + render).
 * Sections without real lyrics get progress bars (`useProgress`).
 */
export function groupKaraokeSections(
  project: Project,
  lyricClips: TekstClip[],
  displayTicks: number,
  activeLineId: string | null,
  roleFilter?: TekstBlockRole | null,
): KaraokeSectionGroup[] {
  const formaClips = formaClipsForKaraoke(project);
  const activeForma = resolveFormaClipAt(project, displayTicks);

  const buckets = new Map<string, KaraokeLine[]>();
  for (const f of formaClips) buckets.set(f.id, []);

  const orphanLines: KaraokeLine[] = [];

  for (const c of lyricClips) {
    const line = toKaraokeLine(c, displayTicks, activeLineId, roleFilter);
    if (!line) continue;
    const host = resolveFormaClipForLyric(project, formaClips, c);
    if (host) {
      buckets.get(host.id)!.push(line);
    } else {
      orphanLines.push(line);
    }
  }

  // Prefer section of the active lyric line (v4 findActiveVocalLine).
  const activeClip =
    activeLineId != null
      ? (lyricClips.find((c) => c.id === activeLineId) ?? null)
      : null;
  const activeLineHostId = activeClip
    ? (resolveFormaClipForLyric(project, formaClips, activeClip)?.id ?? null)
    : null;
  const activeSectionId = activeLineHostId ?? activeForma?.id ?? null;

  const groups: KaraokeSectionGroup[] = formaClips.map((f) => {
    const raw = buckets.get(f.id) ?? [];
    const isCountdown = f.kind === "countdown";
    const useProgress =
      !isCountdown &&
      (raw.length === 0 || raw.every((l) => isPlaceholderLyric(l.text)));
    const lines = useProgress
      ? raw.filter((l) => !isPlaceholderLyric(l.text))
      : raw;
    const bars = useProgress
      ? buildBarCellsForClip(
          project,
          f.startTicks,
          f.startTicks + f.lengthTicks,
          displayTicks,
        )
      : [];

    return {
      id: f.id,
      name: f.name,
      kind: f.kind,
      active: f.id === activeSectionId,
      useProgress,
      bars,
      lines,
    };
  });

  // Lyrics that fall outside any Forma span — rare; keep visible under a card.
  if (orphanLines.length > 0) {
    groups.push({
      id: "__orphan__",
      name: "—",
      kind: "section",
      active: orphanLines.some((l) => l.active),
      useProgress: false,
      bars: [],
      lines: orphanLines,
    });
  }

  return groups;
}

export function buildKaraokeLiveContext(
  project: Project | null,
  displayTicks: number,
  opts?: KaraokeBuildOptions,
): KaraokeLiveContext | null {
  if (!project) return null;
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const tempo = resolveTempoAt(project, displayTicks);
  const bbt = ticksToBbtAlongMeterMap(
    displayTicks,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
  const clips = mergeTekstWithCountdownDigits(project, displayTicks).filter(
    (c) => c.text.trim().length > 0,
  );
  const tekst =
    resolveMergedTekstAt(clips, displayTicks) ??
    resolveTekstClipAt(project, displayTicks);
  const lyricLine = tekst?.text?.trim() ? tekst.text : null;
  const hasLyricLines = clips.length > 0;

  // v4 VocalTiming.findActiveLine: only inside a clip window; gaps/rests → null
  // (no “hold previous / peek next” highlight during pauses).
  const activeIdx = clips.findIndex(
    (c) =>
      displayTicks >= c.startTicks &&
      displayTicks < c.startTicks + c.lengthTicks,
  );

  const activeLineId =
    activeIdx >= 0 ? (clips[activeIdx]?.id ?? null) : null;

  const availableRoles = collectTekstBlockRoles(clips);
  // Apply filter only when ≥2 roles are present and the choice is still valid.
  const requested = opts?.roleFilter ?? null;
  const roleFilter =
    availableRoles.length >= 2 &&
    requested != null &&
    availableRoles.includes(requested)
      ? requested
      : null;

  const lines: KaraokeLine[] = [];
  for (const c of clips) {
    const line = toKaraokeLine(c, displayTicks, activeLineId, roleFilter);
    if (line) lines.push(line);
  }

  const activeClip = activeIdx >= 0 ? (clips[activeIdx] ?? null) : null;
  const activeBlockId =
    activeClip != null
      ? resolveActiveBlockId(
          filterTekstBlocksByRole(activeClip.blocks ?? [], roleFilter),
          displayTicks,
        )
      : null;

  const sections = groupKaraokeSections(
    project,
    clips,
    displayTicks,
    activeLineId,
    roleFilter,
  );

  const activeGroup =
    sections.find((s) => s.active) ??
    sections.find((s) => s.id === section?.id) ??
    null;

  const sectionBars =
    activeGroup?.useProgress === true ? activeGroup.bars : [];

  return {
    songTitle: project.name,
    sectionName: section?.name ?? "—",
    bbtLabel: `${toDisplayBar(bbt.bar)}.${bbt.beat}`,
    tempoBpm: tempo,
    meterLabel: `${meter.numerator}/${meter.denominator}`,
    hasLyricLines,
    lyricLine,
    lines,
    sections,
    sectionBars,
    currentBeat: bbt.beat,
    activeBlockId,
    availableRoles,
  };
}

export function formatKaraokeTransportLine(
  ctx: KaraokeLiveContext,
  fallbackMeter: TimeSignature,
): string {
  return `${ctx.sectionName} · takt ${ctx.bbtLabel} · ${ctx.tempoBpm} BPM · ${ctx.meterLabel || `${fallbackMeter.numerator}/${fallbackMeter.denominator}`}`;
}
