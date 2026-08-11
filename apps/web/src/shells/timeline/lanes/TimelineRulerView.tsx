import React, { type RefObject } from "react";
import { ShellIconButton } from "../../components/ShellIconButton.js";
import { IconEye } from "../../components/icons.js";
import { tickToPx } from "@lib/timeline-edit/formaCanvas.js";
import styles from "../TimelineShell.module.css";

export type TimelineRulerViewProps = {
  eyeBtnRef: RefObject<HTMLButtonElement | null>;
  eyeOpen: boolean;
  eyeMenuId: string;
  setEyeOpen: (fn: (v: boolean) => boolean) => void;
  touchTier: string;
  beginDockWidthResize: (e: React.PointerEvent) => void;
  onDockWidthResizePointerMove: (e: React.PointerEvent) => void;
  endDockWidthResize: (e: React.PointerEvent) => void;
  viewSpan: { start: number; end: number };
  barTicks: number;
  effectiveZoomH: number;
  loopRange: { startTicks: number; endTicks: number } | null;
  loopOn: boolean;
  barMarks: Array<{ ticks: number; label: string }>;
  rulerBeatMarks: Array<{ ticks: number }>;
  onLocatorPointerDown: (
    e: React.PointerEvent,
    target: "locator" | "ruler-loop" | "ruler-beat",
  ) => void;
  onLocatorPointerMove: (e: React.PointerEvent) => void;
  onLocatorPointerUp: (e: React.PointerEvent) => void;
};

export function TimelineRulerView({
  eyeBtnRef,
  eyeOpen,
  eyeMenuId,
  setEyeOpen,
  touchTier,
  beginDockWidthResize,
  onDockWidthResizePointerMove,
  endDockWidthResize,
  viewSpan,
  barTicks,
  effectiveZoomH,
  loopRange,
  loopOn,
  barMarks,
  rulerBeatMarks,
  onLocatorPointerDown,
  onLocatorPointerMove,
  onLocatorPointerUp,
}: TimelineRulerViewProps) {
  return (
    <div className={styles.rulerRow}>
      <div className={styles.rulerDock}>
        <ShellIconButton
          ref={eyeBtnRef}
          label="Widoczność ścieżek"
          pressed={eyeOpen}
          aria-expanded={eyeOpen}
          aria-haspopup="menu"
          aria-controls={eyeOpen ? eyeMenuId : undefined}
          onClick={() => setEyeOpen((v) => !v)}
        >
          <IconEye />
        </ShellIconButton>
        {touchTier !== "mobile" ? (
          <button
            type="button"
            className={styles.dockWidthResizeEdge}
            title="Przeciągnij — szerokość kolumny docku"
            aria-label="Zmień szerokość kolumny docku"
            onPointerDown={beginDockWidthResize}
            onPointerMove={onDockWidthResizePointerMove}
            onPointerUp={endDockWidthResize}
            onPointerCancel={endDockWidthResize}
          />
        ) : null}
      </div>
      <div className={styles.ruler}>
        <div
          className={styles.rulerLoopLane}
          onPointerDown={(e) => onLocatorPointerDown(e, "ruler-loop")}
          onPointerMove={onLocatorPointerMove}
          onPointerUp={onLocatorPointerUp}
        >
          {loopRange ? (
            <div
              className={[styles.loopRegion, loopOn ? "" : styles.loopRegionOff]
                .filter(Boolean)
                .join(" ")}
              style={{
                left: `${tickToPx(loopRange.startTicks, viewSpan, barTicks, effectiveZoomH)}px`,
                width: `${Math.max(
                  tickToPx(
                    loopRange.endTicks,
                    viewSpan,
                    barTicks,
                    effectiveZoomH,
                  ) -
                    tickToPx(
                      loopRange.startTicks,
                      viewSpan,
                      barTicks,
                      effectiveZoomH,
                    ),
                  2,
                )}px`,
              }}
              aria-hidden
            />
          ) : null}
          {barMarks.map((mark) => (
            <span
              key={`bar-${mark.ticks}`}
              className={styles.rulerMark}
              style={{
                left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
              }}
            >
              {mark.label}
            </span>
          ))}
        </div>
        <div
          className={styles.rulerBeatLane}
          onPointerDown={(e) => onLocatorPointerDown(e, "ruler-beat")}
          onPointerMove={onLocatorPointerMove}
          onPointerUp={onLocatorPointerUp}
        >
          {barMarks.map((mark) => (
            <span
              key={`bar-tick-${mark.ticks}`}
              className={styles.rulerBarTick}
              style={{
                left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
              }}
              aria-hidden
            />
          ))}
          {rulerBeatMarks.map((mark) => (
            <span
              key={`beat-${mark.ticks}`}
              className={styles.rulerBeatTick}
              style={{
                left: `${tickToPx(mark.ticks, viewSpan, barTicks, effectiveZoomH)}px`,
              }}
              aria-hidden
            />
          ))}
        </div>
      </div>
    </div>
  );
}
