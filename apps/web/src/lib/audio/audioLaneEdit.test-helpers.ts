import {
  createProjectSeed,
  elapsedToTicks,
  type Project,
} from "@stagesync/shared";
import { addAudioTrack } from "./audioLaneEdit.js";
import type { FormaGestureSession } from "@lib/timeline/timelineGesture.js";

export function projectWithAudio(): Project {
  let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
  const added = addAudioTrack(p, "Backing");
  p = added.project;
  const trackId = added.trackId;
  const assetId = "asset-1";
  const lengthTicks = elapsedToTicks(4000, 120, p.defaultMeter, p.ppq);
  return {
    ...p,
    assets: [
      {
        id: assetId,
        storageName: `${assetId}.wav`,
        originalName: "kick.wav",
        kind: "audio",
        mimeType: "audio/wav",
        sizeBytes: 100,
        durationMs: 4000,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId,
        assetId,
        startTicks: 0,
        lengthTicks,
      },
    ],
  };
}

export function abutProject(): Project {
  const p = projectWithAudio();
  const trackId = p.audioTracks[0]!.id;
  const len = p.audioClips[0]!.lengthTicks;
  return {
    ...p,
    audioClips: [
      { ...p.audioClips[0]!, id: "left", startTicks: 0, lengthTicks: len },
      {
        id: "right",
        trackId,
        assetId: "asset-1",
        startTicks: len,
        lengthTicks: len,
      },
    ],
  };
}

export function baseSession(
  overrides: Partial<FormaGestureSession> & Pick<FormaGestureSession, "kind">,
): FormaGestureSession {
  return {
    clipId: "clip-1",
    pointerId: 1,
    originTicks: 0,
    originClipStart: 0,
    originClipLength: 3840,
    ...overrides,
  };
}
