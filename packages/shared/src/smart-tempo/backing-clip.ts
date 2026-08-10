import type { AudioClip, Project, ProjectAsset } from "../schema.js";
import { secondsToTicksAlongMap, type TempoMapProject } from "../tempo-map.js";
import {
  US_UG_BACKING_CLIP_ID,
  US_UG_BACKING_TRACK_ID,
  US_UG_BACKING_TRACK_NAME,
} from "./constants.js";
import type { PlaceUsUgBackingAudioOpts } from "./types.js";

/**
 * Place or update the single US+UG backing clip @ tick 0.
 * Trims to Beat 1 (`audioStartOffsetMs`); playable length follows TempoMap.
 */
export function placeUsUgBackingAudioClip(
  project: Project,
  opts: PlaceUsUgBackingAudioOpts,
): Project {
  const {
    assetId,
    durationMs,
    waveformPeaks,
    waveformRms,
    audioStartOffsetMs = 0,
    startTicks = 0,
  } = opts;
  if (!assetId || !(durationMs > 0)) return project;

  let assets = project.assets.map((a) => {
    if (a.id !== assetId) return a;
    return {
      ...a,
      durationMs,
      ...(waveformPeaks?.length ? { waveformPeaks } : {}),
      ...(waveformRms != null ? { waveformRms } : {}),
    };
  });

  if (!assets.some((a) => a.id === assetId)) {
    const stub: ProjectAsset = {
      id: assetId,
      storageName: `${assetId}.bin`,
      originalName: "backing",
      kind: "audio",
      mimeType: "audio/mpeg",
      sizeBytes: 0,
      durationMs,
      ...(waveformPeaks?.length ? { waveformPeaks } : {}),
      ...(waveformRms != null ? { waveformRms } : {}),
    };
    assets = [...assets, stub];
  }

  const existingClip = project.audioClips.find((c) => c.assetId === assetId);
  let track = existingClip
    ? project.audioTracks.find((t) => t.id === existingClip.trackId)
    : undefined;
  if (!track) {
    track = project.audioTracks.find(
      (t) =>
        t.id === US_UG_BACKING_TRACK_ID || t.name === US_UG_BACKING_TRACK_NAME,
    );
  }
  if (!track && project.audioTracks.length > 0) {
    track = project.audioTracks[0];
  }
  let audioTracks = project.audioTracks;
  if (!track) {
    track = { id: US_UG_BACKING_TRACK_ID, name: US_UG_BACKING_TRACK_NAME };
    audioTracks = [...audioTracks, track];
  }

  const trimInMs = Math.max(0, Math.min(audioStartOffsetMs, durationMs - 1));
  const playableMs = Math.max(1, durationMs - trimInMs);

  const ctxBpm = project.tempoMap[0]?.bpm ?? project.defaultBpm;
  const meter = project.defaultMeter;
  const ppq = project.ppq;
  const tempoProject: TempoMapProject = {
    defaultBpm: ctxBpm,
    defaultMeter: meter,
    tempoMap: project.tempoMap,
    meterMap: project.meterMap ?? [],
    ppq,
  };
  const lengthTicks = Math.max(
    1,
    secondsToTicksAlongMap(playableMs / 1000, tempoProject),
  );
  const floor = Math.max(0, Math.floor(startTicks));

  const clipPayload: AudioClip = {
    id: existingClip?.id ?? US_UG_BACKING_CLIP_ID,
    trackId: track.id,
    assetId,
    startTicks: floor,
    lengthTicks,
    trimInMs: trimInMs > 0 ? trimInMs : undefined,
    trimOutMs: undefined,
  };
  const otherClips = project.audioClips.filter(
    (c) => c.id !== clipPayload.id && c.assetId !== assetId,
  );
  const audioClips = [...otherClips, clipPayload];

  return { ...project, assets, audioTracks, audioClips };
}

/**
 * Warn when the last tempo node wall-clock exceeds audio duration.
 */
export function audioDurationOverflowWarning(
  lastNodeWallMs: number,
  audioDurationMs: number,
): string | null {
  if (!(audioDurationMs > 0) || lastNodeWallMs <= audioDurationMs) return null;
  return `Mapa tempa kończy się (${Math.round(lastNodeWallMs / 1000)}s) po długości audio (${Math.round(audioDurationMs / 1000)}s) — sprawdź Beat Mapper.`;
}
