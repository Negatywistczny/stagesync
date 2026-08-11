import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { Button } from "@stagesync/ui";
import { computeEnvelopeBins } from "@lib/audio/waveformPeaks.js";
import {
  beatMapperWheelPanDelta,
  isBeatMapperHorizontalWheel,
} from "@lib/audio/beatMapperView.js";
import styles from "../BeatMapperPane.module.css";
import {
  clamp,
  drawEnvelope,
  formatAxisMs,
  peaksWindowBins,
  RULER_H,
  WAVE_H,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./waveMath.js";

export type ChordBlockOverlay = {
  symbol: string;
  startMs: number;
  endMs: number;
};

export type BeatMapperWaveCanvasProps = {
  title: string;
  disabled: boolean;
  hasAudio: boolean;
  durationMs: number;
  zoom: number;
  viewStartMs: number;
  viewEndMs: number;
  viewDurationMs: number;
  frameWidth: number;
  setFrameWidth: (w: number) => void;
  setZoom: Dispatch<SetStateAction<number>>;
  setViewStartMs: Dispatch<SetStateAction<number>>;
  setZoomAround: (nextZoom: number, anchorMs?: number) => void;
  viewRef: RefObject<{ start: number; duration: number; total: number }>;
  frameRef: RefObject<HTMLDivElement | null>;
  cursorRef: RefObject<HTMLDivElement | null>;
  timeTicks: number[];
  msToPct: (ms: number) => number;
  localAudioBuffer: AudioBuffer | null;
  peaks: readonly number[];
  chordBlocks: ChordBlockOverlay[];
  beatMarkerMs: number[];
  beat1AnchorMs: number;
  cursorMs: number;
  dragNodeIdx: number | null;
  dragBeat1: boolean;
  onWavePointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWavePointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWavePointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
};

export function BeatMapperWaveCanvas({
  title,
  disabled,
  hasAudio,
  durationMs,
  zoom,
  viewStartMs,
  viewEndMs,
  frameWidth,
  setFrameWidth,
  setZoom,
  setViewStartMs,
  setZoomAround,
  viewRef,
  frameRef,
  cursorRef,
  timeTicks,
  msToPct,
  localAudioBuffer,
  peaks,
  chordBlocks,
  beatMarkerMs,
  beat1AnchorMs,
  cursorMs,
  dragNodeIdx,
  dragBeat1,
  onWavePointerDown,
  onWavePointerMove,
  onWavePointerUp,
}: BeatMapperWaveCanvasProps) {
  const waveStackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Measure wave frame width for 1-bin-per-pixel envelope.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setFrameWidth(Math.round(w));
    });
    ro.observe(el);
    setFrameWidth(Math.round(el.getBoundingClientRect().width) || 800);
    return () => ro.disconnect();
  }, [hasAudio, frameRef, setFrameWidth]);

  // Non-passive wheel on wave stack so Ctrl/⌘+zoom and Shift+pan can preventDefault.
  useEffect(() => {
    const el = waveStackRef.current;
    if (!el || !hasAudio) return;
    function onWheel(e: WheelEvent) {
      if (durationMs <= 0) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod) {
        e.preventDefault();
        e.stopPropagation();
        const rect = el!.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const { start, duration } = viewRef.current;
        const anchor = start + (x / Math.max(1, rect.width)) * duration;
        const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
        setZoom((z) => {
          const next = clamp(z * factor, ZOOM_MIN, ZOOM_MAX);
          const win = Math.max(1, durationMs / next);
          const ratio = duration > 0 ? (anchor - start) / duration : 0.5;
          setViewStartMs(
            clamp(anchor - ratio * win, 0, Math.max(0, durationMs - win)),
          );
          return next;
        });
        return;
      }
      if (!isBeatMapperHorizontalWheel(e)) return;
      const delta = beatMapperWheelPanDelta(e);
      if (delta === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const { duration } = viewRef.current;
      const zNow = durationMs / Math.max(1, duration);
      const pxPerMs = frameWidth / Math.max(1, duration);
      setViewStartMs((s) => {
        const win = Math.max(1, durationMs / Math.max(ZOOM_MIN, zNow));
        return clamp(
          s + delta / Math.max(0.001, pxPerMs),
          0,
          Math.max(0, durationMs - win),
        );
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [
    hasAudio,
    durationMs,
    frameWidth,
    setZoom,
    setViewStartMs,
    viewRef,
  ]);

  // Paint DAW envelope (min/max bins → filled path).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasAudio) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cssW = Math.max(1, frameWidth);
    const cssH = WAVE_H;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bins =
      localAudioBuffer != null
        ? computeEnvelopeBins(localAudioBuffer, cssW, viewStartMs, viewEndMs)
        : peaksWindowBins(peaks, cssW, viewStartMs, viewEndMs, durationMs);

    const fill =
      getComputedStyle(canvas).getPropertyValue("--ss-wave-fill").trim() ||
      "rgba(255, 255, 255, 0.35)";
    const zero =
      getComputedStyle(canvas).getPropertyValue("--ss-wave-zero").trim() ||
      "rgba(255, 255, 255, 0.55)";
    drawEnvelope(ctx, bins, cssW, cssH, fill, zero);
  }, [
    hasAudio,
    localAudioBuffer,
    peaks,
    frameWidth,
    viewStartMs,
    viewEndMs,
    durationMs,
  ]);

  return (
    <div className={styles.waveTop}>
      <div className={styles.waveHead}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.zoomGroup} role="group" aria-label="Zoom">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || zoom <= ZOOM_MIN}
            aria-label="Oddal"
            onClick={() => setZoomAround(zoom / 1.5)}
          >
            −
          </Button>
          <span className={styles.zoomLabel}>{Math.round(zoom)}×</span>
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || zoom >= ZOOM_MAX}
            aria-label="Przybliż"
            onClick={() => setZoomAround(zoom * 1.5)}
          >
            +
          </Button>
        </div>
      </div>
      <p className={styles.hint}>
        Żółty = kursor · niebieski = kotwica Beat 1 / #GAP (tick 0 na Timeline;
        cisza przed Beat 1 jest przycinana z klipu) · Ctrl/⌘+kółko zoom ·
        Shift+kółko pan · Spacja odsłuch
      </p>
      <div ref={waveStackRef} className={styles.waveStack}>
        <div
          className={styles.timeRuler}
          style={{ height: RULER_H }}
          aria-hidden
        >
          {timeTicks.map((t) => {
            const left = msToPct(t);
            if (left < -2 || left > 102) return null;
            const align =
              t <= viewStartMs + 1
                ? "start"
                : t >= viewEndMs - 1
                  ? "end"
                  : "middle";
            return (
              <span
                key={`ruler-${t}`}
                className={styles.rulerLabel}
                data-align={align}
                style={{ left: `${clamp(left, 0, 100)}%` }}
              >
                {formatAxisMs(t)}
              </span>
            );
          })}
        </div>
        <div
          ref={frameRef}
          className={styles.waveFrame}
          style={
            dragNodeIdx != null || dragBeat1
              ? { cursor: "ew-resize" }
              : undefined
          }
          onPointerDown={onWavePointerDown}
          onPointerMove={onWavePointerMove}
          onPointerUp={onWavePointerUp}
          onPointerCancel={onWavePointerUp}
        >
          <canvas
            ref={canvasRef}
            className={styles.waveCanvas}
            role="img"
            aria-label="Fala audio"
          />
          <div className={styles.waveOverlay} aria-hidden>
            {chordBlocks.map((b, i) => {
              const left = msToPct(b.startMs);
              const right = msToPct(b.endMs);
              if (right < 0 || left > 100) return null;
              const l = clamp(left, 0, 100);
              const w = Math.max(0.2, clamp(right, 0, 100) - l);
              return (
                <div
                  key={`ch-${i}`}
                  className={styles.chordBlock}
                  style={{ left: `${l}%`, width: `${w}%` }}
                />
              );
            })}
            {beatMarkerMs.map((bm, i) => {
              const left = msToPct(bm);
              if (left < -1 || left > 101) return null;
              if (
                Math.abs(bm - beat1AnchorMs) < 0.5 &&
                beat1AnchorMs > 0
              ) {
                return null;
              }
              return (
                <div
                  key={`beat-${i}`}
                  className={styles.beat}
                  style={{ left: `${left}%` }}
                />
              );
            })}
            {(() => {
              const left = msToPct(beat1AnchorMs);
              if (left < -1 || left > 101) return null;
              return (
                <div
                  className={styles.beat1}
                  style={{ left: `${left}%` }}
                  title="Beat 1 — początek utworu na Timeline"
                />
              );
            })()}
            {(() => {
              const left = msToPct(cursorMs);
              if (left < -1 || left > 101) return null;
              return (
                <div
                  ref={cursorRef}
                  className={styles.cursor}
                  style={{ left: `${left}%` }}
                  title="Kursor"
                />
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
