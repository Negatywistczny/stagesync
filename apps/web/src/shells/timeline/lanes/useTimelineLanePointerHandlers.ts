import type { RefObject } from "react";
import type { Project } from "@stagesync/shared";
import type { ToolId } from "../timelineToolsData.js";
import {
  toolIsPencilDraw,
  toolUsesMarqueeGesture,
  contentSnapModeFromModifiers,
  isTouchPointerType,
} from "@lib/timeline/timelineGesture.js";
import {
  contentClipCoveringTicks,
  splitContentClipAt,
  type ContentLaneId,
} from "@lib/timeline-edit/contentLaneEdit.js";
import {
  insertScoreAnchor,
  canEditKotwice,
} from "@lib/timeline-edit/scoreBarEdit.js";
import { snapEditTicks } from "@lib/timeline-edit/formaCanvas.js";
import { isMapLaneId, type MapLaneId } from "@lib/timeline/mapLaneEdit.js";
import { isAudioLaneId } from "@lib/timeline/timelineTracks.js";

export type UseTimelineLanePointerHandlersOptions = {
  tool: ToolId;
  draftProject: Project | null;
  rawTicksAtClientX: (clientX: number) => number | null;
  commitDraft: (p: Project) => void;
  clearMapSelection: () => void;
  selectLaneClip: (lane: ContentLaneId | "forma", id: string) => void;
  beginMarquee: (e: React.PointerEvent<HTMLElement>) => void;
  beginTouchCanvasNav: (e: React.PointerEvent<HTMLElement>) => void;
  heldZoomRef: RefObject<boolean>;
  beginContentPencilDraw: (
    e: React.PointerEvent<HTMLElement>,
    lane: ContentLaneId,
  ) => void;
  onFormaLanePointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onMapLanePointerDown: (e: React.PointerEvent<HTMLElement>, lane: MapLaneId) => void;
  draftRef: RefObject<Project | null>;
  laneImportTrackIdRef?: RefObject<string | null>;
  laneImportStartTicksRef?: RefObject<number | null>;
  laneAudioFileRef?: RefObject<HTMLInputElement | null>;
};

export function createLanePointerDownHandler(
  track: { id: string; audioTrackId?: string },
  opts: UseTimelineLanePointerHandlersOptions,
) {
  const {
    tool,
    draftProject,
    rawTicksAtClientX,
    commitDraft,
    clearMapSelection,
    selectLaneClip,
    beginMarquee,
    beginTouchCanvasNav,
    heldZoomRef,
    beginContentPencilDraw,
    onFormaLanePointerDown,
    onMapLanePointerDown,
    draftRef,
    laneImportTrackIdRef,
    laneImportStartTicksRef,
    laneAudioFileRef,
  } = opts;

  if (track.id === "forma") {
    return onFormaLanePointerDown;
  }

  if (track.id === "kotwice") {
    return (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !draftProject) return;
      if (!toolIsPencilDraw(tool)) return;
      if (!canEditKotwice(draftProject)) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const next = insertScoreAnchor(draftProject, raw, 1);
      if (next !== draftProject) commitDraft(next);
    };
  }

  if (isMapLaneId(track.id)) {
    return (e: React.PointerEvent<HTMLElement>) =>
      onMapLanePointerDown(e, track.id as MapLaneId);
  }

  if (track.id === "tekst" || track.id === "akordy" || track.id === "cue") {
    return (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !draftProject) return;
      if (tool === "scissors") {
        e.preventDefault();
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const lane = track.id as ContentLaneId;
        const hit = contentClipCoveringTicks(draftProject, lane, raw);
        if (!hit) return;
        clearMapSelection();
        selectLaneClip(lane, hit.id);
        const next = splitContentClipAt(draftProject, lane, hit.id, raw);
        if (next !== draftProject) commitDraft(next);
        return;
      }
      if (!toolIsPencilDraw(tool)) {
        if (toolUsesMarqueeGesture(tool, e.pointerType)) {
          beginMarquee(e);
        } else if (
          isTouchPointerType(e.pointerType) &&
          tool === "pointer" &&
          !heldZoomRef.current
        ) {
          beginTouchCanvasNav(e);
        }
        return;
      }
      beginContentPencilDraw(e, track.id as ContentLaneId);
    };
  }

  if (isAudioLaneId(track.id)) {
    return (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      if (toolIsPencilDraw(tool)) {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null || !track.audioTrackId) {
          return;
        }
        const draft = draftRef.current;
        if (!draft) return;
        const mode = contentSnapModeFromModifiers(e.metaKey, e.ctrlKey);
        const snapped = snapEditTicks(draft, raw, mode);
        if (
          laneImportTrackIdRef &&
          laneImportTrackIdRef.current !== undefined
        ) {
          (laneImportTrackIdRef as { current: string | null }).current =
            track.audioTrackId;
        }
        if (
          laneImportStartTicksRef &&
          laneImportStartTicksRef.current !== undefined
        ) {
          (laneImportStartTicksRef as { current: number | null }).current =
            snapped;
        }
        laneAudioFileRef?.current?.click();
        return;
      }
      if (toolUsesMarqueeGesture(tool, e.pointerType)) {
        beginMarquee(e);
      } else if (
        isTouchPointerType(e.pointerType) &&
        tool === "pointer" &&
        !heldZoomRef.current
      ) {
        beginTouchCanvasNav(e);
      }
    };
  }

  return undefined;
}
