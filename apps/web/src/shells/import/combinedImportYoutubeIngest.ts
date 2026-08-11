import { runAudioDrivenSmartTempo } from "@stagesync/shared";
import { fetchProject } from "@lib/shell-operator/libraryApi.js";
import { loadAudioBuffer } from "@lib/audio/audioPlayback.js";
import {
  analyzeAudioTempoAsync,
  buildImportTempoAnalysisOptions,
  yieldToUi,
} from "@lib/audio/audioTempoAnalysis.js";
import {
  computeWaveformFromAudioBuffer,
  resolveInitialAudioStartOffsetMs,
} from "@lib/audio/waveformPeaks.js";
import {
  fetchSessionYoutubeFile,
  pollSessionYoutubeJob,
  pollYoutubeAudioJob,
  startSessionYoutubeImport,
  startYoutubeAudioImport,
} from "@lib/shell-operator/projectAssetsApi.js";
import {
  decodeAudioFile,
  pipelinePct,
  refineBeat1OffsetMs,
} from "./combinedImportHelpers.js";
import type { ImportYoutubeIngestContext } from "./combinedImportIngestTypes.js";

async function analyzeIngestedBuffer(
  ctx: ImportYoutubeIngestContext,
  buffer: AudioBuffer,
  hasDownloadProgress: boolean,
): Promise<{
  meta: ReturnType<typeof computeWaveformFromAudioBuffer>;
  analysis: Awaited<ReturnType<typeof analyzeAudioTempoAsync>>["result"];
  analysisWarning: string | undefined;
  offsetMs: number;
}> {
  const { usPreview, beat1ResolveOpts } = ctx;
  if (hasDownloadProgress) {
    ctx.setIngestProgress(pipelinePct("prepare", 0, true));
  }
  await yieldToUi();
  const meta = computeWaveformFromAudioBuffer(buffer, 384);
  if (hasDownloadProgress) {
    ctx.setIngestProgress(pipelinePct("prepare", 1, true));
  }
  const gapMs =
    usPreview?.ok === true && usPreview.gapMs > 0 ? usPreview.gapMs : null;
  const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
    buffer,
    gapMs,
    beat1ResolveOpts,
  );
  ctx.setStepNotice("Analiza tempa…");
  if (hasDownloadProgress) {
    ctx.setIngestProgress(pipelinePct("analyze", 0, true));
  }
  await yieldToUi();
  const { result: analysis, warning: analysisWarning } =
    await analyzeAudioTempoAsync(buffer, {
      ...buildImportTempoAnalysisOptions({
        gapMs,
        durationMs: Math.round(buffer.duration * 1000),
      }),
      onProgress: (ratio) => {
        if (hasDownloadProgress) {
          ctx.setIngestProgress(pipelinePct("analyze", ratio, true));
        }
        ctx.setPipelineStages((prev) =>
          prev.map((s) =>
            s.id === "analyze" ? { ...s, progress: ratio * 100 } : s,
          ),
        );
        ctx.setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
      },
    });
  if (hasDownloadProgress) {
    ctx.setIngestProgress(100);
  }
  const offsetMs = refineBeat1OffsetMs(
    editorialOffsetMs,
    analysis,
    beat1ResolveOpts.layoutBpm ?? 120,
  );
  return { meta, analysis, analysisWarning, offsetMs };
}

function applySmartTempoFromAnalysis(
  ctx: ImportYoutubeIngestContext,
  params: {
    assetId: string;
    buffer: AudioBuffer;
    meta: ReturnType<typeof computeWaveformFromAudioBuffer>;
    analysis: Awaited<ReturnType<typeof analyzeAudioTempoAsync>>["result"];
    offsetMs: number;
    audioFile: File | null;
    resetDraftTempoNodes: boolean;
  },
): void {
  const {
    assetId,
    buffer,
    meta,
    analysis,
    offsetMs,
    audioFile,
    resetDraftTempoNodes,
  } = params;
  ctx.setAudioStartOffsetUserEdited(false);
  ctx.setAudioStartOffsetMs(offsetMs);
  ctx.setLocalBuffer(buffer);
  ctx.setAudioFile(audioFile);
  ctx.setAudioAnalysis(analysis);
  ctx.setGridBpmDraft(null);
  if (resetDraftTempoNodes) {
    ctx.setDraftTempoNodes([]);
  }
  const smartRes = runAudioDrivenSmartTempo({
    analysis,
    durationMs: meta.durationMs,
    audioStartOffsetMs: offsetMs,
  });
  ctx.setSmartTempoAudio({
    assetId,
    durationMs: meta.durationMs,
    peaks: meta.peaks,
    audioStartOffsetMs: offsetMs,
    estimatedBpm: analysis.estimatedBpm,
    tempoMap: smartRes.tempoMap,
    tempoNodes: smartRes.tempoNodes,
    analysis,
  });
  ctx.setPipelineStages([
    {
      id: "download",
      label: "Pobieranie audio z YouTube",
      status: "done",
    },
    {
      id: "analyze",
      label: "Analiza Smart Tempo & Viterbi",
      status: "done",
    },
    {
      id: "build",
      label: "Budowanie siatki taktowej i waveformu",
      status: "done",
    },
  ]);
}

export async function fetchYoutubeAudio(
  ctx: ImportYoutubeIngestContext,
  videoIdOverride?: string | null,
): Promise<void> {
  const { projectId, usPreview, resolvedYoutubeId } = ctx;
  const videoId =
    videoIdOverride?.trim() ||
    resolvedYoutubeId ||
    (usPreview?.ok === true ? usPreview.youtubeVideoId : null);
  if (!videoId) {
    ctx.setApplyError(
      "Podaj link YouTube albo upewnij się, że UltraStar ma #VIDEO.",
    );
    return;
  }
  ctx.setSelectedAssetId(null);
  ctx.setYtJobBusy(true);
  ctx.setStepNotice("Pobieranie z YouTube…");
  ctx.setIngestProgress(pipelinePct("download", 0, true));
  ctx.setPipelineStages([
    {
      id: "download",
      label: "Pobieranie audio z YouTube",
      status: "running",
      progress: 0,
    },
    {
      id: "analyze",
      label: "Analiza Smart Tempo & Viterbi",
      status: "pending",
    },
    {
      id: "build",
      label: "Budowanie siatki taktowej i waveformu",
      status: "pending",
    },
  ]);
  ctx.setApplyError(null);
  try {
    if (projectId) {
      const started = await startYoutubeAudioImport(projectId, videoId);
      let job = started;
      for (
        let i = 0;
        i < 180 && job.status !== "done" && job.status !== "error";
        i++
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        job = await pollYoutubeAudioJob(projectId, started.jobId);
        const dlRatio = Math.max(0, Math.min(100, job.progress)) / 100;
        ctx.setIngestProgress(pipelinePct("download", dlRatio, true));
        ctx.setPipelineStages((prev) =>
          prev.map((s) =>
            s.id === "download" ? { ...s, progress: job.progress } : s,
          ),
        );
        ctx.setStepNotice(
          job.status === "downloading"
            ? `Pobieranie z YouTube… ${Math.round(job.progress)}%`
            : `YouTube: ${job.status}`,
        );
      }
      if (job.status === "error") {
        throw new Error(job.error ?? "Pobieranie YouTube nie powiodło się.");
      }
      if (!job.assetId) {
        throw new Error("Brak pliku po pobraniu z YouTube.");
      }
      const serverProject = await fetchProject(projectId);
      ctx.setServerProjectSnapshot(serverProject);
      ctx.setStepNotice("Dekodowanie audio…");
      ctx.setIngestProgress(pipelinePct("decode", 0, true));
      ctx.setPipelineStages([
        {
          id: "download",
          label: "Pobieranie audio z YouTube",
          status: "done",
        },
        {
          id: "analyze",
          label: "Analiza Smart Tempo & Viterbi",
          status: "running",
          progress: 0,
        },
        {
          id: "build",
          label: "Budowanie siatki taktowej i waveformu",
          status: "pending",
        },
      ]);
      const buffer = await loadAudioBuffer(projectId, job.assetId);
      if (!buffer) {
        throw new Error("Nie udało się zdekodować pobranego audio.");
      }
      ctx.setIngestProgress(pipelinePct("decode", 1, true));
      ctx.setStepNotice("Przygotowanie podglądu…");
      const { meta, analysis, analysisWarning, offsetMs } =
        await analyzeIngestedBuffer(ctx, buffer, true);
      applySmartTempoFromAnalysis(ctx, {
        assetId: job.assetId,
        buffer,
        meta,
        analysis,
        offsetMs,
        audioFile: null,
        resetDraftTempoNodes: true,
      });
      const ytNotice = `Audio z YouTube gotowe (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
      ctx.setStepNotice(
        analysisWarning ? `${ytNotice} — ${analysisWarning}` : ytNotice,
      );
      return;
    }

    // New song — session download, then File for pending upload on apply.
    const started = await startSessionYoutubeImport(videoId);
    let job = started;
    for (
      let i = 0;
      i < 180 && job.status !== "done" && job.status !== "error";
      i++
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      job = await pollSessionYoutubeJob(started.jobId);
      const dlRatio = Math.max(0, Math.min(100, job.progress)) / 100;
      ctx.setIngestProgress(pipelinePct("download", dlRatio, true));
      ctx.setPipelineStages((prev) =>
        prev.map((s) =>
          s.id === "download" ? { ...s, progress: job.progress } : s,
        ),
      );
      ctx.setStepNotice(
        job.status === "downloading"
          ? `Pobieranie z YouTube… ${Math.round(job.progress)}%`
          : `YouTube: ${job.status}`,
      );
    }
    if (job.status === "error") {
      throw new Error(job.error ?? "Pobieranie YouTube nie powiodło się.");
    }
    ctx.setStepNotice("Dekodowanie audio…");
    ctx.setIngestProgress(pipelinePct("decode", 0, true));
    ctx.setPipelineStages([
      {
        id: "download",
        label: "Pobieranie audio z YouTube",
        status: "done",
      },
      {
        id: "analyze",
        label: "Analiza Smart Tempo & Viterbi",
        status: "running",
        progress: 0,
      },
      {
        id: "build",
        label: "Budowanie siatki taktowej i waveformu",
        status: "pending",
      },
    ]);
    const file = await fetchSessionYoutubeFile(started.jobId);
    const buffer = await decodeAudioFile(file);
    ctx.setIngestProgress(pipelinePct("decode", 1, true));
    ctx.setStepNotice("Przygotowanie podglądu…");
    const { meta, analysis, analysisWarning, offsetMs } =
      await analyzeIngestedBuffer(ctx, buffer, true);
    applySmartTempoFromAnalysis(ctx, {
      assetId: `local-${Date.now()}`,
      buffer,
      meta,
      analysis,
      offsetMs,
      audioFile: file,
      resetDraftTempoNodes: true,
    });
    const sessionNotice = `Audio z YouTube gotowe (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
    ctx.setStepNotice(
      analysisWarning ? `${sessionNotice} — ${analysisWarning}` : sessionNotice,
    );
  } catch (err) {
    ctx.setPipelineStages((prev) =>
      prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)),
    );
    ctx.setApplyError(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.setYtJobBusy(false);
    ctx.setIngestProgress(null);
  }
}
