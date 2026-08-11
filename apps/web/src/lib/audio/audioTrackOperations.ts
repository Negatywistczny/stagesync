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

/** Set track mix destination (Master, Bus, or HW). Stale / unknown → Master (omit). */
export function setAudioTrackOutput(
  project: Project,
  trackId: string,
  output: MixerOutputDest,
): Project {
  const busIds = new Set((project.audioBusses ?? []).map((b) => b.id));
  const hwIds = new Set((project.audioHardwareOutputs ?? []).map((h) => h.id));
  let next: MixerOutputDest | undefined;
  if (output.kind === "master") {
    next = undefined;
  } else if (output.kind === "bus" && busIds.has(output.busId)) {
    next = output;
  } else if (output.kind === "hw_out" && hwIds.has(output.hwOutputId)) {
    next = output;
  } else {
    next = undefined;
  }
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

/** Set bus mix destination (Master or another bus). Rejects cycles → unchanged. */
export function setAudioBusOutput(
  project: Project,
  busId: string,
  output: BusOutputDest,
): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  if (output.kind === "bus") {
    const busIds = new Set(busses.map((b) => b.id));
    if (!busIds.has(output.busId) || output.busId === busId) return project;
    if (wouldCreateBusCycle(busses, busId, output)) return project;
  } else if (output.kind === "hw_out") {
    const hwIds = new Set(
      (project.audioHardwareOutputs ?? []).map((h) => h.id),
    );
    if (!hwIds.has(output.hwOutputId)) return project;
  }
  return {
    ...project,
    audioBusses: busses.map((b) => {
      if (b.id !== busId) return b;
      if (output.kind === "master") {
        if (b.output == null) return b;
        const { output: _drop, ...rest } = b;
        void _drop;
        return rest;
      }
      return { ...b, output };
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
    audioBusses: busses.map((b) => (b.id === busId ? { ...b, gainDb } : b)),
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
    audioBusses: busses.map((b) => (b.id === busId ? { ...b, name: next } : b)),
  };
}

/**
 * Remove bus and re-route any tracks / busses that targeted it to Master.
 */
export function removeAudioBus(project: Project, busId: string): Project {
  const busses = project.audioBusses ?? [];
  if (!busses.some((b) => b.id === busId)) return project;
  return {
    ...project,
    audioBusses: busses
      .filter((b) => b.id !== busId)
      .map((b) => {
        if (b.output?.kind === "bus" && b.output.busId === busId) {
          const { output: _drop, ...rest } = b;
          void _drop;
          return rest;
        }
        return b;
      }),
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
