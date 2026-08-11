import {
  resolveFormaClipAt,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type TekstBlockRole,
  type TekstClip,
} from "@stagesync/shared";
import { buildBarCellsForClip } from "@lib/timeline/clientBarCells.js";
import {
  isPlaceholderLyric,
  toKaraokeLine,
  type KaraokeLine,
  type KaraokeSectionGroup,
} from "./karaokeTypes.js";

export function formaClipsForKaraoke(project: Project): FormaClip[] {
  return project.forma.clips
    .filter((c) => c.kind === "section" || c.kind === "countdown")
    .slice()
    .sort((a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id));
}

export function formaEndExclusive(
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
  if (formaClips.length > 0) {
    const last = formaClips[formaClips.length - 1]!;
    if (startTicks >= last.startTicks) return last;
  }
  return null;
}

/**
 * Karaoke section affiliation (v4 `resolveVocalSectionId`).
 *
 * Przedtakt: onset in the previous section’s last bar before the next Forma start → assign to next section.
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
