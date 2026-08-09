/**
 * Visual Beat Mapper — DAW envelope waveform, zoom/pan, Beat 1 markers,
 * audition (audio + metronome click), Audio Start Offset.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input } from "@stagesync/ui";
import {
  DEFAULT_PPQ,
  ticksToMsAlongTempoMap,
  type AkordClip,
  type SmartTempoAudioRef,
  type TempoEvent,
  type TempoMapProject,
  type TempoNode,
  type TextAnchorBridgeOk,
} from "@stagesync/shared";
import {
  computeEnvelopeBins,
  type EnvelopeBin,
} from "@lib/audio/waveformPeaks.js";
import {
  auditionBeatIndex,
  beatPeriodMsFromBpm,
  parseAuditionBpm,
  stopBeatMapperAudition,
  type BeatMapperAuditionVoice,
} from "@lib/audio/beatMapperAudition.js";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
  scheduleMetronomeClickAt,
} from "@lib/audio/metronome.js";
import { IconPause, IconPlay } from "../icons.js";
import {
  BEAT_MAPPER_ZOOM_MAX,
  BEAT_MAPPER_ZOOM_MIN,
  beatMapperWheelPanDelta,
  defaultBeatMapperZoom,
  isBeatMapperHorizontalWheel,
} from "@lib/audio/beatMapperView.js";
import { AudioDropzone } from "./AudioDropzone.js";
import styles from "./BeatMapperPane.module.css";

export type BeatMapperPaneProps = {
  bridge: TextAnchorBridgeOk;
  /** Null = empty guard (dropzone). */
  audio: SmartTempoAudioRef | null;
  localAudioBuffer?: AudioBuffer | null;
  tempoNodes: TempoNode[];
  onTempoNodesChange: (nodes: TempoNode[]) => void;
  audioStartOffsetMs: number;
  onAudioStartOffsetChange: (ms: number) => void;
  gridBpmDisplay: string;
  onGridBpmChange: (raw: string) => void;
  songTitle?: string;
  onSelectAudioFile?: (file: File) => void;
  /** Parent modal registers Space → local audition. */
  onRegisterPlayToggle?: (fn: (() => void) | null) => void;
  disabled?: boolean;
};

const WAVE_H = 160;
const RULER_H = 20;
const ENVELOPE_GAIN = 0.85;
const ZOOM_MIN = BEAT_MAPPER_ZOOM_MIN;
const ZOOM_MAX = BEAT_MAPPER_ZOOM_MAX;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatAxisMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Nice tick step in ms for visible window duration. */
function timeTickStepMs(durationMs: number): number {
  const sec = durationMs / 1000;
  if (sec <= 5) return 500;
  if (sec <= 15) return 1_000;
  if (sec <= 30) return 5_000;
  if (sec <= 90) return 15_000;
  if (sec <= 180) return 30_000;
  if (sec <= 600) return 60_000;
  return 120_000;
}

function buildTimeTicks(startMs: number, endMs: number): number[] {
  if (!(endMs > startMs)) return [startMs];
  const span = endMs - startMs;
  const step = timeTickStepMs(span);
  const first = Math.ceil(startMs / step) * step;
  const ticks: number[] = [];
  if (first > startMs + step * 0.05) ticks.push(startMs);
  for (let t = first; t < endMs - step * 0.05; t += step) {
    ticks.push(t);
  }
  ticks.push(endMs);
  return ticks;
}

/** Fallback envelope from sparse normalized peaks when buffer missing. */
function peaksWindowBins(
  peaks: readonly number[],
  binCount: number,
  startMs: number,
  endMs: number,
  durationMs: number,
): EnvelopeBin[] {
  const bins = Math.max(1, Math.floor(binCount));
  if (!peaks.length || durationMs <= 0) {
    return Array.from({ length: bins }, () => ({ min: 0, max: 0 }));
  }
  const out: EnvelopeBin[] = [];
  for (let b = 0; b < bins; b++) {
    const t0 = startMs + (b / bins) * (endMs - startMs);
    const t1 = startMs + ((b + 1) / bins) * (endMs - startMs);
    const i0 = Math.floor((t0 / durationMs) * peaks.length);
    const i1 = Math.max(i0 + 1, Math.ceil((t1 / durationMs) * peaks.length));
    let peak = 0;
    for (let i = i0; i < Math.min(peaks.length, i1); i++) {
      peak = Math.max(peak, Math.abs(peaks[i] ?? 0));
    }
    out.push({ min: -peak, max: peak });
  }
  return out;
}

function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  bins: readonly EnvelopeBin[],
  width: number,
  height: number,
  fillStyle: string,
  zeroStyle: string,
) {
  const mid = height / 2;
  const g = ENVELOPE_GAIN;
  const n = bins.length;
  if (n <= 0 || width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1)) * width;
    const max = Math.max(-1, Math.min(1, bins[i]?.max ?? 0));
    const y = mid - max * mid * g;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = n === 1 ? 0 : (i / (n - 1)) * width;
    const min = Math.max(-1, Math.min(1, bins[i]?.min ?? 0));
    ctx.lineTo(x, mid - min * mid * g);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(width, mid);
  ctx.strokeStyle = zeroStyle;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function BeatMapperPane({
  bridge,
  audio,
  localAudioBuffer = null,
  tempoNodes,
  onTempoNodesChange,
  audioStartOffsetMs,
  onAudioStartOffsetChange,
  gridBpmDisplay,
  onGridBpmChange,
  songTitle,
  onSelectAudioFile,
  onRegisterPlayToggle,
  disabled = false,
}: BeatMapperPaneProps) {
  const [playing, setPlaying] = useState(false);
  const [cursorMs, setCursorMs] = useState(0);
  const [displayNodes, setDisplayNodes] = useState(tempoNodes);
  const [dragNodeIdx, setDragNodeIdx] = useState<number | null>(null);
  const [dragBeat1, setDragBeat1] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [viewStartMs, setViewStartMs] = useState(0);
  const [frameWidth, setFrameWidth] = useState(800);

  const playRef = useRef<BeatMapperAuditionVoice | null>(null);
  const playingRef = useRef(false);
  const auditionEpochRef = useRef(0);
  const waveStackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorMsRef = useRef(0);
  const dragNodesRef = useRef(tempoNodes);
  const dragIdxRef = useRef<number | null>(null);
  const dragBeat1Ref = useRef(false);
  const togglePlayRef = useRef<() => void>(() => undefined);
  const viewRef = useRef({ start: 0, duration: 1, total: 1 });

  useEffect(() => {
    dragNodesRef.current = tempoNodes;
    setDisplayNodes(tempoNodes);
  }, [tempoNodes]);

  const hasAudio = audio != null && audio.durationMs > 0;

  const durationMs = useMemo(() => {
    if (localAudioBuffer) {
      return Math.max(1, Math.round(localAudioBuffer.duration * 1000));
    }
    return Math.max(0, audio?.durationMs ?? 0);
  }, [localAudioBuffer, audio?.durationMs]);

  const peaks = useMemo(() => audio?.peaks ?? [], [audio?.peaks]);

  const meter = useMemo(() => ({ numerator: 4, denominator: 4 }) as const, []);

  const tempoProject = useMemo((): TempoMapProject => {
    return {
      defaultBpm: bridge.seedBpm,
      defaultMeter: meter,
      tempoMap: bridge.tempoMap as TempoEvent[],
      meterMap: [],
      ppq: DEFAULT_PPQ,
    };
  }, [bridge.seedBpm, bridge.tempoMap, meter]);

  const viewDurationMs = useMemo(() => {
    if (!(durationMs > 0)) return 1;
    return Math.max(1, durationMs / zoom);
  }, [durationMs, zoom]);

  const viewEndMs = Math.min(durationMs, viewStartMs + viewDurationMs);

  useEffect(() => {
    viewRef.current = {
      start: viewStartMs,
      duration: viewDurationMs,
      total: durationMs,
    };
  }, [viewStartMs, viewDurationMs, durationMs]);

  useEffect(() => {
    setZoom(defaultBeatMapperZoom(durationMs));
    setViewStartMs(0);
  }, [durationMs]);

  const setZoomAround = useCallback(
    (nextZoom: number, anchorMs?: number) => {
      const z = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX);
      const win = Math.max(1, durationMs / z);
      const anchor = anchorMs ?? viewStartMs + viewDurationMs / 2;
      const ratio =
        viewDurationMs > 0 ? (anchor - viewStartMs) / viewDurationMs : 0.5;
      const nextStart = clamp(
        anchor - ratio * win,
        0,
        Math.max(0, durationMs - win),
      );
      setZoom(z);
      setViewStartMs(nextStart);
    },
    [durationMs, viewStartMs, viewDurationMs],
  );

  const clientXToMs = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    const { start, duration } = viewRef.current;
    if (!rect || rect.width <= 0 || duration <= 0) return start;
    const x = clamp(clientX - rect.left, 0, rect.width);
    return start + (x / rect.width) * duration;
  }, []);

  const msToPct = useCallback(
    (ms: number) => {
      if (!(viewDurationMs > 0)) return 0;
      return ((ms - viewStartMs) / viewDurationMs) * 100;
    },
    [viewStartMs, viewDurationMs],
  );

  const beatMarkerMs = useMemo(() => {
    return displayNodes.map((n) => {
      try {
        return ticksToMsAlongTempoMap(0, n.targetTick, tempoProject);
      } catch {
        return n.wallMs;
      }
    });
  }, [displayNodes, tempoProject]);

  const beat1AnchorMs = Math.max(0, audioStartOffsetMs);

  const chordBlocks = useMemo(() => {
    return bridge.akordy.clips.map((c: AkordClip) => {
      let ms: number;
      try {
        ms = ticksToMsAlongTempoMap(0, c.startTicks, tempoProject);
      } catch {
        ms = 0;
      }
      let endMs = ms + 500;
      try {
        endMs = ticksToMsAlongTempoMap(
          0,
          c.startTicks + c.lengthTicks,
          tempoProject,
        );
      } catch {
        /* keep default */
      }
      return { symbol: c.symbol, startMs: ms, endMs };
    });
  }, [bridge.akordy.clips, tempoProject]);

  const timeTicks = useMemo(
    () => buildTimeTicks(viewStartMs, viewEndMs),
    [viewStartMs, viewEndMs],
  );

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
  }, [hasAudio]);

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
  }, [hasAudio, durationMs, frameWidth]);

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

  const updateCursorDom = useCallback((ms: number) => {
    cursorMsRef.current = ms;
    const el = cursorRef.current;
    const { start, duration } = viewRef.current;
    if (!el || !(duration > 0)) return;
    const pct = ((ms - start) / duration) * 100;
    if (pct < -1 || pct > 101) {
      el.style.display = "none";
      return;
    }
    el.style.display = "";
    el.style.left = `${Math.max(0, Math.min(100, pct))}%`;
  }, []);

  useEffect(() => {
    updateCursorDom(cursorMs);
  }, [cursorMs, viewStartMs, viewDurationMs, updateCursorDom]);

  const stopPlayback = useCallback(() => {
    auditionEpochRef.current += 1;
    const voice = playRef.current;
    if (voice) {
      const elapsedMs =
        voice.startMs +
        (getMetronomeAudioContext().currentTime - voice.startCtx) * 1000;
      setCursorMs(Math.max(0, elapsedMs));
      updateCursorDom(Math.max(0, elapsedMs));
    }
    stopBeatMapperAudition(playRef.current, playingRef);
    playRef.current = null;
    setPlaying(false);
  }, [updateCursorDom]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  const togglePlay = useCallback(async () => {
    if (playingRef.current) {
      stopPlayback();
      return;
    }
    const buf = localAudioBuffer;
    if (!buf) return;
    const ctx = getMetronomeAudioContext();
    await resumeMetronomeAudio(ctx);
    if (playingRef.current) return;

    auditionEpochRef.current += 1;
    const epoch = auditionEpochRef.current;
    const beatPeriodMs = beatPeriodMsFromBpm(
      parseAuditionBpm(gridBpmDisplay, bridge.seedBpm),
    );
    const meterNumerator = meter.numerator;

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(ctx.destination);
    const startCtx = ctx.currentTime + 0.05;
    const startMs = 0;
    playingRef.current = true;
    playRef.current = {
      source,
      raf: 0,
      startCtx,
      startMs,
      beatIdx: -1,
      epoch,
    };
    setPlaying(true);
    setCursorMs(0);
    updateCursorDom(0);

    source.onended = () => {
      if (playRef.current?.epoch === epoch) stopPlayback();
    };

    try {
      source.start(startCtx, 0);
    } catch {
      stopPlayback();
      return;
    }

    let lastCursorPaint = 0;
    const tick = (now: number) => {
      if (!playingRef.current || playRef.current?.epoch !== epoch) return;
      const st = playRef.current;
      if (!st) return;
      const elapsedMs = st.startMs + (ctx.currentTime - st.startCtx) * 1000;
      if (now - lastCursorPaint >= 32) {
        lastCursorPaint = now;
        setCursorMs(elapsedMs);
        updateCursorDom(elapsedMs);
      }
      const beatFromStart = auditionBeatIndex(
        elapsedMs,
        audioStartOffsetMs,
        beatPeriodMs,
      );
      if (beatFromStart >= 0 && beatFromStart > st.beatIdx) {
        st.beatIdx = beatFromStart;
        scheduleMetronomeClickAt(
          ctx.currentTime,
          beatFromStart % meterNumerator === 0,
        );
      }
      st.raf = requestAnimationFrame(tick);
    };
    playRef.current.raf = requestAnimationFrame(tick);
  }, [
    localAudioBuffer,
    audioStartOffsetMs,
    stopPlayback,
    gridBpmDisplay,
    bridge.seedBpm,
    updateCursorDom,
    meter.numerator,
  ]);

  togglePlayRef.current = () => {
    void togglePlay();
  };

  useEffect(() => {
    onRegisterPlayToggle?.(() => {
      togglePlayRef.current();
    });
    return () => onRegisterPlayToggle?.(null);
  }, [onRegisterPlayToggle]);

  function updateDraggedNode(idx: number, ms: number) {
    const wallMs = Math.max(0, ms);
    const next = dragNodesRef.current.map((n, i) =>
      i === idx ? { ...n, wallMs } : n,
    );
    dragNodesRef.current = next;
    setDisplayNodes(next);
  }

  function commitDraggedNodes() {
    onTempoNodesChange([...dragNodesRef.current]);
  }

  function onWavePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (disabled || durationMs <= 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ms = clientXToMs(e.clientX);
    if (e.shiftKey) {
      setCursorMs(ms);
      updateCursorDom(ms);
      return;
    }
    const xPct = msToPct(ms);
    const beat1Dist =
      Math.abs(msToPct(beat1AnchorMs) - xPct) * (frameWidth / 100);
    if (beat1Dist < 14) {
      stopPlayback();
      dragBeat1Ref.current = true;
      setDragBeat1(true);
      dragIdxRef.current = null;
      setDragNodeIdx(null);
      onAudioStartOffsetChange(Math.max(0, Math.round(ms)));
      return;
    }
    const hitIdx = beatMarkerMs.findIndex((bm) => {
      const pct = msToPct(bm);
      return Math.abs(pct - xPct) * (frameWidth / 100) < 14;
    });
    if (hitIdx >= 0) {
      stopPlayback();
      dragBeat1Ref.current = false;
      setDragBeat1(false);
      dragIdxRef.current = hitIdx;
      setDragNodeIdx(hitIdx);
      updateDraggedNode(hitIdx, ms);
    } else {
      dragBeat1Ref.current = false;
      setDragBeat1(false);
      dragIdxRef.current = null;
      setDragNodeIdx(null);
      setCursorMs(ms);
      updateCursorDom(ms);
    }
  }

  function onWavePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragBeat1Ref.current) {
      e.preventDefault();
      onAudioStartOffsetChange(Math.max(0, Math.round(clientXToMs(e.clientX))));
      return;
    }
    const idx = dragIdxRef.current;
    if (idx == null || disabled) return;
    e.preventDefault();
    updateDraggedNode(idx, clientXToMs(e.clientX));
  }

  function onWavePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (dragIdxRef.current != null) {
      commitDraggedNodes();
    }
    dragBeat1Ref.current = false;
    setDragBeat1(false);
    dragIdxRef.current = null;
    setDragNodeIdx(null);
  }

  function setBeat1AtCursor() {
    const wallAtCursor = Math.max(0, Math.round(cursorMsRef.current));
    onAudioStartOffsetChange(wallAtCursor);
  }

  const title = songTitle?.trim() || "Beat Mapper";

  const sectionsBlock = (
    <aside className={styles.sidePanel} aria-label="Sekcje UG">
      <div className={styles.sideHead}>
        <h4 className={styles.sideTitle}>Sekcje</h4>
        <span className={styles.metaChip}>
          Dopasowanie {Math.round(bridge.alignScore * 100)}%
        </span>
      </div>
      <ul className={styles.sections}>
        {bridge.sections.map((s) => (
          <li key={`${s.name}-${s.startTicks}`} className={styles.sectionCard}>
            <span className={styles.sectionName}>{s.name}</span>
            <span>
              {s.chordCount} akordów
              {s.anchored ? "" : " · Default Grid"}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );

  return (
    <div className={styles.root}>
      {!hasAudio ? (
        <div className={styles.emptyStudio}>
          <div className={styles.mainStage}>
            <p className={styles.hint}>
              Wróć do kroku Audio, aby dodać podkład, albo upuść plik tutaj.
            </p>
            <AudioDropzone
              compact
              disabled={disabled}
              onSelectFile={(file) => onSelectAudioFile?.(file)}
            />
          </div>
          {sectionsBlock}
        </div>
      ) : (
        <div className={styles.studioBeat}>
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
              Żółty = kursor · niebieski = kotwica Beat 1 / #GAP (tick 0 na
              Timeline; cisza przed Beat 1 jest przycinana z klipu) ·
              Ctrl/⌘+kółko zoom · Shift+kółko pan · Spacja odsłuch
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

          <div className={styles.beatBottom}>
            <div className={styles.controlsCol}>
              <div
                className={styles.toolbar}
                role="toolbar"
                aria-label="Beat Mapper"
              >
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled || !localAudioBuffer}
                  onClick={() => void togglePlay()}
                >
                  <span className={styles.playBtn}>
                    {playing ? <IconPause /> : <IconPlay />}
                    {playing ? "Pauza" : "Play"}
                  </span>
                </Button>
                <span className={styles.toolbarSep} aria-hidden />
                <label className={styles.offsetInline}>
                  Audio Start Offset (ms)
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={String(audioStartOffsetMs)}
                    disabled={disabled}
                    aria-label="Audio Start Offset ms"
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      onAudioStartOffsetChange(
                        Number.isFinite(n) && n >= 0 ? n : 0,
                      );
                    }}
                  />
                </label>
                <span className={styles.toolbarSep} aria-hidden />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={disabled}
                  onClick={setBeat1AtCursor}
                >
                  Ustaw Beat 1 w miejscu kursora
                </Button>
              </div>
              <div className={styles.metaRow}>
                <label className={styles.bpmField}>
                  Tempo
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={40}
                    max={300}
                    value={gridBpmDisplay}
                    aria-label="Tempo siatki (BPM)"
                    disabled={disabled}
                    onChange={(e) => onGridBpmChange(e.target.value)}
                  />
                  <span aria-hidden>BPM</span>
                </label>
              </div>
            </div>
            {sectionsBlock}
          </div>
        </div>
      )}
    </div>
  );
}
