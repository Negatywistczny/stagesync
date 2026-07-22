/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 */

import {
  audioClipBufferOffsetSecAlongMaps,
  audioClipRemainingSecAlongMaps,
  gainDbToLinear,
  resolveMeterAt,
  resolveTempoAt,
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
};

type ActiveSource = {
  clipId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
};

const bufferCache = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
let active: ActiveSource[] = [];
let lastDisplayTicks: number | null = null;
let lastGraphKey = "";

const SEEK_JUMP_TICKS = 480;

function cacheKey(projectId: string, assetId: string): string {
  return `${projectId}:${assetId}`;
}

export function assetFileUrl(projectId: string, assetId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/file`;
}

export async function loadAudioBuffer(
  projectId: string,
  assetId: string,
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<AudioBuffer | null> {
  const key = cacheKey(projectId, assetId);
  const hit = bufferCache.get(key);
  if (hit) return hit;
  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    try {
      const res = await fetch(assetFileUrl(projectId, assetId));
      if (!res.ok) return null;
      const raw = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(raw.slice(0));
      bufferCache.set(key, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, job);
  return job;
}

export function clearAudioBufferCache(projectId?: string): void {
  if (!projectId) {
    bufferCache.clear();
    inflight.clear();
    return;
  }
  const prefix = `${projectId}:`;
  for (const key of [...bufferCache.keys()]) {
    if (key.startsWith(prefix)) bufferCache.delete(key);
  }
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

function stopAll(): void {
  for (const a of active) {
    try { a.source.stop(); } catch { /* */ }
    try { a.source.disconnect(); a.gain.disconnect(); } catch { /* */ }
  }
  active = [];
}

function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.gainDb}`,
      )
      .join(";"),
    input.project.audioTracks
      .map((t) => `${t.id}:${t.muted}:${t.gainDb}`)
      .join(";"),
  ].join("|");
}

function startClip(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext,
): void {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return;
  const track = project.audioTracks.find((t) => t.id === clip.trackId);
  if (track?.muted || clip.muted) return;

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
  const gain = ctx.createGain();
  gain.gain.value =
    gainDbToLinear(track?.gainDb) * gainDbToLinear(clip.gainDb);
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
  if (!input.playing || ctx.state !== "running") {
    stopAll();
    lastDisplayTicks = input.displayTicks;
    lastGraphKey = graphKey(input);
    return;
  }

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
    const track = trackById.get(clip.trackId);
    if (track?.muted || clip.muted) continue;
    const offset = audioClipBufferOffsetSecAlongMaps(
      clip,
      input.displayTicks,
      input.project,
    );
    if (offset == null) continue;
    stillNeeded.add(clip.id);
    if (active.some((a) => a.clipId === clip.id)) continue;
    startClip(projectId, input.project, clip.id, input.displayTicks, ctx);
  }

  for (const a of [...active]) {
    if (!stillNeeded.has(a.clipId)) {
      try { a.source.stop(); } catch { /* */ }
      active = active.filter((x) => x.clipId !== a.clipId);
    }
  }
}

export function stopAudioPlayback(): void {
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
  stopAll();
  lastDisplayTicks = null;
  lastGraphKey = "";
  syncAudioPlayback(projectId, input, ctx);
}
