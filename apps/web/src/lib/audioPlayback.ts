/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 */

import {
  audioClipBufferOffsetSecAlongMaps,
  audioClipPlayableMs,
  audioClipRemainingSecAlongMaps,
  audioFadeGainAtMs,
  fadeInMsOf,
  fadeOutMsOf,
  gainDbToLinear,
  resolveMeterAt,
  resolveTempoAt,
  trimInMsOf,
  trimOutMsOf,
  type Project,
} from "@stagesync/shared";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
} from "./metronome.js";

export type AudioPlaybackInput = {
  project: Project;
  playing: boolean;
  displayTicks: number;
  /** When non-empty, only these audio track ids are audible (client Solo). */
  soloTrackIds?: readonly string[];
};

type ActiveSource = {
  clipId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

const bufferCache = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
/** Keys (`projectId:assetId`) that failed fetch/decode — UI warning until cleared. */
const failedAssets = new Set<string>();
let active: ActiveSource[] = [];
let lastDisplayTicks: number | null = null;
let lastGraphKey = "";
/** Local halt while pause/stop RTT still has `playing: true` from SSOT. */
let playbackSuppressed = false;
let stopEpoch = 0;

const SEEK_JUMP_TICKS = 480;
const MAX_BUFFER_CACHE = 32;

function cacheKey(projectId: string, assetId: string): string {
  return `${projectId}:${assetId}`;
}

function rememberBuffer(key: string, decoded: AudioBuffer): void {
  failedAssets.delete(key);
  if (bufferCache.has(key)) bufferCache.delete(key);
  bufferCache.set(key, decoded);
  while (bufferCache.size > MAX_BUFFER_CACHE) {
    const oldest = bufferCache.keys().next().value;
    if (oldest === undefined) break;
    bufferCache.delete(oldest);
  }
}

function markFailed(key: string): void {
  failedAssets.add(key);
}

export function assetFileUrl(projectId: string, assetId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/file`;
}

export function isAudioAssetDecodeFailed(
  projectId: string,
  assetId: string,
): boolean {
  return failedAssets.has(cacheKey(projectId, assetId));
}

/** Asset ids for `projectId` that failed load/decode (Timeline warnings). */
export function getFailedAudioAssetIds(projectId: string): string[] {
  const prefix = `${projectId}:`;
  const out: string[] = [];
  for (const key of failedAssets) {
    if (key.startsWith(prefix)) out.push(key.slice(prefix.length));
  }
  return out;
}

export async function loadAudioBuffer(
  projectId: string,
  assetId: string,
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<AudioBuffer | null> {
  const key = cacheKey(projectId, assetId);
  const hit = bufferCache.get(key);
  if (hit) {
    rememberBuffer(key, hit);
    return hit;
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    try {
      const res = await fetch(assetFileUrl(projectId, assetId));
      if (!res.ok) {
        markFailed(key);
        return null;
      }
      const raw = await res.arrayBuffer();
      if (raw.byteLength > 100 * 1024 * 1024) {
        markFailed(key);
        return null;
      }
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      rememberBuffer(key, decoded);
      return decoded;
    } catch {
      markFailed(key);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

/**
 * Ensure unmuted clips under `playheadTicks` are decoded before Play (#365).
 * Does not start transport — caller gates UI then invokes server play.
 */
export async function ensureAudioBuffered(
  projectId: string,
  project: Project,
  playheadTicks: number,
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<{ ready: boolean; failedAssetIds: string[] }> {
  const trackById = new Map(project.audioTracks.map((t) => [t.id, t]));
  const assetIds = new Set<string>();
  for (const clip of project.audioClips) {
    const track = trackById.get(clip.trackId);
    if (track?.muted || clip.muted) continue;
    const offset = audioClipBufferOffsetSecAlongMaps(
      clip,
      playheadTicks,
      project,
    );
    if (offset == null) continue;
    assetIds.add(clip.assetId);
  }
  if (assetIds.size === 0) {
    return { ready: true, failedAssetIds: [] };
  }
  await Promise.all(
    [...assetIds].map((assetId) => loadAudioBuffer(projectId, assetId, ctx)),
  );
  const failedAssetIds = [...assetIds].filter((id) =>
    isAudioAssetDecodeFailed(projectId, id),
  );
  const ready = [...assetIds].every((id) =>
    bufferCache.has(cacheKey(projectId, id)),
  );
  return { ready, failedAssetIds };
}

export function clearAudioBufferCache(projectId?: string): void {
  if (!projectId) {
    bufferCache.clear();
    inflight.clear();
    failedAssets.clear();
    return;
  }
  const prefix = `${projectId}:`;
  for (const key of [...bufferCache.keys()]) {
    if (key.startsWith(prefix)) bufferCache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
  for (const key of [...failedAssets]) {
    if (key.startsWith(prefix)) failedAssets.delete(key);
  }
}

function stopAll(): void {
  for (const a of active) {
    try { a.source.stop(); } catch { /* */ }
    try { a.source.disconnect(); a.gain.disconnect(); } catch { /* */ }
  }
  active = [];
}

/** Immediate local mute (Pause/Stop click) — blocks re-schedule until cleared. */
export function suppressAudioPlayback(): void {
  playbackSuppressed = true;
  stopEpoch += 1;
  stopAll();
  lastDisplayTicks = null;
  lastGraphKey = "";
}

/** Re-arm scheduler after an explicit Play gesture. */
export function allowAudioPlayback(): void {
  playbackSuppressed = false;
}

/** Test/debug: active BufferSource count + suppress flag. */
export function getAudioPlaybackDebugState(): {
  activeCount: number;
  suppressed: boolean;
  stopEpoch: number;
} {
  return {
    activeCount: active.length,
    suppressed: playbackSuppressed,
    stopEpoch,
  };
}

function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.gainDb}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ?? false}`,
      )
      .join(";"),
    input.project.audioTracks
      .map((t) => `${t.id}:${t.muted}:${t.gainDb}`)
      .join(";"),
    (input.soloTrackIds ?? []).join(","),
  ].join("|");
}

function isClipAudible(
  track: Project["audioTracks"][number] | undefined,
  clipMuted: boolean | undefined,
  soloTrackIds: readonly string[] | undefined,
): boolean {
  if (clipMuted) return false;
  if (track?.muted) return false;
  if (soloTrackIds && soloTrackIds.length > 0) {
    return track != null && soloTrackIds.includes(track.id);
  }
  return true;
}

function startClip(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext,
  soloTrackIds?: readonly string[],
): void {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return;
  const track = project.audioTracks.find((t) => t.id === clip.trackId);
  if (!isClipAudible(track, clip.muted, soloTrackIds)) return;

  const ctxTempo = {
    bpm: resolveTempoAt(project, clip.startTicks),
    meter: resolveMeterAt(project, clip.startTicks),
    ppq: project.ppq,
  };
  const offset = audioClipBufferOffsetSecAlongMaps(clip, displayTicks, project);
  if (offset == null) return;

  const buf = bufferCache.get(cacheKey(projectId, clip.assetId));
  if (!buf) {
    void loadAudioBuffer(projectId, clip.assetId, ctx);
    return;
  }

  const remaining = audioClipRemainingSecAlongMaps(
    clip,
    project.assets.find((a) => a.id === clip.assetId),
    displayTicks,
    project,
    ctxTempo,
  );
  if (remaining <= 0.005) return;

  const source = ctx.createBufferSource();
  source.buffer = buf;
  if (clip.loop) {
    source.loop = true;
    source.loopStart = trimInMsOf(clip) / 1000;
    source.loopEnd = Math.max(
      source.loopStart,
      buf.duration - trimOutMsOf(clip) / 1000,
    );
  }

  const maxGain =
    gainDbToLinear(track?.gainDb) * gainDbToLinear(clip.gainDb);
  const intoClipMs = offset * 1000 - trimInMsOf(clip);
  const asset = project.assets.find((a) => a.id === clip.assetId);
  const playableMs = audioClipPlayableMs(clip, asset, ctxTempo);
  const fadeIn = fadeInMsOf(clip);
  const fadeOut = fadeOutMsOf(clip);
  const now = ctx.currentTime;

  const gain = ctx.createGain();
  const startGain =
    audioFadeGainAtMs(intoClipMs, playableMs, fadeIn, fadeOut) * maxGain;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(startGain, now);

  if (fadeIn > 0 && intoClipMs < fadeIn) {
    const reachMaxAt = now + (fadeIn - intoClipMs) / 1000;
    if (reachMaxAt > now) {
      gain.gain.linearRampToValueAtTime(maxGain, reachMaxAt);
    }
  }

  if (fadeOut > 0 && playableMs > 0) {
    const fadeOutStartMs = playableMs - fadeOut;
    const fadeOutStartAt = now + (fadeOutStartMs - intoClipMs) / 1000;
    const endAt = now + (playableMs - intoClipMs) / 1000;
    if (fadeOutStartAt > now) {
      gain.gain.setValueAtTime(maxGain, fadeOutStartAt);
      if (endAt > fadeOutStartAt) {
        gain.gain.linearRampToValueAtTime(0, endAt);
      }
    } else if (endAt > now) {
      gain.gain.linearRampToValueAtTime(0, endAt);
    }
  }

  source.connect(gain);
  gain.connect(ctx.destination);
  const startAt = Math.max(0, Math.min(offset, Math.max(0, buf.duration - 0.001)));
  try {
    source.start(ctx.currentTime, startAt, remaining);
  } catch {
    return;
  }
  source.onended = () => {
    active = active.filter((a) => a.clipId !== clipId);
  };
  active.push({ clipId, source, gain });
}

export function syncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  if (playbackSuppressed || !input.playing || ctx.state !== "running") {
    stopAll();
    lastDisplayTicks = input.displayTicks;
    lastGraphKey = graphKey(input);
    return;
  }

  const epochAtStart = stopEpoch;
  const gKey = graphKey(input);
  const jumped =
    lastDisplayTicks != null &&
    Math.abs(input.displayTicks - lastDisplayTicks) > SEEK_JUMP_TICKS;
  const graphChanged = gKey !== lastGraphKey;
  if (jumped || graphChanged) stopAll();

  lastDisplayTicks = input.displayTicks;
  lastGraphKey = gKey;

  const trackById = new Map(input.project.audioTracks.map((t) => [t.id, t]));
  const stillNeeded = new Set<string>();

  for (const clip of input.project.audioClips) {
    if (epochAtStart !== stopEpoch || playbackSuppressed) break;
    const track = trackById.get(clip.trackId);
    if (!isClipAudible(track, clip.muted, input.soloTrackIds)) continue;
    const offset = audioClipBufferOffsetSecAlongMaps(
      clip,
      input.displayTicks,
      input.project,
    );
    if (offset == null) continue;
    stillNeeded.add(clip.id);
    if (active.some((a) => a.clipId === clip.id)) continue;
    startClip(
      projectId,
      input.project,
      clip.id,
      input.displayTicks,
      ctx,
      input.soloTrackIds,
    );
  }

  for (const a of [...active]) {
    if (!stillNeeded.has(a.clipId)) {
      try { a.source.stop(); } catch { /* */ }
      active = active.filter((x) => x.clipId !== a.clipId);
    }
  }
}

export function stopAudioPlayback(): void {
  stopEpoch += 1;
  stopAll();
  lastDisplayTicks = null;
  lastGraphKey = "";
}

export async function resumeAndSyncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
): Promise<void> {
  await resumeMetronomeAudio(getMetronomeAudioContext());
  syncAudioPlayback(projectId, input);
}

export function restartAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  playbackSuppressed = false;
  stopEpoch += 1;
  stopAll();
  lastDisplayTicks = null;
  lastGraphKey = "";
  syncAudioPlayback(projectId, input, ctx);
}
