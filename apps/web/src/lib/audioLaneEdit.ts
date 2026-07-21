/**
 * Audio lane edit — Pointer/Smart move + trim; no pencil ([ADR 0008]).
 */

import {
  audioClipPlayableMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  findAbutNeighbor,
  lengthTicksFromAssetWindow,
  moveClipNoOverlap,
  moveClipsRigidDelta,
  placeClipNoOverlap,
  resizeAudioClipEnd,
  resizeAudioClipStart,
  resolveMeterAt,
  resolveTempoAt,
  type AudioClip,
  type FormaClip,
  type Project,
  type SnapMode,
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
  return {
    ...project,
    audioClips: project.audioClips.map((c) =>
      c.id === clipId ? { ...c, gainDb } : c,
    ),
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
  return {
    ...project,
    audioTracks: project.audioTracks.map((t) =>
      t.id === trackId ? { ...t, muted: muted || undefined } : t,
    ),
  };
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

export function addAudioTrack(
  project: Project,
  name?: string,
): { project: Project; trackId: string } {
  const n = project.audioTracks.length + 1;
  const trackId = crypto.randomUUID();
  return {
    project: {
      ...project,
      audioTracks: [
        ...project.audioTracks,
        { id: trackId, name: name?.trim() || `Audio ${n}` },
      ],
    },
    trackId,
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
): FormaGesturePreview {
  const mode = contentSnapModeFromModifiers(metaKey, ctrlKey);
  const floor = contentFloorTicks(project.forma.clips);

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
