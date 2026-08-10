import {
  gainDbToLinear,
  hwOutputUiAllowed,
  resolveBusOutputDest,
  resolveChannelMode,
  resolveMasterOutputRouting,
  resolveTrackOutputDest,
  type AudioHardwareOutput,
  type ChannelMode,
  type Project,
} from "@stagesync/shared";
import {
  applyDestinationChannelLayout,
  getAudioMaxChannelCount,
  refreshAudioHwCapability,
} from "../audioHwCapability.js";
import { state } from "./state.js";
import type { DestGraph, GroupBusNode, HwOutBus, MasterBus, TrackBus } from "./types.js";
import {
  applyBalanceOrPan,
  createChannelBus,
  disconnectBusNodes,
  disconnectSafe,
  makeAnalyser,
  outputNode,
  setParamDezippered,
} from "./graph-nodes.js";

function ensureDestGraph(
  ctx: AudioContext,
  project: Project,
): DestGraph | null {
  refreshAudioHwCapability(ctx);
  const maxCh = getAudioMaxChannelCount();
  const needMulti = projectNeedsMultiOutDest(project, maxCh);
  const n = applyDestinationChannelLayout(ctx, maxCh, needMulti);
  if (!needMulti) {
    if (state.destGraph) {
      disconnectSafe(state.destGraph.merger);
      state.destGraph = null;
    }
    return null;
  }
  if (state.destGraph && state.destGraph.channelCount === n) return state.destGraph;
  if (state.destGraph) {
    disconnectSafe(state.destGraph.merger);
    state.destGraph = null;
  }
  const merger = ctx.createChannelMerger(n);
  merger.connect(ctx.destination);
  state.destGraph = { channelCount: n, merger };
  return state.destGraph;
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

export function ensureMasterBus(ctx: AudioContext, project: Project): MasterBus {
  const graph = ensureDestGraph(ctx, project);
  const multi = graph != null;
  const routing = resolveMasterOutputRouting(project.masterOutput);
  const width = routing.channelMode === "mono" ? 1 : 2;
  let channelOffset = routing.channelOffset;
  if (multi && graph && channelOffset + width > graph.channelCount) {
    channelOffset = 0;
  }

  if (state.masterBus) {
    const hadMulti = Boolean(state.masterBus.toMergerSplit);
    if (
      hadMulti === multi &&
      state.masterBus.channelOffset === channelOffset &&
      (!multi || state.masterBus.toMergerSplit)
    ) {
      return state.masterBus;
    }
    disconnectSafe(state.masterBus.gain);
    disconnectSafe(state.masterBus.splitter);
    disconnectSafe(state.masterBus.analyserL);
    disconnectSafe(state.masterBus.analyserR);
    if (state.masterBus.toMergerSplit) disconnectSafe(state.masterBus.toMergerSplit);
    state.masterBus = null;
    // Force rewire of all routes after master topology change
    state.trackWiredDest.clear();
    state.groupWiredDest.clear();
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

  state.masterBus = {
    gain,
    splitter,
    analyserL,
    analyserR,
    channelOffset,
    toMergerSplit,
  };
  return state.masterBus;
}

function disconnectHwOut(node: HwOutBus): void {
  disconnectSafe(node.gain);
  if (node.splitter) disconnectSafe(node.splitter);
  disconnectSafe(node.analyserL);
  if (node.analyserR) disconnectSafe(node.analyserR);
}

export function ensureHwOutBus(
  ctx: AudioContext,
  project: Project,
  row: AudioHardwareOutput,
): HwOutBus | null {
  const graph = ensureDestGraph(ctx, project);
  if (!graph) return null;
  const mode = resolveChannelMode(row.channelMode);
  const width = mode === "mono" ? 1 : 2;
  if (row.channelOffset + width > graph.channelCount) return null;

  const hit = state.hwOutBuses.get(row.id);
  if (hit && hit.mode === mode && hit.channelOffset === row.channelOffset) {
    return hit;
  }
  if (hit) {
    disconnectHwOut(hit);
    state.hwOutBuses.delete(row.id);
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
  state.hwOutBuses.set(row.id, node);
  return node;
}

function connectRouteToDest(
  out: AudioNode,
  dest:
    | { kind: "master" }
    | { kind: "bus"; busId: string }
    | { kind: "hw_out"; hwOutputId: string },
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
      resolveChannelMode(busses.find((b) => b.id === dest.busId)?.channelMode),
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

export function ensureGroupBus(
  ctx: AudioContext,
  project: Project,
  busId: string,
  mode: ChannelMode,
): GroupBusNode {
  const hit = state.groupBuses.get(busId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    state.groupBuses.delete(busId);
    state.groupWiredDest.delete(busId);
    // Bus node rebuilt (e.g. mono↔stereo): force tracks/cues that fed the old
    // gain to rewire — disconnect() only clears outputs, not incoming edges.
    const destKey = `bus:${busId}`;
    for (const [trackId, wired] of state.trackWiredDest) {
      if (wired === destKey) state.trackWiredDest.delete(trackId);
    }
  }
  const master = ensureMasterBus(ctx, project);
  const node = createChannelBus(ctx, mode);
  outputNode(node).connect(master.gain);
  state.groupBuses.set(busId, node);
  state.groupWiredDest.set(busId, "master");
  return node;
}

export function ensureTrackBus(
  ctx: AudioContext,
  project: Project,
  trackId: string,
  mode: ChannelMode,
): TrackBus {
  const hit = state.trackBuses.get(trackId);
  if (hit && hit.mode === mode) return hit;
  if (hit) {
    disconnectBusNodes(hit);
    state.trackBuses.delete(trackId);
    state.trackWiredDest.delete(trackId);
  }
  const master = ensureMasterBus(ctx, project);
  const bus = createChannelBus(ctx, mode);
  outputNode(bus).connect(master.gain);
  state.trackBuses.set(trackId, bus);
  state.trackWiredDest.set(trackId, "master");
  return bus;
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
export function applyBusParams(
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
    if (state.groupWiredDest.get(bus.id) !== destKey) {
      disconnectSafe(out);
      connectRouteToDest(out, dest, ctx, project, master);
      state.groupWiredDest.set(bus.id, destKey);
    }
  }
  for (const id of [...state.groupBuses.keys()]) {
    if (busIdSet.has(id)) continue;
    const node = state.groupBuses.get(id);
    if (!node) continue;
    disconnectBusNodes(node);
    state.groupBuses.delete(id);
    state.groupWiredDest.delete(id);
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
    if (state.trackWiredDest.get(track.id) !== destKey) {
      disconnectSafe(out);
      connectRouteToDest(out, dest, ctx, project, master);
      state.trackWiredDest.set(track.id, destKey);
    }
  }
  for (const id of [...state.trackBuses.keys()]) {
    if (alive.has(id)) continue;
    const bus = state.trackBuses.get(id);
    if (!bus) continue;
    disconnectBusNodes(bus);
    state.trackBuses.delete(id);
    state.trackWiredDest.delete(id);
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
  for (const id of [...state.hwOutBuses.keys()]) {
    if (hwAlive.has(id)) continue;
    const node = state.hwOutBuses.get(id);
    if (!node) continue;
    disconnectHwOut(node);
    state.hwOutBuses.delete(id);
  }
}

export function disposeBuses(): void {
  for (const bus of state.trackBuses.values()) {
    disconnectBusNodes(bus);
  }
  state.trackBuses.clear();
  state.trackWiredDest.clear();
  for (const bus of state.groupBuses.values()) {
    disconnectBusNodes(bus);
  }
  state.groupBuses.clear();
  state.groupWiredDest.clear();
  for (const hw of state.hwOutBuses.values()) {
    disconnectHwOut(hw);
  }
  state.hwOutBuses.clear();
  if (state.masterBus) {
    disconnectSafe(state.masterBus.gain);
    disconnectSafe(state.masterBus.splitter);
    disconnectSafe(state.masterBus.analyserL);
    disconnectSafe(state.masterBus.analyserR);
    if (state.masterBus.toMergerSplit) disconnectSafe(state.masterBus.toMergerSplit);
    state.masterBus = null;
  }
  if (state.destGraph) {
    disconnectSafe(state.destGraph.merger);
    state.destGraph = null;
  }
}
