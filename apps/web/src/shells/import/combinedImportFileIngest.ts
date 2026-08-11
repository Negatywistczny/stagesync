import { runAudioDrivenSmartTempo } from "@stagesync/shared";
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
import { uploadProjectAudio } from "@lib/shell-operator/projectAssetsApi.js";
import {
  decodeAudioFile,
  pipelinePct,
  refineBeat1OffsetMs,
} from "./combinedImportHelpers.js";
import type { ImportFileIngestContext } from "./combinedImportIngestTypes.js";

export async function ingestProjectAsset(
  ctx: ImportFileIngestContext,
  assetId: string,
): Promise<void> {
  const { projectId, projectAudioAssets, usPreview, beat1ResolveOpts } = ctx;
  if (!projectId) return;
  const asset = projectAudioAssets.find((a) => a.id === assetId);
  if (!asset) return;

  ctx.setApplyError(null);
  ctx.setStepNotice("Odczytywanie pliku z projektu…");
  ctx.setBusyNet(true);
  ctx.setSelectedAssetId(assetId);
  ctx.setPipelineStages([
    {
      id: "download",
      label: `Zasób z projektu (${asset.originalName || asset.storageName})`,
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
  await yieldToUi();

  try {
    const buffer = await loadAudioBuffer(projectId, assetId);
    if (!buffer) {
      throw new Error("Nie udało się zdekodować zasobu audio z projektu.");
    }
    const meta = computeWaveformFromAudioBuffer(buffer, 384);
    const gapMs =
      usPreview?.ok === true && usPreview.gapMs > 0 ? usPreview.gapMs : null;
    const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
      buffer,
      gapMs,
      beat1ResolveOpts,
    );

    ctx.setStepNotice("Analiza tempa…");
    const { result: analysis, warning: analysisWarning } =
      await analyzeAudioTempoAsync(buffer, {
        ...buildImportTempoAnalysisOptions({
          gapMs,
          durationMs: Math.round(buffer.duration * 1000),
        }),
        onProgress: (ratio) => {
          ctx.setPipelineStages((prev) =>
            prev.map((s) =>
              s.id === "analyze" ? { ...s, progress: ratio * 100 } : s,
            ),
          );
          ctx.setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
        },
      });

    const offsetMs = refineBeat1OffsetMs(
      editorialOffsetMs,
      analysis,
      beat1ResolveOpts.layoutBpm ?? 120,
    );
    ctx.setAudioStartOffsetUserEdited(false);
    ctx.setAudioStartOffsetMs(offsetMs);
    ctx.setAudioFile(null);
    ctx.setLocalBuffer(buffer);
    ctx.setAudioAnalysis(analysis);
    ctx.setGridBpmDraft(null);

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
        label: `Zasób z projektu (${asset.originalName || asset.storageName})`,
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

    const notice = `Wczytano ${asset.originalName || asset.storageName} (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
    ctx.setStepNotice(
      analysisWarning ? `${notice} — ${analysisWarning}` : notice,
    );
  } catch (err) {
    ctx.setPipelineStages((prev) =>
      prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)),
    );
    ctx.setApplyError(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.setBusyNet(false);
  }
}

export async function ingestLocalFile(
  ctx: ImportFileIngestContext,
  file: File,
): Promise<void> {
  const { projectId, usPreview, beat1ResolveOpts } = ctx;
  ctx.setSelectedAssetId(null);
  ctx.setApplyError(null);
  ctx.setStepNotice("Dekodowanie audio…");
  ctx.setIngestProgress(pipelinePct("decode", 0, false));
  ctx.setPipelineStages([
    {
      id: "download",
      label: `Plik z dysku (${file.name})`,
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
  ctx.setBusyNet(true);
  await yieldToUi();
  try {
    const buffer = await decodeAudioFile(file);
    ctx.setIngestProgress(pipelinePct("decode", 1, false));
    ctx.setStepNotice("Przygotowanie podglądu…");
    ctx.setIngestProgress(pipelinePct("prepare", 0, false));
    await yieldToUi();
    const meta = computeWaveformFromAudioBuffer(buffer, 384);
    ctx.setIngestProgress(pipelinePct("prepare", 1, false));
    ctx.setStepNotice("Analiza tempa…");
    ctx.setIngestProgress(pipelinePct("analyze", 0, false));
    await yieldToUi();
    const gapMs =
      usPreview?.ok === true && usPreview.gapMs > 0 ? usPreview.gapMs : null;
    const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
      buffer,
      gapMs,
      beat1ResolveOpts,
    );
    const { result: analysis, warning: analysisWarning } =
      await analyzeAudioTempoAsync(buffer, {
        ...buildImportTempoAnalysisOptions({
          gapMs,
          durationMs: Math.round(buffer.duration * 1000),
        }),
        onProgress: (ratio) => {
          ctx.setIngestProgress(pipelinePct("analyze", ratio, false));
          ctx.setPipelineStages((prev) =>
            prev.map((s) =>
              s.id === "analyze" ? { ...s, progress: ratio * 100 } : s,
            ),
          );
          ctx.setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
        },
      });
    ctx.setIngestProgress(100);
    const offsetMs = refineBeat1OffsetMs(
      editorialOffsetMs,
      analysis,
      beat1ResolveOpts.layoutBpm ?? 120,
    );
    ctx.setAudioStartOffsetUserEdited(false);
    ctx.setAudioStartOffsetMs(offsetMs);
    ctx.setAudioFile(file);
    ctx.setLocalBuffer(buffer);
    ctx.setAudioAnalysis(analysis);
    ctx.setGridBpmDraft(null);
    const smartRes = runAudioDrivenSmartTempo({
      analysis,
      durationMs: meta.durationMs,
      audioStartOffsetMs: offsetMs,
    });
    let assetId = `local-${Date.now()}`;
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
        label: `Plik z dysku (${file.name})`,
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
    const baseNotice = `Wczytano ${file.name} (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
    ctx.setStepNotice(
      analysisWarning ? `${baseNotice} — ${analysisWarning}` : baseNotice,
    );
    if (projectId) {
      try {
        const project = await uploadProjectAudio(projectId, file, {
          startTicks: 0,
        });
        ctx.setServerProjectSnapshot(project);
        const asset = project.assets.at(-1);
        if (asset) {
          assetId = asset.id;
          ctx.setSmartTempoAudio((prev) =>
            prev ? { ...prev, assetId } : prev,
          );
        }
      } catch (uploadErr) {
        ctx.setStepNotice(
          `Audio lokalnie OK — zapis na serwer: ${
            uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
          }`,
        );
      }
    }
  } catch (err) {
    ctx.setPipelineStages((prev) =>
      prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)),
    );
    ctx.setApplyError(err instanceof Error ? err.message : String(err));
  } finally {
    ctx.setBusyNet(false);
    ctx.setIngestProgress(null);
  }
}
