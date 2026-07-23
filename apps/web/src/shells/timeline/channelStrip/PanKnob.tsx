/**
 * Compact circular pan / balance knob — readout C / L50 / R50; drag or dblclick → C.
 */

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { clampPan } from "@stagesync/shared";
import styles from "./ChannelStripControls.module.css";

export type PanKnobProps = {
  pan: number;
  onPanChange: (pan: number) => void;
  onPanReset: () => void;
  "aria-label": string;
  /** PAN (mono) vs BAL (stereo True Balance). */
  label?: "PAN" | "BAL";
};

export function formatPanReadout(pan: number): string {
  const p = clampPan(pan);
  if (Math.abs(p) < 0.005) return "C";
  if (p < 0) return `L${Math.round(Math.abs(p) * 100)}`;
  return `R${Math.round(p * 100)}`;
}

export function PanKnob({
  pan,
  onPanChange,
  onPanReset,
  "aria-label": ariaLabel,
  label = "PAN",
}: PanKnobProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{ x: number; pan: number } | null>(null);
  const p = clampPan(pan);
  // Indicator rotation: −135° (L) … +135° (R)
  const deg = p * 135;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    rootRef.current?.setPointerCapture(e.pointerId);
    dragOrigin.current = { x: e.clientX, pan: p };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragOrigin.current) return;
    if (!rootRef.current?.hasPointerCapture(e.pointerId)) return;
    // ~120 px full throw L↔R
    const delta = (e.clientX - dragOrigin.current.x) / 60;
    onPanChange(clampPan(dragOrigin.current.pan + delta));
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (rootRef.current?.hasPointerCapture(e.pointerId)) {
      rootRef.current.releasePointerCapture(e.pointerId);
    }
    dragOrigin.current = null;
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.1 : 0.05;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onPanChange(clampPan(p - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onPanChange(clampPan(p + step));
    } else if (e.key === "Home" || e.key === "0") {
      e.preventDefault();
      onPanReset();
    }
  }

  return (
    <div
      className={styles.panBlock}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPanReset();
      }}
      title={`Dwuklik — ${label} C`}
    >
      <span className={styles.panLabel}>{label}</span>
      <div
        ref={rootRef}
        className={styles.panKnob}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={Math.round(p * 100)}
        aria-valuetext={formatPanReadout(p)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <span
          className={styles.panKnobIndicator}
          style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
          aria-hidden
        />
      </div>
      <span className={styles.panValue}>{formatPanReadout(p)}</span>
    </div>
  );
}
