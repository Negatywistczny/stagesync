// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { fetchYoutubeAudio } from "./combinedImportYoutubeIngest.js";
import type { ImportYoutubeIngestContext } from "./combinedImportIngestTypes.js";

vi.mock("@stagesync/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stagesync/shared")>();
  return {
    ...actual,
    runAudioDrivenSmartTempo: vi.fn().mockReturnValue({
      tempoMap: [],
      tempoNodes: [],
    }),
  };
});

vi.mock("@lib/shell-operator/projectAssetsApi.js", () => ({
  startYoutubeAudioImport: vi.fn().mockResolvedValue({
    jobId: "job-1",
    status: "done",
    progress: 100,
    assetId: "yt-asset-1",
  }),
  pollYoutubeAudioJob: vi.fn().mockResolvedValue({
    jobId: "job-1",
    status: "done",
    progress: 100,
    assetId: "yt-asset-1",
  }),
  startSessionYoutubeImport: vi.fn(),
  pollSessionYoutubeJob: vi.fn(),
  fetchSessionYoutubeFile: vi.fn(),
}));

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchProject: vi.fn().mockResolvedValue({
    id: "proj-1",
    name: "Project 1",
    assets: [{ id: "yt-asset-1", storageName: "yt.mp3" }],
  }),
}));

vi.mock("@lib/audio/audioPlayback.js", () => ({
  loadAudioBuffer: vi.fn().mockResolvedValue({
    duration: 100,
    length: 4410000,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(100),
  }),
}));

vi.mock("@lib/audio/audioTempoAnalysis.js", () => ({
  analyzeAudioTempoAsync: vi.fn().mockResolvedValue({
    result: {
      globalBpm: 120,
      estimatedBpm: 120,
      confidence: 0.9,
      beatCandidates: [],
      viterbiBeats: [],
      onsetsMs: [],
      rawOnsetCurve: new Float32Array(),
    },
    warning: undefined,
  }),
  buildImportTempoAnalysisOptions: vi.fn().mockReturnValue({}),
  yieldToUi: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@lib/audio/waveformPeaks.js", () => ({
  computeWaveformFromAudioBuffer: vi.fn().mockReturnValue({
    durationMs: 100000,
    channels: 2,
    peaks: [],
  }),
  resolveInitialAudioStartOffsetMs: vi.fn().mockReturnValue(50),
}));

describe("combinedImportYoutubeIngest", () => {
  function createMockContext(): ImportYoutubeIngestContext {
    return {
      projectId: "proj-1",
      resolvedYoutubeId: "dQw4w9WgXcQ",
      usPreview: { ok: true, gapMs: 100, youtubeVideoId: "dQw4w9WgXcQ" },
      beat1ResolveOpts: { pipeBarCount: 4, layoutBpm: 120 },
      setApplyError: vi.fn(),
      setStepNotice: vi.fn(),
      setBusyNet: vi.fn(),
      setSelectedAssetId: vi.fn(),
      setPipelineStages: vi.fn(),
      setIngestProgress: vi.fn(),
      setAudioStartOffsetUserEdited: vi.fn(),
      setAudioStartOffsetMs: vi.fn(),
      setAudioFile: vi.fn(),
      setLocalBuffer: vi.fn(),
      setAudioAnalysis: vi.fn(),
      setGridBpmDraft: vi.fn(),
      setSmartTempoAudio: vi.fn(),
      setServerProjectSnapshot: vi.fn(),
      setDraftTempoNodes: vi.fn(),
      setYtJobBusy: vi.fn(),
    };
  }

  it("fetches youtube audio and applies analysis to project", async () => {
    const ctx = createMockContext();
    await fetchYoutubeAudio(ctx, "dQw4w9WgXcQ");

    expect(ctx.setYtJobBusy).toHaveBeenCalledWith(true);
    expect(ctx.setAudioStartOffsetMs).toHaveBeenCalledWith(50);
    expect(ctx.setAudioAnalysis).toHaveBeenCalled();
    expect(ctx.setYtJobBusy).toHaveBeenCalledWith(false);
  });

  it("sets apply error when no video ID is available", async () => {
    const ctx = createMockContext();
    ctx.resolvedYoutubeId = null;
    ctx.usPreview = null;
    await fetchYoutubeAudio(ctx, "");

    expect(ctx.setApplyError).toHaveBeenCalledWith(
      expect.stringContaining("Podaj link YouTube"),
    );
  });
});
