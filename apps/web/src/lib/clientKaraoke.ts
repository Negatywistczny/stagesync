import {
  resolveFormaClipAt,
  resolveMeterAt,
  resolveTempoAt,
  syntheticCountdownDisplayFromProject,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  type FormaClip,
  type Project,
  type TekstClip,
  type TimeSignature,
} from "@stagesync/shared";
import {
  buildBarCellsForClip,
  type ClientBarCell,
} from "./clientBarCells.js";
import { resolveTekstClipAt } from "./tekstEdit.js";

export type KaraokeLine = {
  id: string;
  text: string;
  startTicks: number;
  active: boolean;
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
};

/** v4 `isPlaceholderVocalLine` — empty or `[Label]` placeholders. */
export function isPlaceholderLyric(text: string): boolean {
  const t = String(text || "").trim();
  if (!t) return true;
  return /^\[[^\]]+\]$/i.test(t);
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
): KaraokeSectionGroup[] {
  const formaClips = formaClipsForKaraoke(project);
  const activeForma = resolveFormaClipAt(project, displayTicks);

  const buckets = new Map<string, KaraokeLine[]>();
  for (const f of formaClips) buckets.set(f.id, []);

  const orphanLines: KaraokeLine[] = [];

  for (const c of lyricClips) {
    const line: KaraokeLine = {
      id: c.id,
      text: c.text,
      startTicks: c.startTicks,
      active: activeLineId != null && c.id === activeLineId,
    };
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
): KaraokeLiveContext | null {
  if (!project) return null;
  const section = resolveFormaClipAt(project, displayTicks);
  const meter = resolveMeterAt(project, displayTicks);
  const tempo = resolveTempoAt(project, displayTicks);
  const bbt = ticksToBbt(displayTicks, meter, project.ppq);
  const clips = mergeTekstWithCountdownDigits(project, displayTicks).filter(
    (c) => c.text.trim().length > 0,
  );
  const tekst =
    resolveMergedTekstAt(clips, displayTicks) ??
    resolveTekstClipAt(project, displayTicks);
  const lyricLine = tekst?.text?.trim() ? tekst.text : null;
  const hasLyricLines = clips.length > 0;

  let activeIdx = clips.findIndex(
    (c) =>
      displayTicks >= c.startTicks &&
      displayTicks < c.startTicks + c.lengthTicks,
  );
  if (activeIdx < 0 && clips.length > 0) {
    // Between clips — show nearest upcoming, else last past.
    const next = clips.findIndex((c) => c.startTicks > displayTicks);
    activeIdx = next >= 0 ? next : clips.length - 1;
  }

  const activeLineId =
    activeIdx >= 0 ? (clips[activeIdx]?.id ?? null) : null;

  const lines: KaraokeLine[] = clips.map((c) => ({
    id: c.id,
    text: c.text,
    startTicks: c.startTicks,
    active: activeLineId != null && c.id === activeLineId,
  }));

  const sections = groupKaraokeSections(
    project,
    clips,
    displayTicks,
    activeLineId,
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
  };
}

export function formatKaraokeTransportLine(
  ctx: KaraokeLiveContext,
  fallbackMeter: TimeSignature,
): string {
  return `${ctx.sectionName} · takt ${ctx.bbtLabel} · ${ctx.tempoBpm} BPM · ${ctx.meterLabel || `${fallbackMeter.numerator}/${fallbackMeter.denominator}`}`;
}
