/**
 * Audio clip geometry + gain helpers ([ADR 0008](../../docs/adr/0008-timeline-clip-editing.md)).
 * Pure — no Date.now() / AudioContext. Callers supply bpm/meter/ppq for ticks↔ms.
 */

import type { AudioClip, ProjectAsset } from "./schema.js";
import {
  DEFAULT_PPQ,
  elapsedToTicks,
  ticksToMs,
  type TimeSignature,
} from "./time.js";

export type AudioTempoCtx = {
  bpm: number;
  meter: TimeSignature;
  ppq?: number;
};

function ppqOf(ctx: AudioTempoCtx): number {
  return ctx.ppq ?? DEFAULT_PPQ;
}

/** Convert gain dB to linear amplitude (0 dB → 1). */
export function gainDbToLinear(gainDb: number | undefined): number {
  if (gainDb == null || !Number.isFinite(gainDb)) return 1;
  return Math.pow(10, gainDb / 20);
}

export function trimInMsOf(clip: Pick<AudioClip, "trimInMs">): number {
  return Math.max(0, clip.trimInMs ?? 0);
}

export function trimOutMsOf(clip: Pick<AudioClip, "trimOutMs">): number {
  return Math.max(0, clip.trimOutMs ?? 0);
}

/**
 * Playable source window in ms (after trims).
 * When `durationMs` is unknown, falls back to timeline length converted at ctx tempo.
 */
export function audioClipPlayableMs(
  clip: Pick<AudioClip, "lengthTicks" | "trimInMs" | "trimOutMs">,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  ctx: AudioTempoCtx,
): number {
  const durationMs = asset?.durationMs;
  if (durationMs != null && durationMs > 0) {
    const playable = durationMs - trimInMsOf(clip) - trimOutMsOf(clip);
    return Math.max(0, playable);
  }
  return Math.max(
    0,
    ticksToMs(clip.lengthTicks, ctx.bpm, ctx.meter, ppqOf(ctx)),
  );
}

/** Max lengthTicks allowed for the current trim window (no time-stretch). */
export function maxAudioLengthTicks(
  clip: Pick<AudioClip, "trimInMs" | "trimOutMs">,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  ctx: AudioTempoCtx,
): number | null {
  const durationMs = asset?.durationMs;
  if (durationMs == null || !(durationMs > 0)) return null;
  const playable = Math.max(0, durationMs - trimInMsOf(clip) - trimOutMsOf(clip));
  return Math.max(1, elapsedToTicks(playable, ctx.bpm, ctx.meter, ppqOf(ctx)));
}

/**
 * Offset into the decoded buffer (seconds) at a given transport tick.
 * Returns null when playhead is outside the clip span.
 */
export function audioClipBufferOffsetSec(
  clip: Pick<
    AudioClip,
    "startTicks" | "lengthTicks" | "trimInMs" | "trimOutMs"
  >,
  playheadTicks: number,
  ctx: AudioTempoCtx,
): number | null {
  if (
    playheadTicks < clip.startTicks ||
    playheadTicks >= clip.startTicks + clip.lengthTicks
  ) {
    return null;
  }
  const intoClipMs = ticksToMs(
    playheadTicks - clip.startTicks,
    ctx.bpm,
    ctx.meter,
    ppqOf(ctx),
  );
  return (trimInMsOf(clip) + intoClipMs) / 1000;
}

/** Remaining playable duration (seconds) from playhead within the clip. */
export function audioClipRemainingSec(
  clip: Pick<
    AudioClip,
    "startTicks" | "lengthTicks" | "trimInMs" | "trimOutMs"
  >,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  playheadTicks: number,
  ctx: AudioTempoCtx,
): number {
  const offset = audioClipBufferOffsetSec(clip, playheadTicks, ctx);
  if (offset == null) return 0;
  const playableMs = audioClipPlayableMs(clip, asset, ctx);
  const intoMs = offset * 1000 - trimInMsOf(clip);
  return Math.max(0, (playableMs - intoMs) / 1000);
}

/**
 * Derive lengthTicks from asset duration + trims (constant tempo at clip).
 * Returns null when duration is unknown.
 */
export function lengthTicksFromAssetWindow(
  clip: Pick<AudioClip, "trimInMs" | "trimOutMs">,
  asset: Pick<ProjectAsset, "durationMs">,
  ctx: AudioTempoCtx,
): number | null {
  if (asset.durationMs == null || !(asset.durationMs > 0)) return null;
  const playable = Math.max(
    1,
    asset.durationMs - trimInMsOf(clip) - trimOutMsOf(clip),
  );
  return Math.max(1, elapsedToTicks(playable, ctx.bpm, ctx.meter, ppqOf(ctx)));
}

/**
 * Clamp trim + length so the clip never stretches beyond source material.
 */
export function clampAudioClipToAsset(
  clip: AudioClip,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  ctx: AudioTempoCtx,
): AudioClip {
  let trimIn = trimInMsOf(clip);
  let trimOut = trimOutMsOf(clip);
  let lengthTicks = Math.max(1, Math.floor(clip.lengthTicks));
  const durationMs = asset?.durationMs;

  if (durationMs != null && durationMs > 0) {
    const minPlayable = 1;
    if (trimIn + trimOut >= durationMs - minPlayable) {
      trimOut = Math.max(0, durationMs - trimIn - minPlayable);
    }
    if (trimIn >= durationMs - minPlayable) {
      trimIn = Math.max(0, durationMs - minPlayable);
      trimOut = 0;
    }
    const maxLen = maxAudioLengthTicks(
      { trimInMs: trimIn, trimOutMs: trimOut },
      asset,
      ctx,
    );
    if (maxLen != null && lengthTicks > maxLen) {
      lengthTicks = maxLen;
    }
  }

  return {
    ...clip,
    trimInMs: trimIn > 0 ? trimIn : undefined,
    trimOutMs: trimOut > 0 ? trimOut : undefined,
    lengthTicks,
  };
}

/** Apply end-edge trim: keep start; shorten via trimOutMs when duration known. */
export function resizeAudioClipEnd(
  clip: AudioClip,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  newEndTicks: number,
  ctx: AudioTempoCtx,
): AudioClip {
  const start = clip.startTicks;
  let lengthTicks = Math.max(1, Math.floor(newEndTicks - start));
  const durationMs = asset?.durationMs;
  if (durationMs != null && durationMs > 0) {
    const desiredMs = ticksToMs(lengthTicks, ctx.bpm, ctx.meter, ppqOf(ctx));
    const trimIn = trimInMsOf(clip);
    const maxPlayable = Math.max(1, durationMs - trimIn);
    const playable = Math.min(maxPlayable, Math.max(1, desiredMs));
    const trimOut = Math.max(0, durationMs - trimIn - playable);
    lengthTicks = Math.max(
      1,
      elapsedToTicks(playable, ctx.bpm, ctx.meter, ppqOf(ctx)),
    );
    return clampAudioClipToAsset(
      { ...clip, lengthTicks, trimOutMs: trimOut > 0 ? trimOut : undefined },
      asset,
      ctx,
    );
  }
  return { ...clip, lengthTicks };
}

/** Apply start-edge trim: keep end; adjust startTicks + trimInMs when duration known. */
export function resizeAudioClipStart(
  clip: AudioClip,
  asset: Pick<ProjectAsset, "durationMs"> | null | undefined,
  newStartTicks: number,
  ctx: AudioTempoCtx,
): AudioClip {
  const end = clip.startTicks + clip.lengthTicks;
  let start = Math.floor(newStartTicks);
  if (end - start < 1) start = end - 1;
  let lengthTicks = Math.max(1, end - start);
  const durationMs = asset?.durationMs;
  if (durationMs != null && durationMs > 0) {
    const deltaTicks = start - clip.startTicks;
    const deltaMs = ticksToMs(deltaTicks, ctx.bpm, ctx.meter, ppqOf(ctx));
    let trimIn = trimInMsOf(clip) + deltaMs;
    const trimOut = trimOutMsOf(clip);
    const maxTrimIn = Math.max(0, durationMs - trimOut - 1);
    trimIn = Math.min(Math.max(0, trimIn), maxTrimIn);
    const playable = Math.max(1, durationMs - trimIn - trimOut);
    lengthTicks = Math.max(
      1,
      elapsedToTicks(playable, ctx.bpm, ctx.meter, ppqOf(ctx)),
    );
    start = end - lengthTicks;
    return clampAudioClipToAsset(
      {
        ...clip,
        startTicks: start,
        lengthTicks,
        trimInMs: trimIn > 0 ? trimIn : undefined,
        trimOutMs: trimOut > 0 ? trimOut : undefined,
      },
      asset,
      ctx,
    );
  }
  return { ...clip, startTicks: start, lengthTicks };
}
