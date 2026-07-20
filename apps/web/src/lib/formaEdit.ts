/**
 * Forma project mutations for α7 geometry edit (commit on pointerup).
 */

import {
  deleteClip,
  insertSpanOverwrite,
  moveClipNoOverlap,
  resizeClipNoOverlap,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import type { FormaGesturePreview, FormaGestureSession } from "./timelineGesture.js";
import { snapModeFromModifiers } from "./timelineGesture.js";

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
    name: sectionName,
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
  const clips = moveClipNoOverlap(project.forma.clips, clipId, snapped, {
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
): FormaGesturePreview {
  const mode = snapModeFromModifiers(metaKey, ctrlKey);
  const floor = contentFloorTicks(project.forma.clips);

  if (session.kind === "pencil-draw") {
    let a = snapEditTicksWithMode(project, session.originTicks, mode);
    let b = snapEditTicksWithMode(project, rawTicks, mode);
    if (b < a) {
      const t = a;
      a = b;
      b = t;
    }
    a = Math.max(floor, a);
    const meter = resolveMeterAt(project, a);
    const barTicks = ticksPerBar(meter, project.ppq);
    let length = Math.max(b - a, 0);
    if (length < 1) length = barTicks;
    return {
      kind: "pencil-draw",
      clipId: null,
      startTicks: a,
      lengthTicks: length,
      name: sectionName ?? "Sekcja",
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
    default:
      return project;
  }
}
