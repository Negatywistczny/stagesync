// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { ingestProjectAsset } from "./combinedImportFileIngest.js";
import type { ImportFileIngestContext } from "./combinedImportIngestTypes.js";

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

describe("combinedImportFileIngest", () => {
  function createMockContext(): ImportFileIngestContext {
    return {
      projectId: "proj-1",
      projectAudioAssets: [
        {
          id: "asset-1",
          storageName: "test.mp3",
          originalName: "Original.mp3",
          kind: "audio",
          mimeType: "audio/mpeg",
          sizeBytes: 1000,
          waveformPeaks: [0.1, 0.5],
        },
      ],
      usPreview: { ok: true, gapMs: 100 },
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

  it("ingests project asset and updates stages and analysis", async () => {
    const ctx = createMockContext();
    await ingestProjectAsset(ctx, "asset-1");

    expect(ctx.setSelectedAssetId).toHaveBeenCalledWith("asset-1");
    expect(ctx.setAudioStartOffsetMs).toHaveBeenCalledWith(50);
    expect(ctx.setAudioAnalysis).toHaveBeenCalled();
    expect(ctx.setBusyNet).toHaveBeenCalledWith(false);
  });

  it("early returns when asset is not found", async () => {
    const ctx = createMockContext();
    await ingestProjectAsset(ctx, "non-existent");
    expect(ctx.setSelectedAssetId).not.toHaveBeenCalled();
  });
});
