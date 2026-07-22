/**
 * Metronome click scheduler — Web Audio + transport SSOT ticks (α8).
 * Call `resume()` on first Play or metronome toggle (autoplay policy).
 */

import {
  localTicksPerBeat,
  ticksToMs,
  type TimeSignature,
} from "@stagesync/shared";

export type MetronomeDeps = {
  getAudioContext: () => AudioContext;
};

let sharedCtx: AudioContext | null = null;

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

/** Unlock / resume suspended AudioContext (user gesture). */
export async function resumeMetronomeAudio(
  ctx: AudioContext = getMetronomeAudioContext(),
): Promise<void> {
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
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

function scheduleClick(ctx: AudioContext, when: number, accent: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = accent ? 1200 : 800;
  gain.gain.value = accent ? 0.08 : 0.045;
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + 0.05);
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

  // After tab blur / large seek, skip backlog — one click storm is worse than a gap.
  if (currentBeat - beat > 2) {
    return currentBeat;
  }

  while (beat < currentBeat) {
    beat += 1;
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
