/**
 * Forma gesture preview geometry (pointer-move).
 */

import {
  resolveMeterAt,
  ticksPerBar,
  type Project,
} from "@stagesync/shared";
import { contentFloorTicks } from "../formaCanvas.js";
import {
  moveSubsectionBoundary,
  subsectionMaxChunkForClip,
} from "../formaSubsections.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import {
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  snapModeFromModifiers,
} from "@lib/timeline/timelineGesture.js";
import { snapEditTicksWithMode } from "./snap.js";

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
    let start = Math.max(floor, snapEditTicksWithMode(project, rawTicks, mode));
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
      delta = Math.round(
        ((clientX - session.originClientX) / pxPerBar) * barTicks,
      );
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
