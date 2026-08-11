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

export function audioAsForma(clips: AudioClip[]): FormaClip[] {
  return clips.map((c) => ({
    id: c.id,
    name: c.id,
    kind: "section" as const,
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
  }));
}

export function mapFormaBack(
  project: Project,
  trackId: string,
  formaClips: FormaClip[],
  seedById: Map<string, AudioClip>,
): Project {
  const others = project.audioClips.filter((c) => c.trackId !== trackId);
  const onTrack: AudioClip[] = formaClips
    .filter((c) => c.kind === "section")
    .map((c) => {
      const prev =
        seedById.get(c.id) ?? seedById.get(resolveSplitParentId(c.id));
      if (!prev) throw new Error(`Missing audio clip seed for ${c.id}`);
      return {
        ...prev,
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
      };
    });
  return { ...project, audioClips: [...others, ...onTrack] };
}

export function clipsOnTrack(project: Project, trackId: string): AudioClip[] {
  return project.audioClips.filter((c) => c.trackId === trackId);
}

export function tempoCtxAt(project: Project, ticks: number) {
  return {
    bpm: resolveTempoAt(project, ticks),
    meter: resolveMeterAt(project, ticks),
    ppq: project.ppq,
  };
}

export function assetOf(project: Project, assetId: string) {
  return project.assets.find((a) => a.id === assetId) ?? null;
}
