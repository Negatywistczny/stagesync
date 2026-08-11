import { useState, useRef, useCallback, type RefObject } from "react";
import type { Project } from "@stagesync/shared";
import {
  toolIsPencilDraw,
  isTouchPointerType,
} from "@lib/timeline/timelineGesture.js";
import {
  deleteMapEvents,
  insertMapEventAt,
  mapEventIds,
  mapSnapMode,
  moveMapEventsByDelta,
  splitMapAt,
  type MapLaneId,
} from "@lib/timeline/mapLaneEdit.js";
import { snapEditTicks } from "@lib/timeline-edit/formaCanvas.js";
import type { ToolId } from "../timelineToolsData.js";

export type UseTimelineMapPointerHandlersOptions = {
  draftRef: RefObject<Project | null>;
  draftProject: Project | null;
  commitDraft: (p: Project) => void;
  rawTicksAtClientX: (clientX: number) => number | null;
  tool: ToolId;
  heldZoomRef: RefObject<boolean>;
  gesturePolicy: { mapEdit: boolean };
  setTouchAlertOpen: (v: boolean) => void;
  selectedMapLane: MapLaneId | null;
  selectedMapIds: string[];
  primaryMapId: string | null;
  setMapSelection: (lane: MapLaneId, ids: string[], primaryId: string | null) => void;
  setPrimaryMapId: (id: string | null) => void;
  clearMapSelection: () => void;
  openMapEdit: (lane: MapLaneId, ticks: number) => void;
  beginTouchCanvasNav: (e: React.PointerEvent<HTMLElement>) => void;
};

export function useTimelineMapPointerHandlers({
  draftRef,
  draftProject,
  commitDraft,
  rawTicksAtClientX,
  tool,
  heldZoomRef,
  gesturePolicy,
  setTouchAlertOpen,
  selectedMapLane,
  selectedMapIds,
  primaryMapId,
  setMapSelection,
  setPrimaryMapId,
  clearMapSelection,
  openMapEdit,
  beginTouchCanvasNav,
}: UseTimelineMapPointerHandlersOptions) {
  const [mapDragPreview, setMapDragPreview] = useState<{
    lane: MapLaneId;
    moveIds: string[];
    deltaTicks: number;
  } | null>(null);

  const mapDragRef = useRef<{
    lane: MapLaneId;
    eventId: string;
    moveIds: string[];
    originStartTicks: number;
    originPointerTicks: number;
    originClientX: number;
    pointerId: number;
    moved: boolean;
    previewDeltaTicks: number;
  } | null>(null);

  const onMapLanePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, lane: MapLaneId) => {
      if (e.button !== 0 || !draftProject) return;
      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;

      if (tool === "scissors" || toolIsPencilDraw(tool)) {
        e.preventDefault();
        e.stopPropagation();
        if (!gesturePolicy.mapEdit) {
          setTouchAlertOpen(true);
          return;
        }
        const mode = mapSnapMode(e.metaKey, e.ctrlKey);
        const next =
          tool === "scissors"
            ? splitMapAt(draftProject, lane, raw, mode)
            : insertMapEventAt(draftProject, lane, raw, mode);
        if (next !== draftProject) {
          commitDraft(next);
          const snapped = snapEditTicks(next, raw, mode);
          openMapEdit(lane, snapped);
        }
        return;
      }

      if (tool === "eraser") return;
      if (
        isTouchPointerType(e.pointerType) &&
        tool === "pointer" &&
        !heldZoomRef.current
      ) {
        beginTouchCanvasNav(e);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    },
    [
      draftProject,
      rawTicksAtClientX,
      tool,
      gesturePolicy.mapEdit,
      setTouchAlertOpen,
      commitDraft,
      openMapEdit,
      heldZoomRef,
      beginTouchCanvasNav,
    ],
  );

  const onMapSegmentPointerDown = useCallback(
    (
      e: React.PointerEvent<HTMLButtonElement>,
      lane: MapLaneId,
      seg: {
        eventId: string;
        eventStartTicks: number;
        label: string;
      },
    ) => {
      if (e.button !== 0 || !draftProject) return;
      e.preventDefault();
      e.stopPropagation();

      if (tool === "eraser") {
        if (seg.eventId.endsWith("-default") || seg.eventStartTicks === 0) return;
        const ids =
          selectedMapLane === lane &&
          selectedMapIds.includes(seg.eventId) &&
          selectedMapIds.length > 1
            ? selectedMapIds
            : [seg.eventId];
        const next = deleteMapEvents(draftProject, lane, ids);
        if (next !== draftProject) {
          commitDraft(next);
          clearMapSelection();
        }
        return;
      }

      if (tool === "scissors") {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const mode = mapSnapMode(e.metaKey, e.ctrlKey);
        const next = splitMapAt(draftProject, lane, raw, mode);
        if (next !== draftProject) {
          commitDraft(next);
          openMapEdit(lane, snapEditTicks(next, raw, mode));
        }
        return;
      }

      if (toolIsPencilDraw(tool)) {
        const raw = rawTicksAtClientX(e.clientX);
        if (raw == null) return;
        const mode = mapSnapMode(e.metaKey, e.ctrlKey);
        const next = insertMapEventAt(draftProject, lane, raw, mode);
        if (next !== draftProject) {
          commitDraft(next);
          openMapEdit(lane, snapEditTicks(next, raw, mode));
        } else {
          openMapEdit(lane, seg.eventStartTicks);
        }
        return;
      }

      const isDefault = seg.eventId.endsWith("-default");
      const multiToggle = (e.metaKey || e.ctrlKey) && !e.altKey;

      if (multiToggle && !isDefault) {
        if (selectedMapLane === lane && selectedMapIds.includes(seg.eventId)) {
          const nextIds = selectedMapIds.filter((id) => id !== seg.eventId);
          setMapSelection(
            lane,
            nextIds,
            nextIds.length
              ? nextIds.includes(primaryMapId ?? "")
                ? primaryMapId
                : nextIds[nextIds.length - 1]!
              : null,
          );
        } else if (selectedMapLane === lane) {
          setMapSelection(lane, [...selectedMapIds, seg.eventId], seg.eventId);
        } else {
          setMapSelection(lane, [seg.eventId], seg.eventId);
        }
        return;
      }

      if (e.shiftKey && !isDefault && selectedMapLane === lane && primaryMapId) {
        const ordered = mapEventIds(draftProject, lane);
        const a = ordered.indexOf(primaryMapId);
        const b = ordered.indexOf(seg.eventId);
        if (a >= 0 && b >= 0) {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          setMapSelection(lane, ordered.slice(lo, hi + 1), seg.eventId);
          return;
        }
      }

      const inMulti =
        selectedMapLane === lane &&
        selectedMapIds.includes(seg.eventId) &&
        selectedMapIds.length > 1;

      if (!inMulti) {
        setMapSelection(
          lane,
          isDefault ? [] : [seg.eventId],
          isDefault ? null : seg.eventId,
        );
      } else {
        setPrimaryMapId(seg.eventId);
      }

      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const moveIds = inMulti
        ? selectedMapIds.filter((id) => !id.endsWith("-default"))
        : isDefault
          ? []
          : [seg.eventId];
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      mapDragRef.current = {
        lane,
        eventId: seg.eventId,
        moveIds,
        originStartTicks: seg.eventStartTicks,
        originPointerTicks: raw,
        originClientX: e.clientX,
        pointerId: e.pointerId,
        moved: false,
        previewDeltaTicks: 0,
      };
    },
    [
      draftProject,
      tool,
      selectedMapLane,
      selectedMapIds,
      commitDraft,
      clearMapSelection,
      rawTicksAtClientX,
      openMapEdit,
      primaryMapId,
      setMapSelection,
      setPrimaryMapId,
    ],
  );

  const onMapSegmentPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = mapDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
      if (!draftRef.current) return;
      if (!drag.moveIds.length || drag.originStartTicks <= 0) return;

      const raw = rawTicksAtClientX(e.clientX);
      if (raw == null) return;
      const dx = Math.abs(e.clientX - drag.originClientX);
      if (dx >= 5) drag.moved = true;
      if (!drag.moved) return;

      const mode = mapSnapMode(e.metaKey, e.ctrlKey);
      const unsnappedTarget =
        drag.originStartTicks + (raw - drag.originPointerTicks);
      const snappedTarget = snapEditTicks(
        draftRef.current,
        unsnappedTarget,
        mode,
      );
      const deltaTicks = snappedTarget - drag.originStartTicks;
      drag.previewDeltaTicks = deltaTicks;
      setMapDragPreview({
        lane: drag.lane,
        moveIds: drag.moveIds,
        deltaTicks,
      });
    },
    [draftRef, rawTicksAtClientX],
  );

  const onMapSegmentPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = mapDragRef.current;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!drag || drag.pointerId !== e.pointerId) return;
      mapDragRef.current = null;
      setMapDragPreview(null);

      const draft = draftRef.current;
      if (!draft) return;

      if (drag.moved && drag.moveIds.length > 0) {
        const next = moveMapEventsByDelta(
          draft,
          drag.lane,
          drag.moveIds,
          drag.previewDeltaTicks,
          "off",
        );
        if (next !== draft) commitDraft(next);
        return;
      }

      if (drag.moveIds.length <= 1) {
        openMapEdit(drag.lane, drag.originStartTicks);
      }
    },
    [draftRef, commitDraft, openMapEdit],
  );

  return {
    mapDragPreview,
    onMapLanePointerDown,
    onMapSegmentPointerDown,
    onMapSegmentPointerMove,
    onMapSegmentPointerUp,
  };
}
