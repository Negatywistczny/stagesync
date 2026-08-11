import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useDeferredValue,
} from "react";
import {
  extractYoutubeVideoId,
  type SmartTempoAudioRef,
  type TempoNode,
  type AudioAnalysisResult,
  type Project,
  type UgSearchHit,
  type UltrastarSearchHit,
} from "@stagesync/shared";
import { fetchProject } from "@lib/shell-operator/libraryApi.js";
import { estimateAudioBufferBytes } from "@lib/audio/audioPlayback.js";
import {
  formatBytesMb,
  registerMemoryContributor,
} from "@lib/client/memoryPressure.js";
import { yieldToUi } from "@lib/audio/audioTempoAnalysis.js";
import {
  DEFAULT_PIPELINE_STAGES,
  stepMeta,
  type CombinedUsUgImportFormProps,
  type ImportWizardStep,
  type PipelineStage,
} from "./combinedImportHelpers.js";
import {
  ingestLocalFile as runIngestLocalFile,
  ingestProjectAsset as runIngestProjectAsset,
} from "./combinedImportFileIngest.js";
import { fetchYoutubeAudio as runFetchYoutubeAudio } from "./combinedImportYoutubeIngest.js";
import {
  pickUsHit as runPickUsHit,
  pickUgHit as runPickUgHit,
  searchUs as runSearchUs,
  searchUg as runSearchUg,
} from "./combinedImportSourceSearch.js";
import { useCombinedImportBridging } from "./useCombinedImportBridging.js";

export function useCombinedUsUgImport({
  disabled = false,
  applying = false,
  importOptions,
  projectId,
  initialTitle = "",
  initialArtist = "",
  includeAudioStep = true,
  onApply,
}: CombinedUsUgImportFormProps) {
  const seedTitle = initialTitle.trim();
  const seedArtist = initialArtist.trim();
  const wizardSteps = useMemo<ImportWizardStep[]>(
    () =>
      includeAudioStep
        ? ["us", "ug", "audio", "beatmap"]
        : ["us", "ug", "beatmap"],
    [includeAudioStep],
  );
  const [step, setStep] = useState<ImportWizardStep>("us");
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
  const [showUsdbAccount, setShowUsdbAccount] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);

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
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>(
    DEFAULT_PIPELINE_STAGES,
  );

  useEffect(() => {
    if (!projectId || serverProjectSnapshot) return;
    fetchProject(projectId)
      .then((p) => setServerProjectSnapshot(p))
      .catch(() => {});
  }, [projectId, serverProjectSnapshot]);

  const projectAudioAssets = useMemo(
    () =>
      serverProjectSnapshot?.assets?.filter((a) => a.kind === "audio") ?? [],
    [serverProjectSnapshot],
  );

  const [ytJobBusy, setYtJobBusy] = useState(false);
  const [, setIngestProgress] = useState<number | null>(null);
  const [usHits, setUsHits] = useState<UltrastarSearchHit[]>([]);
  const [ugHits, setUgHits] = useState<UgSearchHit[]>([]);
  const [ugHitScores, setUgHitScores] = useState<Record<string, number>>({});
  const [ugHitScoresBusy, setUgHitScoresBusy] = useState(false);
  const [selectedUsUrl, setSelectedUsUrl] = useState<string | null>(null);
  const [selectedUgUrl, setSelectedUgUrl] = useState<string | null>(null);
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("");
  const beatPlayToggleRef = useRef<(() => void) | null>(null);

  const sortedUgHits = useMemo(() => {
    if (!ugHits.length) return [];
    return ugHits.slice().sort((a, b) => {
      const scoreA = a.url ? (ugHitScores[a.url] ?? -1) : -1;
      const scoreB = b.url ? (ugHitScores[b.url] ?? -1) : -1;
      return scoreB - scoreA;
    });
  }, [ugHits, ugHitScores]);

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

  const locked =
    disabled || applying || busyNet || busyApply || ytJobBusy || accountBusy;

  const bridging = useCombinedImportBridging({
    usText,
    ugText,
    importOptions,
    step,
    audioStartOffsetMs,
    audioStartOffsetUserEdited,
    smartTempoAudio,
    audioAnalysis,
    draftTempoNodes,
    draftTempoNodesUserEdited,
    deferredTempoNodes,
    gridBpmDraft,
    localBuffer,
    applyError,
    setAudioStartOffsetMs,
    setSmartTempoAudio,
    setDraftTempoNodes,
    setDraftTempoNodesUserEdited,
    setGridBpmDraft,
    setAudioStartOffsetUserEdited,
  });

  const {
    usPreview,
    ugPreview,
    beat1ResolveOpts,
    gridBpmDisplay,
    bridged,
    displayTempoNodes,
    handleTempoNodesChange,
    error,
    bridgeOk,
    weakAlign,
    hasAudio,
    handleAudioStartOffsetChange,
  } = bridging;

  const usYoutubeId = usPreview?.ok === true ? usPreview.youtubeVideoId : null;
  const draftYoutubeId = extractYoutubeVideoId(youtubeUrlDraft.trim());
  const resolvedYoutubeId = draftYoutubeId ?? usYoutubeId;
  const youtubeAvailable = Boolean(resolvedYoutubeId);

  useEffect(() => {
    if (!usYoutubeId) return;
    setYoutubeUrlDraft((prev) =>
      prev.trim() ? prev : `https://www.youtube.com/watch?v=${usYoutubeId}`,
    );
  }, [usYoutubeId]);

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

  const fileIngestCtx = useMemo(
    () => ({
      projectId,
      projectAudioAssets,
      usPreview,
      beat1ResolveOpts,
      setApplyError,
      setStepNotice,
      setBusyNet,
      setSelectedAssetId,
      setPipelineStages,
      setIngestProgress,
      setAudioStartOffsetUserEdited,
      setAudioStartOffsetMs,
      setAudioFile,
      setLocalBuffer,
      setAudioAnalysis,
      setGridBpmDraft,
      setSmartTempoAudio,
      setServerProjectSnapshot,
      setDraftTempoNodes,
      setYtJobBusy,
    }),
    [projectId, projectAudioAssets, usPreview, beat1ResolveOpts],
  );

  const ingestProjectAsset = useCallback(
    (assetId: string) => runIngestProjectAsset(fileIngestCtx, assetId),
    [fileIngestCtx],
  );

  const ingestLocalFile = useCallback(
    (file: File) => runIngestLocalFile(fileIngestCtx, file),
    [fileIngestCtx],
  );

  const youtubeIngestCtx = useMemo(
    () => ({
      ...fileIngestCtx,
      resolvedYoutubeId,
    }),
    [fileIngestCtx, resolvedYoutubeId],
  );

  const fetchYoutubeAudio = useCallback(
    (videoIdOverride?: string | null) =>
      runFetchYoutubeAudio(youtubeIngestCtx, videoIdOverride),
    [youtubeIngestCtx],
  );

  const searchCtx = useMemo(
    () => ({
      usTitle,
      usArtist,
      ugTitle,
      ugArtist,
      usText,
      setBusyNet,
      setStepNotice,
      setApplyError,
      setUsText,
      setSelectedUsUrl,
      setGridBpmDraft,
      setUsTitle,
      setUsArtist,
      setShowUsdbAccount,
      setUgText,
      setSelectedUgUrl,
      setUgTitle,
      setUgArtist,
      setUgHitScores,
      setUsHits,
      setUgHits,
      setUgHitScoresBusy,
    }),
    [usTitle, usArtist, ugTitle, ugArtist, usText],
  );

  const pickUsHit = useCallback(
    (hit: UltrastarSearchHit) => runPickUsHit(searchCtx, hit),
    [searchCtx],
  );

  const pickUgHit = useCallback(
    (hit: UgSearchHit) => runPickUgHit(searchCtx, hit),
    [searchCtx],
  );

  const searchUs = useCallback(() => runSearchUs(searchCtx), [searchCtx]);

  const searchUg = useCallback(() => runSearchUg(searchCtx), [searchCtx]);

  const apply = useCallback(async () => {
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
      console.log(
        `[APPLY_SUBMIT] seedBpm=${bridgeOk.seedBpm} tempoMap[0]=${bridgeOk.tempoMap[0]?.bpm} audioOffset=${audioPayload?.audioStartOffsetMs}ms estimatedBpm=${audioPayload?.estimatedBpm}`,
      );
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
  }, [
    bridgeOk,
    weakAlign,
    confirmWeak,
    smartTempoAudio,
    audioStartOffsetUserEdited,
    audioStartOffsetMs,
    audioFile,
    projectId,
    serverProjectSnapshot,
    onApply,
  ]);

  const meta = stepMeta(step, wizardSteps);
  const canGoNextUs = Boolean(usPreview?.ok);
  const canGoNextUg = Boolean(ugPreview?.ok && usPreview?.ok);
  const canGoNextAudio = Boolean(bridgeOk);
  const canApply = Boolean(bridgeOk) && !(weakAlign && !confirmWeak);

  const go = useCallback((next: ImportWizardStep) => {
    setApplyError(null);
    setStepNotice(null);
    setStep(next);
  }, []);

  const stepAfterUg = useCallback((): ImportWizardStep => {
    return includeAudioStep ? "audio" : "beatmap";
  }, [includeAudioStep]);

  const stepBeforeBeatmap = useCallback((): ImportWizardStep => {
    return includeAudioStep ? "audio" : "ug";
  }, [includeAudioStep]);

  const stepBeforeAudio = useCallback((): ImportWizardStep => {
    return "ug";
  }, []);

  return {
    step,
    meta,
    includeAudioStep,
    showUsdbAccount,
    setShowUsdbAccount,
    disabled,
    applying,
    setAccountBusy,
    usTitle,
    setUsTitle,
    usArtist,
    setUsArtist,
    locked,
    busyNet,
    searchUs,
    usHits,
    selectedUsUrl,
    pickUsHit,
    usText,
    setUsText,
    setGridBpmDraft,
    usPreview,
    stepNotice,
    ugTitle,
    setUgTitle,
    ugArtist,
    setUgArtist,
    searchUg,
    sortedUgHits,
    selectedUgUrl,
    pickUgHit,
    ugHitScores,
    ugHitScoresBusy,
    ugText,
    setUgText,
    bridged,
    projectAudioAssets,
    selectedAssetId,
    smartTempoAudio,
    ytJobBusy,
    hasAudio,
    pipelineStages,
    youtubeUrlDraft,
    youtubeAvailable,
    resolvedYoutubeId,
    setYoutubeUrlDraft,
    ingestProjectAsset,
    ingestLocalFile,
    fetchYoutubeAudio,
    bridgeOk,
    audioStartOffsetMs,
    localBuffer,
    displayTempoNodes,
    handleTempoNodesChange,
    handleAudioStartOffsetChange,
    gridBpmDisplay,
    beatPlayToggleRef,
    weakAlign,
    confirmWeak,
    setConfirmWeak,
    error,
    go,
    stepAfterUg,
    stepBeforeBeatmap,
    stepBeforeAudio,
    canGoNextUs,
    canGoNextUg,
    canGoNextAudio,
    canApply,
    busyApply,
    apply,
  };
}
