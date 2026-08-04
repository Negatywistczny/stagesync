/**
 * Combined UltraStar + UG import wizard (Text-Anchor Bridging + Smart Tempo).
 * Steps: UltraStar → UG → Audio → Beat Mapper → Apply.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Button, Input, Textarea } from "@stagesync/ui";
import {
  TEXT_ANCHOR_WEAK_ALIGN,
  bridgeUsUgFromTexts,
  extractYoutubeVideoId,
  importUltrastarText,
  importUgText,
  suggestGridBpmFromUsUgTexts,
  parseUgBridgeSections,
  snapBeat1MsToOnset,
  runAudioDrivenSmartTempo,
  type SmartTempoAudioRef,
  type TempoNode,
  type TextAnchorBridgeOk,
  type TextAnchorBridgeOptions,
  type AudioAnalysisResult,
  type Project,
  type UgSearchHit,
  type UltrastarSearchHit,
} from "@stagesync/shared";
import { fetchProject } from "../lib/libraryApi.js";
import {
  estimateAudioBufferBytes,
  loadAudioBuffer,
} from "../lib/audioPlayback.js";
import {
  formatBytesMb,
  noteMemoryCheckpoint,
  registerMemoryContributor,
} from "../lib/memoryPressure.js";
import {
  analyzeAudioTempoAsync,
  buildImportTempoAnalysisOptions,
  yieldToUi,
} from "../lib/audioTempoAnalysis.js";
import {
  computeWaveformFromAudioBuffer,
  resolveInitialAudioStartOffsetMs,
} from "../lib/waveformPeaks.js";
import {
  fetchSessionYoutubeFile,
  pollSessionYoutubeJob,
  pollYoutubeAudioJob,
  startSessionYoutubeImport,
  startYoutubeAudioImport,
  uploadProjectAudio,
} from "../lib/projectAssetsApi.js";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
} from "../lib/metronome.js";

/** Editorial Beat 1, then snap to nearby onset so the attack sits on the barline. */
function refineBeat1OffsetMs(
  editorialMs: number,
  analysis: AudioAnalysisResult,
  layoutBpm: number,
): number {
  // Prefer editorial/pipe layout BPM for the snap window — analysis often
  // undershoots and widens the window enough to grab a late intro transient.
  const bpm =
    layoutBpm > 0
      ? layoutBpm
      : analysis.estimatedBpm > 0
        ? analysis.estimatedBpm
        : 120;
  return snapBeat1MsToOnset(editorialMs, analysis.onsetsMs, bpm);
}
import {
  fetchUltrastarFromServer,
  searchUltrastarSongs,
} from "../lib/ultrastarImportApi.js";
import { fetchUgTabFromServer, searchUgTabs } from "../lib/ugImportApi.js";
import { AudioDropzone } from "./import/AudioDropzone.js";
import { BeatMapperPane } from "./import/BeatMapperPane.js";
import { ImportProgress } from "./import/ImportProgress.js";
import styles from "./CombinedUsUgImportForm.module.css";

/** Continuous 0…100 bar across download → decode → prepare → analyze. */
function pipelinePct(
  phase: "download" | "decode" | "prepare" | "analyze",
  localRatio: number,
  hasDownload: boolean,
): number {
  const r = Math.max(0, Math.min(1, localRatio));
  if (hasDownload) {
    switch (phase) {
      case "download":
        return r * 65;
      case "decode":
        return 65 + r * 10;
      case "prepare":
        return 75 + r * 7;
      case "analyze":
        return 82 + r * 18;
    }
  }
  switch (phase) {
    case "download":
      return 0;
    case "decode":
      return r * 15;
    case "prepare":
      return 15 + r * 10;
    case "analyze":
      return 25 + r * 75;
  }
}

export type UsUgApplyPayload = {
  bridge: TextAnchorBridgeOk;
  smartTempoAudio?: SmartTempoAudioRef;
  /** When creating a new song — upload after project exists. */
  pendingAudioFile?: File;
  /** Server revision after audio upload in wizard (OCC token for Save). */
  serverProjectSnapshot?: Project;
};

export type CombinedUsUgImportFormProps = {
  applyLabel: string;
  disabled?: boolean;
  applying?: boolean;
  importOptions?: TextAnchorBridgeOptions;
  /** Draft import project. Omit when creating a new song. */
  projectId?: string;
  initialTitle?: string;
  initialArtist?: string;
  onCancel: () => void;
  onApply: (payload: UsUgApplyPayload) => void | Promise<void>;
};

type Step = "us" | "ug" | "audio" | "beatmap";

const STEP_META: Record<
  Step,
  { title: string; subtitle: string }
> = {
  us: {
    title: "Krok 1 z 4: Plik UltraStar (.txt)",
    subtitle: "Wklej tekst UltraStar albo wyszukaj utwór w USDB.",
  },
  ug: {
    title: "Krok 2 z 4: Tabulatura Ultimate Guitar",
    subtitle: "Wklej ChordPro / UG albo wyszukaj zakładkę online.",
  },
  audio: {
    title: "Krok 3 z 4: Ścieżka Audio",
    subtitle: "Dodaj nagranie audio, aby zsynchronizować siatkę taktową.",
  },
  beatmap: {
    title: "Krok 4 z 4: Weryfikacja Siatki i Tempa",
    subtitle: "Sprawdź Beat 1, tempo i sekcje przed importem.",
  },
};

function parseGridBpmInput(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getMetronomeAudioContext();
  await resumeMetronomeAudio(ctx);
  const compressedBytes = file.size;
  if (compressedBytes >= 20 * 1024 * 1024) {
    noteMemoryCheckpoint("import-decode-file-large", {
      name: file.name,
      compressedBytes,
    });
  }
  const buffer = await ctx.decodeAudioData((await file.arrayBuffer()).slice(0));
  noteMemoryCheckpoint("import-decode-file-done", {
    name: file.name,
    compressedBytes,
    pcmBytes: estimateAudioBufferBytes(buffer),
    durationSec: buffer.duration,
    channels: buffer.numberOfChannels,
  });
  return buffer;
}

export function CombinedUsUgImportForm({
  applyLabel,
  disabled = false,
  applying = false,
  importOptions,
  projectId,
  initialTitle = "",
  initialArtist = "",
  onCancel,
  onApply,
}: CombinedUsUgImportFormProps) {
  const seedTitle = initialTitle.trim();
  const seedArtist = initialArtist.trim();
  const [step, setStep] = useState<Step>("us");
  const [usText, setUsText] = useState("");
  const [ugText, setUgText] = useState("");

  const [usTitle, setUsTitle] = useState(seedTitle);
  const [usArtist, setUsArtist] = useState(seedArtist);
  const [ugTitle, setUgTitle] = useState(seedTitle);
  const [ugArtist, setUgArtist] = useState(seedArtist);
  const [gridBpmDraft, setGridBpmDraft] = useState<string | null>(null);
  const [busyNet, setBusyNet] = useState(false);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busyApply, setBusyApply] = useState(false);
  const [confirmWeak, setConfirmWeak] = useState(false);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [localBuffer, setLocalBuffer] = useState<AudioBuffer | null>(null);
  const [smartTempoAudio, setSmartTempoAudio] =
    useState<SmartTempoAudioRef | null>(null);
  const [audioAnalysis, setAudioAnalysis] =
    useState<AudioAnalysisResult | null>(null);
  const [audioStartOffsetMs, setAudioStartOffsetMs] = useState(0);
  const [audioStartOffsetUserEdited, setAudioStartOffsetUserEdited] =
    useState(false);
  const [draftTempoNodes, setDraftTempoNodes] = useState<TempoNode[]>([]);
  const [draftTempoNodesUserEdited, setDraftTempoNodesUserEdited] =
    useState(false);
  const deferredTempoNodes = useDeferredValue(draftTempoNodes);
  const [serverProjectSnapshot, setServerProjectSnapshot] =
    useState<Project | null>(null);
  const [ytJobBusy, setYtJobBusy] = useState(false);
  /** 0…100 continuous ingest bar (YouTube + decode + tempo analysis). */
  const [ingestProgress, setIngestProgress] = useState<number | null>(null);
  const [usHits, setUsHits] = useState<UltrastarSearchHit[]>([]);
  const [ugHits, setUgHits] = useState<UgSearchHit[]>([]);
  const [selectedUsUrl, setSelectedUsUrl] = useState<string | null>(null);
  const [selectedUgUrl, setSelectedUgUrl] = useState<string | null>(null);
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("");
  const beatPlayToggleRef = useRef<(() => void) | null>(null);

  // Hold decoded import PCM in the memory-pressure ledger while Beat Mapper is open.
  useEffect(() => {
    if (!localBuffer) return;
    return registerMemoryContributor({
      id: "import-local-audio",
      label: "Import US+UG (zdekodowany bufor)",
      approxBytes: () => estimateAudioBufferBytes(localBuffer),
      detail: () =>
        `${formatBytesMb(estimateAudioBufferBytes(localBuffer))} · ${localBuffer.duration.toFixed(1)}s · ${localBuffer.numberOfChannels} ch · ${Math.round(localBuffer.sampleRate)} Hz`,
    });
  }, [localBuffer]);

  const locked = disabled || applying || busyNet || busyApply || ytJobBusy;

  const usPreview = useMemo(() => {
    if (!usText.trim()) return null;
    return importUltrastarText(usText, {
      ppq: importOptions?.ppq,
      meter: importOptions?.meter,
      contentFloorTicks: importOptions?.contentFloorTicks,
      idPrefix: "us",
    });
  }, [usText, importOptions]);

  const ugPreview = useMemo(() => {
    if (!ugText.trim()) return null;
    return importUgText(ugText, {
      ppq: importOptions?.ppq,
      meter: importOptions?.meter,
      contentFloorTicks: importOptions?.contentFloorTicks,
      idPrefix: "ug",
    });
  }, [ugText, importOptions]);

  const fileMetroBpm =
    usPreview?.ok === true ? usPreview.ultrastarMetronomeBpm : null;

  const suggestedGridBpm = useMemo(() => {
    if (!usText.trim() || !ugText.trim()) return null;
    return suggestGridBpmFromUsUgTexts(usText, ugText, {
      meter: importOptions?.meter,
      // Exclude pre-roll so SingStar GAP (~35s) does not seed ~113 BPM.
      beat1Ms: audioStartOffsetMs,
    });
  }, [usText, ugText, importOptions, audioStartOffsetMs]);

  const pipeIntroBarCount = useMemo(() => {
    if (!ugText.trim()) return 0;
    try {
      return (
        parseUgBridgeSections(ugText).find((s) => s.pipeBarCount > 0)
          ?.pipeBarCount ?? 0
      );
    } catch {
      return 0;
    }
  }, [ugText]);

  const beat1ResolveOpts = useMemo(
    () => ({
      pipeBarCount: pipeIntroBarCount,
      layoutBpm: suggestedGridBpm ?? fileMetroBpm ?? 120,
    }),
    [pipeIntroBarCount, suggestedGridBpm, fileMetroBpm],
  );

  const importTempoOptions = useMemo(
    () =>
      buildImportTempoAnalysisOptions({
        gapMs: usPreview?.ok === true ? usPreview.gapMs : null,
        // Soft octave center for ACF only — pipe/~120, never UltraStar `#BPM`.
        seedBpm: suggestedGridBpm ?? 120,
        durationMs:
          smartTempoAudio?.durationMs ??
          (localBuffer != null
            ? Math.round(localBuffer.duration * 1000)
            : null),
      }),
    [
      suggestedGridBpm,
      smartTempoAudio?.durationMs,
      localBuffer,
    ],
  );

  const gridBpmDisplay =
    gridBpmDraft ??
    (smartTempoAudio?.estimatedBpm != null && smartTempoAudio.estimatedBpm > 0
      ? String(Math.round(smartTempoAudio.estimatedBpm * 100) / 100)
      : suggestedGridBpm != null
        ? String(Math.round(suggestedGridBpm * 100) / 100)
        : fileMetroBpm != null
          ? String(Math.round(fileMetroBpm * 100) / 100)
          : "");
  const gridBpmForBridge = parseGridBpmInput(gridBpmDisplay);

  const audioRefForBridge = smartTempoAudio
    ? { ...smartTempoAudio, audioStartOffsetMs }
    : undefined;

  const bridged = useMemo(() => {
    if (!usText.trim() || !ugText.trim()) return null;
    const passGrid =
      gridBpmForBridge != null &&
      !(
        fileMetroBpm != null &&
        Math.abs(gridBpmForBridge - fileMetroBpm) < 0.05
      );
    return bridgeUsUgFromTexts(usText, ugText, {
      ...importOptions,
      idPrefix: "bridge",
      ...(passGrid ? { gridBpm: gridBpmForBridge } : {}),
      ...(audioRefForBridge ? { smartTempoAudio: audioRefForBridge } : {}),
      ...(audioAnalysis ? { audioAnalysis } : {}),
      ...(audioStartOffsetUserEdited
        ? { audioStartOffsetUserEdited: true }
        : {}),
      ...(draftTempoNodesUserEdited && deferredTempoNodes.length > 0
        ? {
            draftTempoNodes: deferredTempoNodes,
            draftTempoNodesUserEdited: true,
          }
        : {}),
    });
  }, [
    usText,
    ugText,
    importOptions,
    gridBpmForBridge,
    fileMetroBpm,
    audioRefForBridge,
    audioAnalysis,
    audioStartOffsetUserEdited,
    draftTempoNodesUserEdited,
    deferredTempoNodes,
  ]);

  const displayTempoNodes = useMemo(() => {
    if (draftTempoNodesUserEdited && draftTempoNodes.length > 0) {
      return draftTempoNodes;
    }
    if (bridged?.ok === true && (bridged.tempoNodes?.length ?? 0) > 0) {
      return bridged.tempoNodes;
    }
    return draftTempoNodes;
  }, [draftTempoNodesUserEdited, draftTempoNodes, bridged]);

  const handleTempoNodesChange = useCallback((nodes: TempoNode[]) => {
    setDraftTempoNodes(nodes);
    setDraftTempoNodesUserEdited(true);
  }, []);

  useEffect(() => {
    setDraftTempoNodes([]);
    setDraftTempoNodesUserEdited(false);
  }, [audioAnalysis]);

  const error =
    applyError ??
    (usText.trim() && usPreview && !usPreview.ok ? usPreview.message : null) ??
    (ugText.trim() && ugPreview && !ugPreview.ok ? ugPreview.message : null) ??
    (bridged && !bridged.ok ? bridged.message : null);

  const bridgeOk = bridged?.ok === true ? bridged : null;
  const weakAlign =
    bridgeOk != null && bridgeOk.alignScore < TEXT_ANCHOR_WEAK_ALIGN;
  const hasAudio = smartTempoAudio != null && smartTempoAudio.durationMs > 0;

  // Chord↔syllable lock may nudge Beat 1 — keep Beat Mapper / trim in sync.
  // Skip once the user has set Audio Start Offset manually (override wins).
  useEffect(() => {
    if (audioStartOffsetUserEdited) return;
    if (bridgeOk?.smartTempoAudio?.audioStartOffsetMs == null) return;
    const aligned = bridgeOk.smartTempoAudio.audioStartOffsetMs;
    if (aligned === audioStartOffsetMs) return;
    setAudioStartOffsetMs(aligned);
    setSmartTempoAudio((prev) =>
      prev ? { ...prev, audioStartOffsetMs: aligned } : prev,
    );
  }, [bridgeOk, audioStartOffsetMs, audioStartOffsetUserEdited]);

  // Re-resolve editorial Beat 1 once a long pipe Intro is known. Audio loaded
  // before UG often used the first transient (~½–1½ bars late) instead of
  // pipe+GAP ideal — that makes MP3 lead the barline into Verse.
  useEffect(() => {
    if (audioStartOffsetUserEdited) return;
    if (!localBuffer) return;
    if (pipeIntroBarCount < 12) return;
    const gapMs =
      usPreview?.ok === true && usPreview.gapMs > 0 ? usPreview.gapMs : null;
    if (!(gapMs != null && gapMs > 0)) return;
    const editorial = resolveInitialAudioStartOffsetMs(
      localBuffer,
      gapMs,
      beat1ResolveOpts,
    );
    const refined = audioAnalysis
      ? refineBeat1OffsetMs(
          editorial,
          audioAnalysis,
          beat1ResolveOpts.layoutBpm ?? 120,
        )
      : editorial;
    if (refined === audioStartOffsetMs) return;
    setAudioStartOffsetMs(refined);
    setSmartTempoAudio((prev) =>
      prev ? { ...prev, audioStartOffsetMs: refined } : prev,
    );
  }, [
    audioStartOffsetUserEdited,
    localBuffer,
    pipeIntroBarCount,
    usPreview,
    beat1ResolveOpts,
    audioAnalysis,
    audioStartOffsetMs,
  ]);

  const handleAudioStartOffsetChange = useCallback((ms: number) => {
    setAudioStartOffsetUserEdited(true);
    setAudioStartOffsetMs(ms);
    setSmartTempoAudio((prev) =>
      prev ? { ...prev, audioStartOffsetMs: ms } : prev,
    );
  }, []);

  const usYoutubeId =
    usPreview?.ok === true ? usPreview.youtubeVideoId : null;
  const draftYoutubeId = extractYoutubeVideoId(youtubeUrlDraft.trim());
  const resolvedYoutubeId = draftYoutubeId ?? usYoutubeId;
  const youtubeAvailable = Boolean(resolvedYoutubeId);

  // Prefill YouTube field from UltraStar #VIDEO when available.
  useEffect(() => {
    if (!usYoutubeId) return;
    setYoutubeUrlDraft((prev) =>
      prev.trim()
        ? prev
        : `https://www.youtube.com/watch?v=${usYoutubeId}`,
    );
  }, [usYoutubeId]);

  // Modal owns Space — never let Timeline transport steal it.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" && e.key !== " ") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      beatPlayToggleRef.current?.();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const ingestLocalFile = useCallback(
    async (file: File) => {
      setApplyError(null);
      setStepNotice("Dekodowanie audio…");
      setIngestProgress(pipelinePct("decode", 0, false));
      setBusyNet(true);
      await yieldToUi();
      try {
        const buffer = await decodeAudioFile(file);
        setIngestProgress(pipelinePct("decode", 1, false));
        setStepNotice("Przygotowanie podglądu…");
        setIngestProgress(pipelinePct("prepare", 0, false));
        await yieldToUi();
        const meta = computeWaveformFromAudioBuffer(buffer, 384);
        setIngestProgress(pipelinePct("prepare", 1, false));
        setStepNotice("Analiza tempa…");
        setIngestProgress(pipelinePct("analyze", 0, false));
        await yieldToUi();
        const gapMs =
          usPreview?.ok === true && usPreview.gapMs > 0
            ? usPreview.gapMs
            : null;
        const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
          buffer,
          gapMs,
          beat1ResolveOpts,
        );
        const { result: analysis, warning: analysisWarning } =
          await analyzeAudioTempoAsync(buffer, {
            ...buildImportTempoAnalysisOptions({
              gapMs,
              seedBpm: suggestedGridBpm ?? 120,
              durationMs: Math.round(buffer.duration * 1000),
            }),
            onProgress: (ratio) => {
              setIngestProgress(pipelinePct("analyze", ratio, false));
              setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
            },
          });
        setIngestProgress(100);
        const offsetMs = refineBeat1OffsetMs(
          editorialOffsetMs,
          analysis,
          beat1ResolveOpts.layoutBpm ?? 120,
        );
        setAudioStartOffsetUserEdited(false);
        setAudioStartOffsetMs(offsetMs);
        setAudioFile(file);
        setLocalBuffer(buffer);
        setAudioAnalysis(analysis);
        setGridBpmDraft(null);
        const smartRes = runAudioDrivenSmartTempo({
          analysis,
          durationMs: meta.durationMs,
          audioStartOffsetMs: offsetMs,
        });
        let assetId = `local-${Date.now()}`;
        setSmartTempoAudio({
          assetId,
          durationMs: meta.durationMs,
          peaks: meta.peaks,
          audioStartOffsetMs: offsetMs,
          estimatedBpm: analysis.estimatedBpm,
          tempoMap: smartRes.tempoMap,
          tempoNodes: smartRes.tempoNodes,
          analysis,
        });
        const baseNotice = `Wczytano ${file.name} (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
        setStepNotice(
          analysisWarning ? `${baseNotice} — ${analysisWarning}` : baseNotice,
        );
        if (projectId) {
          try {
            const project = await uploadProjectAudio(projectId, file, {
              startTicks: 0,
            });
            setServerProjectSnapshot(project);
            const asset = project.assets.at(-1);
            if (asset) {
              assetId = asset.id;
              setSmartTempoAudio((prev) =>
                prev ? { ...prev, assetId } : prev,
              );
            }
          } catch (uploadErr) {
            setStepNotice(
              `Audio lokalnie OK — zapis na serwer: ${
                uploadErr instanceof Error
                  ? uploadErr.message
                  : String(uploadErr)
              }`,
            );
          }
        }
      } catch (err) {
        setApplyError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyNet(false);
        setIngestProgress(null);
      }
    },
    [projectId, usPreview, suggestedGridBpm, beat1ResolveOpts],
  );

  async function fetchYoutubeAudio(videoIdOverride?: string | null) {
    const videoId =
      videoIdOverride?.trim() ||
      resolvedYoutubeId ||
      (usPreview?.ok === true ? usPreview.youtubeVideoId : null);
    if (!videoId) {
      setApplyError(
        "Podaj link YouTube albo upewnij się, że UltraStar ma #VIDEO.",
      );
      return;
    }
    setYtJobBusy(true);
    setStepNotice("Pobieranie z YouTube…");
    setIngestProgress(pipelinePct("download", 0, true));
    setApplyError(null);
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
          setIngestProgress(pipelinePct("download", dlRatio, true));
          setStepNotice(
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
        setServerProjectSnapshot(serverProject);
        setStepNotice("Dekodowanie audio…");
        setIngestProgress(pipelinePct("decode", 0, true));
        const buffer = await loadAudioBuffer(projectId, job.assetId);
        if (!buffer) {
          throw new Error("Nie udało się zdekodować pobranego audio.");
        }
        setIngestProgress(pipelinePct("decode", 1, true));
        setStepNotice("Przygotowanie podglądu…");
        setIngestProgress(pipelinePct("prepare", 0, true));
        await yieldToUi();
        const meta = computeWaveformFromAudioBuffer(buffer, 384);
        setIngestProgress(pipelinePct("prepare", 1, true));
        const gapMs =
          usPreview?.ok === true && usPreview.gapMs > 0
            ? usPreview.gapMs
            : null;
        const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
          buffer,
          gapMs,
          beat1ResolveOpts,
        );
        setStepNotice("Analiza tempa…");
        setIngestProgress(pipelinePct("analyze", 0, true));
        await yieldToUi();
        const { result: analysis, warning: analysisWarning } =
          await analyzeAudioTempoAsync(buffer, {
            ...buildImportTempoAnalysisOptions({
              gapMs,
              seedBpm: suggestedGridBpm ?? 120,
              durationMs: Math.round(buffer.duration * 1000),
            }),
            onProgress: (ratio) => {
              setIngestProgress(pipelinePct("analyze", ratio, true));
              setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
            },
          });
        setIngestProgress(100);
        const offsetMs = refineBeat1OffsetMs(
          editorialOffsetMs,
          analysis,
          beat1ResolveOpts.layoutBpm ?? 120,
        );
        setAudioStartOffsetUserEdited(false);
        setAudioStartOffsetMs(offsetMs);
        setLocalBuffer(buffer);
        setAudioFile(null);
        setAudioAnalysis(analysis);
        setGridBpmDraft(null);
        setDraftTempoNodes([]);
        const smartRes = runAudioDrivenSmartTempo({
          analysis,
          durationMs: meta.durationMs,
          audioStartOffsetMs: offsetMs,
        });
        setSmartTempoAudio({
          assetId: job.assetId,
          durationMs: meta.durationMs,
          peaks: meta.peaks,
          audioStartOffsetMs: offsetMs,
          estimatedBpm: analysis.estimatedBpm,
          tempoMap: smartRes.tempoMap,
          tempoNodes: smartRes.tempoNodes,
          analysis,
        });
        const ytNotice = `Audio z YouTube gotowe (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
        setStepNotice(
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
        setIngestProgress(pipelinePct("download", dlRatio, true));
        setStepNotice(
          job.status === "downloading"
            ? `Pobieranie z YouTube… ${Math.round(job.progress)}%`
            : `YouTube: ${job.status}`,
        );
      }
      if (job.status === "error") {
        throw new Error(job.error ?? "Pobieranie YouTube nie powiodło się.");
      }
      setStepNotice("Dekodowanie audio…");
      setIngestProgress(pipelinePct("decode", 0, true));
      const file = await fetchSessionYoutubeFile(started.jobId);
      const buffer = await decodeAudioFile(file);
      setIngestProgress(pipelinePct("decode", 1, true));
      setStepNotice("Przygotowanie podglądu…");
      setIngestProgress(pipelinePct("prepare", 0, true));
      await yieldToUi();
      const meta = computeWaveformFromAudioBuffer(buffer, 384);
      setIngestProgress(pipelinePct("prepare", 1, true));
      const gapMs =
        usPreview?.ok === true && usPreview.gapMs > 0
          ? usPreview.gapMs
          : null;
      const editorialOffsetMs = resolveInitialAudioStartOffsetMs(
        buffer,
        gapMs,
        beat1ResolveOpts,
      );
      setStepNotice("Analiza tempa…");
      setIngestProgress(pipelinePct("analyze", 0, true));
      await yieldToUi();
      const { result: analysis, warning: analysisWarning } =
        await analyzeAudioTempoAsync(buffer, {
          ...buildImportTempoAnalysisOptions({
            gapMs,
            seedBpm: suggestedGridBpm ?? 120,
            durationMs: Math.round(buffer.duration * 1000),
          }),
          onProgress: (ratio) => {
            setIngestProgress(pipelinePct("analyze", ratio, true));
            setStepNotice(`Analiza tempa… ${Math.round(ratio * 100)}%`);
          },
        });
      setIngestProgress(100);
      const offsetMs = refineBeat1OffsetMs(
        editorialOffsetMs,
        analysis,
        beat1ResolveOpts.layoutBpm ?? 120,
      );
      setAudioStartOffsetUserEdited(false);
      setAudioStartOffsetMs(offsetMs);
      setAudioFile(file);
      setLocalBuffer(buffer);
      setAudioAnalysis(analysis);
      setGridBpmDraft(null);
      setDraftTempoNodes([]);
        const smartRes = runAudioDrivenSmartTempo({
          analysis,
          durationMs: meta.durationMs,
          audioStartOffsetMs: offsetMs,
        });
        setSmartTempoAudio({
          assetId: `local-${Date.now()}`,
          durationMs: meta.durationMs,
          peaks: meta.peaks,
          audioStartOffsetMs: offsetMs,
          estimatedBpm: analysis.estimatedBpm,
          tempoMap: smartRes.tempoMap,
          tempoNodes: smartRes.tempoNodes,
          analysis,
        });
      const sessionNotice = `Audio z YouTube gotowe (${Math.round(meta.durationMs / 1000)} s) · ~${analysis.estimatedBpm} BPM`;
      setStepNotice(
        analysisWarning ? `${sessionNotice} — ${analysisWarning}` : sessionNotice,
      );
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setYtJobBusy(false);
      setIngestProgress(null);
    }
  }

  async function pickUsHit(hit: UltrastarSearchHit) {
    if (!hit.url) {
      setStepNotice("Wynik USDB bez URL.");
      return;
    }
    setBusyNet(true);
    setStepNotice(null);
    setApplyError(null);
    await yieldToUi();
    try {
      const fetched = await fetchUltrastarFromServer(hit.url);
      setUsText(fetched.content);
      setSelectedUsUrl(hit.url);
      setGridBpmDraft(null);
      const metaTitle =
        fetched.metadata.title?.trim() || hit.title?.trim() || "";
      const metaArtist = fetched.metadata.artist?.trim() || hit.artist?.trim() || "";
      if (metaTitle) setUsTitle(metaTitle);
      if (metaArtist) setUsArtist(metaArtist);
      setStepNotice(`Załadowano: ${metaTitle || "utwór"}`);
    } catch (err) {
      setStepNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function pickUgHit(hit: UgSearchHit) {
    if (!hit.url) {
      setStepNotice("Wynik UG bez URL.");
      return;
    }
    setBusyNet(true);
    setStepNotice(null);
    setApplyError(null);
    await yieldToUi();
    try {
      const fetched = await fetchUgTabFromServer(hit.url);
      setUgText(fetched.content);
      setSelectedUgUrl(hit.url);
      setGridBpmDraft(null);
      const metaTitle =
        fetched.metadata?.title?.trim() || hit.title?.trim() || "";
      const metaArtist =
        fetched.metadata?.artist?.trim() || hit.artist?.trim() || "";
      if (metaTitle) setUgTitle(metaTitle);
      if (metaArtist) setUgArtist(metaArtist);
      setStepNotice(`Załadowano zakładkę: ${metaTitle || "UG"}`);
    } catch (err) {
      setStepNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function searchUs() {
    setStepNotice(null);
    setBusyNet(true);
    await yieldToUi();
    try {
      const data = await searchUltrastarSongs(usTitle, usArtist);
      setUsHits(data.results);
      setSelectedUsUrl(null);
      if (!data.results.length) {
        setStepNotice(data.message ?? "Brak wyników USDB.");
        return;
      }
      setStepNotice(`Znaleziono ${data.results.length} wersji — wybierz kartę.`);
    } catch (err) {
      setUsHits([]);
      setStepNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function searchUg() {
    setStepNotice(null);
    setBusyNet(true);
    await yieldToUi();
    try {
      const data = await searchUgTabs(ugTitle, ugArtist);
      setUgHits(data.results);
      setSelectedUgUrl(null);
      if (!data.results.length) {
        setStepNotice(data.message ?? "Brak wyników Ultimate Guitar.");
        return;
      }
      setStepNotice(`Znaleziono ${data.results.length} zakładek — wybierz kartę.`);
    } catch (err) {
      setUgHits([]);
      setStepNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyNet(false);
    }
  }

  async function apply() {
    if (!bridgeOk) return;
    if (weakAlign && !confirmWeak) {
      setApplyError(
        "Słabe dopasowanie tekstu — zaznacz potwierdzenie albo popraw źródła.",
      );
      return;
    }
    setApplyError(null);
    setBusyApply(true);
    await yieldToUi();
    try {
      const audioPayload: SmartTempoAudioRef | undefined = smartTempoAudio
        ? {
            ...smartTempoAudio,
            audioStartOffsetMs: audioStartOffsetUserEdited
              ? audioStartOffsetMs
              : (bridgeOk.smartTempoAudio?.audioStartOffsetMs ??
                audioStartOffsetMs),
            peaks: smartTempoAudio.peaks,
          }
        : undefined;
      await onApply({
        bridge: bridgeOk,
        smartTempoAudio: audioPayload,
        ...(audioFile && !projectId ? { pendingAudioFile: audioFile } : {}),
        ...(serverProjectSnapshot ? { serverProjectSnapshot } : {}),
      });
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyApply(false);
    }
  }

  const meta = STEP_META[step];
  const canGoNextUs = Boolean(usPreview?.ok);
  const canGoNextUg = Boolean(ugPreview?.ok && usPreview?.ok);
  const canGoNextAudio = Boolean(bridgeOk);
  const canApply = Boolean(bridgeOk) && !(weakAlign && !confirmWeak);

  function go(next: Step) {
    setApplyError(null);
    setStepNotice(null);
    setStep(next);
  }

  return (
    <div className={styles.wizard}>
      <div className={styles.body}>
        <header className={styles.stepHead}>
          <h3 className={styles.stepTitle}>{meta.title}</h3>
          <p className={styles.stepSubtitle}>{meta.subtitle}</p>
        </header>

        {step === "us" ? (
          <div className={styles.stepPanel}>
            <div className={styles.studioSplit}>
              <div className={styles.studioColLeft}>
                <div className={styles.fieldStack}>
                  <Input
                    type="text"
                    value={usTitle}
                    aria-label="Tytuł USDB"
                    placeholder="Tytuł"
                    disabled={locked}
                    onChange={(e) => setUsTitle(e.target.value)}
                  />
                  <div className={styles.artistSearchRow}>
                    <Input
                      type="text"
                      value={usArtist}
                      aria-label="Artysta USDB"
                      placeholder="Artysta"
                      disabled={locked}
                      onChange={(e) => setUsArtist(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={locked || !usTitle.trim()}
                      loading={busyNet}
                      onClick={() => void searchUs()}
                    >
                      Szukaj w USDB
                    </Button>
                  </div>
                </div>
                {usHits.length > 0 ? (
                  <ul className={styles.resultList} aria-label="Wyniki USDB">
                    {usHits.map((hit, i) => {
                      const label =
                        [hit.title, hit.artist].filter(Boolean).join(" — ") ||
                        `Wersja ${i + 1}`;
                      const meta = [
                        hit.edition,
                        hit.language,
                        hit.rating != null ? `★ ${hit.rating}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const selected = Boolean(
                        hit.url && hit.url === selectedUsUrl,
                      );
                      return (
                        <li key={`${hit.url ?? i}-${i}`}>
                          <button
                            type="button"
                            className={[
                              styles.resultCard,
                              selected ? styles.resultCardSelected : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={locked || !hit.url}
                            onClick={() => void pickUsHit(hit)}
                          >
                            <span className={styles.resultTitle}>
                              UltraStar: {label}
                            </span>
                            {meta ? (
                              <span className={styles.resultMeta}>{meta}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.notice} role="status">
                    Wyszukaj w USDB albo wklej plik po prawej.
                  </p>
                )}
              </div>
              <div className={styles.studioColRight}>
                <p className={styles.previewLabel}>Podgląd UltraStar</p>
                <Textarea
                  className={styles.previewTextarea}
                  value={usText}
                  aria-label="Tekst UltraStar"
                  placeholder="Wklej UltraStar .txt…"
                  disabled={locked}
                  rows={12}
                  onChange={(e) => {
                    setUsText(e.target.value);
                    setGridBpmDraft(null);
                  }}
                />
                {usPreview?.ok ? (
                  <p className={styles.notice} role="status">
                    {usPreview.syllableCount} sylab ·{" "}
                    {usPreview.ultrastarMetronomeBpm.toFixed(1)} BPM
                    {usPreview.youtubeVideoId
                      ? ` · YouTube ${usPreview.youtubeVideoId}`
                      : ""}
                  </p>
                ) : stepNotice ? (
                  <p className={styles.notice} role="status">
                    {stepNotice}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {step === "ug" ? (
          <div className={styles.stepPanel}>
            <div className={styles.studioSplit}>
              <div className={styles.studioColLeft}>
                <div className={styles.fieldStack}>
                  <Input
                    type="text"
                    value={ugTitle}
                    aria-label="Tytuł UG"
                    placeholder="Tytuł"
                    disabled={locked}
                    onChange={(e) => setUgTitle(e.target.value)}
                  />
                  <div className={styles.artistSearchRow}>
                    <Input
                      type="text"
                      value={ugArtist}
                      aria-label="Artysta UG"
                      placeholder="Artysta"
                      disabled={locked}
                      onChange={(e) => setUgArtist(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={locked || !ugTitle.trim()}
                      loading={busyNet}
                      onClick={() => void searchUg()}
                    >
                      Szukaj w UG
                    </Button>
                  </div>
                </div>
                {ugHits.length > 0 ? (
                  <ul className={styles.resultList} aria-label="Wyniki UG">
                    {ugHits.map((hit, i) => {
                      const label =
                        [hit.title, hit.artist].filter(Boolean).join(" — ") ||
                        `Wersja ${i + 1}`;
                      const meta = [
                        hit.type,
                        hit.rating != null ? `★ ${hit.rating}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const selected = Boolean(
                        hit.url && hit.url === selectedUgUrl,
                      );
                      return (
                        <li key={`${hit.url ?? i}-${i}`}>
                          <button
                            type="button"
                            className={[
                              styles.resultCard,
                              selected ? styles.resultCardSelected : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={locked || !hit.url}
                            onClick={() => void pickUgHit(hit)}
                          >
                            <span className={styles.resultTitle}>
                              UG: {label}
                            </span>
                            {meta ? (
                              <span className={styles.resultMeta}>{meta}</span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className={styles.notice} role="status">
                    Wyszukaj w UG albo wklej tabulatury po prawej.
                  </p>
                )}
              </div>
              <div className={styles.studioColRight}>
                <p className={styles.previewLabel}>Podgląd Ultimate Guitar</p>
                <Textarea
                  className={styles.previewTextarea}
                  value={ugText}
                  aria-label="Tekst Ultimate Guitar"
                  placeholder="Wklej ChordPro / UG…"
                  disabled={locked}
                  rows={12}
                  onChange={(e) => {
                    setUgText(e.target.value);
                    setGridBpmDraft(null);
                  }}
                />
                {stepNotice ? (
                  <p className={styles.notice} role="status">
                    {stepNotice}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {step === "audio" ? (
          <div className={styles.stepPanel}>
            {hasAudio ? (
              <p className={styles.notice} role="status">
                Audio gotowe: {Math.round(smartTempoAudio!.durationMs / 1000)} s
                {localBuffer ? " · podgląd fali dostępny" : ""}
              </p>
            ) : null}
            <div className={styles.audioSplit}>
              <div className={styles.audioCard}>
                <h4 className={styles.audioCardTitle}>Plik z dysku</h4>
                <p className={styles.audioCardHint}>
                  MP3, WAV lub inny plik audio na Beat Mapper.
                </p>
                <AudioDropzone
                  compact
                  disabled={locked}
                  busy={busyNet && !ytJobBusy}
                  progressLabel={busyNet && !ytJobBusy ? stepNotice : null}
                  progressValue={
                    busyNet && !ytJobBusy ? ingestProgress : null
                  }
                  onSelectFile={(f) => void ingestLocalFile(f)}
                />
              </div>
              <div className={styles.audioCard}>
                <h4 className={styles.audioCardTitle}>YouTube</h4>
                <p className={styles.audioCardHint}>
                  Link lub ID z #VIDEO UltraStar — działa też przy nowym utworze.
                </p>
                <div className={styles.ytFieldRow}>
                  <Input
                    type="url"
                    value={youtubeUrlDraft}
                    aria-label="Link YouTube"
                    placeholder="https://www.youtube.com/watch?v=…"
                    disabled={locked}
                    onChange={(e) => setYoutubeUrlDraft(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={locked || !youtubeAvailable}
                    loading={ytJobBusy}
                    onClick={() => void fetchYoutubeAudio(resolvedYoutubeId)}
                  >
                    Pobierz z YouTube
                  </Button>
                  {ytJobBusy && stepNotice && ingestProgress != null ? (
                    <ImportProgress
                      label={stepNotice}
                      value={ingestProgress}
                    />
                  ) : stepNotice && hasAudio ? (
                    <p className={styles.notice} role="status">
                      {stepNotice}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === "beatmap" && bridgeOk ? (
          <div className={styles.stepPanel}>
            {stepNotice ? (
              <p className={styles.notice} role="status">
                {stepNotice}
              </p>
            ) : null}
            <BeatMapperPane
              bridge={bridgeOk}
              audio={
                smartTempoAudio
                  ? { ...smartTempoAudio, audioStartOffsetMs }
                  : null
              }
              localAudioBuffer={localBuffer}
              tempoNodes={displayTempoNodes}
              onTempoNodesChange={handleTempoNodesChange}
              audioStartOffsetMs={audioStartOffsetMs}
              onAudioStartOffsetChange={handleAudioStartOffsetChange}
              gridBpmDisplay={gridBpmDisplay}
              onGridBpmChange={setGridBpmDraft}
              songTitle={
                usTitle.trim() ||
                (usPreview?.ok === true ? usPreview.title?.trim() : "") ||
                ""
              }
              onSelectAudioFile={(file) => void ingestLocalFile(file)}
              onRegisterPlayToggle={(fn) => {
                beatPlayToggleRef.current = fn;
              }}
              disabled={locked}
            />
            {bridgeOk.warnings.length > 0 ? (
              <ul className={styles.warnList}>
                {bridgeOk.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {weakAlign ? (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={confirmWeak}
                  disabled={locked}
                  onChange={(e) => setConfirmWeak(e.target.checked)}
                />
                Potwierdzam import mimo słabego dopasowania tekstu
              </label>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          {step === "us" ? (
            <Button
              type="button"
              variant="ghost"
              disabled={locked}
              onClick={onCancel}
            >
              Anuluj
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={locked}
              onClick={() =>
                go(
                  step === "ug"
                    ? "us"
                    : step === "audio"
                      ? "ug"
                      : "audio",
                )
              }
            >
              Wstecz
            </Button>
          )}
        </div>
        <div className={styles.footerRight}>
          {step === "us" ? (
            <Button
              type="button"
              variant="primary"
              disabled={locked || !canGoNextUs}
              onClick={() => {
                const fromUsTitle =
                  usTitle.trim() ||
                  (usPreview?.ok === true
                    ? (usPreview.title?.trim() ?? "")
                    : "") ||
                  "";
                const fromUsArtist =
                  usArtist.trim() ||
                  (usPreview?.ok === true
                    ? (usPreview.artist?.trim() ?? "")
                    : "") ||
                  "";
                if (fromUsTitle)
                  setUgTitle((prev) => prev.trim() || fromUsTitle);
                if (fromUsArtist)
                  setUgArtist((prev) => prev.trim() || fromUsArtist);
                go("ug");
              }}
            >
              Dalej
            </Button>
          ) : null}
          {step === "ug" ? (
            <Button
              type="button"
              variant="primary"
              disabled={locked || !canGoNextUg}
              onClick={() => {
                setConfirmWeak(false);
                go("audio");
              }}
            >
              Dalej
            </Button>
          ) : null}
          {step === "audio" ? (
            <Button
              type="button"
              variant="primary"
              disabled={locked || !canGoNextAudio}
              onClick={() => go("beatmap")}
            >
              {hasAudio ? "Dalej" : "Dalej bez audio"}
            </Button>
          ) : null}
          {step === "beatmap" ? (
            <Button
              type="button"
              variant="primary"
              disabled={locked || !canApply}
              loading={busyApply || Boolean(applying)}
              onClick={() => void apply()}
            >
              {applyLabel}
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
