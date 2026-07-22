/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 */

import {
  audioClipBufferOffsetSec,
  audioClipPlayableMs,
  audioClipRemainingSec,
  audioFadeGainAtMs,
  clampAudioFades,
  fadeInMsOf,
  gainDbToLinear,
  resolveMeterAt,
  resolveTempoAt,
  ticksToMs,
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
    return;
  }
  const prefix = `${projectId}:`;
  for (const key of [...bufferCache.keys()]) {
    if (key.startsWith(prefix)) bufferCache.delete(key);
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
  const tempo = resolveTempoAt(input.project, input.displayTicks);
  const meter = resolveMeterAt(input.project, input.displayTicks);
  return [
    `t:${tempo}:${meter.numerator}/${meter.denominator}`,
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ? 1 : 0}:${c.muted}:${c.gainDb}`,
      )
      .join(";"),
    input.project.audioTracks
      .map((t) => `${t.id}:${t.muted}:${t.gainDb}`)
      .join(";"),
  ].join("|");
}

function tempoCtxAt(project: Project, ticks: number) {
  return {
    bpm: resolveTempoAt(project, ticks),
    meter: resolveMeterAt(project, ticks),
    ppq: project.ppq,
  };
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

  const ctxTempo = tempoCtxAt(project, displayTicks);
  const offset = audioClipBufferOffsetSec(clip, displayTicks, ctxTempo);
  if (offset == null) return;

  const buf = bufferCache.get(cacheKey(projectId, clip.assetId));
  if (!buf) {
    void loadAudioBuffer(projectId, clip.assetId, ctx);
    return;
  }

  const remaining = audioClipRemainingSec(
    clip,
    project.assets.find((a) => a.id === clip.assetId),
    displayTicks,
    ctxTempo,
  );
  if (remaining <= 0.005 && !clip.loop) return;

  const asset = project.assets.find((a) => a.id === clip.assetId);
  const playableMs = audioClipPlayableMs(clip, asset, ctxTempo);
  const intoClipMs = ticksToMs(
    displayTicks - clip.startTicks,
    ctxTempo.bpm,
    ctxTempo.meter,
    ctxTempo.ppq,
  );
  const fades = clampAudioFades(clip, playableMs);
  const peak =
    gainDbToLinear(track?.gainDb) * gainDbToLinear(clip.gainDb);
  const startGain =
    peak *
    audioFadeGainAtMs(
      intoClipMs,
      playableMs,
      fades.fadeInMs,
      fades.fadeOutMs,
    );

  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = Boolean(clip.loop);
  if (clip.loop) {
    const trimInSec = (clip.trimInMs ?? 0) / 1000;
    const playableSec = Math.max(0.001, playableMs / 1000);
    source.loopStart = trimInSec;
    source.loopEnd = Math.min(buf.duration, trimInSec + playableSec);
  }
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(Math.max(0.0001, startGain), now);

  const fadeInLeft = Math.max(0, fades.fadeInMs - intoClipMs) / 1000;
  if (fadeInLeft > 0.001 && fadeInMsOf(clip) > 0) {
    gain.gain.linearRampToValueAtTime(peak, now + fadeInLeft);
  } else {
    gain.gain.setValueAtTime(Math.max(0.0001, startGain || peak), now);
  }
  const outStartMs = playableMs - fades.fadeOutMs;
  if (fades.fadeOutMs > 0 && intoClipMs < playableMs) {
    const untilOut = Math.max(0, (outStartMs - intoClipMs) / 1000);
    const outDur = fades.fadeOutMs / 1000;
    if (untilOut > 0) {
      gain.gain.setValueAtTime(peak, now + untilOut);
      gain.gain.linearRampToValueAtTime(0.0001, now + untilOut + outDur);
    } else {
      const left = Math.max(0.001, (playableMs - intoClipMs) / 1000);
      gain.gain.linearRampToValueAtTime(0.0001, now + left);
    }
  }

  source.connect(gain);
  gain.connect(ctx.destination);
  const startAt = Math.max(0, Math.min(offset, Math.max(0, buf.duration - 0.001)));
  try {
    if (clip.loop) {
      source.start(now, startAt);
    } else {
      source.start(now, startAt, remaining);
    }
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
    const offset = audioClipBufferOffsetSec(clip, input.displayTicks, {
      ...tempoCtxAt(input.project, input.displayTicks),
    });
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
