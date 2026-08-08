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
 * Apply destination channel layout for Mixer HW Out.
 * Returns the channel count used for ChannelMerger (2 when multi-out inactive).
 *
 * When multi-out is inactive: restore **speakers** stereo (browser media path).
 * Forcing `discrete` on stereo — or opening an N-ch discrete stream on an
 * interface while only Master 1–2 is used — sounded thinner / worse than
 * QuickTime / Music. Activate discrete N-ch only when HW outs / non-default
 * Master map actually need ChannelMerger addressing.
 *
 * Skip no-op writes: applyBusParams → ensureDestGraph runs every transport
 * tick; re-assigning destination.channel* can glitch the stream even when
 * values are unchanged.
 */
export function applyDestinationChannelLayout(
  ctx: AudioContext,
  maxChannelCount = refreshAudioHwCapability(ctx).maxChannelCount,
  multiOutActive = false,
): number {
  const dest = ctx.destination;
  const canMulti = hwOutputUiAllowed(maxChannelCount);
  if (!multiOutActive || !canMulti) {
    if (
      dest.channelCount === 2 &&
      dest.channelCountMode === "explicit" &&
      dest.channelInterpretation === "speakers"
    ) {
      return 2;
    }
    try {
      dest.channelCount = 2;
      dest.channelCountMode = "explicit";
      dest.channelInterpretation = "speakers";
    } catch {
      /* some browsers reject — keep whatever the engine allows */
    }
    return 2;
  }
  const n = Math.floor(maxChannelCount);
  if (
    dest.channelCount === n &&
    dest.channelCountMode === "explicit" &&
    dest.channelInterpretation === "discrete"
  ) {
    return n;
  }
  try {
    dest.channelCount = n;
    dest.channelCountMode = "explicit";
    dest.channelInterpretation = "discrete";
  } catch {
    /* some browsers reject — keep stereo fail-soft */
    return 2;
  }
  return n;
}
