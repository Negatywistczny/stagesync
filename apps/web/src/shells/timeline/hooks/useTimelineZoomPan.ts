import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ZOOM_H_MAX,
  ZOOM_H_MIN,
  loadZoomPrefs,
  saveZoomPrefs,
} from "@lib/timeline/timelineZoomPrefs.js";
import {
  DEFAULT_LANE_PX,
  MAX_LANE_PX,
  MIN_LANE_PX,
  clearLaneHeightOverride,
  laneHeightBase,
  laneHeightEffective,
  loadLaneHeights,
  saveLaneHeights,
  scaleLaneHeights,
  setLaneHeightOverride,
  type LaneHeightsMap,
} from "@lib/timeline/timelineLaneHeights.js";
import {
  clampDockWidth,
  loadDockWidth,
  saveDockWidth,
} from "@lib/timeline/timelineDockWidth.js";
import { DEFAULT_PX_PER_BAR } from "@lib/timeline-edit/formaCanvas.js";
import type { TimelineTouchTier } from "@lib/timeline/timelineTouchTier.js";

const ZOOM_H_STEP = 4;
const ZOOM_V_STEP = 4;
const ZOOM_V_MIN = MIN_LANE_PX;
const ZOOM_V_MAX = MAX_LANE_PX;

export type UseTimelineZoomPanParams = {
  canvasScrollRef: RefObject<HTMLElement | null>;
  viewSpanRef: RefObject<{ start: number; end: number }>;
  barTicksRef: RefObject<number>;
  touchTier: TimelineTouchTier;
};

export function useTimelineZoomPan({
  canvasScrollRef,
  viewSpanRef,
  barTicksRef,
  touchTier,
}: UseTimelineZoomPanParams) {
  const [zoomH, setZoomH] = useState(() => loadZoomPrefs().zoomH);
  const [zoomV, setZoomV] = useState(() => loadZoomPrefs().zoomV);
  const [zoomUi, setZoomUi] = useState(() => loadZoomPrefs().zoomUi);
  const [laneHeights, setLaneHeights] = useState<LaneHeightsMap>(() =>
    loadLaneHeights(),
  );
  const [laneResizeTrackId, setLaneResizeTrackId] = useState<string | null>(
    null,
  );
  const [dockWidthBase, setDockWidthBase] = useState(() => loadDockWidth());
  const [dockWidthResizing, setDockWidthResizing] = useState(false);

  const uiScale = zoomUi / 100;
  const effectiveZoomH = zoomH * uiScale;
  const effectiveZoomV = Math.max(1, Math.round(zoomV * uiScale));
  const effectiveDockWidth = Math.max(1, Math.round(dockWidthBase * uiScale));

  const zoomHRef = useRef(DEFAULT_PX_PER_BAR);
  const zoomHBaseRef = useRef(DEFAULT_PX_PER_BAR);
  const zoomVBaseRef = useRef(DEFAULT_LANE_PX);
  const uiScaleRef = useRef(1);
  const laneHeightsRef = useRef(laneHeights);
  laneHeightsRef.current = laneHeights;
  const dockWidthBaseRef = useRef(dockWidthBase);
  dockWidthBaseRef.current = dockWidthBase;

  zoomHRef.current = effectiveZoomH;
  zoomHBaseRef.current = zoomH;
  zoomVBaseRef.current = zoomV;
  uiScaleRef.current = uiScale;

  const laneResizeRef = useRef<{
    trackId: string;
    startY: number;
    startHeightBase: number;
    pointerId: number;
  } | null>(null);

  const dockWidthResizeRef = useRef<{
    startX: number;
    startWidthBase: number;
    pointerId: number;
  } | null>(null);

  useEffect(() => {
    saveZoomPrefs({ zoomH, zoomV, zoomUi });
  }, [zoomH, zoomV, zoomUi]);

  const applyAbsoluteZoomH = useCallback(
    (nextBaseRaw: number, anchorViewportX?: number) => {
      const scroll =
        canvasScrollRef.current ??
        (document.querySelector("[data-canvas-scroll]") as HTMLElement | null);
      const oldEff = zoomHRef.current;
      const nextBase = Math.min(
        ZOOM_H_MAX,
        Math.max(ZOOM_H_MIN, Math.round(nextBaseRaw)),
      );
      const newEff = nextBase * uiScaleRef.current;
      if (nextBase === zoomHBaseRef.current || !(oldEff > 0) || !(newEff > 0)) {
        return;
      }
      const ax =
        anchorViewportX != null
          ? anchorViewportX
          : (scroll?.clientWidth ?? 0) / 2;
      const prevScroll = scroll?.scrollLeft ?? 0;
      const newScroll = ((prevScroll + ax) * newEff) / oldEff - ax;
      setZoomH(nextBase);
      if (scroll) {
        requestAnimationFrame(() => {
          scroll.scrollLeft = Math.max(0, newScroll);
        });
      }
    },
    [canvasScrollRef],
  );

  const zoomHorizontalBySteps = useCallback(
    (steps: number, anchorViewportX?: number) => {
      if (!steps) return;
      applyAbsoluteZoomH(
        zoomHBaseRef.current + steps * ZOOM_H_STEP,
        anchorViewportX,
      );
    },
    [applyAbsoluteZoomH],
  );

  const setVerticalZoom = useCallback((nextLanePx: number) => {
    const oldBase = zoomVBaseRef.current;
    const next = Math.min(
      ZOOM_V_MAX,
      Math.max(ZOOM_V_MIN, Math.round(nextLanePx)),
    );
    if (next === oldBase) return;
    setZoomV(next);
    const current = laneHeightsRef.current;
    if (oldBase > 0 && Object.keys(current).length) {
      const scaled = scaleLaneHeights(current, oldBase, next);
      setLaneHeights(scaled);
      saveLaneHeights(scaled);
    }
  }, []);

  const zoomVerticalBySteps = useCallback(
    (steps: number) => {
      if (!steps) return;
      setVerticalZoom(zoomVBaseRef.current + steps * ZOOM_V_STEP);
    },
    [setVerticalZoom],
  );

  const fitZoom = useCallback(() => {
    const scroll =
      canvasScrollRef.current ??
      (document.querySelector("[data-canvas-scroll]") as HTMLElement | null);
    if (!scroll) return;
    const usable = Math.max(80, scroll.clientWidth - 48);
    const bars = Math.max(
      1,
      viewSpanRef.current.end / Math.max(1, barTicksRef.current),
    );
    const next = Math.round(usable / bars / Math.max(0.01, uiScaleRef.current));
    setZoomH(Math.min(ZOOM_H_MAX, Math.max(ZOOM_H_MIN, next)));
    requestAnimationFrame(() => {
      scroll.scrollLeft = 0;
    });
  }, [canvasScrollRef, barTicksRef, viewSpanRef]);

  const rowHeightStyle = useCallback(
    (trackId: string): React.CSSProperties => {
      const base = laneHeightBase(trackId, laneHeights, zoomV);
      const eff = laneHeightEffective(base, uiScale);
      return { ["--tl-row-h" as string]: `${eff}px` };
    },
    [laneHeights, zoomV, uiScale],
  );

  const beginLaneResize = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, trackId: string) => {
      if (e.button !== 0 || touchTier === "mobile") return;
      e.preventDefault();
      e.stopPropagation();
      const startHeightBase = laneHeightBase(trackId, laneHeights, zoomV);
      laneResizeRef.current = {
        trackId,
        startY: e.clientY,
        startHeightBase,
        pointerId: e.pointerId,
      };
      setLaneResizeTrackId(trackId);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [laneHeights, touchTier, zoomV],
  );

  const onLaneResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = laneResizeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const scale = uiScaleRef.current || 1;
      const dy = e.clientY - drag.startY;
      const nextBase = drag.startHeightBase + dy / scale;
      const next = setLaneHeightOverride(
        laneHeightsRef.current,
        drag.trackId,
        nextBase,
      );
      setLaneHeights(next);
    },
    [],
  );

  const endLaneResize = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = laneResizeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      laneResizeRef.current = null;
      setLaneResizeTrackId(null);
      saveLaneHeights(laneHeightsRef.current);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const onLaneResizeDblClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>, trackId: string) => {
      if (touchTier === "mobile") return;
      e.preventDefault();
      e.stopPropagation();
      const next = clearLaneHeightOverride(laneHeightsRef.current, trackId);
      setLaneHeights(next);
      saveLaneHeights(next);
    },
    [touchTier],
  );

  const beginDockWidthResize = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0 || touchTier === "mobile") return;
      e.preventDefault();
      e.stopPropagation();
      dockWidthResizeRef.current = {
        startX: e.clientX,
        startWidthBase: dockWidthBaseRef.current,
        pointerId: e.pointerId,
      };
      setDockWidthResizing(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [touchTier],
  );

  const onDockWidthResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dockWidthResizeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const scale = uiScaleRef.current || 1;
      const dx = e.clientX - drag.startX;
      const nextBase = clampDockWidth(drag.startWidthBase + dx / scale);
      dockWidthBaseRef.current = nextBase;
      setDockWidthBase(nextBase);
    },
    [],
  );

  const endDockWidthResize = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dockWidthResizeRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      dockWidthResizeRef.current = null;
      setDockWidthResizing(false);
      saveDockWidth(dockWidthBaseRef.current);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  return {
    zoomH,
    setZoomH,
    zoomV,
    setZoomV,
    zoomUi,
    setZoomUi,
    uiScale,
    effectiveZoomH,
    effectiveZoomV,
    dockWidthBase,
    setDockWidthBase,
    effectiveDockWidth,
    dockWidthResizing,
    laneHeights,
    setLaneHeights,
    laneResizeTrackId,
    zoomHRef,
    zoomHBaseRef,
    zoomVBaseRef,
    uiScaleRef,
    dockWidthBaseRef,
    applyAbsoluteZoomH,
    zoomHorizontalBySteps,
    setVerticalZoom,
    zoomVerticalBySteps,
    fitZoom,
    rowHeightStyle,
    beginLaneResize,
    onLaneResizePointerMove,
    endLaneResize,
    onLaneResizeDblClick,
    beginDockWidthResize,
    onDockWidthResizePointerMove,
    endDockWidthResize,
  };
}
