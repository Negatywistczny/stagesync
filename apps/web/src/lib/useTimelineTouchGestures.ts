/**
 * Attach native touch listeners for pinch-zoom + double-tap on Timeline viewport.
 * Enabled only for tablet/coarse tiers — does not interfere with mouse/desktop.
 */

import { useEffect, useRef, type RefObject } from "react";
import {
  isDoubleTap,
  pinchAnchorViewportX,
  pinchZoomFromRatio,
  TOUCH_MOVE_THRESHOLD_PX,
  TOUCH_PINCH_MIN_DIST_PX,
  touchDistance,
  type LastTapState,
} from "./timelineTouchGestures.js";

export type UseTimelineTouchGesturesOptions = {
  enabled: boolean;
  scrollRef: RefObject<HTMLElement | null>;
  getZoomH: () => number;
  /** Absolute base zoom H (px/bar), with viewport anchor for scroll lock. */
  applyZoomH: (next: number, anchorViewportX: number) => void;
  onDoubleTap: () => void;
  zoomMin: number;
  zoomMax: number;
};

export function useTimelineTouchGestures(
  options: UseTimelineTouchGesturesOptions,
): void {
  const { enabled, scrollRef, zoomMin, zoomMax } = options;
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!enabled || !scrollEl) return;

    const prevTouchAction = scrollEl.style.touchAction;
    scrollEl.style.touchAction = "pan-x pan-y";

    let pinchState: {
      startDist: number;
      anchorX: number;
      startZoom: number;
    } | null = null;
    let tapCtx: {
      startX: number;
      startY: number;
    } | null = null;
    let lastTap: LastTapState | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        tapCtx = null;
        const startDist = touchDistance(e.touches[0]!, e.touches[1]!);
        if (startDist < TOUCH_PINCH_MIN_DIST_PX) {
          pinchState = null;
          return;
        }
        const rect = scrollEl.getBoundingClientRect();
        pinchState = {
          startDist,
          anchorX: pinchAnchorViewportX(
            e.touches[0]!,
            e.touches[1]!,
            rect.left,
          ),
          startZoom: optsRef.current.getZoomH(),
        };
        return;
      }
      pinchState = null;
      if (e.touches.length !== 1) {
        tapCtx = null;
        return;
      }
      const t = e.touches[0]!;
      tapCtx = { startX: t.clientX, startY: t.clientY };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (pinchState && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDistance(e.touches[0]!, e.touches[1]!);
        const ratio = dist / pinchState.startDist;
        const next = pinchZoomFromRatio(
          pinchState.startZoom,
          ratio,
          zoomMin,
          zoomMax,
        );
        optsRef.current.applyZoomH(next, pinchState.anchorX);
        return;
      }
      if (!tapCtx || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      if (
        Math.hypot(t.clientX - tapCtx.startX, t.clientY - tapCtx.startY) >
        TOUCH_MOVE_THRESHOLD_PX
      ) {
        tapCtx = null;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (pinchState && e.touches.length < 2) {
        pinchState = null;
      }
      if (!tapCtx) return;
      const t = e.changedTouches[0];
      if (!t) {
        tapCtx = null;
        return;
      }
      const travel = Math.hypot(
        t.clientX - tapCtx.startX,
        t.clientY - tapCtx.startY,
      );
      tapCtx = null;
      if (travel > TOUCH_MOVE_THRESHOLD_PX * 2) return;

      const now = Date.now();
      if (isDoubleTap(lastTap, now, t.clientX, t.clientY)) {
        e.preventDefault();
        lastTap = null;
        optsRef.current.onDoubleTap();
        return;
      }
      lastTap = { time: now, x: t.clientX, y: t.clientY };
    };

    const onTouchCancel = () => {
      pinchState = null;
      tapCtx = null;
    };

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd, { passive: false });
    scrollEl.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      scrollEl.style.touchAction = prevTouchAction;
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
      scrollEl.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, scrollRef, zoomMin, zoomMax]);
}
