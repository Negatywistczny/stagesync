/**
 * Content-lane pencil draw / preview (gesture geometry).
 */

import {
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
  type TekstClip,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "../formaCanvas.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import {
  PENCIL_DRAG_THRESHOLD_PX,
  resolvePencilRangeTicks,
  contentSnapModeFromModifiers,
} from "@lib/timeline/timelineGesture.js";
import {
  newTekstClipWithBlocks,
  remapTekstClipGeometry,
} from "../tekstBlocks.js";
import {
  contentAsForma,
  defaultPencilLabel,
  resolveSplitParentId,
  type ContentLaneId,
} from "./helpers.js";


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
    const clips: TekstClip[] = placed
      .filter((c) => c.kind === "section")
      .map((c) => {
        if (c.id === newClip.id) {
          return newTekstClipWithBlocks({
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            text: "",
          });
        }
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

