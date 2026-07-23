/**
 * Metronome click scheduler — Web Audio + transport SSOT ticks (α8).
 * Call `resume()` on first Play or metronome toggle (autoplay policy).
 *
 * Click routing: Direct Cue — Osc → Gain → analyser → destination.
 * NEVER through the project Master bus (Stereo Out).
 */

import {
  localTicksPerBeat,
  linearPeakToMeterDb,
  ticksToMs,
  type TimeSignature,
} from "@stagesync/shared";
import {
  getMetronomePrefs,
  masterClickGainLinear,
  type MetronomeTimbre,
} from "./metronomePrefs.js";

export type MetronomeDeps = {
  getAudioContext: () => AudioContext;
};

let sharedCtx: AudioContext | null = null;
let clickAnalyser: AnalyserNode | null = null;
let clickAnalyserBuf: Float32Array | null = null;

export function getMetronomeAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    sharedCtx = new Ctx();
  }
  return sharedCtx;
}

function ensureClickAnalyser(ctx: AudioContext): AnalyserNode {
  if (clickAnalyser && clickAnalyser.context === ctx) return clickAnalyser;
  const a = ctx.createAnalyser();
  a.fftSize = 256;
  a.smoothingTimeConstant = 0.2;
  a.connect(ctx.destination);
  clickAnalyser = a;
  clickAnalyserBuf = null;
  return a;
}

/** Unlock / resume suspended AudioContext (user gesture). */
export async function resumeMetronomeAudio(
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<void> {
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  ensureClickAnalyser(ctx);
  // iOS unlock: play a near-silent buffer once
  try {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

const BASE_ACCENT_GAIN = 0.08;
const BASE_BEAT_GAIN = 0.045;

type TimbreProfile = {
  type: OscillatorType;
  accentHz: number;
  beatHz: number;
  durationSec: number;
};

const TIMBRE_PROFILES: Record<MetronomeTimbre, TimbreProfile> = {
  default: {
    type: "square",
    accentHz: 1200,
    beatHz: 800,
    durationSec: 0.05,
  },
  woodblock: {
    type: "triangle",
    accentHz: 980,
    beatHz: 620,
    durationSec: 0.035,
  },
  bell: {
    type: "sine",
    accentHz: 1760,
    beatHz: 1320,
    durationSec: 0.08,
  },
};

function scheduleClick(ctx: AudioContext, when: number, accent: boolean) {
  const prefs = getMetronomePrefs();
  const masterLin = masterClickGainLinear(prefs);
  if (masterLin <= 0) return;

  const profile = TIMBRE_PROFILES[prefs.timbre];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = profile.type;
  osc.frequency.value = accent ? profile.accentHz : profile.beatHz;
  const level =
    (accent ? BASE_ACCENT_GAIN : BASE_BEAT_GAIN) *
    ((accent ? prefs.accentVolume : prefs.beatVolume) / 100) *
    masterLin;
  gain.gain.value = Math.max(0.0001, level);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    when + profile.durationSec * 0.85,
  );
  const cue = ensureClickAnalyser(ctx);
  osc.connect(gain);
  // Direct Cue path — bypass Master Stereo Out.
  gain.connect(cue);
  osc.start(when);
  osc.stop(when + profile.durationSec);
}

/** Live Click cue peak dB (not Master). Missing analyser → floor. */
export function readClickMeterDb(): number {
  if (!clickAnalyser) return linearPeakToMeterDb(0);
  const n = clickAnalyser.fftSize;
  if (!clickAnalyserBuf || clickAnalyserBuf.length !== n) {
    clickAnalyserBuf = new Float32Array(n);
  }
  const buf = clickAnalyserBuf;
  clickAnalyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = Math.abs(buf[i]!);
    if (v > peak) peak = v;
  }
  return linearPeakToMeterDb(peak);
}

export type MetronomeTickInput = {
  enabled: boolean;
  playing: boolean;
  displayTicks: number;
  bpm: number;
  timeSignature: TimeSignature;
  ppq: number;
};

/**
 * Schedule clicks for beats crossed since `lastScheduledBeat`.
 * Returns updated lastScheduledBeat index (global beat from song start).
 */
export function advanceMetronomeClicks(
  input: MetronomeTickInput,
  lastScheduledBeat: number,
  ctx: AudioContext = getMetronomeAudioContext(),
): number {
  if (!input.enabled || !input.playing || ctx.state !== "running") {
    return lastScheduledBeat;
  }

  const perBeat = localTicksPerBeat(input.timeSignature, input.ppq);
  if (perBeat <= 0) return lastScheduledBeat;

  const currentBeat = Math.floor(input.displayTicks / perBeat);
  let beat = lastScheduledBeat;
  const now = ctx.currentTime;
  const MAX_BEATS_PER_ADVANCE = 64;
  let scheduled = 0;

  while (beat < currentBeat && scheduled < MAX_BEATS_PER_ADVANCE) {
    beat += 1;
    scheduled += 1;
    const beatStartTicks = beat * perBeat;
    // Schedule slightly ahead; if late, play ASAP
    const aheadMs = ticksToMs(
      beatStartTicks - input.displayTicks,
      input.bpm,
      input.timeSignature,
      input.ppq,
    );
    const when = Math.max(now, now + aheadMs / 1000);
    const beatInBar =
      ((beat % input.timeSignature.numerator) +
        input.timeSignature.numerator) %
      input.timeSignature.numerator;
    scheduleClick(ctx, when, beatInBar === 0);
  }

  // Large seek/jump: skip ahead without scheduling every missed click.
  if (beat < currentBeat) {
    beat = currentBeat;
  }

  return beat;
}

/** Reset beat cursor (Stop / seek). */
export function metronomeBeatIndex(
  displayTicks: number,
  timeSignature: TimeSignature,
  ppq: number,
): number {
  const perBeat = localTicksPerBeat(timeSignature, ppq);
  if (perBeat <= 0) return 0;
  return Math.floor(displayTicks / perBeat);
}
