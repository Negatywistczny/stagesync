/**
 * Vertical console fader — taper position, rectangular cap, dB tick rail.
 */

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  clampFaderGainDb,
  dbToFaderTaper,
  faderTaperToDb,
  FADER_TICK_DBS,
  formatFaderTickLabel,
} from "@stagesync/shared";
import styles from "./ChannelStripControls.module.css";

export type VerticalFaderProps = {
  gainDb: number;
  onGainChange: (gainDb: number) => void;
  onGainReset: () => void;
  "aria-label": string;
  className?: string;
};

function emitFromClientY(
  track: HTMLElement,
  clientY: number,
  onGainChange: (gainDb: number) => void,
): void {
  const rect = track.getBoundingClientRect();
  if (rect.height <= 0) return;
  // t = 1 at top, 0 at bottom
  const t = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
  onGainChange(clampFaderGainDb(faderTaperToDb(t)));
}

export function VerticalFader({
  gainDb,
  onGainChange,
  onGainReset,
  "aria-label": ariaLabel,
  className,
}: VerticalFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const t = dbToFaderTaper(gainDb);
  const capBottomPct = t * 100;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const track = trackRef.current;
    if (!track) return;
    track.setPointerCapture(e.pointerId);
    emitFromClientY(track, e.clientY, onGainChange);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!trackRef.current?.hasPointerCapture(e.pointerId)) return;
    emitFromClientY(trackRef.current, e.clientY, onGainChange);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.05 : 0.02;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault();
      onGainChange(clampFaderGainDb(faderTaperToDb(Math.min(1, t + step))));
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault();
      onGainChange(clampFaderGainDb(faderTaperToDb(Math.max(0, t - step))));
    } else if (e.key === "Home") {
      e.preventDefault();
      onGainChange(clampFaderGainDb(faderTaperToDb(1)));
    } else if (e.key === "End") {
      e.preventDefault();
      onGainChange(clampFaderGainDb(faderTaperToDb(0)));
    }
  }

  return (
    <div
      className={[styles.faderColumn, className].filter(Boolean).join(" ")}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onGainReset();
      }}
      title="Dwuklik — 0.0 dB"
    >
      <div className={styles.tickRail} aria-hidden>
        {FADER_TICK_DBS.map((db) => {
          const tickT = dbToFaderTaper(db);
          const isUnity = db === 0;
          return (
            <span
              key={formatFaderTickLabel(db)}
              className={[styles.tick, isUnity ? styles.tickUnity : ""]
                .filter(Boolean)
                .join(" ")}
              style={{ bottom: `${tickT * 100}%` }}
            >
              {formatFaderTickLabel(db)}
            </span>
          );
        })}
      </div>

      <div
        ref={trackRef}
        className={styles.faderTrack}
        role="slider"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-valuemin={-60}
        aria-valuemax={6}
        aria-valuenow={Math.round(clampFaderGainDb(gainDb) * 10) / 10}
        aria-valuetext={`${clampFaderGainDb(gainDb).toFixed(1)} dB`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={onKeyDown}
      >
        <div className={styles.faderGroove} />
        <div
          className={styles.faderCap}
          style={{ bottom: `calc(${capBottomPct}% - var(--ss-space-3) / 2)` }}
        >
          <span className={styles.faderCapLine} aria-hidden />
        </div>
      </div>
    </div>
  );
}
