/**
 * Audio lane edit — Pointer/Smart move + trim; Pencil @ empty = import ([ADR 0008]/[ADR 0015]).
 */

import {
  audioClipPlayableMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  clampAudioFades,
  channelModeFromChannelCount,
  DEFAULT_TRACK_ICON,
  elapsedToTicks,
  findAbutNeighbor,
  lengthTicksFromAssetWindow,
  MAX_AUDIO_BUSSES,
  moveClipNoOverlap,
  moveClipsRigidDelta,
  nextBusName,
  placeClipNoOverlap,
  resizeAudioClipEnd,
  resizeAudioClipStart,
  resolveMeterAt,
  resolveTempoAt,
  ticksToMs,
  ticksToMsAlongTempoMap,
  trackColorForIndex,
  type AudioClip,
  type BusOutputDest,
  type ChannelMode,
  type FormaClip,
  type MixerOutputDest,
  type Project,
  type SnapMode,
  type TrackColor,
  type TrackIcon,
  wouldCreateBusCycle,
} from "@stagesync/shared";
import {
  contentFloorTicks,
  snapEditTicks,
} from "@lib/timeline-edit/formaCanvas.js";
import { resolveSplitParentId } from "@lib/timeline-edit/contentLaneEdit.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "@lib/timeline/timelineGesture.js";
import { contentSnapModeFromModifiers } from "@lib/timeline/timelineGesture.js";
import {
  audioTrackIdFromLane,
  isAudioLaneId,
  type AudioLaneId,
} from "@lib/timeline/timelineTracks.js";

import {
  clipsOnTrack,
  tempoCtxAt,
  assetOf,
  mapFormaBack,
  audioAsForma,
} from "./audioOperationsUtils.js";
export function deleteAudioClip(project: Project, clipId: string): Project {
  const clips = project.audioClips.filter((c) => c.id !== clipId);
  if (clips.length === project.audioClips.length) return project;
  return { ...project, audioClips: clips };
}

/**
 * After import: move clip to click ticks (No Overlap) and optionally set length
 * from decoded duration. Used by Pencil @ empty audio lane (Logic-like).
 */
export function placeImportedAudioClipAt(
  project: Project,
  clipId: string,
  startTicks: number,
  opts?: { durationMs?: number },
): Project {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return project;
  const floor = contentFloorTicks(project.forma.clips);
  const start = Math.max(floor, Math.floor(startTicks));
  if (!Number.isFinite(start) || start < 0) return project;

  let nextProject = project;
  let lengthTicks = clip.lengthTicks;
  if (
    opts?.durationMs != null &&
    Number.isFinite(opts.durationMs) &&
    opts.durationMs > 0
  ) {
    const asset = assetOf(project, clip.assetId);
    if (asset) {
      nextProject = {
        ...project,
        assets: project.assets.map((a) =>
          a.id === asset.id ? { ...a, durationMs: opts.durationMs } : a,
        ),
      };
    }
    const ctx = tempoCtxAt(nextProject, start);
    lengthTicks = Math.max(
      1,
      elapsedToTicks(opts.durationMs, ctx.bpm, ctx.meter, ctx.ppq),
    );
  }

  const seed: AudioClip = {
    ...clip,
    startTicks: start,
    lengthTicks,
  };
  const onTrack = clipsOnTrack(nextProject, clip.trackId);
  const byId = new Map(onTrack.map((c) => [c.id, c]));
  byId.set(seed.id, seed);
  const placed = placeClipNoOverlap(
    audioAsForma(onTrack.filter((c) => c.id !== clipId)),
    {
      id: seed.id,
      name: seed.id,
      kind: "section",
      startTicks: seed.startTicks,
      lengthTicks: seed.lengthTicks,
    },
  );
  if (!placed.some((c) => c.id === clipId)) {
    return nextProject;
  }
  return mapFormaBack(nextProject, clip.trackId, placed, byId);
}

export function setAudioClipMuted(
  project: Project,
  clipId: string,
  muted: boolean,
): Project {
  return {
    ...project,
    audioClips: project.audioClips.map((c) =>
      c.id === clipId ? { ...c, muted: muted || undefined } : c,
    ),
  };
}

export function setAudioClipGainDb(
  project: Project,
  clipId: string,
  gainDb: number,
): Project {
  if (!Number.isFinite(gainDb)) return project;
  const clamped = Math.min(24, Math.max(-60, gainDb));
  return {
    ...project,
    audioClips: project.audioClips.map((c) =>
      c.id === clipId ? { ...c, gainDb: clamped } : c,
    ),
  };
}

/** Toggle clip mute; returns next project (no-op when clip missing). */
export function toggleAudioClipMute(project: Project, clipId: string): Project {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return project;
  return setAudioClipMuted(project, clipId, !clip.muted);
}

/**
 * Split an audio clip at absolute ticks (must be strictly inside the clip).
 * Left keeps fade-in; right keeps fade-out; mid fades cleared.
 */
export function splitAudioClipAt(
  project: Project,
  clipId: string,
  atTicks: number,
): Project {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return project;
  const end = clip.startTicks + clip.lengthTicks;
  if (
    !Number.isFinite(atTicks) ||
    atTicks <= clip.startTicks ||
    atTicks >= end
  ) {
    return project;
  }
  const cut = Math.floor(atTicks);
  const leftLen = cut - clip.startTicks;
  const rightLen = end - cut;
  if (leftLen < 1 || rightLen < 1) return project;

  const ctx = tempoCtxAt(project, clip.startTicks);
  const intoMs = ticksToMsAlongTempoMap(clip.startTicks, cut, project);
  const trimIn = clip.trimInMs ?? 0;
  const asset = assetOf(project, clip.assetId);
  const durationMs = asset?.durationMs;
  let leftTrimOut: number | undefined;
  let rightTrimIn: number | undefined;
  if (durationMs != null && durationMs > 0) {
    const leftPlayable = Math.min(
      Math.max(1, intoMs),
      Math.max(1, durationMs - trimIn),
    );
    leftTrimOut = Math.max(0, durationMs - trimIn - leftPlayable);
    rightTrimIn = trimIn + leftPlayable;
  } else {
    rightTrimIn = trimIn + intoMs;
    leftTrimOut = clip.trimOutMs;
  }

  const left: AudioClip = {
    ...clip,
    lengthTicks: leftLen,
    trimOutMs: leftTrimOut && leftTrimOut > 0 ? leftTrimOut : undefined,
    fadeOutMs: undefined,
  };
  const right: AudioClip = {
    ...clip,
    id: `audio-${crypto.randomUUID()}`,
    startTicks: cut,
    lengthTicks: rightLen,
    trimInMs: rightTrimIn && rightTrimIn > 0 ? rightTrimIn : undefined,
    trimOutMs: clip.trimOutMs,
    fadeInMs: undefined,
    muted: clip.muted,
    gainDb: clip.gainDb,
    loop: clip.loop,
  };

  const clampedLeft = clampAudioClipToAsset(left, asset, ctx);
  const clampedRight = clampAudioClipToAsset(
    right,
    asset,
    tempoCtxAt(project, right.startTicks),
  );

  return {
    ...project,
    audioClips: project.audioClips.flatMap((c) =>
      c.id === clipId ? [clampedLeft, clampedRight] : [c],
    ),
  };
}

/**
 * Join abutting audio clips on the same track when they share an asset and
 * the source windows are contiguous (left playable end = right trimIn).
 * Prefers joining the clicked clip with its abut neighbor (right, else left).
 */
export function joinAdjacentAudioClips(
  project: Project,
  clipId: string,
): Project {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return project;
  const onTrack = clipsOnTrack(project, clip.trackId);
  const pair = findAbutNeighbor(onTrack, clipId);
  if (!pair) return project;
  if (pair.left.assetId !== pair.right.assetId) return project;

  const ctx = tempoCtxAt(project, pair.left.startTicks);
  const asset = assetOf(project, pair.left.assetId);
  const leftPlayable = audioClipPlayableMs(pair.left, asset, ctx);
  const leftTrimIn = pair.left.trimInMs ?? 0;
  const rightTrimIn = pair.right.trimInMs ?? 0;
  // Contiguous source: right starts where left's playable window ends.
  if (Math.abs(leftTrimIn + leftPlayable - rightTrimIn) > 1.5) {
    return project;
  }

  const merged: AudioClip = {
    ...pair.left,
    lengthTicks: pair.left.lengthTicks + pair.right.lengthTicks,
    trimOutMs: pair.right.trimOutMs,
    fadeOutMs: pair.right.fadeOutMs,
  };
  const clamped = clampAudioClipToAsset(merged, asset, ctx);
  const drop = new Set([pair.left.id, pair.right.id]);
  return {
    ...project,
    audioClips: [...project.audioClips.filter((c) => !drop.has(c.id)), clamped],
  };
}

/** Pixel → dB sensitivity for Gain tool (drag up = louder). */
export const GAIN_TOOL_DB_PER_PX = 0.15;

export function gainDbFromPointerDelta(
  originGainDb: number,
  originClientY: number,
  clientY: number,
  dbPerPx: number = GAIN_TOOL_DB_PER_PX,
): number {
  const origin = Number.isFinite(originGainDb) ? originGainDb : 0;
  if (
    !Number.isFinite(originClientY) ||
    !Number.isFinite(clientY) ||
    !Number.isFinite(dbPerPx)
  ) {
    return Math.min(24, Math.max(-60, origin));
  }
  const deltaY = originClientY - clientY;
  const next = origin + deltaY * dbPerPx;
  return Math.min(24, Math.max(-60, next));
}

export function setAudioClipTrimMs(
  project: Project,
  clipId: string,
  trim: { trimInMs?: number; trimOutMs?: number },
): Project {
  return {
    ...project,
    audioClips: project.audioClips.map((c) => {
      if (c.id !== clipId) return c;
      const trimInMs =
        trim.trimInMs === undefined
          ? c.trimInMs
          : trim.trimInMs > 0
            ? trim.trimInMs
            : undefined;
      const trimOutMs =
        trim.trimOutMs === undefined
          ? c.trimOutMs
          : trim.trimOutMs > 0
            ? trim.trimOutMs
            : undefined;
      return { ...c, trimInMs, trimOutMs };
    }),
  };
}

export function setAudioClipFadeMs(
  project: Project,
  clipId: string,
  fade: { fadeInMs?: number; fadeOutMs?: number },
): Project {
  return {
    ...project,
    audioClips: project.audioClips.map((c) => {
      if (c.id !== clipId) return c;
      const fadeInMs =
        fade.fadeInMs === undefined
          ? c.fadeInMs
          : fade.fadeInMs > 0
            ? fade.fadeInMs
            : undefined;
      const fadeOutMs =
        fade.fadeOutMs === undefined
          ? c.fadeOutMs
          : fade.fadeOutMs > 0
            ? fade.fadeOutMs
            : undefined;
      return { ...c, fadeInMs, fadeOutMs };
    }),
  };
}

export function setAudioClipLoop(
  project: Project,
  clipId: string,
  loop: boolean,
): Project {
  return {
    ...project,
    audioClips: project.audioClips.map((c) =>
      c.id === clipId ? { ...c, loop: loop || undefined } : c,
    ),
  };
}

/** Apply symmetric crossfade when selected clip abuts a neighbor (gap 0). */
export function applyAbutCrossfadeForClip(
  project: Project,
  clipId: string,
  crossfadeMs: number = 80,
): Project {
  const clip = project.audioClips.find((c) => c.id === clipId);
  if (!clip) return project;
  const onTrack = project.audioClips.filter((c) => c.trackId === clip.trackId);
  const pair = findAbutNeighbor(onTrack, clipId);
  if (!pair) return project;
  const ctx = {
    bpm: resolveTempoAt(project, pair.left.startTicks),
    meter: resolveMeterAt(project, pair.left.startTicks),
    ppq: project.ppq,
  };
  const leftAsset = project.assets.find((a) => a.id === pair.left.assetId);
  const rightAsset = project.assets.find((a) => a.id === pair.right.assetId);
  const applied = applyAbutCrossfade(
    pair.left,
    pair.right,
    crossfadeMs,
    audioClipPlayableMs(pair.left, leftAsset, ctx),
    audioClipPlayableMs(pair.right, rightAsset, ctx),
  );
  if (!applied) return project;
  return {
    ...project,
    audioClips: project.audioClips.map((c) => {
      if (c.id === applied.left.id) return applied.left;
      if (c.id === applied.right.id) return applied.right;
      return c;
    }),
  };
}
