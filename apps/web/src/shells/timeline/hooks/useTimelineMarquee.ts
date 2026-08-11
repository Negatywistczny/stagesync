import { useState, useRef, useCallback, type RefObject } from "react";
import { isTouchPointerType } from "@lib/timeline/timelineGesture.js";
import {
  isMarqueeClick,
  rectsIntersect,
  marqueeSelectFromHits,
  type ClipSelection,
  type ClipSelectionLane,
} from "@lib/timeline/timelineSelection.js";
import { ZOOM_H_MAX, ZOOM_H_MIN } from "@lib/timeline/timelineZoomPrefs.js";
import type { ToolId } from "../timelineToolsData.js";

export type UseTimelineMarqueeOptions = {
  toolRef: RefObject<ToolId>;
  heldZoomRef: RefObject<boolean>;
  lanesCoordRef: RefObject<HTMLDivElement | null>;
  canvasScrollRef: RefObject<HTMLDivElement | null>;
  zoomHBaseRef: RefObject<number>;
  setZoomH: (z: number | ((prev: number) => number)) => void;
  fitZoom: () => void;
  clearClipSelection: () => void;
  clearMapSelection: () => void;
  setSelectedAnchorId: (id: string | null) => void;
  setSongMetaOpen: (v: boolean) => void;
  setSelectedSubsectionIdx: (idx: number | null) => void;
  setClipSelection: (sel: ClipSelection) => void;
  setLocatorFromClientX: (
    clientX: number,
    opts?: { seekTransport?: boolean; metaKey?: boolean; ctrlKey?: boolean },
  ) => void;
};

export function useTimelineMarquee({
  toolRef,
  heldZoomRef,
  lanesCoordRef,
  canvasScrollRef,
  zoomHBaseRef,
  setZoomH,
  fitZoom,
  clearClipSelection,
  clearMapSelection,
  setSelectedAnchorId,
  setSongMetaOpen,
  setSelectedSubsectionIdx,
  setClipSelection,
  setLocatorFromClientX,
}: UseTimelineMarqueeOptions) {
  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [touchCanvasNavActive, setTouchCanvasNavActive] = useState(false);

  const marqueeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const touchCanvasNavRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);

  const clientToCanvasLocal = useCallback(
    (clientX: number, clientY: number) => {
      const root = lanesCoordRef.current;
      if (!root) return { x: 0, y: 0 };
      const rect = root.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [lanesCoordRef],
  );

  const updateMarqueeBoxFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const drag = marqueeRef.current;
      if (!drag) return;
      drag.currentX = clientX;
      drag.currentY = clientY;
      const a = clientToCanvasLocal(drag.startX, drag.startY);
      const b = clientToCanvasLocal(clientX, clientY);
      setMarqueeBox({
        left: Math.min(a.x, b.x),
        top: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      });
    },
    [clientToCanvasLocal],
  );

  const finishMarquee = useCallback(
    (clientX: number, clientY: number) => {
      const drag = marqueeRef.current;
      marqueeRef.current = null;
      setMarqueeBox(null);
      if (!drag) return;
      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;
      if (isMarqueeClick(dx, dy)) {
        if (toolRef.current === "zoom" || heldZoomRef.current) {
          fitZoom();
          return;
        }
        clearClipSelection();
        clearMapSelection();
        setSelectedAnchorId(null);
        setLocatorFromClientX(clientX, { seekTransport: true });
        return;
      }
      const a = clientToCanvasLocal(drag.startX, drag.startY);
      const b = clientToCanvasLocal(clientX, clientY);
      const box = {
        left: Math.min(a.x, b.x),
        right: Math.max(a.x, b.x),
        top: Math.min(a.y, b.y),
        bottom: Math.max(a.y, b.y),
      };
      if (toolRef.current === "zoom" || heldZoomRef.current) {
        const boxW = box.right - box.left;
        const scroll = canvasScrollRef.current;
        if (scroll && boxW > 16) {
          const ratio = scroll.clientWidth / boxW;
          const next = Math.round(zoomHBaseRef.current * ratio);
          setZoomH(Math.min(ZOOM_H_MAX, Math.max(ZOOM_H_MIN, next)));
          requestAnimationFrame(() => {
            scroll.scrollLeft = Math.max(0, box.left * ratio - 24);
          });
        }
        return;
      }
      const overlay = lanesCoordRef.current;
      const root = overlay?.parentElement;
      if (!overlay || !root) {
        clearClipSelection();
        return;
      }
      const rootRect = overlay.getBoundingClientRect();
      const viewportBox = {
        left: rootRect.left + box.left,
        right: rootRect.left + box.right,
        top: rootRect.top + box.top,
        bottom: rootRect.top + box.bottom,
      };
      const hits: { id: string; lane: ClipSelectionLane }[] = [];
      root
        .querySelectorAll<HTMLElement>("[data-clip-id][data-clip-lane]")
        .forEach((el) => {
          const id = el.dataset.clipId;
          const lane = el.dataset.clipLane as ClipSelectionLane | undefined;
          if (!id || !lane) return;
          const r = el.getBoundingClientRect();
          if (rectsIntersect(viewportBox, r)) {
            hits.push({ id, lane });
          }
        });
      clearMapSelection();
      setSelectedAnchorId(null);
      setSongMetaOpen(false);
      setSelectedSubsectionIdx(null);
      setClipSelection(marqueeSelectFromHits(hits));
    },
    [
      toolRef,
      heldZoomRef,
      fitZoom,
      clearClipSelection,
      clearMapSelection,
      setSelectedAnchorId,
      setLocatorFromClientX,
      clientToCanvasLocal,
      canvasScrollRef,
      zoomHBaseRef,
      setZoomH,
      lanesCoordRef,
      setSongMetaOpen,
      setSelectedSubsectionIdx,
      setClipSelection,
    ],
  );

  const beginTouchCanvasNav = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      touchCanvasNavRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
      };
      setTouchCanvasNavActive(true);
    },
    [],
  );

  const finishTouchCanvasNav = useCallback(
    (clientX: number, clientY: number) => {
      const nav = touchCanvasNavRef.current;
      touchCanvasNavRef.current = null;
      setTouchCanvasNavActive(false);
      if (!nav) return;
      const dx = clientX - nav.startX;
      const dy = clientY - nav.startY;
      if (!isMarqueeClick(dx, dy)) return;
      clearClipSelection();
      clearMapSelection();
      setSelectedAnchorId(null);
      setLocatorFromClientX(clientX, { seekTransport: true });
    },
    [
      clearClipSelection,
      clearMapSelection,
      setSelectedAnchorId,
      setLocatorFromClientX,
    ],
  );

  const beginMarquee = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (
        isTouchPointerType(e.pointerType) &&
        toolRef.current === "pointer" &&
        !heldZoomRef.current
      ) {
        beginTouchCanvasNav(e);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      marqueeRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      };

      function onMove(ev: PointerEvent) {
        if (
          !marqueeRef.current ||
          ev.pointerId !== marqueeRef.current.pointerId
        )
          return;
        updateMarqueeBoxFromPointer(ev.clientX, ev.clientY);
      }

      function onUp(ev: PointerEvent) {
        if (
          !marqueeRef.current ||
          ev.pointerId !== marqueeRef.current.pointerId
        )
          return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        finishMarquee(ev.clientX, ev.clientY);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [
      toolRef,
      heldZoomRef,
      beginTouchCanvasNav,
      updateMarqueeBoxFromPointer,
      finishMarquee,
    ],
  );

  return {
    marqueeBox,
    touchCanvasNavActive,
    beginMarquee,
    beginTouchCanvasNav,
    finishTouchCanvasNav,
  };
}
