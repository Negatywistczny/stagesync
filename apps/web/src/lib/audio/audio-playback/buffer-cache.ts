import {
  formatBytesMb,
  noteMemoryCheckpoint,
  registerMemoryContributor,
} from "@lib/client/memoryPressure.js";
import { getMetronomeAudioContext } from "../metronome.js";
import {
  MAX_BUFFER_CACHE,
  MAX_BUFFER_CACHE_BYTES,
  state,
} from "./state.js";
import type {
  AudioBufferCacheEntry,
  AudioBufferCacheStats,
  LoadAudioBufferOptions,
} from "./types.js";
import type { Project } from "@stagesync/shared";
import { audioClipBufferOffsetSecAlongMaps } from "@stagesync/shared";

export function cacheKey(projectId: string, assetId: string): string {
  return `${projectId}:${assetId}`;
}

/** Approx float32 PCM footprint (Web Audio keeps channel data as Float32). */
export function estimateAudioBufferBytes(buffer: AudioBuffer): number {
  const channels = Math.max(1, buffer.numberOfChannels);
  const frames = Math.max(0, buffer.length);
  return frames * channels * 4;
}

export function bufferCacheApproxBytes(): number {
  let total = 0;
  for (const buf of state.bufferCache.values()) {
    total += estimateAudioBufferBytes(buf);
  }
  return total;
}

export function getAudioBufferCacheStats(): AudioBufferCacheStats {
  return {
    entries: state.bufferCache.size,
    approxBytes: bufferCacheApproxBytes(),
    maxEntries: MAX_BUFFER_CACHE,
    maxBytes: MAX_BUFFER_CACHE_BYTES,
  };
}

/** Per-entry cache listing for memory diagnostics. */
export function getAudioBufferCacheEntries(): AudioBufferCacheEntry[] {
  const out: AudioBufferCacheEntry[] = [];
  for (const [key, buf] of state.bufferCache) {
    out.push({
      key,
      approxBytes: estimateAudioBufferBytes(buf),
      durationSec: buf.duration,
      channels: buf.numberOfChannels,
    });
  }
  return out;
}

export function getAudioBufferInflightCount(): number {
  return state.inflight.size;
}

function rememberBuffer(key: string, decoded: AudioBuffer): void {
  state.failedAssets.delete(key);
  if (state.bufferCache.has(key)) state.bufferCache.delete(key);
  state.bufferCache.set(key, decoded);

  const evicted: string[] = [];
  const evictWhileOver = () => {
    while (
      state.bufferCache.size > MAX_BUFFER_CACHE ||
      bufferCacheApproxBytes() > MAX_BUFFER_CACHE_BYTES
    ) {
      let oldest: string | undefined;
      for (const candidate of state.bufferCache.keys()) {
        if (candidate === key) continue;
        oldest = candidate;
        break;
      }
      if (oldest === undefined) break;
      state.bufferCache.delete(oldest);
      evicted.push(oldest);
    }
  };
  evictWhileOver();

  // Single asset larger than the budget: keep it alone (must be playable).
  if (
    state.bufferCache.size > 1 &&
    bufferCacheApproxBytes() > MAX_BUFFER_CACHE_BYTES
  ) {
    for (const candidate of [...state.bufferCache.keys()]) {
      if (candidate !== key) {
        state.bufferCache.delete(candidate);
        evicted.push(candidate);
      }
    }
  }

  const bytes = estimateAudioBufferBytes(decoded);
  const stats = getAudioBufferCacheStats();
  ensureAudioMemoryContributor();
  if (evicted.length > 0 || bytes >= 64 * 1024 * 1024) {
    noteMemoryCheckpoint(
      evicted.length > 0 ? "audio-cache-evict" : "audio-decode-large",
      {
        key,
        bytes,
        evicted,
        cacheEntries: stats.entries,
        cacheApproxBytes: stats.approxBytes,
        cacheKeys: getAudioBufferCacheEntries().map((e) => e.key),
      },
    );
  } else if (stats.approxBytes >= stats.maxBytes * 0.75) {
    noteMemoryCheckpoint("audio-cache-near-budget", {
      key,
      bytes,
      cacheEntries: stats.entries,
      cacheApproxBytes: stats.approxBytes,
      maxBytes: stats.maxBytes,
    });
  }
}

function markFailed(key: string): void {
  state.failedAssets.add(key);
}

export function assetFileUrl(projectId: string, assetId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/file`;
}

export function isAudioAssetDecodeFailed(
  projectId: string,
  assetId: string,
): boolean {
  return state.failedAssets.has(cacheKey(projectId, assetId));
}

/** Asset ids for `projectId` that failed load/decode (Timeline warnings). */
export function getFailedAudioAssetIds(projectId: string): string[] {
  const prefix = `${projectId}:`;
  const out: string[] = [];
  for (const key of state.failedAssets) {
    if (key.startsWith(prefix)) out.push(key.slice(prefix.length));
  }
  return out;
}

export async function loadAudioBuffer(
  projectId: string,
  assetId: string,
  ctx: AudioContext = getMetronomeAudioContext(),
  options?: LoadAudioBufferOptions,
): Promise<AudioBuffer | null> {
  const retain = options?.cache !== false;
  const key = cacheKey(projectId, assetId);
  const hit = state.bufferCache.get(key);
  if (hit) {
    if (retain) rememberBuffer(key, hit);
    return hit;
  }

  const genGlobal = state.bufferCacheGlobalGen;
  const genProject = state.bufferCacheProjectGen.get(projectId) ?? 0;

  let pending = state.inflight.get(key);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(assetFileUrl(projectId, assetId));
        if (!res.ok) {
          markFailed(key);
          return null;
        }
        const raw = await res.arrayBuffer();
        if (raw.byteLength > 100 * 1024 * 1024) {
          markFailed(key);
          noteMemoryCheckpoint("audio-fetch-rejected-too-large", {
            key,
            compressedBytes: raw.byteLength,
          });
          return null;
        }
        if (raw.byteLength >= 20 * 1024 * 1024) {
          noteMemoryCheckpoint("audio-fetch-large", {
            key,
            compressedBytes: raw.byteLength,
            inflight: state.inflight.size,
          });
        }
        // decodeAudioData detaches the buffer — avoid an extra .slice() copy.
        return await ctx.decodeAudioData(raw);
      } catch {
        markFailed(key);
        return null;
      } finally {
        state.inflight.delete(key);
      }
    })();
    state.inflight.set(key, pending);
  }

  const decoded = await pending;
  if (!decoded) return null;
  // Cleared while fetch/decode was in flight — do not re-pollute cache.
  if (
    genGlobal !== state.bufferCacheGlobalGen ||
    (state.bufferCacheProjectGen.get(projectId) ?? 0) !== genProject
  ) {
    return retain ? null : decoded;
  }
  if (retain) rememberBuffer(key, decoded);
  return decoded;
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
  for (const clip of project.cue.clips) {
    if (clip.sample?.assetId) assetIds.add(clip.sample.assetId);
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
    state.bufferCache.has(cacheKey(projectId, id)),
  );
  return { ready, failedAssetIds };
}

export function clearAudioBufferCache(projectId?: string): void {
  if (!projectId) {
    state.bufferCacheGlobalGen += 1;
    state.bufferCacheProjectGen.clear();
    state.bufferCache.clear();
    state.inflight.clear();
    state.failedAssets.clear();
    return;
  }
  state.bufferCacheProjectGen.set(
    projectId,
    (state.bufferCacheProjectGen.get(projectId) ?? 0) + 1,
  );
  const prefix = `${projectId}:`;
  for (const key of [...state.bufferCache.keys()]) {
    if (key.startsWith(prefix)) state.bufferCache.delete(key);
  }
  for (const key of [...state.inflight.keys()]) {
    if (key.startsWith(prefix)) state.inflight.delete(key);
  }
  for (const key of [...state.failedAssets]) {
    if (key.startsWith(prefix)) state.failedAssets.delete(key);
  }
}

/** Idempotent — safe after test resets of the memory-pressure registry. */
export function ensureAudioMemoryContributor(): void {
  registerMemoryContributor({
    id: "audio-buffer-cache",
    label: "Cache PCM (odtwarzanie)",
    approxBytes: () => bufferCacheApproxBytes(),
    detail: () => {
      const stats = getAudioBufferCacheStats();
      const keys = getAudioBufferCacheEntries()
        .map(
          (e) =>
            `${e.key} ${formatBytesMb(e.approxBytes)} ${e.durationSec.toFixed(0)}s`,
        )
        .join("; ");
      return `${stats.entries}/${stats.maxEntries} · ${formatBytesMb(stats.approxBytes)} / ${formatBytesMb(stats.maxBytes)}${keys ? ` · ${keys}` : ""} · inflight=${state.inflight.size} · voices=${state.active.length}+${state.activeCues.length}`;
    },
  });
}

ensureAudioMemoryContributor();
