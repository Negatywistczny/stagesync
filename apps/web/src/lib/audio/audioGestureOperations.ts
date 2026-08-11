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
  setAudioClipGainDb,
  setAudioClipFadeMs,
} from "./audioClipOperations.js";
import {
  clipsOnTrack,
  tempoCtxAt,
  assetOf,
  mapFormaBack,
  audioAsForma,
} from "./audioOperationsUtils.js";
import { gainDbFromPointerDelta } from "./audioClipOperations.js";

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
  const ids = moveIds.includes(primaryId)
    ? moveIds
    : [primaryId, ...moveIds.filter(Boolean)];
  if (ids.length <= 1) {
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
  const nextForma = moveClipsRigidDelta(forma, ids, delta, {
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
  targetLane?: AudioLaneId,
): Project {
  if (!isAudioLaneId(lane)) return project;
  const sourceTrackId = audioTrackIdFromLane(lane);
  const destLane = targetLane && isAudioLaneId(targetLane) ? targetLane : lane;
  const destTrackId = audioTrackIdFromLane(destLane);
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  switch (session.kind) {
    case "move": {
      if (!session.clipId) return project;
      const moveIds =
        session.moveIds && session.moveIds.length > 0
          ? session.moveIds
          : [session.clipId];

      let updatedProject = project;
      if (destTrackId !== sourceTrackId) {
        const idSet = new Set(moveIds);
        updatedProject = {
          ...project,
          audioClips: project.audioClips.map((c) =>
            idSet.has(c.id) ? { ...c, trackId: destTrackId } : c,
          ),
        };
      }

      if (moveIds.length > 1) {
        return commitMoveAudioClips(
          updatedProject,
          destTrackId,
          moveIds,
          session.clipId,
          preview.startTicks,
          mode,
        );
      }
      return commitMoveAudioClip(
        updatedProject,
        destTrackId,
        session.clipId,
        preview.startTicks,
        mode,
      );
    }
    case "resize-start":
      if (!session.clipId) return project;
      return commitResizeAudioClip(
        project,
        sourceTrackId,
        session.clipId,
        "start",
        preview.startTicks,
        mode,
      );
    case "resize-end":
      if (!session.clipId) return project;
      return commitResizeAudioClip(
        project,
        sourceTrackId,
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
  targetLane?: AudioLaneId,
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
      targetLane:
        targetLane && isAudioLaneId(targetLane)
          ? targetLane
          : (session.lane as AudioLaneId | undefined),
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
    /** When set, stamp channelMode on tracks that use this asset and have no mode yet. */
    channelCount?: number;
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

  let audioTracks = project.audioTracks;
  if (meta.channelCount != null && Number.isFinite(meta.channelCount)) {
    const mode = channelModeFromChannelCount(meta.channelCount);
    const trackIds = new Set(
      audioClips.filter((c) => c.assetId === assetId).map((c) => c.trackId),
    );
    audioTracks = project.audioTracks.map((t) => {
      if (!trackIds.has(t.id)) return t;
      if (t.channelMode != null) return t;
      return mode === "mono" ? { ...t, channelMode: "mono" } : t;
    });
  }

  return { ...project, assets, audioClips, audioTracks };
}
