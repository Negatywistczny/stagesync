/**
 * Visual Beat Mapper — DAW envelope waveform, zoom/pan, Beat 1 markers,
 * audition (audio + metronome click), Audio Start Offset.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { defaultBeatMapperZoom } from "@lib/audio/beatMapperView.js";
import { AudioDropzone } from "./AudioDropzone.js";
import styles from "./BeatMapperPane.module.css";
import { BeatMapperToolbar } from "./beatMapper/BeatMapperToolbar.js";
import { BeatMapperWaveCanvas } from "./beatMapper/BeatMapperWaveCanvas.js";
import {
  buildTimeTicks,
  clamp,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./beatMapper/waveMath.js";

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
  const frameRef = useRef<HTMLDivElement>(null);
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
          <BeatMapperWaveCanvas
            title={title}
            disabled={disabled}
            hasAudio={hasAudio}
            durationMs={durationMs}
            zoom={zoom}
            viewStartMs={viewStartMs}
            viewEndMs={viewEndMs}
            viewDurationMs={viewDurationMs}
            frameWidth={frameWidth}
            setFrameWidth={setFrameWidth}
            setZoom={setZoom}
            setViewStartMs={setViewStartMs}
            setZoomAround={setZoomAround}
            viewRef={viewRef}
            frameRef={frameRef}
            cursorRef={cursorRef}
            timeTicks={timeTicks}
            msToPct={msToPct}
            localAudioBuffer={localAudioBuffer}
            peaks={peaks}
            chordBlocks={chordBlocks}
            beatMarkerMs={beatMarkerMs}
            beat1AnchorMs={beat1AnchorMs}
            cursorMs={cursorMs}
            dragNodeIdx={dragNodeIdx}
            dragBeat1={dragBeat1}
            onWavePointerDown={onWavePointerDown}
            onWavePointerMove={onWavePointerMove}
            onWavePointerUp={onWavePointerUp}
          />

          <div className={styles.beatBottom}>
            <div className={styles.controlsCol}>
              <BeatMapperToolbar
                disabled={disabled}
                playing={playing}
                hasLocalAudio={localAudioBuffer != null}
                audioStartOffsetMs={audioStartOffsetMs}
                gridBpmDisplay={gridBpmDisplay}
                onTogglePlay={() => void togglePlay()}
                onAudioStartOffsetChange={onAudioStartOffsetChange}
                onSetBeat1AtCursor={setBeat1AtCursor}
                onGridBpmChange={onGridBpmChange}
              />
            </div>
            {sectionsBlock}
          </div>
        </div>
      )}
    </div>
  );
}
