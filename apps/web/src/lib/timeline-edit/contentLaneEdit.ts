/**
 * Content-lane (Tekst / Akordy / Cue) move / resize / pencil-draw via Forma helpers.
 */

import {
  moveClipNoOverlap,
  moveClipsRigidDelta,
  resizeClipNoOverlap,
  splitClipAt,
  type FormaClip,
  type Project,
  type SnapMode,
  type TekstClip,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import { contentSnapModeFromModifiers } from "@lib/timeline/timelineGesture.js";
import { joinTekstClips, remapTekstClipGeometry } from "./tekstBlocks.js";
import {
  contentAsForma,
  resolveSplitParentId,
  type ContentLaneId,
} from "./contentLaneEdit/helpers.js";

export type { ContentLaneId } from "./contentLaneEdit/helpers.js";
export {
  defaultPencilLabel,
  contentAsForma,
  resolveSplitParentId,
} from "./contentLaneEdit/helpers.js";
import {
  commitPencilContentSpan,
  previewContentFromSession,
} from "./contentLaneEdit/pencil-gesture.js";
export { commitPencilContentSpan, previewContentFromSession };

export function contentClipCoveringTicks(
  project: Project,
  lane: ContentLaneId,
  ticks: number,
): { id: string; startTicks: number; lengthTicks: number } | null {
  const clips =
    lane === "tekst"
      ? project.tekst.clips
      : lane === "akordy"
        ? project.akordy.clips
        : project.cue.clips;
  for (const c of clips) {
    if (ticks >= c.startTicks && ticks < c.startTicks + c.lengthTicks) {
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
      };
    }
  }
  return null;
}

function mapFormaBack(
  project: Project,
  lane: ContentLaneId,
  formaClips: FormaClip[],
): Project {
  if (lane === "tekst") {
    const byId = new Map(project.tekst.clips.map((c) => [c.id, c]));
    const clips: TekstClip[] = formaClips
      .filter((c) => c.kind === "section")
      .map((c) => {
        const prev = byId.get(c.id) ?? byId.get(resolveSplitParentId(c.id));
        return remapTekstClipGeometry(prev, {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
          text: prev?.text ?? "",
        });
      });
    return { ...project, tekst: { clips } };
  }
  if (lane === "akordy") {
    const byId = new Map(project.akordy.clips.map((c) => [c.id, c]));
    const clips = formaClips
      .filter((c) => c.kind === "section")
      .map((c) => {
        const prev = byId.get(c.id) ?? byId.get(resolveSplitParentId(c.id));
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
      const prev = byId.get(c.id) ?? byId.get(resolveSplitParentId(c.id));
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        label: prev?.label ?? "Cue",
        ...(prev?.roles?.length ? { roles: prev.roles } : {}),
        ...(prev?.priority === "alert" ? { priority: "alert" as const } : {}),
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
  const before = contentAsForma(project, lane);
  // Default right id = `${clipId}-r` so resolveSplitParentId preserves payload/blocks.
  const clips = splitClipAt(before, clipId, snapped, {
    contentFloorTicks: floor,
  });
  if (clips === before) return project;
  return mapFormaBack(project, lane, clips);
}

/**
 * Join abutting content clips on a lane (gap 0). Keeps left payload / id.
 * Tekst: concatenates `blocks[]` from both sides.
 */
export function joinAdjacentContentClips(
  project: Project,
  lane: ContentLaneId,
  clipId: string,
): Project {
  const before = contentAsForma(project, lane);
  const sorted = [...before].sort((a, b) => a.startTicks - b.startTicks);
  const idx = sorted.findIndex((c) => c.id === clipId);
  if (idx < 0) return project;
  const cur = sorted[idx]!;
  const next = sorted[idx + 1];
  const prev = sorted[idx - 1];
  let left = cur;
  let right: FormaClip | null = null;
  if (next && next.startTicks === cur.startTicks + cur.lengthTicks) {
    right = next;
  } else if (prev && cur.startTicks === prev.startTicks + prev.lengthTicks) {
    left = prev;
    right = cur;
  }
  if (!right) return project;

  if (lane === "tekst") {
    const leftClip = project.tekst.clips.find((c) => c.id === left.id);
    const rightClip = project.tekst.clips.find((c) => c.id === right!.id);
    if (!leftClip || !rightClip) return project;
    const merged = joinTekstClips(leftClip, rightClip);
    const clips = project.tekst.clips
      .filter((c) => c.id !== left.id && c.id !== right!.id)
      .concat(merged);
    return { ...project, tekst: { clips } };
  }

  const merged: FormaClip = {
    ...left,
    lengthTicks: left.lengthTicks + right.lengthTicks,
  };
  const without = before.filter((c) => c.id !== left.id && c.id !== right!.id);
  return mapFormaBack(project, lane, [...without, merged]);
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
  const clips = moveClipNoOverlap(
    contentAsForma(project, lane),
    clipId,
    snapped,
    {
      contentFloorTicks: floor,
    },
  );
  return mapFormaBack(project, lane, clips);
}

export function commitMoveContentClips(
  project: Project,
  lane: ContentLaneId,
  moveIds: string[],
  primaryId: string,
  primaryNewStartTicks: number,
  mode: SnapMode,
): Project {
  if (moveIds.length <= 1) {
    return commitMoveContentClip(
      project,
      lane,
      primaryId,
      primaryNewStartTicks,
      mode,
    );
  }
  const forma = contentAsForma(project, lane);
  const primary = forma.find((c) => c.id === primaryId);
  if (!primary) return project;
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(
    floor,
    snapEditTicks(project, primaryNewStartTicks, mode),
  );
  const delta = snapped - primary.startTicks;
  if (delta === 0) return project;
  const clips = moveClipsRigidDelta(forma, moveIds, delta, {
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
      if (session.moveIds && session.moveIds.length > 1) {
        return commitMoveContentClips(
          project,
          lane,
          session.moveIds,
          session.clipId,
          preview.startTicks,
          mode,
        );
      }
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
