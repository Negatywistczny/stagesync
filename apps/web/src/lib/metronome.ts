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
  ticksToMsAlongTempoMap,
  type TempoMapProject,
  type TimeSignature,
} from "@stagesync/shared";
import {
  getMetronomePrefs,
  masterClickGainLinear,
  type MetronomePrefs,
  type MetronomeTimbre,
} from "./metronomePrefs.js";

export type MetronomeDeps = {
  getAudioContext: () => AudioContext;
};

let sharedCtx: AudioContext | null = null;
let clickAnalyser: AnalyserNode | null = null;
let clickAnalyserBuf: Float32Array | null = null;
let lastDisplayTicks: number | null = null;
let lastCtxTime: number | null = null;

/**
 * Options for the shared realtime AudioContext.
 * - `latencyHint: "playback"` — larger render buffers (music path). Chrome’s
 *   bare `new AudioContext()` matches interactive (~5 ms) and is more prone to
 *   underrun crackle on backing tracks.
 * - Never set `sampleRate` — keep the device default (typically 48 kHz). Forcing
 *   22.05/44.1 when the device is 48 kHz adds an extra SRC step and dulls MP3s
 *   vs QuickTime / Music.
 */
export function sharedAudioContextOptions(): AudioContextOptions {
  return { latencyHint: "playback" };
}

export function getMetronomeAudioContext(): AudioContext {
  if (!sharedCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const opts = sharedAudioContextOptions();
    sharedCtx = new Ctx(opts);
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

/** Peak gain @ 100 % accent/beat volume and 0 dB Click fader (Direct Cue). */
export const BASE_ACCENT_GAIN = 0.7;
export const BASE_BEAT_GAIN = 0.45;

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

/** Linear peak for one click (prefs × master fader). */
export function clickLevelLinear(
  accent: boolean,
  prefs: MetronomePrefs = getMetronomePrefs(),
): number {
  const masterLin = masterClickGainLinear(prefs);
  if (masterLin <= 0) return 0;
  const volPct = accent ? prefs.accentVolume : prefs.beatVolume;
  const base = accent ? BASE_ACCENT_GAIN : BASE_BEAT_GAIN;
  return base * (volPct / 100) * masterLin;
}

/**
 * Max lateness for an audible catch-up click. Deeper misses only advance the
 * beat cursor — stacking many past clicks at `currentTime` caused loud bangs.
 */
export const MAX_LATE_CLICK_MS = 40;
export const METRONOME_LOOKAHEAD_MS = 2500;
export const MAX_LOOKAHEAD_BEATS = 8;
export const MAX_BEATS_PER_ADVANCE = 64;

type ScheduledClickNode = {
  osc: OscillatorNode;
  when: number;
};

const scheduledClickNodes: ScheduledClickNode[] = [];

export function cancelScheduledMetronomeClicks(): void {
  for (const node of scheduledClickNodes) {
    try {
      node.osc.stop();
      node.osc.disconnect();
    } catch {
      /* ignore */
    }
  }
  scheduledClickNodes.length = 0;
  lastDisplayTicks = null;
  lastCtxTime = null;
}

function scheduleClick(
  ctx: AudioContext,
  when: number,
  accent: boolean,
  prefs = getMetronomePrefs(),
) {
  const level = clickLevelLinear(accent, prefs);
  if (level <= 0) return;

  const profile = TIMBRE_PROFILES[prefs.timbre];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = profile.type;
  osc.frequency.value = accent ? profile.accentHz : profile.beatHz;
  // Anchor the envelope at `when` — setting `.value` + ramp from "now" decays
  // look-ahead clicks to near-silence before the oscillator starts, while
  // late catch-up clicks (when ≈ now) stayed full level → quiet/loud spikes.
  const peak = Math.max(0.0001, level);
  gain.gain.setValueAtTime(peak, when);
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

  scheduledClickNodes.push({ osc, when });
  if (scheduledClickNodes.length > 64) {
    const cutoff = ctx.currentTime - 0.5;
    for (let i = scheduledClickNodes.length - 1; i >= 0; i--) {
      if (scheduledClickNodes[i]!.when < cutoff) {
        scheduledClickNodes.splice(i, 1);
      }
    }
  }
}

/**
 * Schedule one metronome click at `when` (AudioContext time).
 * Synchronous — safe inside rAF audition loops (no await stack).
 */
export function scheduleMetronomeClickAt(
  when: number,
  accent = true,
  prefs: MetronomePrefs = getMetronomePrefs(),
  ctx: AudioContext = getMetronomeAudioContext(),
): void {
  scheduleClick(ctx, when, accent, prefs);
}

/**
 * Play one click for Preferences preview (user gesture → resume + schedule).
 * Uses draft prefs when provided so Odsłuch matches the unsaved timbre/volume.
 */
export async function previewMetronomeClick(
  prefs: MetronomePrefs = getMetronomePrefs(),
  accent = true,
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<void> {
  await resumeMetronomeAudio(ctx);
  scheduleMetronomeClickAt(ctx.currentTime, accent, prefs, ctx);
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
  /**
   * When set, click lead time uses TempoMap/meterMap (Smart Tempo).
   * Flat `bpm` remains fallback when maps are absent.
   */
  tempoMaps?: TempoMapProject | null;
};

function aheadMsToBeat(
  fromTicks: number,
  toTicks: number,
  input: MetronomeTickInput,
): number {
  if (input.tempoMaps) {
    return ticksToMsAlongTempoMap(fromTicks, toTicks, input.tempoMaps);
  }
  return ticksToMs(
    toTicks - fromTicks,
    input.bpm,
    input.timeSignature,
    input.ppq,
  );
}

/**
 * Schedule clicks for beats crossed since `lastScheduledBeat`.
 * Returns updated lastScheduledBeat index (global beat from song start).
 */
export function advanceMetronomeClicks(
  input: MetronomeTickInput,
  lastScheduledBeat: number,
  ctx: AudioContext = getMetronomeAudioContext(),
): number {
  if (!input.enabled || !input.playing) {
    cancelScheduledMetronomeClicks();
    return lastScheduledBeat;
  }

  const perBeat = localTicksPerBeat(input.timeSignature, input.ppq);
  if (perBeat <= 0) return lastScheduledBeat;

  const currentBeat = Math.floor(input.displayTicks / perBeat);

  // Keep the beat cursor aligned while the context is unlocking so the first
  // running frame does not dump a burst of late clicks (or stay mute forever).
  if (ctx.state !== "running") {
    void ctx.resume().catch(() => {});
    return currentBeat;
  }

  const now = ctx.currentTime;

  const dtTicks = lastDisplayTicks !== null ? input.displayTicks - lastDisplayTicks : 0;

  const isBackwardSeek =
    (lastDisplayTicks !== null && dtTicks < -50) ||
    lastScheduledBeat > currentBeat + MAX_LOOKAHEAD_BEATS;

  const isForwardSeek =
    lastDisplayTicks !== null &&
    (dtTicks > Math.max(perBeat * 3, 2880) ||
      (currentBeat > lastScheduledBeat + 1 && dtTicks > perBeat * 1.5));

  const isSeekOrWrap = isBackwardSeek || isForwardSeek;

  if (isSeekOrWrap) {
    cancelScheduledMetronomeClicks();
  }

  let beat = isSeekOrWrap ? currentBeat - 1 : lastScheduledBeat;
  lastDisplayTicks = input.displayTicks;
  lastCtxTime = now;
  let advanced = 0;

  while (beat < currentBeat && advanced < MAX_BEATS_PER_ADVANCE) {
    beat += 1;
    advanced += 1;
    const beatStartTicks = beat * perBeat;
    const aheadMs = aheadMsToBeat(
      input.displayTicks,
      beatStartTicks,
      input,
    );
    // Past the lateness window: advance cursor only (no stacked bang).
    if (aheadMs < -MAX_LATE_CLICK_MS) continue;
    const when = Math.max(now, now + aheadMs / 1000);
    const beatInBar =
      ((beat % input.timeSignature.numerator) +
        input.timeSignature.numerator) %
      input.timeSignature.numerator;
    scheduleClick(ctx, when, beatInBar === 0);
  }

  // Large seek/jump forward: skip ahead without scheduling every missed click.
  if (beat < currentBeat) {
    beat = currentBeat;
  }
  advanced = 0;

  // Look-ahead scheduling: queue upcoming beats up to lookahead window into WebAudio.
  // This allows metronome playback to continue seamlessly even when rAF pauses in background tabs.
  const lookaheadMs = Math.max(METRONOME_LOOKAHEAD_MS, msPerBarHint(input));
  let upcoming = Math.max(beat + 1, currentBeat + 1);
  while (advanced < MAX_BEATS_PER_ADVANCE) {
    const beatStartTicks = upcoming * perBeat;
    const aheadMs = aheadMsToBeat(
      input.displayTicks,
      beatStartTicks,
      input,
    );
    if (aheadMs <= 1 || aheadMs > lookaheadMs) {
      break;
    }
    const when = Math.max(now, now + aheadMs / 1000);
    const beatInBar =
      ((upcoming % input.timeSignature.numerator) +
        input.timeSignature.numerator) %
      input.timeSignature.numerator;
    scheduleClick(ctx, when, beatInBar === 0);
    beat = upcoming;
    upcoming += 1;
    advanced += 1;
  }

  return beat;
}

/** Upper bound for look-ahead window (~1 bar @ local or flat BPM). */
function msPerBarHint(input: MetronomeTickInput): number {
  const beats = Math.max(1, input.timeSignature.numerator);
  if (input.tempoMaps) {
    const from = input.displayTicks;
    const to = from + localTicksPerBeat(input.timeSignature, input.ppq) * beats;
    return Math.max(50, Math.abs(aheadMsToBeat(from, to, input)) * 1.25);
  }
  const beatMs = 60_000 / Math.max(1, input.bpm);
  return beatMs * beats * 1.25;
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
