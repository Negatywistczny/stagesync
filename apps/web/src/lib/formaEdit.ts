/**
 * Forma project mutations for α7 geometry edit (commit on pointerup).
 */

import {
  deleteClip,
  insertGapSectionAfterCountdown,
  insertSpanOverwrite,
  moveClipNoOverlap,
  moveClipsRigidDelta,
  resizeClipNoOverlap,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import {
  applyCountdownLengthFromBoundary,
  setCountdownBars,
} from "./formaInspector.js";
import {
  fill4BarGapsFromLeft,
  moveSubsectionBoundary,
  subsectionMaxChunkForClip,
  withFormaSubsections,
} from "./formaSubsections.js";
import type { FormaGesturePreview, FormaGestureSession } from "./timelineGesture.js";
import {
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  snapModeFromModifiers,
} from "./timelineGesture.js";

export function snapEditTicksWithMode(
  project: Project,
  atTicks: number,
  mode: SnapMode,
): number {
  return snapEditTicks(project, atTicks, mode);
}

export function deleteFormaClip(project: Project, clipId: string): Project {
  const clips = deleteClip(project.forma.clips, clipId);
  if (clips === project.forma.clips) return project;
  return { ...project, forma: { clips } };
}

/**
 * Section (not countdown) whose span covers `ticks` (half-open).
 * Used for empty-lane scissors hit-test.
 */
export function formaSectionCoveringTicks(
  project: Project,
  ticks: number,
): FormaClip | null {
  for (const c of project.forma.clips) {
    if (c.kind !== "section") continue;
    if (ticks >= c.startTicks && ticks < c.startTicks + c.lengthTicks) {
      return c;
    }
  }
  return null;
}

/**
 * Scissors on Forma — insert subsection boundary (v4 insertSubsectionBoundary).
 * Does **not** split into two section clips (legacy parity).
 */
export function insertFormaSubsectionAt(
  project: Project,
  clipId: string,
  atTicks: number,
  mode: SnapMode = "bar",
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(floor, snapEditTicksWithMode(project, atTicks, mode));
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind === "countdown") return project;

  const rel = snapped - clip.startTicks;
  const meter = resolveMeterAt(project, snapped);
  const barTicks = ticksPerBar(meter, project.ppq);
  if (rel < barTicks || rel > clip.lengthTicks - barTicks) return project;

  const existing = clip.subsections ?? [];
  if (existing.some((s) => s === rel)) return project;
  const maxChunk = subsectionMaxChunkForClip(project, clip);
  const subsections = fill4BarGapsFromLeft(
    [...existing, rel],
    clip.lengthTicks,
    maxChunk,
  );
  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.id === clipId ? withFormaSubsections(c, subsections) : c,
      ),
    },
  };
}

/**
 * Drag interior subsection boundary (v4 moveSubsectionBoundary + 4-bar fill).
 * `boundarySubIdx` ≥ 1 (band index whose start is the boundary).
 */
export function commitSubsectionBoundaryMove(
  project: Project,
  clipId: string,
  boundarySubIdx: number,
  newAbsTicks: number,
  mode: SnapMode = "bar",
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(floor, snapEditTicksWithMode(project, newAbsTicks, mode));
  const clip = project.forma.clips.find((c) => c.id === clipId);
  if (!clip || clip.kind === "countdown") return project;

  const maxChunk = subsectionMaxChunkForClip(project, clip);
  const next = moveSubsectionBoundary(
    clip.subsections ?? [],
    clip.lengthTicks,
    boundarySubIdx,
    snapped - clip.startTicks,
    maxChunk,
  );
  if (next == null) return project;
  const prev = normalizeOffsetsKey(clip.subsections);
  const after = normalizeOffsetsKey(next);
  if (prev === after) return project;

  return {
    ...project,
    forma: {
      clips: project.forma.clips.map((c) =>
        c.id === clipId ? withFormaSubsections(c, next) : c,
      ),
    },
  };
}

function normalizeOffsetsKey(offsets: readonly number[] | undefined): string {
  return (offsets ?? []).join(",");
}

/** @deprecated Prefer insertFormaSubsectionAt (v4 scissors = podsekcja). Kept for content-lane split helpers. */
export function splitFormaClipAt(
  project: Project,
  clipId: string,
  atTicks: number,
  mode: SnapMode = "bar",
): Project {
  return insertFormaSubsectionAt(project, clipId, atTicks, mode);
}

export function commitPencilSpan(
  project: Project,
  startTicks: number,
  endTicks: number,
  sectionName: string,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  let a = snapEditTicksWithMode(project, startTicks, mode);
  let b = snapEditTicksWithMode(project, endTicks, mode);
  if (b < a) {
    const t = a;
    a = b;
    b = t;
  }
  a = Math.max(floor, a);
  b = Math.max(a, b);

  const meter = resolveMeterAt(project, a);
  const barTicks = ticksPerBar(meter, project.ppq);
  if (b - a < 1) {
    b = a + barTicks;
  }

  const newClip: FormaClip = {
    id: `forma-${crypto.randomUUID()}`,
    name: sectionName.slice(0, 120),
    kind: "section",
    startTicks: a,
    lengthTicks: b - a,
  };

  const clips = insertSpanOverwrite(project.forma.clips, newClip, {
    contentFloorTicks: floor,
  });
  return { ...project, forma: { clips } };
}

export function commitMoveClip(
  project: Project,
  clipId: string,
  newStartTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = snapEditTicksWithMode(project, newStartTicks, mode);
  let clips = moveClipNoOverlap(project.forma.clips, clipId, snapped, {
    contentFloorTicks: floor,
  });
  // TE-23: fill Intro gap when first post-CD section leaves space after Countdown.
  clips = insertGapSectionAfterCountdown(clips, clipId, {
    contentFloorTicks: floor,
  });
  return { ...project, forma: { clips } };
}

/** IDs to move when dragging a single Forma section (TE-24 cascade). */
export function cascadeFormaMoveIds(
  clips: readonly FormaClip[],
  clipId: string,
): string[] {
  const target = clips.find((c) => c.id === clipId);
  if (!target || target.kind === "countdown") return [clipId];
  return clips
    .filter((c) => c.kind !== "countdown" && c.startTicks >= target.startTicks)
    .map((c) => c.id);
}

/** Multi-move same Δ from primary preview start (v4 moveIds). */
export function commitMoveClips(
  project: Project,
  moveIds: string[],
  primaryId: string,
  primaryNewStartTicks: number,
  mode: SnapMode,
): Project {
  if (moveIds.length <= 1) {
    return commitMoveClip(project, primaryId, primaryNewStartTicks, mode);
  }
  const primary = project.forma.clips.find((c) => c.id === primaryId);
  if (!primary || primary.kind === "countdown") return project;
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = snapEditTicksWithMode(project, primaryNewStartTicks, mode);
  const delta = snapped - primary.startTicks;
  if (delta === 0) return project;
  const clips = moveClipsRigidDelta(project.forma.clips, moveIds, delta, {
    contentFloorTicks: floor,
  });
  return { ...project, forma: { clips } };
}

export function commitResizeClip(
  project: Project,
  clipId: string,
  edge: "start" | "end",
  edgeTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = snapEditTicksWithMode(project, edgeTicks, mode);
  const clips = resizeClipNoOverlap(
    project.forma.clips,
    clipId,
    edge,
    snapped,
    { contentFloorTicks: floor },
  );
  return { ...project, forma: { clips } };
}

export function previewFromSession(
  project: Project,
  session: FormaGestureSession,
  rawTicks: number,
  metaKey: boolean,
  ctrlKey: boolean,
  sectionName?: string,
  clientX?: number,
  /** Effective px/bar — CD length drag uses clientX delta (scroll-independent). */
  pxPerBar?: number,
): FormaGesturePreview {
  const mode = snapModeFromModifiers(metaKey, ctrlKey);
  const floor = contentFloorTicks(project.forma.clips);

  if (session.kind === "pencil-draw") {
    const a = snapEditTicksWithMode(project, session.originTicks, mode);
    const b = snapEditTicksWithMode(project, rawTicks, mode);
    const meter = resolveMeterAt(project, Math.max(floor, Math.min(a, b)));
    const barTicks = ticksPerBar(meter, project.ppq);
    const dxPx =
      clientX != null && session.originClientX != null
        ? Math.abs(clientX - session.originClientX)
        : a !== b
          ? PENCIL_DRAG_THRESHOLD_PX
          : 0;
    const range = resolvePencilRangeTicks(a, b, {
      barTicks,
      dxPx,
      floorTicks: floor,
    });
    return {
      kind: "pencil-draw",
      clipId: null,
      startTicks: range.startTicks,
      lengthTicks: range.lengthTicks,
      name: (sectionName ?? "Sekcja").slice(0, 120),
    };
  }

  if (session.kind === "move") {
    const delta = rawTicks - session.originTicks;
    const unsnapped = session.originClipStart + delta;
    const snapped = Math.max(
      floor,
      snapEditTicksWithMode(project, unsnapped, mode),
    );
    return {
      kind: "move",
      clipId: session.clipId,
      startTicks: snapped,
      lengthTicks: session.originClipLength,
    };
  }

  if (session.kind === "resize-start") {
    const end = session.originClipStart + session.originClipLength;
    let start = Math.max(
      floor,
      snapEditTicksWithMode(project, rawTicks, mode),
    );
    if (end - start < 1) {
      const meter = resolveMeterAt(project, end);
      start = end - ticksPerBar(meter, project.ppq);
      start = Math.max(floor, start);
    }
    return {
      kind: "resize-start",
      clipId: session.clipId,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
    };
  }

  if (session.kind === "subsection-boundary") {
    const clip = project.forma.clips.find((c) => c.id === session.clipId);
    const length = session.originClipLength;
    const start = session.originClipStart;
    const idx = session.boundarySubIdx ?? 1;
    const maxChunk = clip
      ? subsectionMaxChunkForClip(project, clip)
      : ticksPerBar(resolveMeterAt(project, start), project.ppq) * 4;
    const snappedAbs = Math.max(
      floor,
      snapEditTicksWithMode(project, rawTicks, mode),
    );
    const next = moveSubsectionBoundary(
      clip?.subsections ?? [],
      length,
      idx,
      snappedAbs - start,
      maxChunk,
    );
    return {
      kind: "subsection-boundary",
      clipId: session.clipId,
      startTicks: start,
      lengthTicks: length,
      subsections: next ?? clip?.subsections,
    };
  }

  if (session.kind === "countdown-length") {
    // v4 body/right-edge: newEnd = originEnd + delta. Do not use snapEditTicks —
    // that clamps to content floor and blocks shorten. Snap length in whole bars
    // from CD start; preview is end-pinned (left edge moves) for renorm @ 0.
    // Prefer clientX→ticks when available so scroll-to-start during drag stays stable.
    const originEnd = session.originClipStart + session.originClipLength;
    const meter = resolveMeterAt(project, Math.max(0, originEnd));
    const barTicks = ticksPerBar(meter, project.ppq);
    let delta: number;
    if (
      clientX != null &&
      session.originClientX != null &&
      pxPerBar != null &&
      pxPerBar > 0
    ) {
      delta = Math.round(((clientX - session.originClientX) / pxPerBar) * barTicks);
    } else {
      delta = rawTicks - session.originTicks;
    }
    const rawEnd = originEnd + delta;
    const rawLen = rawEnd - session.originClipStart;
    const bars =
      mode === "off"
        ? Math.max(1, Math.round(rawLen / barTicks) || 1)
        : Math.max(1, Math.round(rawLen / barTicks));
    const lengthTicks = bars * barTicks;
    return {
      kind: "countdown-length",
      clipId: session.clipId,
      startTicks: originEnd - lengthTicks,
      lengthTicks,
    };
  }

  // resize-end
  let end = snapEditTicksWithMode(project, rawTicks, mode);
  const start = session.originClipStart;
  if (end - start < 1) {
    const meter = resolveMeterAt(project, start);
    end = start + ticksPerBar(meter, project.ppq);
  }
  return {
    kind: "resize-end",
    clipId: session.clipId,
    startTicks: start,
    lengthTicks: Math.max(1, end - start),
  };
}

export function commitGesture(
  project: Project,
  session: FormaGestureSession,
  preview: FormaGesturePreview,
  metaKey: boolean,
  ctrlKey: boolean,
): Project {
  const mode = snapModeFromModifiers(metaKey, ctrlKey);
  switch (session.kind) {
    case "pencil-draw":
      return commitPencilSpan(
        project,
        preview.startTicks,
        preview.startTicks + preview.lengthTicks,
        preview.name ?? "Sekcja",
        mode,
      );
    case "move":
      if (!session.clipId) return project;
      if (session.moveIds && session.moveIds.length > 1) {
        return commitMoveClips(
          project,
          session.moveIds,
          session.clipId,
          preview.startTicks,
          mode,
        );
      }
      return commitMoveClip(project, session.clipId, preview.startTicks, mode);
    case "resize-start":
      if (!session.clipId) return project;
      return commitResizeClip(
        project,
        session.clipId,
        "start",
        preview.startTicks,
        mode,
      );
    case "resize-end":
      if (!session.clipId) return project;
      return commitResizeClip(
        project,
        session.clipId,
        "end",
        preview.startTicks + preview.lengthTicks,
        mode,
      );
    case "countdown-length":
      if (!session.clipId) return project;
      {
        // Desired end before renorm = originStart + preview length (v4 boundary).
        const newEnd = session.originClipStart + preview.lengthTicks;
        const next = applyCountdownLengthFromBoundary(project, newEnd);
        if (next !== project) return next;
        const meter = resolveMeterAt(project, 0);
        const barTicks = ticksPerBar(meter, project.ppq);
        const bars = Math.max(1, Math.round(preview.lengthTicks / barTicks));
        return setCountdownBars(project, bars);
      }
    case "subsection-boundary":
      if (!session.clipId) return project;
      {
        const clip = project.forma.clips.find((c) => c.id === session.clipId);
        if (!clip) return project;
        const next = preview.subsections ?? null;
        const prevKey = (clip.subsections ?? []).join(",");
        const nextKey = (next ?? []).join(",");
        if (prevKey === nextKey) return project;
        return {
          ...project,
          forma: {
            clips: project.forma.clips.map((c) =>
              c.id === session.clipId
                ? withFormaSubsections(c, next?.length ? next : undefined)
                : c,
            ),
          },
        };
      }
    default:
      return project;
  }
}
