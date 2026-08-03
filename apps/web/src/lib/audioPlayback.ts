/**
 * Client WebAudio playback synced to server transport ticks ([ADR 0008]).
 *
 * Graph (Track → Master | Bus | HW-failsoft-Master; Bus → Master | Bus DAG):
 *
 * Mono track:
 *   BufferSource → [stereo→mono −3 dB downmix?] → fadeGain → levelGain → trackGain
 *     → analyser (pre-pan meter) + StereoPanner → route → (master | bus)
 *
 * Stereo track (True Balance — not StereoPanner):
 *   BufferSource → fadeGain → levelGain → trackGain (explicit 2-ch upmix)
 *     → ChannelSplitter → gainL / gainR → ChannelMerger → meterSplit → analyserL/R
 *     merger → (masterGain | groupBusGain)
 *
 * Mono file on a stereo bus is upmixed on trackGain before the splitter (otherwise L-only).
 * Bus may feed Master, another bus (acyclic), or HW out when
 * `maxChannelCount ≥ 4` **and** HW outs / remapped Master are active
 * (discrete ChannelMerger). Otherwise Master connects speakers-stereo to
 * destination; HW fail-softs to Master when multi-out is inactive.
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
  hwOutputUiAllowed,
  linearPeakToMeterDb,
  projectEndTicks,
  resolveBusOutputDest,
  resolveChannelMode,
  resolveMasterOutputRouting,
  resolveMeterAt,
  resolveTempoAt,
  resolveTrackOutputDest,
  STEREO_DOWNMIX_LINEAR,
  trimInMsOf,
  trimOutMsOf,
  ticksToMsAlongTempoMap,
  type AudioHardwareOutput,
  type ChannelMode,
  type Project,
} from "@stagesync/shared";
import {
  applyDestinationChannelLayout,
  getAudioMaxChannelCount,
  refreshAudioHwCapability,
} from "./audioHwCapability.js";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
} from "./metronome.js";

export type AudioPlaybackInput = {
  project: Project;
  playing: boolean;
  displayTicks: number;
  /**
   * When true, do not soft-stop at song end (transport loop wraps;
   * pause-at-end / auto-advance stay off on the server).
   */
  loopEnabled?: boolean;
  /** When non-empty, only these audio track ids are audible (client Solo). */
  soloTrackIds?: readonly string[];
  /**
   * When non-empty **and no track solo**, only tracks feeding these busses.
   * Product rule (DEF-BUG-04): track solo wins — bus solo is ignored for
   * audibility while any track is soloed (typical DAW; avoids silent dead state).
   */
  soloBusIds?: readonly string[];
};

type ActiveSource = {
  clipId: string;
  trackId: string;
  source: AudioBufferSourceNode;
  /** Fade envelope 0…1 (scheduled ramps). */
  fadeGain: GainNode;
  /** Clip `gainDb` level — updated live without graph restart. */
  levelGain: GainNode;
  /** Extra nodes for stereo→mono downmix (disconnected on stop). */
  extras: AudioNode[];
};

type ActiveCueSample = {
  clipId: string;
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  playPostStop: boolean;
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
  /** Device channel offset for L (R = offset+1 when stereo multi-out). */
  channelOffset: number;
  /** Present when multi-out is active — feeds destination merger. */
  toMergerSplit?: ChannelSplitterNode;
};

type HwOutBus = {
  id: string;
  mode: ChannelMode;
  channelOffset: number;
  gain: GainNode;
  splitter?: ChannelSplitterNode;
  analyserL: AnalyserNode;
  analyserR?: AnalyserNode;
};

type DestGraph = {
  channelCount: number;
  merger: ChannelMergerNode;
};

const bufferCache = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
/** Keys (`projectId:assetId`) that failed fetch/decode — UI warning until cleared. */
const failedAssets = new Set<string>();
/** Bumped on full cache clear — invalidates in-flight decode for all projects. */
let bufferCacheGlobalGen = 0;
/** Per-project clear generation — late decode must not re-pollute after switch. */
const bufferCacheProjectGen = new Map<string, number>();
let active: ActiveSource[] = [];
let activeCues: ActiveCueSample[] = [];
/** Cue clip ids fired this play-through (reset on seek / hard stop). */
const firedCueIds = new Set<string>();
let lastDisplayTicks: number | null = null;
let lastGraphKey = "";
/** Last sync args — cold-buffer load completion may re-trigger under playhead. */
let lastSyncArgs: {
  projectId: string;
  input: AudioPlaybackInput;
  ctx: AudioContext;
} | null = null;
/** Local halt while pause/stop RTT still has `playing: true` from SSOT. */
let playbackSuppressed = false;
let stopEpoch = 0;

const trackBuses = new Map<string, TrackBus>();
const groupBuses = new Map<string, GroupBusNode>();
const hwOutBuses = new Map<string, HwOutBus>();
let masterBus: MasterBus | null = null;
let destGraph: DestGraph | null = null;

const SEEK_JUMP_TICKS = 480;
const MAX_BUFFER_CACHE = 32;
const ANALYSER_FFT = 256;
/** Short linear ramp — avoids zipper clicks on live fader / mute / solo. */
const GAIN_DEZIPPER_SEC = 0.012;
/** Last wired track output: `"master"` | `bus:<id>` | `hw:<id>`. */
const trackWiredDest = new Map<string, string>();
/** Last wired group-bus output: `"master"` | `bus:<id>` | `hw:<id>`. */
const groupWiredDest = new Map<string, string>();

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

  const genGlobal = bufferCacheGlobalGen;
  const genProject = bufferCacheProjectGen.get(projectId) ?? 0;

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
      // Cleared while fetch/decode was in flight — do not re-pollute cache.
      if (
        genGlobal !== bufferCacheGlobalGen ||
        (bufferCacheProjectGen.get(projectId) ?? 0) !== genProject
      ) {
        return null;
      }
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
    bufferCache.has(cacheKey(projectId, id)),
  );
  return { ready, failedAssetIds };
}

export function clearAudioBufferCache(projectId?: string): void {
  if (!projectId) {
    bufferCacheGlobalGen += 1;
    bufferCacheProjectGen.clear();
    bufferCache.clear();
    inflight.clear();
    failedAssets.clear();
    return;
  }
  bufferCacheProjectGen.set(
    projectId,
    (bufferCacheProjectGen.get(projectId) ?? 0) + 1,
  );
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
    // Meter pre-pan so Peak/VU does not sag when pan is hard L/R (equal-power).
    gain.connect(analyser);
    gain.connect(pan);
    pan.connect(route);
    return { mode: "mono", gain, pan, analyser, route };
  }
  // Mono clip → stereo bus: Force 2-ch speakers upmix before ChannelSplitter
  // (splitter is discrete — mono would otherwise reach only output 0 / Left).
  gain.channelCount = 2;
  gain.channelCountMode = "explicit";
  gain.channelInterpretation = "speakers";
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

/** Last scheduled dezipper target — avoids re-ramping every transport tick. */
const dezipperTargets = new WeakMap<AudioParam, number>();

/**
 * Dezipper an AudioParam (fader / balance / mute). Instant `.value =` while
 * signal is present (or right after local suppress) causes clicks/pops.
 * Skip when the same target is already scheduled (mid-ramp thrash would
 * modulate gain every tick and sound like distortion / aliasing).
 */
function setParamDezippered(
  param: AudioParam,
  value: number,
  currentTime: number,
): void {
  if (dezipperTargets.get(param) === value) return;
  if (param.value === value) {
    dezipperTargets.set(param, value);
    return;
  }
  dezipperTargets.set(param, value);
  try {
    param.cancelScheduledValues(currentTime);
    param.setValueAtTime(param.value, currentTime);
    param.linearRampToValueAtTime(value, currentTime + GAIN_DEZIPPER_SEC);
  } catch {
    param.value = value;
  }
}

function applyBalanceOrPan(
  bus: TrackBus,
  pan: number,
  currentTime: number,
): void {
  const p = clampPan(pan);
  if (bus.mode === "mono") {
    setParamDezippered(bus.pan.pan, p, currentTime);
    return;
  }
  const { l, r } = balanceGains(p);
  setParamDezippered(bus.gainL.gain, l, currentTime);
  setParamDezippered(bus.gainR.gain, r, currentTime);
}

function ensureDestGraph(ctx: AudioContext, project: Project): DestGraph | null {
  refreshAudioHwCapability(ctx);
  const maxCh = getAudioMaxChannelCount();
  const needMulti = projectNeedsMultiOutDest(project, maxCh);
  const n = applyDestinationChannelLayout(ctx, maxCh, needMulti);
  if (!needMulti) {
    if (destGraph) {
      disconnectSafe(destGraph.merger);
      destGraph = null;
    }
    return null;
  }
  if (destGraph && destGraph.channelCount === n) return destGraph;
  if (destGraph) {
    disconnectSafe(destGraph.merger);
    destGraph = null;
  }
  const merger = ctx.createChannelMerger(n);
  merger.connect(ctx.destination);
  destGraph = { channelCount: n, merger };
  return destGraph;
}

/**
 * Discrete multi-channel destination only when something actually addresses
 * channels beyond a plain stereo Master→destination (HW outs or remapped Master).
 */
function projectNeedsMultiOutDest(
  project: Project,
  maxChannelCount: number,
): boolean {
  if (!hwOutputUiAllowed(maxChannelCount)) return false;
  if ((project.audioHardwareOutputs ?? []).length > 0) return true;
  const routing = resolveMasterOutputRouting(project.masterOutput);
  return routing.channelOffset !== 0;
}

function ensureMasterBus(ctx: AudioContext, project: Project): MasterBus {
  const graph = ensureDestGraph(ctx, project);
  const multi = graph != null;
  const routing = resolveMasterOutputRouting(project.masterOutput);
  const width = routing.channelMode === "mono" ? 1 : 2;
  let channelOffset = routing.channelOffset;
  if (multi && graph && channelOffset + width > graph.channelCount) {
    channelOffset = 0;
  }

  if (masterBus) {
    const hadMulti = Boolean(masterBus.toMergerSplit);
    if (
      hadMulti === multi &&
      masterBus.channelOffset === channelOffset &&
      (!multi || masterBus.toMergerSplit)
    ) {
      return masterBus;
    }
    disconnectSafe(masterBus.gain);
    disconnectSafe(masterBus.splitter);
    disconnectSafe(masterBus.analyserL);
    disconnectSafe(masterBus.analyserR);
    if (masterBus.toMergerSplit) disconnectSafe(masterBus.toMergerSplit);
    masterBus = null;
    // Force rewire of all routes after master topology change
    trackWiredDest.clear();
    groupWiredDest.clear();
  }

  const gain = ctx.createGain();
  gain.gain.value = 1;
  const splitter = ctx.createChannelSplitter(2);
  const analyserL = makeAnalyser(ctx);
  const analyserR = makeAnalyser(ctx);
  gain.connect(splitter);
  splitter.connect(analyserL, 0);
  splitter.connect(analyserR, 1);

  let toMergerSplit: ChannelSplitterNode | undefined;
  if (multi && graph) {
    toMergerSplit = ctx.createChannelSplitter(2);
    gain.connect(toMergerSplit);
    toMergerSplit.connect(graph.merger, 0, channelOffset);
    if (width >= 2) {
      toMergerSplit.connect(graph.merger, 1, channelOffset + 1);
    } else {
      // Mono Master map: fold R into the same physical channel.
      toMergerSplit.connect(graph.merger, 1, channelOffset);
    }
  } else {
    gain.connect(ctx.destination);
  }

  masterBus = {
    gain,
    splitter,
    analyserL,
    analyserR,
    channelOffset,
    toMergerSplit,
  };
  return masterBus;
}

function disconnectHwOut(node: HwOutBus): void {
  disconnectSafe(node.gain);
  if (node.splitter) disconnectSafe(node.splitter);
  disconnectSafe(node.analyserL);
  if (node.analyserR) disconnectSafe(node.analyserR);
}

function ensureHwOutBus(
  ctx: AudioContext,
  project: Project,
  row: AudioHardwareOutput,
): HwOutBus | null {
  const graph = ensureDestGraph(ctx, project);
  if (!graph) return null;
  const mode = resolveChannelMode(row.channelMode);
  const width = mode === "mono" ? 1 : 2;
  if (row.channelOffset + width > graph.channelCount) return null;

  const hit = hwOutBuses.get(row.id);
  if (
    hit &&
    hit.mode === mode &&
    hit.channelOffset === row.channelOffset
  ) {
    return hit;
  }
  if (hit) {
    disconnectHwOut(hit);
    hwOutBuses.delete(row.id);
  }

  const gain = ctx.createGain();
  gain.gain.value = 1;
  const analyserL = makeAnalyser(ctx);
  let analyserR: AnalyserNode | undefined;
  let splitter: ChannelSplitterNode | undefined;

  if (mode === "mono") {
    gain.connect(analyserL);
    gain.connect(graph.merger, 0, row.channelOffset);
  } else {
    gain.channelCount = 2;
    gain.channelCountMode = "explicit";
    gain.channelInterpretation = "speakers";
    splitter = ctx.createChannelSplitter(2);
    analyserR = makeAnalyser(ctx);
    gain.connect(splitter);
    splitter.connect(analyserL, 0);
    splitter.connect(analyserR, 1);
    splitter.connect(graph.merger, 0, row.channelOffset);
    splitter.connect(graph.merger, 1, row.channelOffset + 1);
  }

  const node: HwOutBus = {
    id: row.id,
    mode,
    channelOffset: row.channelOffset,
    gain,
    splitter,
    analyserL,
    analyserR,
  };
  hwOutBuses.set(row.id, node);
  return node;
}

function connectRouteToDest(
  out: AudioNode,
  dest: { kind: "master" } | { kind: "bus"; busId: string } | { kind: "hw_out"; hwOutputId: string },
  ctx: AudioContext,
  project: Project,
  master: MasterBus,
): void {
  if (dest.kind === "bus") {
    const busses = project.audioBusses ?? [];
    const g = ensureGroupBus(
      ctx,
      project,
      dest.busId,
      resolveChannelMode(
        busses.find((b) => b.id === dest.busId)?.channelMode,
      ),
    );
    out.connect(g.gain);
    return;
  }
  if (dest.kind === "hw_out") {
    const row = (project.audioHardwareOutputs ?? []).find(
      (h) => h.id === dest.hwOutputId,
    );
    if (row) {
      const hw = ensureHwOutBus(ctx, project, row);
      if (hw) {
        out.connect(hw.gain);
        return;
      }
    }
  }
  out.connect(master.gain);
}

function ensureGroupBus(
  ctx: AudioContext,
  project: Project,
  busId: string,
  mode: ChannelMode,
): GroupBusNode {
  const hit = groupBuses.get(busId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    groupBuses.delete(busId);
    groupWiredDest.delete(busId);
    // Bus node rebuilt (e.g. mono↔stereo): force tracks/cues that fed the old
    // gain to rewire — disconnect() only clears outputs, not incoming edges.
    const destKey = `bus:${busId}`;
    for (const [trackId, wired] of trackWiredDest) {
      if (wired === destKey) trackWiredDest.delete(trackId);
    }
  }
  const master = ensureMasterBus(ctx, project);
  const node = createChannelBus(ctx, mode);
  outputNode(node).connect(master.gain);
  groupBuses.set(busId, node);
  groupWiredDest.set(busId, "master");
  return node;
}

function ensureTrackBus(
  ctx: AudioContext,
  project: Project,
  trackId: string,
  mode: ChannelMode,
): TrackBus {
  const hit = trackBuses.get(trackId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    trackBuses.delete(trackId);
    trackWiredDest.delete(trackId);
  }
  const master = ensureMasterBus(ctx, project);
  const bus = createChannelBus(ctx, mode);
  outputNode(bus).connect(master.gain);
  trackBuses.set(trackId, bus);
  trackWiredDest.set(trackId, "master");
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
 * Whether group-bus solo should zero this bus gain.
 * Track solo wins: when any track is soloed, bus solo does not mute buses
 * (soloed tracks stay audible via their destination fader; DEF-BUG-04).
 */
export function busSoloMutesBus(
  busId: string,
  soloTrackIds: readonly string[] | undefined,
  soloBusIds: readonly string[] | undefined,
): boolean {
  if (soloTrackIds && soloTrackIds.length > 0) return false;
  if (!soloBusIds || soloBusIds.length === 0) return false;
  return !soloBusIds.includes(busId);
}

/**
 * Apply gain/pan/balance/mute/solo and (re)wire outputs to Master or group bus.
 * Gain/pan/balance update live (dezippered) — no graph restart.
 * Output rewire only when destination changes (avoids tick-rate reconnect clicks).
 * Channel-mode change rebuilds topology (caller includes mode in graphKey).
 */
function applyBusParams(
  project: Project,
  ctx: AudioContext,
  soloTrackIds?: readonly string[],
  soloBusIds?: readonly string[],
): void {
  const master = ensureMasterBus(ctx, project);
  const now = ctx.currentTime;
  setParamDezippered(
    master.gain.gain,
    gainDbToLinear(project.masterGainDb),
    now,
  );

  const busses = project.audioBusses ?? [];
  const busIdSet = new Set(busses.map((b) => b.id));
  const hwIdSet = new Set(
    (project.audioHardwareOutputs ?? []).map((h) => h.id),
  );

  for (const bus of busses) {
    const mode = resolveChannelMode(bus.channelMode);
    const node = ensureGroupBus(ctx, project, bus.id, mode);
    let lin = gainDbToLinear(bus.gainDb);
    if (bus.muted) lin = 0;
    if (busSoloMutesBus(bus.id, soloTrackIds, soloBusIds)) lin = 0;
    setParamDezippered(node.gain.gain, lin, now);
    applyBalanceOrPan(node, bus.pan ?? 0, now);
    const dest = resolveBusOutputDest(bus.output, {
      fromBusId: bus.id,
      busIds: busIdSet,
      busses,
      hwOutputIds: hwIdSet,
    });
    const destKey =
      dest.kind === "bus"
        ? `bus:${dest.busId}`
        : dest.kind === "hw_out"
          ? `hw:${dest.hwOutputId}`
          : "master";
    const out = outputNode(node);
    if (groupWiredDest.get(bus.id) !== destKey) {
      disconnectSafe(out);
      connectRouteToDest(out, dest, ctx, project, master);
      groupWiredDest.set(bus.id, destKey);
    }
  }
  for (const id of [...groupBuses.keys()]) {
    if (busIdSet.has(id)) continue;
    const node = groupBuses.get(id);
    if (!node) continue;
    disconnectBusNodes(node);
    groupBuses.delete(id);
    groupWiredDest.delete(id);
  }

  const alive = new Set(project.audioTracks.map((t) => t.id));
  for (const track of project.audioTracks) {
    const mode = resolveChannelMode(track.channelMode);
    const tBus = ensureTrackBus(ctx, project, track.id, mode);
    setParamDezippered(tBus.gain.gain, gainDbToLinear(track.gainDb), now);
    applyBalanceOrPan(tBus, track.pan ?? 0, now);
    const dest = resolveTrackOutputDest(track.output, busIdSet, hwIdSet);
    const destKey =
      dest.kind === "bus"
        ? `bus:${dest.busId}`
        : dest.kind === "hw_out"
          ? `hw:${dest.hwOutputId}`
          : "master";
    const out = outputNode(tBus);
    if (trackWiredDest.get(track.id) !== destKey) {
      disconnectSafe(out);
      connectRouteToDest(out, dest, ctx, project, master);
      trackWiredDest.set(track.id, destKey);
    }
  }
  for (const id of [...trackBuses.keys()]) {
    if (alive.has(id)) continue;
    const bus = trackBuses.get(id);
    if (!bus) continue;
    disconnectBusNodes(bus);
    trackBuses.delete(id);
    trackWiredDest.delete(id);
  }

  // HW patch gain/mute + prune removed rows
  const hwRows = project.audioHardwareOutputs ?? [];
  const hwAlive = new Set(hwRows.map((h) => h.id));
  for (const row of hwRows) {
    const node = ensureHwOutBus(ctx, project, row);
    if (!node) continue;
    let lin = gainDbToLinear(row.gainDb);
    if (row.muted) lin = 0;
    setParamDezippered(node.gain.gain, lin, now);
  }
  for (const id of [...hwOutBuses.keys()]) {
    if (hwAlive.has(id)) continue;
    const node = hwOutBuses.get(id);
    if (!node) continue;
    disconnectHwOut(node);
    hwOutBuses.delete(id);
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

/** Live peak dB per hardware output patch. */
export function readHwOutMeterDb(hwOutputId: string): ChannelMeterPeaks {
  const bus = hwOutBuses.get(hwOutputId);
  const floor = linearPeakToMeterDb(0);
  if (!bus) return { l: floor };
  if (bus.mode === "mono" || !bus.analyserR) {
    return { l: peakDbFromAnalyser(bus.analyserL) };
  }
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

/** Tiny silent buffer assigned after stop — releases decoded PCM (Safari/WebKit scratch). */
const emptyBufferByCtx = new WeakMap<BaseAudioContext, AudioBuffer>();

function emptyReleaseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = emptyBufferByCtx.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
    emptyBufferByCtx.set(ctx, buf);
  }
  return buf;
}

/** Stop + detach + swap buffer so WebKit can drop decoded audio RAM (WA-MEM-02). */
function releaseActiveSource(a: ActiveSource): void {
  // Clear before stop — BufferSource fires `ended` after stop(); a handler that
  // matched by clipId would wipe a replacement voice started for the same clip
  // (restart thrash → choppy / “aliased” playback).
  a.source.onended = null;
  try {
    const audioCtx = a.source.context ?? a.fadeGain.context;
    const now = audioCtx.currentTime;
    a.fadeGain.gain.cancelScheduledValues(now);
    a.fadeGain.gain.setValueAtTime(0, now);
    a.levelGain.gain.cancelScheduledValues(now);
    a.levelGain.gain.setValueAtTime(0, now);
  } catch {
    /* context closed or unavailable */
  }
  try {
    a.source.stop();
  } catch {
    /* already stopped */
  }
  try {
    const ctx = a.source.context;
    a.source.buffer = emptyReleaseBuffer(ctx);
  } catch {
    /* assign may throw if context closed */
  }
  // Disconnect each node separately. A single try/catch around the chain is
  // unsafe: if source.disconnect() throws (e.g. already detached after buffer
  // swap on WebKit), levelGain would stay wired into the track bus — the next
  // graph rebuild then stacks another voice and loudness creeps up permanently.
  disconnectSafe(a.source);
  disconnectSafe(a.fadeGain);
  disconnectSafe(a.levelGain);
  for (const n of a.extras) disconnectSafe(n);
}

function releaseCueSample(a: ActiveCueSample): void {
  try {
    a.source.stop();
  } catch {
    /* */
  }
  disconnectSafe(a.source);
  disconnectSafe(a.gain);
  disconnectSafe(a.pan);
}

/** PANIC — stop all cue samples including playPostStop. */
export function panicCueSamples(): void {
  for (const a of activeCues) releaseCueSample(a);
  activeCues = [];
  firedCueIds.clear();
}

function stopCueSamplesOnTransportStop(): void {
  const keep: ActiveCueSample[] = [];
  for (const a of activeCues) {
    if (a.playPostStop) keep.push(a);
    else releaseCueSample(a);
  }
  activeCues = keep;
}

function startCueSample(
  projectId: string,
  project: Project,
  clip: Project["cue"]["clips"][number],
  ctx: AudioContext,
): void {
  const sample = clip.sample;
  if (!sample) return;
  const buf = bufferCache.get(cacheKey(projectId, sample.assetId));
  if (!buf) {
    void loadAudioBuffer(projectId, sample.assetId, ctx);
    return;
  }
  const poly = sample.polyphony ?? "retrigger";
  if (poly === "choke") {
    activeCues = activeCues.filter((a) => {
      if (a.clipId !== clip.id) return true;
      releaseCueSample(a);
      return false;
    });
  }
  const source = ctx.createBufferSource();
  source.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = gainDbToLinear(sample.gainDb);
  const pan = ctx.createStereoPanner();
  pan.pan.value = sample.pan ?? 0;
  source.connect(gain);
  gain.connect(pan);

  const master = ensureMasterBus(ctx, project);
  let dest: AudioNode = master.gain;
  if (sample.output?.kind === "bus") {
    const busId = sample.output.busId;
    const bus = project.audioBusses?.find((b) => b.id === busId);
    if (bus) {
      dest = ensureGroupBus(
        ctx,
        project,
        bus.id,
        resolveChannelMode(bus.channelMode),
      ).gain;
    }
  } else if (sample.output?.kind === "hw_out") {
    const hwOutputId = sample.output.hwOutputId;
    const row = (project.audioHardwareOutputs ?? []).find(
      (h) => h.id === hwOutputId,
    );
    if (row) {
      const hw = ensureHwOutBus(ctx, project, row);
      if (hw) dest = hw.gain;
    }
  }
  pan.connect(dest);

  const mode = sample.mode ?? "one-shot";
  let dur = buf.duration;
  if (mode === "gated") {
    const alongMs = ticksToMsAlongTempoMap(
      clip.startTicks,
      clip.startTicks + clip.lengthTicks,
      project,
    );
    dur = Math.max(0.01, alongMs / 1000);
  }
  try {
    if (mode === "gated") source.start(0, 0, dur);
    else source.start(0);
  } catch {
    return;
  }
  const entry: ActiveCueSample = {
    clipId: clip.id,
    source,
    gain,
    pan,
    playPostStop: Boolean(sample.playPostStop),
  };
  source.onended = () => {
    activeCues = activeCues.filter((a) => a !== entry);
  };
  activeCues.push(entry);
}

/** Manual GO pad — fires cue sample (immediate or next-beat). */
export function fireCueSampleGo(
  projectId: string,
  project: Project,
  clipId: string,
  displayTicks: number,
  ctx: AudioContext = getMetronomeAudioContext(),
): boolean {
  const clip = project.cue.clips.find((c) => c.id === clipId);
  if (!clip?.sample) return false;
  const q = clip.sample.quantization ?? "immediate";
  if (q === "next-beat") {
    const beatTicks = Math.max(1, project.ppq);
    const next = Math.ceil((displayTicks + 1) / beatTicks) * beatTicks;
    const delayMs = Math.max(
      0,
      ticksToMsAlongTempoMap(displayTicks, next, project),
    );
    window.setTimeout(() => {
      startCueSample(projectId, project, clip, ctx);
    }, delayMs);
    return true;
  }
  startCueSample(projectId, project, clip, ctx);
  return true;
}

function syncCueSamples(
  projectId: string,
  project: Project,
  displayTicks: number,
  prevTicks: number | null,
  ctx: AudioContext,
): void {
  for (const clip of project.cue.clips) {
    if (!clip.sample) continue;
    const q = clip.sample.quantization ?? "tick";
    if (q === "immediate") continue;

    let fireAt = clip.startTicks;
    if (q === "next-beat") {
      const beatTicks = Math.max(1, project.ppq);
      fireAt = Math.ceil(clip.startTicks / beatTicks) * beatTicks;
      if (fireAt < clip.startTicks) fireAt += beatTicks;
    }

    const crossed =
      prevTicks != null && prevTicks < fireAt && displayTicks >= fireAt;
    if (!crossed) continue;
    if (firedCueIds.has(clip.id)) continue;
    firedCueIds.add(clip.id);
    startCueSample(projectId, project, clip, ctx);
  }
}

function stopAll(): void {
  for (const a of active) {
    releaseActiveSource(a);
  }
  active = [];
  stopCueSamplesOnTransportStop();
  firedCueIds.clear();
}

function disposeBuses(): void {
  for (const bus of trackBuses.values()) {
    disconnectBusNodes(bus);
  }
  trackBuses.clear();
  trackWiredDest.clear();
  for (const bus of groupBuses.values()) {
    disconnectBusNodes(bus);
  }
  groupBuses.clear();
  groupWiredDest.clear();
  for (const hw of hwOutBuses.values()) {
    disconnectHwOut(hw);
  }
  hwOutBuses.clear();
  if (masterBus) {
    disconnectSafe(masterBus.gain);
    disconnectSafe(masterBus.splitter);
    disconnectSafe(masterBus.analyserL);
    disconnectSafe(masterBus.analyserR);
    if (masterBus.toMergerSplit) disconnectSafe(masterBus.toMergerSplit);
    masterBus = null;
  }
  if (destGraph) {
    disconnectSafe(destGraph.merger);
    destGraph = null;
  }
}

/** Immediate local mute (Pause/Stop click) — blocks re-schedule until cleared. */
export function suppressAudioPlayback(): void {
  playbackSuppressed = true;
  stopEpoch += 1;
  stopAll();
  panicCueSamples();
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
  /** Active cue-sample voices (one-shot / gated). */
  activeCueCount: number;
  suppressed: boolean;
  stopEpoch: number;
  /** Linear gain currently applied to each group bus (post mute/solo). */
  groupBusGainLinear: Record<string, number>;
  /** Linear gain currently applied to each track bus fader. */
  trackGainLinear: Record<string, number>;
} {
  const groupBusGainLinear: Record<string, number> = {};
  for (const [id, bus] of groupBuses) {
    groupBusGainLinear[id] = bus.gain.gain.value;
  }
  const trackGainLinear: Record<string, number> = {};
  for (const [id, bus] of trackBuses) {
    trackGainLinear[id] = bus.gain.gain.value;
  }
  return {
    activeCount: active.length,
    activeCueCount: activeCues.length,
    suppressed: playbackSuppressed,
    stopEpoch,
    groupBusGainLinear,
    trackGainLinear,
  };
}

/**
 * Structural graph key — mute/solo/clip geometry / track routing / channel mode.
 * Track/bus/master gain/pan and clip `gainDb` update live (no restart).
 *
 * Idle group-bus rows are intentionally omitted: add/remove/mute/gain/pan on a
 * bus is handled by {@link applyBusParams}. Listing every bus here used to
 * rebuild all clip voices on "+ Dodaj Bus" even with zero sends — and any
 * incomplete voice teardown then stacked levelGain→track edges (loudness creep).
 */
function graphKey(input: AudioPlaybackInput): string {
  return [
    input.project.audioClips
      .map(
        (c) =>
          `${c.id}:${c.trackId}:${c.assetId}:${c.startTicks}:${c.lengthTicks}:${c.trimInMs ?? 0}:${c.trimOutMs ?? 0}:${c.muted}:${c.fadeInMs ?? 0}:${c.fadeOutMs ?? 0}:${c.loop ?? false}`,
      )
      .join(";"),
    input.project.audioTracks
      .map((t) => {
        const out =
          t.output?.kind === "bus"
            ? `bus:${t.output.busId}`
            : t.output?.kind === "hw_out"
              ? `hw:${t.output.hwOutputId}`
              : "master";
        return `${t.id}:${t.muted}:${resolveChannelMode(t.channelMode)}:${out}`;
      })
      .join(";"),
    (input.soloTrackIds ?? []).join(","),
    (input.soloBusIds ?? []).join(","),
    (() => {
      const m = resolveMasterOutputRouting(input.project.masterOutput);
      return `masterOut:${m.channelOffset}:${m.channelMode}`;
    })(),
    (input.project.audioHardwareOutputs ?? [])
      .map(
        (h) =>
          `${h.id}:${h.channelOffset}:${resolveChannelMode(h.channelMode)}`,
      )
      .join(";"),
    input.project.cue.clips
      .map((c) => {
        const s = c.sample;
        if (!s) return `${c.id}:-`;
        return `${c.id}:${s.assetId}:${s.mode ?? "one-shot"}:${s.quantization ?? "tick"}:${s.output?.kind === "bus" ? s.output.busId : "master"}`;
      })
      .join(";"),
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
  // Track solo wins over bus solo (same rule as busSoloMutesBus / DEF-BUG-04).
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
    const epoch = stopEpoch;
    void loadAudioBuffer(projectId, clip.assetId, ctx).then((loaded) => {
      if (!loaded || epoch !== stopEpoch || playbackSuppressed) return;
      const snap = lastSyncArgs;
      if (!snap || snap.projectId !== projectId || !snap.input.playing) return;
      if (!snap.input.project.audioClips.some((c) => c.id === clipId)) return;
      if (active.some((a) => a.clipId === clipId)) return;
      startClip(
        projectId,
        snap.input.project,
        clipId,
        snap.input.displayTicks,
        snap.ctx,
        snap.input.soloTrackIds,
        snap.input.soloBusIds,
      );
    });
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
    const loopStart = trimInMsOf(clip) / 1000;
    const loopEnd = Math.max(
      loopStart,
      buf.duration - trimOutMsOf(clip) / 1000,
    );
    // Zero-length loop window can hang some engines — skip loop in that case.
    if (loopEnd > loopStart + 1e-4) {
      source.loop = true;
      source.loopStart = loopStart;
      source.loopEnd = loopEnd;
    }
  }

  // Fade envelope (0…1) separate from clip level so gainDb can update live.
  const intoClipMs = Math.max(0, offset * 1000 - trimInMsOf(clip));
  const asset = project.assets.find((a) => a.id === clip.assetId);
  const playableMs = audioClipPlayableMs(clip, asset, ctxTempo);
  const fadeIn = fadeInMsOf(clip);
  const fadeOut = fadeOutMsOf(clip);
  const now = ctx.currentTime;

  const fadeGain = ctx.createGain();
  const startFade = audioFadeGainAtMs(intoClipMs, playableMs, fadeIn, fadeOut);
  fadeGain.gain.cancelScheduledValues(now);
  fadeGain.gain.setValueAtTime(startFade, now);

  if (fadeIn > 0 && intoClipMs < fadeIn) {
    const reachMaxAt = now + (fadeIn - intoClipMs) / 1000;
    if (reachMaxAt > now) {
      fadeGain.gain.linearRampToValueAtTime(1, reachMaxAt);
    }
  }

  if (fadeOut > 0 && playableMs > 0) {
    const fadeOutStartMs = playableMs - fadeOut;
    const fadeOutStartAt = now + (fadeOutStartMs - intoClipMs) / 1000;
    const endAt = now + (playableMs - intoClipMs) / 1000;
    if (fadeOutStartAt > now) {
      fadeGain.gain.setValueAtTime(1, fadeOutStartAt);
      if (endAt > fadeOutStartAt) {
        fadeGain.gain.linearRampToValueAtTime(0, endAt);
      }
    } else if (endAt > now) {
      // Already in fade-out: startFade is the anchor (setValueAtTime above).
      fadeGain.gain.linearRampToValueAtTime(0, endAt);
    }
  }

  const levelGain = ctx.createGain();
  levelGain.gain.value = gainDbToLinear(clip.gainDb);

  const trackMode = resolveChannelMode(track?.channelMode);
  const trackBus = ensureTrackBus(ctx, project, clip.trackId, trackMode);
  const extras = connectWithOptionalDownmix(
    ctx,
    source,
    fadeGain,
    trackMode,
    buf.numberOfChannels,
  );
  fadeGain.connect(levelGain);
  levelGain.connect(trackBus.gain);
  const startAt = Math.max(
    0,
    Math.min(offset, Math.max(0, buf.duration - 0.001)),
  );
  try {
    source.start(ctx.currentTime, startAt, remaining);
  } catch {
    return;
  }
  const entry: ActiveSource = {
    clipId,
    trackId: clip.trackId,
    source,
    fadeGain,
    levelGain,
    extras,
  };
  // Match by entry identity — NOT clipId. After stop()/seek, the old source's
  // `ended` event must not remove a newly started voice for the same clip.
  source.onended = () => {
    active = active.filter((a) => a !== entry);
  };
  active.push(entry);
}

/**
 * Soft-stop when SSOT ticks are already past song end while the server is
 * still `playing` (pause-at-end / auto-advance awaiting setlist I/O).
 * Stops WebAudio sources only — does not invent a music clock (ADR 0002).
 */
export function shouldSoftStopPastSongEnd(input: AudioPlaybackInput): boolean {
  if (input.loopEnabled) return false;
  return input.displayTicks >= projectEndTicks(input.project);
}

export function syncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  lastSyncArgs = { projectId, input, ctx };
  applyBusParams(
    input.project,
    ctx,
    input.soloTrackIds,
    input.soloBusIds,
  );

  if (
    playbackSuppressed ||
    !input.playing ||
    shouldSoftStopPastSongEnd(input) ||
    ctx.state !== "running"
  ) {
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
  if (jumped || graphChanged) {
    stopEpoch += 1;
    stopAll();
    firedCueIds.clear();
  }
  const epochAtStart = stopEpoch;

  const prevTicks = lastDisplayTicks;
  lastDisplayTicks = input.displayTicks;
  lastGraphKey = gKey;

  const trackById = new Map(input.project.audioTracks.map((t) => [t.id, t]));
  const busIds = new Set((input.project.audioBusses ?? []).map((b) => b.id));
  const stillNeeded = new Set<string>();
  const clipById = new Map(input.project.audioClips.map((c) => [c.id, c]));

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

  syncCueSamples(
    projectId,
    input.project,
    input.displayTicks,
    prevTicks,
    ctx,
  );

  // Live clip gainDb (not part of graphKey) — only write when changed.
  for (const a of active) {
    const clip = clipById.get(a.clipId);
    if (!clip) continue;
    const lin = gainDbToLinear(clip.gainDb);
    if (a.levelGain.gain.value !== lin) {
      a.levelGain.gain.value = lin;
    }
  }

  for (const a of [...active]) {
    if (!stillNeeded.has(a.clipId)) {
      releaseActiveSource(a);
      active = active.filter((x) => x !== a);
    }
  }
}

export function stopAudioPlayback(): void {
  stopEpoch += 1;
  stopAll();
  disposeBuses();
  lastDisplayTicks = null;
  lastGraphKey = "";
  lastSyncArgs = null;
}

export async function resumeAndSyncAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
): Promise<void> {
  const epoch = stopEpoch;
  await resumeMetronomeAudio(getMetronomeAudioContext());
  // Pause/Stop during resume must not start sources from a stale Play snapshot.
  if (playbackSuppressed || epoch !== stopEpoch) return;
  if (!input.playing) return;
  syncAudioPlayback(projectId, input);
}

export function restartAudioPlayback(
  projectId: string,
  input: AudioPlaybackInput,
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  // Caller must `allowAudioPlayback()` before async resume/buffer; do not clear
  // suppress here — Pause during that window would otherwise phantom-start.
  if (playbackSuppressed) return;
  stopEpoch += 1;
  stopAll();
  lastDisplayTicks = null;
  lastGraphKey = "";
  syncAudioPlayback(projectId, input, ctx);
}
