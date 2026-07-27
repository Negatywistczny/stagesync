/**
 * Probe AudioContext.destination.maxChannelCount for Mixer HW Out gate.
 * Multi-out UI only when {@link hwOutputUiAllowed} (typically ≥ 4).
 */

import { hwOutputUiAllowed } from "@stagesync/shared";
import { getMetronomeAudioContext } from "./metronome.js";

export const AUDIO_HW_CAPABILITY_EVENT = "stagesync-audio-hw-capability";

export type AudioHwCapability = {
  maxChannelCount: number;
  uiAllowed: boolean;
};

let cached: AudioHwCapability = {
  maxChannelCount: 2,
  uiAllowed: false,
};

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AudioHwCapability>(AUDIO_HW_CAPABILITY_EVENT, {
      detail: { ...cached },
    }),
  );
}

export function getAudioHwCapability(): AudioHwCapability {
  return { ...cached };
}

export function getAudioMaxChannelCount(): number {
  return cached.maxChannelCount;
}

/** Re-read destination after setSinkId / resume. */
export function refreshAudioHwCapability(
  ctx: AudioContext = getMetronomeAudioContext(),
): AudioHwCapability {
  let n = 2;
  try {
    const raw = ctx.destination.maxChannelCount;
    if (Number.isFinite(raw) && raw >= 1) n = Math.floor(raw);
  } catch {
    n = 2;
  }
  const next: AudioHwCapability = {
    maxChannelCount: n,
    uiAllowed: hwOutputUiAllowed(n),
  };
  const changed =
    next.maxChannelCount !== cached.maxChannelCount ||
    next.uiAllowed !== cached.uiAllowed;
  cached = next;
  if (changed) emit();
  return getAudioHwCapability();
}

/**
 * Apply discrete multi-channel layout on the destination when UI allows.
 * Returns the channel count used for ChannelMerger (2 when gated off).
 */
export function applyDestinationChannelLayout(
  ctx: AudioContext,
  maxChannelCount = refreshAudioHwCapability(ctx).maxChannelCount,
): number {
  const n = hwOutputUiAllowed(maxChannelCount) ? maxChannelCount : 2;
  try {
    const dest = ctx.destination;
    dest.channelCount = n;
    dest.channelCountMode = "explicit";
    dest.channelInterpretation = "discrete";
  } catch {
    /* some browsers reject — keep stereo fail-soft */
    return 2;
  }
  return n;
}
