// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineAudioUpload } from "./useTimelineAudioUpload.js";
import type { Project } from "@stagesync/shared";
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";

vi.mock("@lib/shell-operator/projectAssetsApi.js", () => ({
  uploadProjectAudio: vi.fn(),
}));

vi.mock("@lib/audio/audioPlayback.js", () => ({
  loadAudioBuffer: vi.fn().mockResolvedValue({
    numberOfChannels: 2,
    duration: 10,
  }),
}));

describe("useTimelineAudioUpload", () => {
  const dummyProject: Project = {
    id: "p1",
    name: "Song",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    cue: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [
      {
        id: "track-1",
        name: "Vocals",
        gainDb: 0,
        pan: 0,
        muted: false,
      },
    ],
    audioClips: [],
    assets: [
      {
        id: "asset-1",
        name: "vocals.wav",
        durationSeconds: 10,
        sampleRate: 44100,
        channelCount: 2,
      },
    ],
  };

  it("uploads audio file to track and updates project state", async () => {
    const updatedProject: Project = {
      ...dummyProject,
      audioTracks: [
        {
          id: "track-1",
          name: "Vocals",
          gainDb: 0,
          pan: 0,
          muted: false,
        },
      ],
      audioClips: [
        {
          id: "clip-1",
          trackId: "track-1",
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 3840,
          startOffsetMs: 0,
        },
      ],
    };

    vi.mocked(uploadProjectAudio).mockResolvedValue(updatedProject);

    const setSavedProject = vi.fn();
    const setDraftProject = vi.fn();
    const setDraftHistory = vi.fn();
    const setTrackVisibility = vi.fn();
    const setLoadError = vi.fn();

    const { result } = renderHook(() =>
      useTimelineAudioUpload({
        projectId: "p1",
        draftProject: dummyProject,
        setSavedProject,
        setDraftProject,
        setDraftHistory,
        setTrackVisibility,
        setLoadError,
      }),
    );

    const fakeFile = new File(["dummy"], "vocals.wav", { type: "audio/wav" });

    await act(async () => {
      await result.current.onUploadAudioToTrack("track-1", fakeFile);
    });

    expect(uploadProjectAudio).toHaveBeenCalledWith("p1", fakeFile, {
      trackId: "track-1",
      startTicks: undefined,
    });
    expect(setDraftProject).toHaveBeenCalled();
  });
});
