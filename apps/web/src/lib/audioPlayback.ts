/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 *
 * Graph (routing still Track → Master | Bus, Bus → Master):
 *
 * Mono track:
 *   BufferSource → [stereo→mono −3 dB downmix?] → clipGain → trackGain
 *     → StereoPanner → analyser → (masterGain | groupBusGain)
 *
 * Stereo track (True Balance — not StereoPanner):
 *   BufferSource → clipGain → trackGain → ChannelSplitter
 *     → gainL / gainR → ChannelMerger → meterSplit → analyserL/R
 *     merger → (masterGain | groupBusGain)
 *
 * Bus mirrors track mono/stereo topology; bus always → Master.
 * Click / metronome stays on a separate Direct Cue path (never through Master).
 */

import {
  audioClipBufferOffsetSecAlongMaps,
  audioClipPlayableMs,
  audioClipRemainingSecAlongMaps,
  audioFadeGainAtMs,
  balanceGains,
  clampPan,
  fadeInMsOf,
  fadeOutMsOf,
  gainDbToLinear,
  linearPeakToMeterDb,
  resolveChannelMode,
  resolveMeterAt,
  resolveTempoAt,
  resolveTrackOutputDest,
  STEREO_DOWNMIX_LINEAR,
  trimInMsOf,
  trimOutMsOf,
  type ChannelMode,
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
  /** When non-empty (and no track solo), only tracks feeding these busses. */
  soloBusIds?: readonly string[];
};

type ActiveSource = {
  clipId: string;
  trackId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  /** Extra nodes for stereo→mono downmix (disconnected on stop). */
  extras: AudioNode[];
};

type TrackBusMono = {
  mode: "mono";
  gain: GainNode;
  pan: StereoPannerNode;
  analyser: AnalyserNode;
  /** Reconnected to Master / bus; meters stay upstream. */
  route: GainNode;
};

type TrackBusStereo = {
  mode: "stereo";
  gain: GainNode;
  splitter: ChannelSplitterNode;
  gainL: GainNode;
  gainR: GainNode;
  merger: ChannelMergerNode;
  meterSplit: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
  route: GainNode;
};

type TrackBus = TrackBusMono | TrackBusStereo;
type GroupBusNode = TrackBus;

type MasterBus = {
  gain: GainNode;
  splitter: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR: AnalyserNode;
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

const trackBuses = new Map<string, TrackBus>();
const groupBuses = new Map<string, GroupBusNode>();
let masterBus: MasterBus | null = null;

const SEEK_JUMP_TICKS = 480;
const MAX_BUFFER_CACHE = 32;
const ANALYSER_FFT = 256;

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

function makeAnalyser(ctx: AudioContext): AnalyserNode {
  const a = ctx.createAnalyser();
  a.fftSize = ANALYSER_FFT;
  a.smoothingTimeConstant = 0.35;
  return a;
}

function outputNode(bus: TrackBus): AudioNode {
  return bus.route;
}

function disconnectBusNodes(bus: TrackBus): void {
  disconnectSafe(bus.gain);
  disconnectSafe(bus.route);
  if (bus.mode === "mono") {
    disconnectSafe(bus.pan);
    disconnectSafe(bus.analyser);
  } else {
    disconnectSafe(bus.splitter);
    disconnectSafe(bus.gainL);
    disconnectSafe(bus.gainR);
    disconnectSafe(bus.merger);
    disconnectSafe(bus.meterSplit);
    disconnectSafe(bus.analyserL);
    disconnectSafe(bus.analyserR);
  }
}

function createChannelBus(ctx: AudioContext, mode: ChannelMode): TrackBus {
  const gain = ctx.createGain();
  gain.gain.value = 1;
  const route = ctx.createGain();
  route.gain.value = 1;
  if (mode === "mono") {
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0;
    const analyser = makeAnalyser(ctx);
    gain.connect(pan);
    pan.connect(analyser);
    analyser.connect(route);
    return { mode: "mono", gain, pan, analyser, route };
  }
  const splitter = ctx.createChannelSplitter(2);
  const gainL = ctx.createGain();
  const gainR = ctx.createGain();
  gainL.gain.value = 1;
  gainR.gain.value = 1;
  const merger = ctx.createChannelMerger(2);
  const meterSplit = ctx.createChannelSplitter(2);
  const analyserL = makeAnalyser(ctx);
  const analyserR = makeAnalyser(ctx);
  gain.connect(splitter);
  splitter.connect(gainL, 0);
  splitter.connect(gainR, 1);
  gainL.connect(merger, 0, 0);
  gainR.connect(merger, 0, 1);
  merger.connect(route);
  merger.connect(meterSplit);
  meterSplit.connect(analyserL, 0);
  meterSplit.connect(analyserR, 1);
  return {
    mode: "stereo",
    gain,
    splitter,
    gainL,
    gainR,
    merger,
    meterSplit,
    analyserL,
    analyserR,
    route,
  };
}

function applyBalanceOrPan(bus: TrackBus, pan: number): void {
  const p = clampPan(pan);
  if (bus.mode === "mono") {
    bus.pan.pan.value = p;
    return;
  }
  const { l, r } = balanceGains(p);
  bus.gainL.gain.value = l;
  bus.gainR.gain.value = r;
}

function ensureMasterBus(ctx: AudioContext): MasterBus {
  if (masterBus) return masterBus;
  const gain = ctx.createGain();
  gain.gain.value = 1;
  const splitter = ctx.createChannelSplitter(2);
  const analyserL = makeAnalyser(ctx);
  const analyserR = makeAnalyser(ctx);
  gain.connect(ctx.destination);
  gain.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);
  masterBus = { gain, splitter, analyserL, analyserR };
  return masterBus;
}

function ensureGroupBus(
  ctx: AudioContext,
  busId: string,
  mode: ChannelMode,
): GroupBusNode {
  const hit = groupBuses.get(busId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    groupBuses.delete(busId);
  }
  const master = ensureMasterBus(ctx);
  const node = createChannelBus(ctx, mode);
  outputNode(node).connect(master.gain);
  groupBuses.set(busId, node);
  return node;
}

function ensureTrackBus(
  ctx: AudioContext,
  trackId: string,
  mode: ChannelMode,
): TrackBus {
  const hit = trackBuses.get(trackId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    trackBuses.delete(trackId);
  }
  const master = ensureMasterBus(ctx);
  const bus = createChannelBus(ctx, mode);
  outputNode(bus).connect(master.gain);
  trackBuses.set(trackId, bus);
  return bus;
}

function disconnectSafe(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    /* */
  }
}

/**
 * Apply gain/pan/balance/mute/solo and (re)wire outputs to Master or group bus.
 * Gain/pan/balance/routing update live — no graph restart.
 * Channel-mode change rebuilds topology (caller includes mode in graphKey).
 */
function applyBusParams(
  project: Project,
  ctx: AudioContext,
  soloBusIds?: readonly string[],
): void {
  const master = ensureMasterBus(ctx);
  master.gain.gain.value = gainDbToLinear(project.masterGainDb);

  const busses = project.audioBusses ?? [];
  const busIdSet = new Set(busses.map((b) => b.id));
  const soloBusses =
    soloBusIds && soloBusIds.length > 0 ? new Set(soloBusIds) : null;

  for (const bus of busses) {
    const mode = resolveChannelMode(bus.channelMode);
    const node = ensureGroupBus(ctx, bus.id, mode);
    let lin = gainDbToLinear(bus.gainDb);
    if (bus.muted) lin = 0;
    if (soloBusses && !soloBusses.has(bus.id)) lin = 0;
    node.gain.gain.value = lin;
    applyBalanceOrPan(node, bus.pan ?? 0);
    // Bus always → Master (physical outs not in model).
    const out = outputNode(node);
    disconnectSafe(out);
    out.connect(master.gain);
  }
  for (const id of [...groupBuses.keys()]) {
    if (busIdSet.has(id)) continue;
    const node = groupBuses.get(id);
    if (!node) continue;
    disconnectBusNodes(node);
    groupBuses.delete(id);
  }

  const alive = new Set(project.audioTracks.map((t) => t.id));
  for (const track of project.audioTracks) {
    const mode = resolveChannelMode(track.channelMode);
    const tBus = ensureTrackBus(ctx, track.id, mode);
    tBus.gain.gain.value = gainDbToLinear(track.gainDb);
    applyBalanceOrPan(tBus, track.pan ?? 0);
    const dest = resolveTrackOutputDest(track.output, busIdSet);
    const out = outputNode(tBus);
    disconnectSafe(out);
    if (dest.kind === "bus") {
      const g = ensureGroupBus(
        ctx,
        dest.busId,
        resolveChannelMode(
          busses.find((b) => b.id === dest.busId)?.channelMode,
        ),
      );
      out.connect(g.gain);
    } else {
      out.connect(master.gain);
    }
  }
  for (const id of [...trackBuses.keys()]) {
    if (alive.has(id)) continue;
    const bus = trackBuses.get(id);
    if (!bus) continue;
    disconnectBusNodes(bus);
    trackBuses.delete(id);
  }
}

function peakDbFromAnalyser(analyser: AnalyserNode): number {
  const buf = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]!);
    if (v > peak) peak = v;
  }
  return linearPeakToMeterDb(peak);
}

export type ChannelMeterPeaks = {
  l: number;
  /** Present for stereo buses; omit for mono. */
  r?: number;
};

/** Live peak dB per track (−60 floor). Missing bus → floor. */
export function readTrackMeterDb(trackId: string): ChannelMeterPeaks {
  const bus = trackBuses.get(trackId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono") return { l: peakDbFromAnalyser(bus.analyser) };
  return {
    l: peakDbFromAnalyser(bus.analyserL),
    r: peakDbFromAnalyser(bus.analyserR),
  };
}

/** Live peak dB per group bus. */
export function readGroupBusMeterDb(busId: string): ChannelMeterPeaks {
  const bus = groupBuses.get(busId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono") return { l: peakDbFromAnalyser(bus.analyser) };
  return {
    l: peakDbFromAnalyser(bus.analyserL),
    r: peakDbFromAnalyser(bus.analyserR),
  };
}

/** Stereo Out L/R peak dB. */
export function readMasterMeterDb(): { l: number; r: number } {
  if (!masterBus) {
    const floor = linearPeakToMeterDb(0);
    return { l: floor, r: floor };
  }
  return {
    l: peakDbFromAnalyser(masterBus.analyserL),
    r: peakDbFromAnalyser(masterBus.analyserR),
  };
}

function stopAll(): void {
  for (const a of active) {
    try {
      a.source.stop();
    } catch {
      /* */
    }
    try {
      a.source.disconnect();
      a.gain.disconnect();
      for (const n of a.extras) disconnectSafe(n);
    } catch {
      /* */
    }
  }
  active = [];
}

function disposeBuses(): void {
  for (const bus of trackBuses.values()) {
    disconnectBusNodes(bus);
  }
  trackBuses.clear();
  for (const bus of groupBuses.values()) {
    disconnectBusNodes(bus);
  }
  groupBuses.clear();
  if (masterBus) {
    disconnectSafe(masterBus.gain);
    disconnectSafe(masterBus.splitter);
    disconnectSafe(masterBus.analyserL);
    disconnectSafe(masterBus.analyserR);
    masterBus = null;
  }
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

/**
 * Structural graph key — mute/solo/clip geometry / routing / channel mode.
 * Gain/pan/balance/master update live via {@link applyBusParams} (no restart).
 */
function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.gainDb}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ?? false}`,
      )
      .join(";"),
    input.project.audioTracks
      .map(
        (t) =>
          `${t.id}:${t.muted}:${resolveChannelMode(t.channelMode)}:${t.output?.kind === "bus" ? t.output.busId : "master"}`,
      )
      .join(";"),
    (input.project.audioBusses ?? [])
      .map(
        (b) =>
          `${b.id}:${b.muted}:${resolveChannelMode(b.channelMode)}`,
      )
      .join(";"),
    (input.soloTrackIds ?? []).join(","),
    (input.soloBusIds ?? []).join(","),
  ].join("|");
}

function isClipAudible(
  track: Project["audioTracks"][number] | undefined,
  clipMuted: boolean | undefined,
  soloTrackIds: readonly string[] | undefined,
  soloBusIds: readonly string[] | undefined,
  busIds: ReadonlySet<string>,
): boolean {
  if (clipMuted) return false;
  if (track?.muted) return false;
  if (soloTrackIds && soloTrackIds.length > 0) {
    return track != null && soloTrackIds.includes(track.id);
  }
  if (soloBusIds && soloBusIds.length > 0) {
    if (!track) return false;
    const dest = resolveTrackOutputDest(track.output, busIds);
    return dest.kind === "bus" && soloBusIds.includes(dest.busId);
  }
  return true;
}

/**
 * Stereo file on mono track: L+R each × −3 dB into clip gain.
 * Returns extra nodes to disconnect on stop.
 */
function connectWithOptionalDownmix(
  ctx: AudioContext,
  source: AudioBufferSourceNode,
  clipGain: GainNode,
  trackMode: ChannelMode,
  bufferChannels: number,
): AudioNode[] {
  if (trackMode === "mono" && bufferChannels >= 2) {
    const splitter = ctx.createChannelSplitter(2);
    const gL = ctx.createGain();
    const gR = ctx.createGain();
    gL.gain.value = STEREO_DOWNMIX_LINEAR;
    gR.gain.value = STEREO_DOWNMIX_LINEAR;
    source.connect(splitter);
    splitter.connect(gL, 0);
    splitter.connect(gR, 1);
    gL.connect(clipGain);
    gR.connect(clipGain);
    return [splitter, gL, gR];
  }
  // Mono→stereo: browser upmix into True Balance path; stereo→stereo direct.
  source.connect(clipGain);
  return [];
}

function startClip(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext,
  soloTrackIds?: readonly string[],
  soloBusIds?: readonly string[],
): void {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return;
  const track = project.audioTracks.find((t) => t.id === clip.trackId);
  const busIds = new Set((project.audioBusses ?? []).map((b) => b.id));
  if (!isClipAudible(track, clip.muted, soloTrackIds, soloBusIds, busIds)) {
    return;
  }

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

  // Track gain lives on the bus; clip node is fade × clip.gainDb only.
  const maxGain = gainDbToLinear(clip.gainDb);
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

  const trackMode = resolveChannelMode(track?.channelMode);
  const trackBus = ensureTrackBus(ctx, clip.trackId, trackMode);
  const extras = connectWithOptionalDownmix(
    ctx,
    source,
    gain,
    trackMode,
    buf.numberOfChannels,
  );
  gain.connect(trackBus.gain);
  const startAt = Math.max(
    0,
    Math.min(offset, Math.max(0, buf.duration - 0.001)),
  );
  try {
    source.start(ctx.currentTime, startAt, remaining);
  } catch {
    return;
  }
  source.onended = () => {
    active = active.filter((a) => a.clipId !== clipId);
  };
  active.push({ clipId, trackId: clip.trackId, source, gain, extras });
}

export function syncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  applyBusParams(input.project, ctx, input.soloBusIds);

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
  const busIds = new Set((input.project.audioBusses ?? []).map((b) => b.id));
  const stillNeeded = new Set<string>();

  for (const clip of input.project.audioClips) {
    if (epochAtStart !== stopEpoch || playbackSuppressed) break;
    const track = trackById.get(clip.trackId);
    if (
      !isClipAudible(
        track,
        clip.muted,
        input.soloTrackIds,
        input.soloBusIds,
        busIds,
      )
    ) {
      continue;
    }
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
      input.soloBusIds,
    );
  }

  for (const a of [...active]) {
    if (!stillNeeded.has(a.clipId)) {
      try {
        a.source.stop();
      } catch {
        /* */
      }
      try {
        a.source.disconnect();
        a.gain.disconnect();
        for (const n of a.extras) disconnectSafe(n);
      } catch {
        /* */
      }
      active = active.filter((x) => x.clipId !== a.clipId);
    }
  }
}

export function stopAudioPlayback(): void {
  stopEpoch += 1;
  stopAll();
  disposeBuses();
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
