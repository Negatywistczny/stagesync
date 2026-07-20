/**
 * Content-lane (Tekst / Akordy / Cue) move / resize / pencil-draw via Forma helpers.
 */

import {
  insertSpanOverwrite,
  moveClipNoOverlap,
  resizeClipNoOverlap,
  resolveMeterAt,
  splitClipAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import type { FormaGesturePreview, FormaGestureSession } from "./timelineGesture.js";
import {
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  contentSnapModeFromModifiers,
} from "./timelineGesture.js";

export type ContentLaneId = "tekst" | "akordy" | "cue";

export function defaultPencilLabel(lane: ContentLaneId): string {
  if (lane === "tekst") return "…";
  if (lane === "akordy") return "C";
  return "Cue";
}

function labelOf(
  project: Project,
  lane: ContentLaneId,
  id: string,
): string {
  if (lane === "tekst") {
    return project.tekst.clips.find((c) => c.id === id)?.text || "…";
  }
  if (lane === "akordy") {
    return project.akordy.clips.find((c) => c.id === id)?.symbol || "…";
  }
  return project.cue.clips.find((c) => c.id === id)?.label || "…";
}

/** Map content clips → Forma-shaped list for shared collision. */
export function contentAsForma(
  project: Project,
  lane: ContentLaneId,
): FormaClip[] {
  const clips =
    lane === "tekst"
      ? project.tekst.clips
      : lane === "akordy"
        ? project.akordy.clips
        : project.cue.clips;
  return clips.map((c) => ({
    id: c.id,
    name: labelOf(project, lane, c.id),
    kind: "section" as const,
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
  }));
}

function mapFormaBack(
  project: Project,
  lane: ContentLaneId,
  formaClips: FormaClip[],
): Project {
  if (lane === "tekst") {
    const byId = new Map(project.tekst.clips.map((c) => [c.id, c]));
    const clips = formaClips
      .filter((c) => c.kind === "section")
      .map((c) => {
        const prev = byId.get(c.id);
        return {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          text: prev?.text ?? "",
        };
      });
    return { ...project, tekst: { clips } };
  }
  if (lane === "akordy") {
    const byId = new Map(project.akordy.clips.map((c) => [c.id, c]));
    const clips = formaClips
      .filter((c) => c.kind === "section")
      .map((c) => {
        const prev = byId.get(c.id);
        return {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          symbol: prev?.symbol ?? "C",
        };
      });
    return { ...project, akordy: { clips } };
  }
  const byId = new Map(project.cue.clips.map((c) => [c.id, c]));
  const clips = formaClips
    .filter((c) => c.kind === "section")
    .map((c) => {
      const prev = byId.get(c.id);
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        label: prev?.label ?? "Cue",
      };
    });
  return { ...project, cue: { clips } };
}

/** Scissors: split content clip at snapped ticks (v4 Tekst/Akordy/Cue). */
export function splitContentClipAt(
  project: Project,
  lane: ContentLaneId,
  clipId: string,
  atTicks: number,
  mode: SnapMode = "beat",
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(floor, snapEditTicks(project, atTicks, mode));
  const idPrefix =
    lane === "tekst" ? "tekst" : lane === "akordy" ? "akord" : "cue";
  const before = contentAsForma(project, lane);
  const clips = splitClipAt(before, clipId, snapped, {
    contentFloorTicks: floor,
    rightId: `${idPrefix}-${crypto.randomUUID()}`,
  });
  if (clips === before) return project;
  return mapFormaBack(project, lane, clips);
}

export function commitMoveContentClip(
  project: Project,
  lane: ContentLaneId,
  clipId: string,
  newStartTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(floor, snapEditTicks(project, newStartTicks, mode));
  const clips = moveClipNoOverlap(contentAsForma(project, lane), clipId, snapped, {
    contentFloorTicks: floor,
  });
  return mapFormaBack(project, lane, clips);
}

export function commitResizeContentClip(
  project: Project,
  lane: ContentLaneId,
  clipId: string,
  edge: "start" | "end",
  edgeTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = snapEditTicks(project, edgeTicks, mode);
  const clips = resizeClipNoOverlap(
    contentAsForma(project, lane),
    clipId,
    edge,
    snapped,
    { contentFloorTicks: floor },
  );
  return mapFormaBack(project, lane, clips);
}

/** Pencil drag / click: overwrite span on content lane (v4 insertClipRange). */
export function commitPencilContentSpan(
  project: Project,
  lane: ContentLaneId,
  startTicks: number,
  endTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  let a = snapEditTicks(project, startTicks, mode);
  let b = snapEditTicks(project, endTicks, mode);
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

  const idPrefix =
    lane === "tekst" ? "tekst" : lane === "akordy" ? "akord" : "cue";
  const newClip: FormaClip = {
    id: `${idPrefix}-${crypto.randomUUID()}`,
    name: defaultPencilLabel(lane),
    kind: "section",
    startTicks: a,
    lengthTicks: b - a,
  };

  const placed = insertSpanOverwrite(contentAsForma(project, lane), newClip, {
    contentFloorTicks: floor,
  });

  if (lane === "tekst") {
    const byId = new Map(project.tekst.clips.map((c) => [c.id, c]));
    const clips = placed
      .filter((c) => c.kind === "section")
      .map((c) => {
        if (c.id === newClip.id) {
          return {
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            text: "",
          };
        }
        const prev = byId.get(c.id);
        return {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          text: prev?.text ?? "",
        };
      });
    return { ...project, tekst: { clips } };
  }
  if (lane === "akordy") {
    const byId = new Map(project.akordy.clips.map((c) => [c.id, c]));
    const clips = placed
      .filter((c) => c.kind === "section")
      .map((c) => {
        if (c.id === newClip.id) {
          return {
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            symbol: "C",
          };
        }
        const prev = byId.get(c.id);
        return {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          symbol: prev?.symbol ?? "C",
        };
      });
    return { ...project, akordy: { clips } };
  }
  const byId = new Map(project.cue.clips.map((c) => [c.id, c]));
  const clips = placed
    .filter((c) => c.kind === "section")
    .map((c) => {
      if (c.id === newClip.id) {
        return {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          label: "Cue",
        };
      }
      const prev = byId.get(c.id);
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        label: prev?.label ?? "Cue",
      };
    });
  return { ...project, cue: { clips } };
}

export function commitContentGesture(
  project: Project,
  lane: ContentLaneId,
  session: FormaGestureSession,
  preview: FormaGesturePreview,
  metaKey: boolean,
  ctrlKey: boolean,
): Project {
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  switch (session.kind) {
    case "pencil-draw":
      return commitPencilContentSpan(
        project,
        lane,
        preview.startTicks,
        preview.startTicks + preview.lengthTicks,
        mode,
      );
    case "move":
      if (!session.clipId) return project;
      return commitMoveContentClip(
        project,
        lane,
        session.clipId,
        preview.startTicks,
        mode,
      );
    case "resize-start":
      if (!session.clipId) return project;
      return commitResizeContentClip(
        project,
        lane,
        session.clipId,
        "start",
        preview.startTicks,
        mode,
      );
    case "resize-end":
      if (!session.clipId) return project;
      return commitResizeContentClip(
        project,
        lane,
        session.clipId,
        "end",
        preview.startTicks + preview.lengthTicks,
        mode,
      );
    default:
      return project;
  }
}

/** Preview geometry for content move/resize/pencil (same math as Forma). */
export function previewContentFromSession(
  project: Project,
  session: FormaGestureSession,
  rawTicks: number,
  metaKey: boolean,
  ctrlKey: boolean,
  clientX?: number,
): FormaGesturePreview {
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  const floor = contentFloorTicks(project.forma.clips);

  if (session.kind === "pencil-draw") {
    const a = snapEditTicks(project, session.originTicks, mode);
    const b = snapEditTicks(project, rawTicks, mode);
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
      name: defaultPencilLabel(
        (session.lane as ContentLaneId | undefined) ?? "tekst",
      ),
    };
  }

  if (session.kind === "move") {
    const delta = rawTicks - session.originTicks;
    const unsnapped = session.originClipStart + delta;
    const snapped = Math.max(floor, snapEditTicks(project, unsnapped, mode));
    return {
      kind: "move",
      clipId: session.clipId,
      startTicks: snapped,
      lengthTicks: session.originClipLength,
    };
  }

  if (session.kind === "resize-start") {
    const end = session.originClipStart + session.originClipLength;
    let start = Math.max(floor, snapEditTicks(project, rawTicks, mode));
    if (end - start < 1) {
      start = Math.max(floor, end - 1);
    }
    return {
      kind: "resize-start",
      clipId: session.clipId,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
    };
  }

  let end = snapEditTicks(project, rawTicks, mode);
  const start = session.originClipStart;
  if (end - start < 1) {
    end = start + 1;
  }
  return {
    kind: "resize-end",
    clipId: session.clipId,
    startTicks: start,
    lengthTicks: Math.max(1, end - start),
  };
}
