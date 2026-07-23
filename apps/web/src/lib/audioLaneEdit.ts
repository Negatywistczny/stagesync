/**
 * Audio lane edit — Pointer/Smart move + trim; no pencil ([ADR 0008]).
 */

import {
  audioClipPlayableMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  clampAudioFades,
  DEFAULT_TRACK_ICON,
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
  trackColorForIndex,
  type AudioClip,
  type ChannelMode,
  type FormaClip,
  type MixerOutputDest,
  type Project,
  type SnapMode,
  type TrackColor,
  type TrackIcon,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import type {
  FormaGesturePreview,
  FormaGestureSession,
} from "./timelineGesture.js";
import { contentSnapModeFromModifiers } from "./timelineGesture.js";
import {
  audioTrackIdFromLane,
  isAudioLaneId,
  type AudioLaneId,
} from "./timelineTracks.js";

export function audioAsForma(clips: AudioClip[]): FormaClip[] {
  return clips.map((c) => ({
    id: c.id,
    name: c.id,
    kind: "section" as const,
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
  }));
}

function mapFormaBack(
  project: Project,
  trackId: string,
  formaClips: FormaClip[],
  seedById: Map<string, AudioClip>,
): Project {
  const others = project.audioClips.filter((c) => c.trackId !== trackId);
  const onTrack: AudioClip[] = formaClips
    .filter((c) => c.kind === "section")
    .map((c) => {
      const prev = seedById.get(c.id);
      if (!prev) throw new Error(`Missing audio clip seed for ${c.id}`);
      return { ...prev, startTicks: c.startTicks, lengthTicks: c.lengthTicks };
    });
  return { ...project, audioClips: [...others, ...onTrack] };
}

function clipsOnTrack(project: Project, trackId: string): AudioClip[] {
  return project.audioClips.filter((c) => c.trackId === trackId);
}

function tempoCtxAt(project: Project, ticks: number) {
  return {
    bpm: resolveTempoAt(project, ticks),
    meter: resolveMeterAt(project, ticks),
    ppq: project.ppq,
  };
}

function assetOf(project: Project, assetId: string) {
  return project.assets.find((a) => a.id === assetId) ?? null;
}

export function deleteAudioClip(project: Project, clipId: string): Project {
  const clips = project.audioClips.filter((c) => c.id !== clipId);
  if (clips.length === project.audioClips.length) return project;
  return { ...project, audioClips: clips };
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
  const intoMs = ticksToMs(leftLen, ctx.bpm, ctx.meter, ctx.ppq);
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
    audioClips: [
      ...project.audioClips.filter((c) => !drop.has(c.id)),
      clamped,
    ],
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
  const deltaY = originClientY - clientY;
  const next = originGainDb + deltaY * dbPerPx;
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

export function setAudioTrackMuted(
  project: Project,
  trackId: string,
  muted: boolean,
): Project {
  return setAudioTracksMuted(project, [trackId], muted);
}

/** Batch mute/unmute (multi-select / Cmd+M). */
export function setAudioTracksMuted(
  project: Project,
  trackIds: readonly string[],
  muted: boolean,
): Project {
  if (!trackIds.length) return project;
  const set = new Set(trackIds);
  let changed = false;
  const audioTracks = project.audioTracks.map((t) => {
    if (!set.has(t.id)) return t;
    const nextMuted = muted || undefined;
    if (t.muted === nextMuted) return t;
    changed = true;
    return { ...t, muted: nextMuted };
  });
  return changed ? { ...project, audioTracks } : project;
}

export function setAudioTrackGainDb(
  project: Project,
  trackId: string,
  gainDb: number,
): Project {
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, gainDb } : t,
    ),
  };
}

/** Stereo pan −1…+1; 0 omitted as center default. */
export function setAudioTrackPan(
  project: Project,
  trackId: string,
  pan: number,
): Project {
  const next =
    !Number.isFinite(pan) || Math.abs(pan) < 1e-6
      ? undefined
      : Math.min(1, Math.max(-1, pan));
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) => {
      if (t.id !== trackId) return t;
      if (t.pan === next) return t;
      if (next === undefined) {
        const { pan: _drop, ...rest } = t;
        void _drop;
        return rest;
      }
      return { ...t, pan: next };
    }),
  };
}

/** Mono = pan; stereo = True Balance. Default stereo when clearing. */
export function setAudioTrackChannelMode(
  project: Project,
  trackId: string,
  channelMode: ChannelMode,
): Project {
  const next = channelMode === "mono" ? "mono" : "stereo";
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) => {
      if (t.id !== trackId) return t;
      if (t.channelMode === next) return t;
      // Omit stereo (= schema default) to keep JSON lean.
      if (next === "stereo") {
        if (t.channelMode == null || t.channelMode === "stereo") return t;
        const { channelMode: _drop, ...rest } = t;
        void _drop;
        return rest;
      }
      return { ...t, channelMode: next };
    }),
  };
}

/** Project Stereo Out / master fader; 0 omitted. */
export function setMasterGainDb(project: Project, gainDb: number): Project {
  const next =
    !Number.isFinite(gainDb) || Math.abs(gainDb) < 1e-6 ? undefined : gainDb;
  if (project.masterGainDb === next) return project;
  if (next === undefined) {
    const { masterGainDb: _drop, ...rest } = project;
    void _drop;
    return rest;
  }
  return { ...project, masterGainDb: next };
}

export function setAudioTrackName(
  project: Project,
  trackId: string,
  name: string,
): Project {
  const next = name.trim().slice(0, 80);
  if (!next) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, name: next } : t,
    ),
  };
}

export function setAudioTrackColor(
  project: Project,
  trackId: string,
  color: TrackColor,
): Project {
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, color } : t,
    ),
  };
}

export function setAudioTrackIcon(
  project: Project,
  trackId: string,
  icon: TrackIcon,
): Project {
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, icon } : t,
    ),
  };
}

/** Set track mix destination (Master or Bus). Stale busId → Master (omit). */
export function setAudioTrackOutput(
  project: Project,
  trackId: string,
  output: MixerOutputDest,
): Project {
  const busIds = new Set((project.audioBusses ?? []).map((b) => b.id));
  const next: MixerOutputDest | undefined =
    output.kind === "master"
      ? undefined
      : output.kind === "bus" && busIds.has(output.busId)
        ? output
        : undefined;
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) => {
      if (t.id !== trackId) return t;
      if (next == null) {
        if (t.output == null) return t;
        const { output: _drop, ...rest } = t;
        void _drop;
        return rest;
      }
      return { ...t, output: next };
    }),
  };
}

export function addAudioBus(
  project: Project,
  name?: string,
): { project: Project; busId: string } {
  const busses = project.audioBusses ?? [];
  if (busses.length >= MAX_AUDIO_BUSSES) {
    throw new RangeError(`Audio busses limited to ${MAX_AUDIO_BUSSES}`);
  }
  const busId = crypto.randomUUID();
  const busName = name?.trim() || nextBusName(busses.map((b) => b.name));
  return {
    project: {
      ...project,
      audioBusses: [...busses, { id: busId, name: busName.slice(0, 80) }],
    },
    busId,
  };
}

export function setAudioBusGainDb(
  project: Project,
  busId: string,
  gainDb: number,
): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  return {
    ...project,
    audioBusses: busses.map((b) =>
      b.id === busId ? { ...b, gainDb } : b,
    ),
  };
}

export function setAudioBusPan(
  project: Project,
  busId: string,
  pan: number,
): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  const next =
    !Number.isFinite(pan) || Math.abs(pan) < 1e-6
      ? undefined
      : Math.min(1, Math.max(-1, pan));
  return {
    ...project,
    audioBusses: busses.map((b) => {
      if (b.id !== busId) return b;
      if (b.pan === next) return b;
      if (next === undefined) {
        const { pan: _drop, ...rest } = b;
        void _drop;
        return rest;
      }
      return { ...b, pan: next };
    }),
  };
}

export function setAudioBusChannelMode(
  project: Project,
  busId: string,
  channelMode: ChannelMode,
): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  const next = channelMode === "mono" ? "mono" : "stereo";
  return {
    ...project,
    audioBusses: busses.map((b) => {
      if (b.id !== busId) return b;
      if (b.channelMode === next) return b;
      if (next === "stereo") {
        if (b.channelMode == null || b.channelMode === "stereo") return b;
        const { channelMode: _drop, ...rest } = b;
        void _drop;
        return rest;
      }
      return { ...b, channelMode: next };
    }),
  };
}

export function setAudioBusMuted(
  project: Project,
  busId: string,
  muted: boolean,
): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  return {
    ...project,
    audioBusses: busses.map((b) => {
      if (b.id !== busId) return b;
      if (!muted) {
        if (b.muted == null) return b;
        const { muted: _drop, ...rest } = b;
        void _drop;
        return rest;
      }
      return { ...b, muted: true };
    }),
  };
}

export function setAudioBusName(
  project: Project,
  busId: string,
  name: string,
): Project {
  const next = name.trim().slice(0, 80);
  if (!next) return project;
  const busses = project.audioBusses ?? [];
  return {
    ...project,
    audioBusses: busses.map((b) =>
      b.id === busId ? { ...b, name: next } : b,
    ),
  };
}

/**
 * Remove bus and re-route any tracks that targeted it to Master.
 */
export function removeAudioBus(project: Project, busId: string): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  return {
    ...project,
    audioBusses: busses.filter((b) => b.id !== busId),
    audioTracks: project.audioTracks.map((t) => {
      if (t.output?.kind === "bus" && t.output.busId === busId) {
        const { output: _drop, ...rest } = t;
        void _drop;
        return rest;
      }
      return t;
    }),
  };
}

export const MAX_AUDIO_TRACKS = 64;

export function addAudioTrack(
  project: Project,
  name?: string,
): { project: Project; trackId: string } {
  if (project.audioTracks.length >= MAX_AUDIO_TRACKS) {
    throw new RangeError(`Audio tracks limited to ${MAX_AUDIO_TRACKS}`);
  }
  const n = project.audioTracks.length + 1;
  const trackId = crypto.randomUUID();
  return {
    project: {
      ...project,
      audioTracks: [
        ...project.audioTracks,
        {
          id: trackId,
          name: name?.trim() || `Audio ${n}`,
          /** Empty track default — import may overwrite from file channels. */
          channelMode: "stereo" as const,
          color: trackColorForIndex(project.audioTracks.length),
          icon: DEFAULT_TRACK_ICON,
        },
      ],
    },
    trackId,
  };
}

/** Remove a track and all clips on it (assets stay shared). */
export function removeAudioTrack(project: Project, trackId: string): Project {
  if (!project.audioTracks.some((t) => t.id === trackId)) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.filter((t) => t.id !== trackId),
    audioClips: project.audioClips.filter((c) => c.trackId !== trackId),
  };
}

/**
 * Duplicate track + clips (new ids; shared assets). Inserts after the source.
 * Name defaults to `${name} (kopia)` truncated to schema max.
 */
export function duplicateAudioTrack(
  project: Project,
  trackId: string,
): { project: Project; trackId: string } | null {
  if (project.audioTracks.length >= MAX_AUDIO_TRACKS) {
    throw new RangeError(`Audio tracks limited to ${MAX_AUDIO_TRACKS}`);
  }
  const idx = project.audioTracks.findIndex((t) => t.id === trackId);
  if (idx < 0) return null;
  const src = project.audioTracks[idx]!;
  const newTrackId = crypto.randomUUID();
  const baseName = src.name.trim() || `Audio ${idx + 1}`;
  const copyName = `${baseName} (kopia)`.slice(0, 80);
  const newTrack = {
    ...src,
    id: newTrackId,
    name: copyName,
  };
  const clonedClips = project.audioClips
    .filter((c) => c.trackId === trackId)
    .map((c) => ({
      ...c,
      id: crypto.randomUUID(),
      trackId: newTrackId,
    }));
  const audioTracks = [
    ...project.audioTracks.slice(0, idx + 1),
    newTrack,
    ...project.audioTracks.slice(idx + 1),
  ];
  return {
    project: {
      ...project,
      audioTracks,
      audioClips: [...project.audioClips, ...clonedClips],
    },
    trackId: newTrackId,
  };
}

export function commitMoveAudioClip(
  project: Project,
  trackId: string,
  clipId: string,
  newStartTicks: number,
  mode: SnapMode,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(floor, snapEditTicks(project, newStartTicks, mode));
  const onTrack = clipsOnTrack(project, trackId);
  const byId = new Map(onTrack.map((c) => [c.id, c]));
  const forma = moveClipNoOverlap(audioAsForma(onTrack), clipId, snapped, {
    contentFloorTicks: floor,
  });
  return mapFormaBack(project, trackId, forma, byId);
}

export function commitMoveAudioClips(
  project: Project,
  trackId: string,
  moveIds: string[],
  primaryId: string,
  primaryNewStartTicks: number,
  mode: SnapMode,
): Project {
  if (moveIds.length <= 1) {
    return commitMoveAudioClip(
      project,
      trackId,
      primaryId,
      primaryNewStartTicks,
      mode,
    );
  }
  const onTrack = clipsOnTrack(project, trackId);
  const forma = audioAsForma(onTrack);
  const primary = forma.find((c) => c.id === primaryId);
  if (!primary) return project;
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = Math.max(
    floor,
    snapEditTicks(project, primaryNewStartTicks, mode),
  );
  const delta = snapped - primary.startTicks;
  if (delta === 0) return project;
  const nextForma = moveClipsRigidDelta(forma, moveIds, delta, {
    contentFloorTicks: floor,
  });
  return mapFormaBack(
    project,
    trackId,
    nextForma,
    new Map(onTrack.map((c) => [c.id, c])),
  );
}

export function commitResizeAudioClip(
  project: Project,
  trackId: string,
  clipId: string,
  edge: "start" | "end",
  edgeTicks: number,
  mode: SnapMode,
): Project {
  const clip = project.audioClips.find(
    (c) => c.id === clipId && c.trackId === trackId,
  );
  if (!clip) return project;
  const floor = contentFloorTicks(project.forma.clips);
  const snapped = snapEditTicks(project, edgeTicks, mode);
  const ctx = tempoCtxAt(project, clip.startTicks);
  const asset = assetOf(project, clip.assetId);

  let resized =
    edge === "end"
      ? resizeAudioClipEnd(clip, asset, snapped, ctx)
      : resizeAudioClipStart(clip, asset, Math.max(floor, snapped), ctx);

  if (resized.startTicks < floor) {
    const shift = floor - resized.startTicks;
    resized = {
      ...resized,
      startTicks: floor,
      lengthTicks: Math.max(1, resized.lengthTicks - shift),
    };
  }

  const onTrack = clipsOnTrack(project, trackId).map((c) =>
    c.id === clipId ? resized : c,
  );
  const byId = new Map(onTrack.map((c) => [c.id, c]));
  byId.set(resized.id, resized);
  const placed = placeClipNoOverlap(
    audioAsForma(onTrack.filter((c) => c.id !== clipId)),
    {
      id: resized.id,
      name: resized.id,
      kind: "section",
      startTicks: resized.startTicks,
      lengthTicks: resized.lengthTicks,
    },
  );
  return mapFormaBack(project, trackId, placed, byId);
}

export function commitAudioGesture(
  project: Project,
  lane: AudioLaneId,
  session: FormaGestureSession,
  preview: FormaGesturePreview,
  metaKey: boolean,
  ctrlKey: boolean,
): Project {
  if (!isAudioLaneId(lane)) return project;
  const trackId = audioTrackIdFromLane(lane);
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  switch (session.kind) {
    case "move":
      if (!session.clipId) return project;
      if (session.moveIds && session.moveIds.length > 1) {
        return commitMoveAudioClips(
          project,
          trackId,
          session.moveIds,
          session.clipId,
          preview.startTicks,
          mode,
        );
      }
      return commitMoveAudioClip(
        project,
        trackId,
        session.clipId,
        preview.startTicks,
        mode,
      );
    case "resize-start":
      if (!session.clipId) return project;
      return commitResizeAudioClip(
        project,
        trackId,
        session.clipId,
        "start",
        preview.startTicks,
        mode,
      );
    case "resize-end":
      if (!session.clipId) return project;
      return commitResizeAudioClip(
        project,
        trackId,
        session.clipId,
        "end",
        preview.startTicks + preview.lengthTicks,
        mode,
      );
    case "fade-in":
      if (!session.clipId || preview.fadeInMs == null) return project;
      return setAudioClipFadeMs(project, session.clipId, {
        fadeInMs: preview.fadeInMs,
      });
    case "fade-out":
      if (!session.clipId || preview.fadeOutMs == null) return project;
      return setAudioClipFadeMs(project, session.clipId, {
        fadeOutMs: preview.fadeOutMs,
      });
    case "gain":
      if (!session.clipId || preview.gainDb == null) return project;
      return setAudioClipGainDb(project, session.clipId, preview.gainDb);
    default:
      return project;
  }
}

export function previewAudioFromSession(
  project: Project,
  session: FormaGestureSession,
  rawTicks: number,
  metaKey: boolean,
  ctrlKey: boolean,
  clientY?: number,
): FormaGesturePreview {
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  const floor = contentFloorTicks(project.forma.clips);

  if (session.kind === "gain") {
    const clip = project.audioClips.find((c) => c.id === session.clipId);
    const originY = session.originClientY ?? 0;
    const y = clientY ?? originY;
    const originGain = session.originGainDb ?? clip?.gainDb ?? 0;
    return {
      kind: "gain",
      clipId: session.clipId,
      startTicks: session.originClipStart,
      lengthTicks: session.originClipLength,
      gainDb: gainDbFromPointerDelta(originGain, originY, y),
    };
  }

  if (session.kind === "fade-in" || session.kind === "fade-out") {
    const clip = project.audioClips.find((c) => c.id === session.clipId);
    if (!clip) {
      return {
        kind: session.kind,
        clipId: session.clipId,
        startTicks: session.originClipStart,
        lengthTicks: session.originClipLength,
      };
    }
    const ctx = {
      bpm: resolveTempoAt(project, clip.startTicks),
      meter: resolveMeterAt(project, clip.startTicks),
      ppq: project.ppq,
    };
    const asset = project.assets.find((a) => a.id === clip.assetId);
    const playableMs = audioClipPlayableMs(clip, asset, ctx);
    const intoMs = Math.max(
      0,
      ticksToMs(
        Math.max(0, rawTicks - clip.startTicks),
        ctx.bpm,
        ctx.meter,
        ctx.ppq,
      ),
    );
    const fromEndMs = Math.max(
      0,
      ticksToMs(
        Math.max(0, clip.startTicks + clip.lengthTicks - rawTicks),
        ctx.bpm,
        ctx.meter,
        ctx.ppq,
      ),
    );
    if (session.kind === "fade-in") {
      const fades = clampAudioFades(
        { fadeInMs: intoMs, fadeOutMs: clip.fadeOutMs },
        playableMs,
      );
      return {
        kind: "fade-in",
        clipId: clip.id,
        startTicks: clip.startTicks,
        lengthTicks: clip.lengthTicks,
        fadeInMs: fades.fadeInMs,
        fadeOutMs: clip.fadeOutMs,
      };
    }
    const fades = clampAudioFades(
      { fadeInMs: clip.fadeInMs, fadeOutMs: fromEndMs },
      playableMs,
    );
    return {
      kind: "fade-out",
      clipId: clip.id,
      startTicks: clip.startTicks,
      lengthTicks: clip.lengthTicks,
      fadeInMs: clip.fadeInMs,
      fadeOutMs: fades.fadeOutMs,
    };
  }

  if (session.kind === "move") {
    const delta = rawTicks - session.originTicks;
    const snapped = Math.max(
      floor,
      snapEditTicks(project, session.originClipStart + delta, mode),
    );
    return {
      kind: "move",
      clipId: session.clipId,
      startTicks: snapped,
      lengthTicks: session.originClipLength,
    };
  }

  if (session.kind === "resize-start") {
    const end = session.originClipStart + session.originClipLength;
    let start = Math.max(floor, snapEditTicks(project, rawTicks, mode));
    if (end - start < 1) start = Math.max(floor, end - 1);
    return {
      kind: "resize-start",
      clipId: session.clipId,
      startTicks: start,
      lengthTicks: Math.max(1, end - start),
    };
  }

  let end = snapEditTicks(project, rawTicks, mode);
  const start = session.originClipStart;
  if (end - start < 1) end = start + 1;
  return {
    kind: "resize-end",
    clipId: session.clipId,
    startTicks: start,
    lengthTicks: Math.max(1, end - start),
  };
}

export function applyDecodedAudioMeta(
  project: Project,
  assetId: string,
  meta: {
    durationMs: number;
    waveformPeaks?: number[];
    waveformRms?: number;
  },
): Project {
  const assets = project.assets.map((a) =>
    a.id === assetId
      ? {
          ...a,
          durationMs: meta.durationMs,
          waveformPeaks: meta.waveformPeaks,
          waveformRms: meta.waveformRms,
        }
      : a,
  );
  const asset = assets.find((a) => a.id === assetId);
  if (!asset?.durationMs) return { ...project, assets };

  const audioClips = project.audioClips.map((clip) => {
    if (clip.assetId !== assetId) return clip;
    const ctx = tempoCtxAt(project, clip.startTicks);
    const derived = lengthTicksFromAssetWindow(clip, asset, ctx);
    return clampAudioClipToAsset(
      { ...clip, lengthTicks: derived ?? clip.lengthTicks },
      asset,
      ctx,
    );
  });

  return { ...project, assets, audioClips };
}
