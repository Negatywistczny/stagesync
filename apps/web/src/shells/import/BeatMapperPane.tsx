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
import { useBeatMapperAudition } from "./beatMapper/useBeatMapperAudition.js";
import { useBeatMapperInteractions } from "./beatMapper/useBeatMapperInteractions.js";

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
  const [zoom, setZoom] = useState(1);
  const [viewStartMs, setViewStartMs] = useState(0);
  const [frameWidth, setFrameWidth] = useState(800);

  const frameRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorMsRef = useRef(0);
  const viewRef = useRef({ start: 0, duration: 1, total: 1 });

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
    return tempoNodes.map((n) => {
      try {
        return ticksToMsAlongTempoMap(0, n.targetTick, tempoProject);
      } catch {
        return n.wallMs;
      }
    });
  }, [tempoNodes, tempoProject]);

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

  const { playing, cursorMs, setCursorMs, stopPlayback, togglePlay } =
    useBeatMapperAudition({
      localAudioBuffer,
      gridBpmDisplay,
      seedBpm: bridge.seedBpm,
      audioStartOffsetMs,
      meterNumerator: meter.numerator,
      updateCursorDom,
      onRegisterPlayToggle,
    });

  useEffect(() => {
    updateCursorDom(cursorMs);
  }, [cursorMs, viewStartMs, viewDurationMs, updateCursorDom]);

  const {
    dragNodeIdx,
    dragBeat1,
    onWavePointerDown,
    onWavePointerMove,
    onWavePointerUp,
    setBeat1AtCursor,
  } = useBeatMapperInteractions({
    disabled,
    durationMs,
    tempoNodes,
    onTempoNodesChange,
    beat1AnchorMs,
    beatMarkerMs,
    audioStartOffsetMs,
    onAudioStartOffsetChange,
    frameWidth,
    clientXToMs,
    msToPct,
    stopPlayback,
    setCursorMs,
    updateCursorDom,
    cursorMsRef,
  });

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
