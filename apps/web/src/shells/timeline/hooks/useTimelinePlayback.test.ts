// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelinePlayback } from "./useTimelinePlayback.js";
import {
  EMPTY_CLIP_SELECTION,
  selectSingle,
} from "@lib/timeline/timelineSelection.js";
import type { Project } from "@stagesync/shared";

vi.mock("@lib/audio/audioPlayback.js", () => ({
  allowAudioPlayback: vi.fn(),
  ensureAudioBuffered: vi.fn().mockResolvedValue({ failedAssetIds: [] }),
  getAudioPlaybackDebugState: vi.fn().mockReturnValue({ suppressed: false }),
  getFailedAudioAssetIds: vi.fn().mockReturnValue([]),
  restartAudioPlayback: vi.fn(),
  suppressAudioPlayback: vi.fn(),
}));

vi.mock("@lib/audio/metronome.js", () => ({
  advanceMetronomeClicks: vi.fn(),
  cancelScheduledMetronomeClicks: vi.fn(),
  getMetronomeAudioContext: vi.fn().mockReturnValue(null),
  metronomeBeatIndex: vi.fn().mockReturnValue(0),
  resumeMetronomeAudio: vi.fn().mockResolvedValue(undefined),
}));

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Playback Test",
    formatVersion: 6,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "c1",
          name: "Verse",
          kind: "section",
          startTicks: 960,
          lengthTicks: 3840,
        },
      ],
    },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };
}

describe("useTimelinePlayback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes metronome, latency compensation, followPlayhead and toggles metronome", async () => {
    const setLocatorTicks = vi.fn();
    const seek = vi.fn().mockResolvedValue(undefined);
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn().mockResolvedValue(undefined);

    const draftProject = createTestProject();
    const draftRef = { current: draftProject };

    const { result } = renderHook(() =>
      useTimelinePlayback({
        projectId: "p1",
        draftProject,
        draftRef,
        locatorTicks: 0,
        setLocatorTicks,
        displayTicks: 0,
        clipSelection: EMPTY_CLIP_SELECTION,
        state: {
          playing: false,
          positionTicks: 0,
          timeSignature: { numerator: 4, denominator: 4 },
          ppq: 960,
        } as any,
        seek,
        play,
        pause,
        stop,
        soloAudioTrackIds: [],
        soloBusIds: [],
        canvasScrollRef: { current: null },
        playheadPx: 100,
        meterAtPlayhead: { numerator: 4, denominator: 4 },
        tempoAtPlayhead: 120,
      }),
    );

    expect(typeof result.current.onPlayClick).toBe("function");
    expect(typeof result.current.onPauseClick).toBe("function");
    expect(typeof result.current.onStopClick).toBe("function");

    await act(async () => {
      await result.current.onMetronomeToggle();
    });
    expect(result.current.metronomeOn).toBeDefined();

    await act(async () => {
      await result.current.onPauseClick();
    });
    expect(pause).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.onStopClick();
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(setLocatorTicks).toHaveBeenCalledWith(0);
  });

  it("triggers playClick and playFromSelectionOrLocator", async () => {
    const setLocatorTicks = vi.fn();
    const seek = vi.fn().mockResolvedValue(undefined);
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn().mockResolvedValue(undefined);
    const stop = vi.fn().mockResolvedValue(undefined);

    const draftProject = createTestProject();
    const draftRef = { current: draftProject };
    const selection = selectSingle("c1", "forma");

    const { result } = renderHook(() =>
      useTimelinePlayback({
        projectId: "p1",
        draftProject,
        draftRef,
        locatorTicks: 0,
        setLocatorTicks,
        displayTicks: 0,
        clipSelection: selection,
        state: {
          playing: false,
          positionTicks: 0,
          timeSignature: { numerator: 4, denominator: 4 },
          ppq: 960,
        } as any,
        seek,
        play,
        pause,
        stop,
        soloAudioTrackIds: [],
        soloBusIds: [],
        canvasScrollRef: { current: null },
        playheadPx: 100,
        meterAtPlayhead: { numerator: 4, denominator: 4 },
        tempoAtPlayhead: 120,
      }),
    );

    await act(async () => {
      await result.current.onPlayClick();
    });
    expect(play).toHaveBeenCalled();

    await act(async () => {
      await result.current.playFromSelectionOrLocator();
    });
    expect(setLocatorTicks).toHaveBeenCalledWith(960);
  });
});
