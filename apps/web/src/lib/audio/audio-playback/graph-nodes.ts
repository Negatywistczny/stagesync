import {
  balanceGains,
  clampPan,
  type ChannelMode,
} from "@stagesync/shared";
import { ANALYSER_FFT, GAIN_DEZIPPER_SEC, state } from "./state.js";
import type { ActiveCueSample, ActiveSource, TrackBus } from "./types.js";

export function makeAnalyser(ctx: AudioContext): AnalyserNode {
  const a = ctx.createAnalyser();
  a.fftSize = ANALYSER_FFT;
  a.smoothingTimeConstant = 0.35;
  return a;
}

export function outputNode(bus: TrackBus): AudioNode {
  return bus.route;
}

export function disconnectSafe(node: AudioNode): void {
  try {
    node.disconnect();
  } catch {
    /* */
  }
}

export function disconnectBusNodes(bus: TrackBus): void {
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

export function createChannelBus(ctx: AudioContext, mode: ChannelMode): TrackBus {
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

/**
 * Dezipper an AudioParam (fader / balance / mute). Instant `.value =` while
 * signal is present (or right after local suppress) causes clicks/pops.
 * Skip when the same target is already scheduled (mid-ramp thrash would
 * modulate gain every tick and sound like distortion / aliasing).
 */
export function setParamDezippered(
  param: AudioParam,
  value: number,
  currentTime: number,
): void {
  if (state.dezipperTargets.get(param) === value) return;
  if (param.value === value) {
    state.dezipperTargets.set(param, value);
    return;
  }
  state.dezipperTargets.set(param, value);
  try {
    param.cancelScheduledValues(currentTime);
    param.setValueAtTime(param.value, currentTime);
    param.linearRampToValueAtTime(value, currentTime + GAIN_DEZIPPER_SEC);
  } catch {
    param.value = value;
  }
}

export function applyBalanceOrPan(
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

function emptyReleaseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let buf = state.emptyBufferByCtx.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
    state.emptyBufferByCtx.set(ctx, buf);
  }
  return buf;
}

/** Stop + detach + swap buffer so WebKit can drop decoded audio RAM (WA-MEM-02). */
export function releaseActiveSource(a: ActiveSource): void {
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

export function releaseCueSample(a: ActiveCueSample): void {
  try {
    a.source.stop();
  } catch {
    /* */
  }
  disconnectSafe(a.source);
  disconnectSafe(a.gain);
  disconnectSafe(a.pan);
}
