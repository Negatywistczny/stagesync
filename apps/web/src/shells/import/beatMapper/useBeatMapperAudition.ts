import { useCallback, useEffect, useRef, useState } from "react";
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

export type UseBeatMapperAuditionParams = {
  localAudioBuffer: AudioBuffer | null;
  gridBpmDisplay: string;
  seedBpm: number;
  audioStartOffsetMs: number;
  meterNumerator: number;
  updateCursorDom: (ms: number) => void;
  onRegisterPlayToggle?: (fn: (() => void) | null) => void;
};

export function useBeatMapperAudition({
  localAudioBuffer,
  gridBpmDisplay,
  seedBpm,
  audioStartOffsetMs,
  meterNumerator,
  updateCursorDom,
  onRegisterPlayToggle,
}: UseBeatMapperAuditionParams) {
  const [playing, setPlaying] = useState(false);
  const [cursorMs, setCursorMs] = useState(0);

  const playRef = useRef<BeatMapperAuditionVoice | null>(null);
  const playingRef = useRef(false);
  const auditionEpochRef = useRef(0);
  const togglePlayRef = useRef<() => void>(() => undefined);

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
      parseAuditionBpm(gridBpmDisplay, seedBpm),
    );

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
    seedBpm,
    updateCursorDom,
    meterNumerator,
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

  return {
    playing,
    cursorMs,
    setCursorMs,
    stopPlayback,
    togglePlay,
  };
}
