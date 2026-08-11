import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Project, TransportState } from "@stagesync/shared";
import { transportHomeTicks } from "@stagesync/shared";
import {
  allowAudioPlayback,
  ensureAudioBuffered,
  getAudioPlaybackDebugState,
  getFailedAudioAssetIds,
  restartAudioPlayback,
  suppressAudioPlayback,
} from "@lib/audio/audioPlayback.js";
import {
  AUDIO_LATENCY_CHANGED_EVENT,
  getStoredLatencyCompensationMs,
  setStoredLatencyCompensationMs,
} from "@lib/audio/audioLatencyPrefs.js";
import {
  advanceMetronomeClicks,
  cancelScheduledMetronomeClicks,
  getMetronomeAudioContext,
  metronomeBeatIndex,
  resumeMetronomeAudio,
} from "@lib/audio/metronome.js";
import {
  getMetronomeOn,
  setMetronomeOn as persistMetronomeOn,
} from "@lib/audio/metronomePrefs.js";
import { scrollCanvasToStart } from "@lib/timeline-edit/formaCanvas.js";
import {
  isAudioSelectionLane,
  primaryLane,
  type ClipSelection,
} from "@lib/timeline/timelineSelection.js";
import { ticksFromSyncLeadAlongMap } from "@lib/timeline/syncLead.js";

export type MeterType = {
  numerator: number;
  denominator: number;
};

export type UseTimelinePlaybackParams = {
  projectId: string | null | undefined;
  draftProject: Project | null;
  draftRef: RefObject<Project | null>;
  locatorTicks: number;
  setLocatorTicks: (ticks: number | ((prev: number) => number)) => void;
  displayTicks: number;
  clipSelection: ClipSelection;
  state: TransportState;
  seek: (ticks: number) => Promise<void>;
  play: (body?: { bpm?: number; timeSignature?: MeterType; projectId?: string }) => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  soloAudioTrackIds: string[];
  soloBusIds: string[];
  canvasScrollRef: RefObject<HTMLElement | null>;
  playheadPx: number;
  meterAtPlayhead: MeterType;
  tempoAtPlayhead: number;
};

export function useTimelinePlayback({
  projectId,
  draftProject,
  draftRef,
  locatorTicks,
  setLocatorTicks,
  displayTicks,
  clipSelection,
  state,
  seek,
  play,
  pause,
  stop,
  soloAudioTrackIds,
  soloBusIds,
  canvasScrollRef,
  playheadPx,
  meterAtPlayhead,
  tempoAtPlayhead,
}: UseTimelinePlaybackParams) {
  const [metronomeOn, setMetronomeOn] = useState(() => getMetronomeOn());
  const [latencyCompMs, setLatencyCompMs] = useState(() =>
    getStoredLatencyCompensationMs(),
  );
  const [audioBuffering, setAudioBuffering] = useState(false);
  const [failedAudioAssetIds, setFailedAudioAssetIds] = useState<string[]>([]);
  const metroBeatRef = useRef(-1);
  const wasPlayingRef = useRef(false);

  const [followPlayhead, setFollowPlayhead] = useState(() => {
    try {
      return localStorage.getItem("stagesync-timeline-follow-playhead") === "1";
    } catch {
      return false;
    }
  });

  const [showMidiPlayhead, setShowMidiPlayhead] = useState(() => {
    try {
      const v = localStorage.getItem("stagesync-timeline-midi-playhead");
      if (v === null) return true;
      return v === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        "stagesync-timeline-follow-playhead",
        followPlayhead ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [followPlayhead]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "stagesync-timeline-midi-playhead",
        showMidiPlayhead ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [showMidiPlayhead]);

  useEffect(() => {
    setStoredLatencyCompensationMs(latencyCompMs);
  }, [latencyCompMs]);

  useEffect(() => {
    const onLatency = () => {
      setLatencyCompMs(getStoredLatencyCompensationMs());
    };
    window.addEventListener(AUDIO_LATENCY_CHANGED_EVENT, onLatency);
    return () => {
      window.removeEventListener(AUDIO_LATENCY_CHANGED_EVENT, onLatency);
    };
  }, []);

  // Follow playhead: continuous center (v4 scrollFollowToX) while playing — not edge-only.
  useEffect(() => {
    if (!followPlayhead || !state.playing) return;
    const scrollEl =
      canvasScrollRef.current ??
      document.querySelector<HTMLElement>("[data-canvas-scroll]");
    if (!scrollEl) return;
    const viewW = scrollEl.clientWidth;
    if (viewW <= 0) return;
    const maxScroll = Math.max(0, scrollEl.scrollWidth - viewW);
    scrollEl.scrollLeft = Math.max(
      0,
      Math.min(maxScroll, playheadPx - viewW / 2),
    );
  }, [canvasScrollRef, followPlayhead, playheadPx, state.playing]);

  // After pause/stop: yellow locator stays at last transport position (v4).
  useEffect(() => {
    if (wasPlayingRef.current && !state.playing) {
      setLocatorTicks(state.positionTicks);
    }
    wasPlayingRef.current = state.playing;
  }, [setLocatorTicks, state.playing, state.positionTicks]);

  // Metronome click scheduling loop
  useEffect(() => {
    if (!metronomeOn || !state.playing) {
      cancelScheduledMetronomeClicks();
      metroBeatRef.current =
        metronomeBeatIndex(displayTicks, meterAtPlayhead, state.ppq) - 1;
      return;
    }
    metroBeatRef.current = advanceMetronomeClicks(
      {
        enabled: metronomeOn,
        playing: state.playing,
        displayTicks,
        bpm: tempoAtPlayhead,
        timeSignature: meterAtPlayhead,
        ppq: state.ppq,
        tempoMaps: draftProject
          ? {
              defaultBpm: draftProject.defaultBpm,
              defaultMeter: draftProject.defaultMeter,
              tempoMap: draftProject.tempoMap,
              meterMap: draftProject.meterMap,
              ppq: draftProject.ppq,
            }
          : null,
      },
      metroBeatRef.current,
    );
  }, [
    displayTicks,
    draftProject,
    meterAtPlayhead,
    metronomeOn,
    state.playing,
    state.ppq,
    tempoAtPlayhead,
  ]);

  const onPlayClick = useCallback(async () => {
    allowAudioPlayback();
    await resumeMetronomeAudio(getMetronomeAudioContext());
    if (getAudioPlaybackDebugState().suppressed) return;
    if (projectId && draftProject) {
      setAudioBuffering(true);
      try {
        const buffered = await ensureAudioBuffered(
          projectId,
          draftProject,
          locatorTicks,
        );
        setFailedAudioAssetIds(
          buffered.failedAssetIds.length
            ? buffered.failedAssetIds
            : getFailedAudioAssetIds(projectId),
        );
      } finally {
        setAudioBuffering(false);
      }
      if (getAudioPlaybackDebugState().suppressed) return;
      restartAudioPlayback(projectId, {
        project: draftProject,
        playing: true,
        displayTicks: locatorTicks,
        soloTrackIds: soloAudioTrackIds,
        soloBusIds,
      });
    }
    const startTicks = locatorTicks;
    metroBeatRef.current = metronomeBeatIndex(
      startTicks,
      state.timeSignature,
      state.ppq,
    );
    if (getAudioPlaybackDebugState().suppressed) return;
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    if (getAudioPlaybackDebugState().suppressed) return;
    await play(projectId ? { projectId } : undefined);
  }, [
    draftProject,
    locatorTicks,
    play,
    projectId,
    seek,
    soloAudioTrackIds,
    soloBusIds,
    state.positionTicks,
    state.ppq,
    state.timeSignature,
  ]);

  const playFromSelectionOrLocator = useCallback(async () => {
    if (audioBuffering) return;
    const draft = draftRef.current;
    const lane = primaryLane(clipSelection);
    const id = clipSelection.primaryId;
    let startTicks = locatorTicks;
    if (draft && lane && id) {
      if (lane === "forma") {
        const c = draft.forma.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "tekst") {
        const c = draft.tekst.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "akordy") {
        const c = draft.akordy.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (lane === "cue") {
        const c = draft.cue.clips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      } else if (isAudioSelectionLane(lane)) {
        const c = draft.audioClips.find((x) => x.id === id);
        if (c) startTicks = c.startTicks;
      }
    }
    setLocatorTicks(startTicks);
    allowAudioPlayback();
    await resumeMetronomeAudio(getMetronomeAudioContext());
    if (getAudioPlaybackDebugState().suppressed) return;
    if (projectId && draft) {
      setAudioBuffering(true);
      try {
        const buffered = await ensureAudioBuffered(
          projectId,
          draft,
          startTicks,
        );
        setFailedAudioAssetIds(
          buffered.failedAssetIds.length
            ? buffered.failedAssetIds
            : getFailedAudioAssetIds(projectId),
        );
      } finally {
        setAudioBuffering(false);
      }
      if (getAudioPlaybackDebugState().suppressed) return;
      restartAudioPlayback(projectId, {
        project: draft,
        playing: true,
        displayTicks:
          startTicks +
          ticksFromSyncLeadAlongMap(latencyCompMs, startTicks, draft),
        soloTrackIds: soloAudioTrackIds,
        soloBusIds,
      });
    }
    metroBeatRef.current = metronomeBeatIndex(
      startTicks,
      state.timeSignature,
      state.ppq,
    );
    if (getAudioPlaybackDebugState().suppressed) return;
    if (startTicks !== state.positionTicks) {
      await seek(startTicks);
    }
    if (getAudioPlaybackDebugState().suppressed) return;
    await play(projectId ? { projectId } : undefined);
  }, [
    audioBuffering,
    clipSelection,
    draftRef,
    latencyCompMs,
    locatorTicks,
    play,
    projectId,
    seek,
    setLocatorTicks,
    soloAudioTrackIds,
    soloBusIds,
    state.positionTicks,
    state.ppq,
    state.timeSignature,
  ]);

  const onPauseClick = useCallback(async () => {
    suppressAudioPlayback();
    await pause();
  }, [pause]);

  const onStopClick = useCallback(async () => {
    suppressAudioPlayback();
    await stop();
    setLocatorTicks(transportHomeTicks(draftRef.current));
    requestAnimationFrame(() => {
      scrollCanvasToStart(
        canvasScrollRef.current ??
          (document.querySelector("[data-canvas-scroll]") as HTMLElement | null),
      );
    });
  }, [canvasScrollRef, draftRef, setLocatorTicks, stop]);

  const onMetronomeToggle = useCallback(async () => {
    const next = !metronomeOn;
    if (next) {
      await resumeMetronomeAudio(getMetronomeAudioContext());
      metroBeatRef.current = metronomeBeatIndex(
        displayTicks,
        state.timeSignature,
        state.ppq,
      );
    }
    persistMetronomeOn(next);
    setMetronomeOn(next);
  }, [displayTicks, metronomeOn, state.ppq, state.timeSignature]);

  return {
    metronomeOn,
    setMetronomeOn,
    latencyCompMs,
    setLatencyCompMs,
    audioBuffering,
    failedAudioAssetIds,
    setFailedAudioAssetIds,
    followPlayhead,
    setFollowPlayhead,
    showMidiPlayhead,
    setShowMidiPlayhead,
    onPlayClick,
    onPauseClick,
    onStopClick,
    onMetronomeToggle,
    playFromSelectionOrLocator,
  };
}
