import {
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
} from "@stagesync/shared";
import { snapEditTicks } from "./formaCanvas.js";
import {
  fill4BarGapsFromLeft,
  subsectionMaxChunkForClip,
  subsectionRanges,
  withFormaSubsections,
  type SubsectionRange,
} from "./formaSubsections.js";
import { logicBarFromTicks, ticksFromLogicBar } from "./scoreBarEdit.js";

export function renameFormaClip(project: Project, clipId: string, name: string): Project {
  const trimmed = name.trim();
  if (!trimmed) return project;
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.id === clipId ? { ...c, name: trimmed } : c,
      ),
    },
  };
}

/** Countdown length in full bars @ meter at tick 0; updates startTicks = -lengthTicks. */
export function setCountdownBars(project: Project, bars: number): Project {
  if (!Number.isInteger(bars) || bars < 1) {
    throw new RangeError("Countdown length must be at least 1 bar");
  }
  const meter = resolveMeterAt(project, 0);
  const barTicks = ticksPerBar(meter, project.ppq);
  const lengthTicks = bars * barTicks;
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.kind === "countdown"
          ? { ...c, lengthTicks, startTicks: -lengthTicks }
          : c,
      ),
    },
  };
}

export function countdownBars(project: Project, clip: FormaClip): number {
  if (clip.kind !== "countdown") return 1;
  const meter = resolveMeterAt(project, 0);
  const barTicks = ticksPerBar(meter, project.ppq);
  return Math.max(1, Math.round(clip.lengthTicks / barTicks));
}

export type FormaSubsectionRow = SubsectionRange & {
  /** Display bar (1-based) of the band start. */
  startDisplayBar: number;
};

/**
 * Inspector list rows for stored subsections (v4 Podsekcje).
 * Empty when the clip has no interior boundaries — UI shows „Brak podsekcji”.
 */
export function formaSubsectionRows(
  project: Project,
  clip: FormaClip,
): FormaSubsectionRow[] {
  if (clip.kind !== "section") return [];
  const offsets = clip.subsections ?? [];
  if (!offsets.length) return [];
  return subsectionRanges(offsets, clip.lengthTicks).map((r) => ({
    ...r,
    startDisplayBar: logicBarFromTicks(project, clip.startTicks + r.startRel),
  }));
}

function applySubsectionOffsets(
  project: Project,
  clipId: string,
  offsets: number[],
): Project {
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind !== "section") return project;
  const maxChunk = subsectionMaxChunkForClip(project, clip);
  const next = fill4BarGapsFromLeft(offsets, clip.lengthTicks, maxChunk);
  const prevKey = (clip.subsections ?? []).join(",");
  const nextKey = next.join(",");
  if (prevKey === nextKey) return project;
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.id === clipId ? withFormaSubsections(c, next) : c,
      ),
    },
  };
}

/**
 * Inspector „+” — insert interior boundary at midpoint of last span (v4 addSectionSubsection).
 * Returns `{ project, selectIdx }` or null when there is no room.
 */
export function addFormaSubsection(
  project: Project,
  clipId: string,
): { project: Project; selectIdx: number } | null {
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind !== "section") return null;

  const ranges = subsectionRanges(clip.subsections, clip.lengthTicks);
  const last = ranges[ranges.length - 1]!;
  const meter = resolveMeterAt(project, clip.startTicks + last.startRel);
  const barTicks = ticksPerBar(meter, project.ppq);
  const beatTicks = Math.max(1, Math.floor(barTicks / Math.max(1, meter.numerator)));

  let cutRel: number;
  if (last.lengthRel >= 2 * beatTicks) {
    // Midpoint of last span (v4: lengthBeats ≥ 2).
    cutRel = last.startRel + Math.floor(last.lengthRel / 2);
  } else {
    cutRel = barTicks;
  }

  const abs = snapEditTicks(project, clip.startTicks + cutRel, "bar");
  cutRel = abs - clip.startTicks;
  if (!(cutRel > 0 && cutRel < clip.lengthTicks)) return null;
  if ((clip.subsections ?? []).some((s) => s === cutRel)) return null;

  const next = applySubsectionOffsets(project, clipId, [
    ...(clip.subsections ?? []),
    cutRel,
  ]);
  if (next === project) return null;

  const updated = next.forma.clips.find((c) => c.id === clipId)!;
  const rows = subsectionRanges(updated.subsections, updated.lengthTicks);
  const selectIdx = rows.findIndex((r) => r.startRel === cutRel);
  return {
    project: next,
    selectIdx: selectIdx >= 0 ? selectIdx : Math.max(0, rows.length - 1),
  };
}

/**
 * Inspector „×” — remove band at index by dropping a boundary (v4 deleteSectionSubsection).
 */
export function deleteFormaSubsection(
  project: Project,
  clipId: string,
  index: number,
): { project: Project; selectIdx: number } | null {
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind !== "section") return null;

  const ranges = subsectionRanges(clip.subsections, clip.lengthTicks);
  if (ranges.length < 2) {
    // Already a single span — clear storage.
    if (!(clip.subsections?.length)) return null;
    const cleared = {
      ...project,
      forma: {
        clips: project.forma.clips.map((c) =>
          c.id === clipId ? withFormaSubsections(c, []) : c,
        ),
      },
    };
    return { project: cleared, selectIdx: 0 };
  }

  const idx = Math.round(Number(index));
  if (!Number.isFinite(idx) || idx < 0 || idx >= ranges.length) return null;

  // Index 0 merges with next; last merges with prev; else merge with prev.
  let merge: "prev" | "next" = idx === 0 ? "next" : "prev";
  if (idx === ranges.length - 1) merge = "prev";
  const dropRel =
    merge === "next" ? ranges[idx + 1]!.startRel : ranges[idx]!.startRel;

  const starts = ranges
    .map((r) => r.startRel)
    .filter((s) => s > 0 && s !== dropRel);

  const next = applySubsectionOffsets(project, clipId, starts);
  const updated = next.forma.clips.find((c) => c.id === clipId)!;
  const maxIdx = Math.max(
    0,
    subsectionRanges(updated.subsections, updated.lengthTicks).length - 1,
  );
  const selectAfter = Math.max(0, Math.min(idx === 0 ? 0 : idx - 1, maxIdx));
  return { project: next, selectIdx: selectAfter };
}

/**
 * Commit start-bar edits from the inspector list (v4 commitSectionSubsectionBars).
 * Index 0 is locked to the section start. Returns updated project (or same).
 */
export function setFormaSubsectionStartBar(
  project: Project,
  clipId: string,
  index: number,
  displayBar: number,
): Project {
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind !== "section") return project;
  const idx = Math.round(Number(index));
  if (!Number.isFinite(idx) || idx < 1) return project;

  const ranges = subsectionRanges(clip.subsections, clip.lengthTicks);
  if (idx >= ranges.length) return project;

  const bar = Math.max(1, Math.round(Number(displayBar)) || 1);
  const abs = snapEditTicks(project, ticksFromLogicBar(project, bar), "bar");
  let cutRel = abs - clip.startTicks;
  const prevStart = ranges[idx - 1]!.startRel;
  const nextStart =
    idx + 1 < ranges.length ? ranges[idx + 1]!.startRel : clip.lengthTicks;
  cutRel = Math.max(prevStart + 1, Math.min(cutRel, nextStart - 1));
  if (!(cutRel > prevStart && cutRel < nextStart)) return project;

  const starts = ranges.map((r) => r.startRel);
  starts[idx] = cutRel;
  return applySubsectionOffsets(
    project,
    clipId,
    starts.filter((s) => s > 0),
  );
}
