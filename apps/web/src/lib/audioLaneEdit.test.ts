import { describe, expect, it } from "vitest";
import {
  createProjectSeed,
  elapsedToTicks,
  type Project,
} from "@stagesync/shared";
import {
  addAudioTrack,
  MAX_AUDIO_TRACKS,
  applyDecodedAudioMeta,
  commitMoveAudioClip,
  commitResizeAudioClip,
  deleteAudioClip,
  setAudioClipMuted,
  setAudioTrackMuted,
} from "./audioLaneEdit.js";

function projectWithAudio(): Project {
  let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
  const added = addAudioTrack(p, "Backing");
  p = added.project;
  const trackId = added.trackId;
  const assetId = "asset-1";
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
        lengthTicks: elapsedToTicks(4000, 120, p.defaultMeter, p.ppq),
      },
    ],
  };
}

describe("audioLaneEdit", () => {
  it("moves clip on lane", () => {
    const p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;
    const next = commitMoveAudioClip(p, trackId, "clip-1", 3840, "bar");
    expect(next.audioClips[0]!.id).toBe("clip-1");
    expect(next.audioClips[0]!.startTicks).toBeGreaterThanOrEqual(0);
  });

  it("trim end sets trimOutMs", () => {
    const p = projectWithAudio();
    const trackId = p.audioTracks[0]!.id;
    const clip = p.audioClips[0]!;
    const mid = clip.startTicks + Math.floor(clip.lengthTicks / 2);
    const next = commitResizeAudioClip(p, trackId, "clip-1", "end", mid, "off");
    expect(next.audioClips[0]!.lengthTicks).toBeLessThan(clip.lengthTicks);
    expect((next.audioClips[0]!.trimOutMs ?? 0) > 0).toBe(true);
  });

  it("mute and delete", () => {
    let p = projectWithAudio();
    p = setAudioClipMuted(p, "clip-1", true);
    expect(p.audioClips[0]!.muted).toBe(true);
    p = setAudioTrackMuted(p, p.audioTracks[0]!.id, true);
    expect(p.audioTracks[0]!.muted).toBe(true);
    p = deleteAudioClip(p, "clip-1");
    expect(p.audioClips).toHaveLength(0);
  });

  it("applyDecodedAudioMeta stamps peaks", () => {
    let p = projectWithAudio();
    p = {
      ...p,
      assets: p.assets.map((a) => ({ ...a, durationMs: undefined })),
      audioClips: p.audioClips.map((c) => ({ ...c, lengthTicks: 7680 })),
    };
    const next = applyDecodedAudioMeta(p, "asset-1", {
      durationMs: 2000,
      waveformPeaks: [0.1, 0.5, 0.2],
      waveformRms: 0.3,
    });
    expect(next.assets[0]!.durationMs).toBe(2000);
    expect(next.assets[0]!.waveformPeaks).toEqual([0.1, 0.5, 0.2]);
    expect(next.audioClips[0]!.lengthTicks).toBe(
      elapsedToTicks(2000, 120, p.defaultMeter, p.ppq),
    );
  });

  it("addAudioTrack rejects above MAX_AUDIO_TRACKS", () => {
    let p = createProjectSeed("p1", "Song", "2026-07-21T00:00:00.000Z");
    for (let i = 0; i < MAX_AUDIO_TRACKS; i++) {
      p = addAudioTrack(p).project;
    }
    expect(p.audioTracks).toHaveLength(MAX_AUDIO_TRACKS);
    expect(() => addAudioTrack(p)).toThrow(RangeError);
  });
});
