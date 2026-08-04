/**
 * Beat Mapper local audition — isolated from React render loop.
 * Panic stop must release BufferSource immediately (no stale onended restart).
 */

export type BeatMapperAuditionVoice = {
  source: AudioBufferSourceNode;
  raf: number;
  startCtx: number;
  startMs: number;
  beatIdx: number;
  epoch: number;
};

export function beatPeriodMsFromBpm(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return 500;
  return 60_000 / bpm;
}

/** Global beat index from elapsed wall ms and fixed grid BPM (audition only). */
export function auditionBeatIndex(
  elapsedMs: number,
  audioStartOffsetMs: number,
  beatPeriodMs: number,
): number {
  if (!(beatPeriodMs > 0)) return -1;
  const adjusted = elapsedMs - Math.max(0, audioStartOffsetMs);
  if (adjusted < 0) return -1;
  return Math.floor(adjusted / beatPeriodMs);
}

export function parseAuditionBpm(raw: string, fallbackBpm: number): number {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (Number.isFinite(n) && n > 0) return n;
  if (Number.isFinite(fallbackBpm) && fallbackBpm > 0) return fallbackBpm;
  return 120;
}

/** Immediate panic stop — safe to call multiple times. */
export function stopBeatMapperAudition(
  voice: BeatMapperAuditionVoice | null,
  playingFlag: { current: boolean },
): void {
  playingFlag.current = false;
  if (!voice) return;
  voice.source.onended = null;
  try {
    voice.source.stop();
  } catch {
    /* already stopped */
  }
  try {
    voice.source.disconnect();
  } catch {
    /* already disconnected */
  }
  if (voice.raf && typeof cancelAnimationFrame === "function") {
    cancelAnimationFrame(voice.raf);
  }
}
