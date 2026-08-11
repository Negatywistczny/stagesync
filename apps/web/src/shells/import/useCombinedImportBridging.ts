import {
  useCallback,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  TEXT_ANCHOR_WEAK_ALIGN,
  bridgeUsUgFromTexts,
  importUltrastarText,
  importUgText,
  suggestGridBpmFromUsUgTexts,
  parseUgBridgeSections,
  type SmartTempoAudioRef,
  type TempoNode,
  type TextAnchorBridgeOptions,
  type AudioAnalysisResult,
} from "@stagesync/shared";
import { resolveInitialAudioStartOffsetMs } from "@lib/audio/waveformPeaks.js";
import {
  parseGridBpmInput,
  refineBeat1OffsetMs,
} from "./combinedImportHelpers.js";
import type { ImportWizardStep } from "./combinedImportHelpers.js";

type BridgeInputs = {
  usText: string;
  ugText: string;
  importOptions?: TextAnchorBridgeOptions;
  step: ImportWizardStep;
  audioStartOffsetMs: number;
  audioStartOffsetUserEdited: boolean;
  smartTempoAudio: SmartTempoAudioRef | null;
  audioAnalysis: AudioAnalysisResult | null;
  draftTempoNodes: TempoNode[];
  draftTempoNodesUserEdited: boolean;
  deferredTempoNodes: TempoNode[];
  gridBpmDraft: string | null;
  localBuffer: AudioBuffer | null;
  applyError: string | null;
  setAudioStartOffsetMs: (ms: number) => void;
  setSmartTempoAudio: Dispatch<SetStateAction<SmartTempoAudioRef | null>>;
  setDraftTempoNodes: Dispatch<SetStateAction<TempoNode[]>>;
  setDraftTempoNodesUserEdited: Dispatch<SetStateAction<boolean>>;
  setGridBpmDraft: Dispatch<SetStateAction<string | null>>;
  setAudioStartOffsetUserEdited: Dispatch<SetStateAction<boolean>>;
};

export function useCombinedImportBridging({
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
}: BridgeInputs) {
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
      layoutBpm:
        smartTempoAudio?.estimatedBpm != null &&
        smartTempoAudio.estimatedBpm > 0
          ? smartTempoAudio.estimatedBpm
          : (suggestedGridBpm ?? fileMetroBpm ?? 120),
    }),
    [
      pipeIntroBarCount,
      smartTempoAudio?.estimatedBpm,
      suggestedGridBpm,
      fileMetroBpm,
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

  const audioRefForBridge = useMemo(
    () =>
      smartTempoAudio ? { ...smartTempoAudio, audioStartOffsetMs } : undefined,
    [smartTempoAudio, audioStartOffsetMs],
  );

  const bridged = useMemo(() => {
    if (!usText.trim() || !ugText.trim()) return null;
    const passGrid =
      gridBpmForBridge != null &&
      !(
        fileMetroBpm != null && Math.abs(gridBpmForBridge - fileMetroBpm) < 0.05
      );
    const res = bridgeUsUgFromTexts(usText, ugText, {
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
    if (res.ok) {
      console.log(
        `[IMPORT_PHASE_BRIDGED] step=${step} seedBpm=${res.seedBpm} tempoMap[0]=${res.tempoMap[0]?.bpm} offset=${audioStartOffsetMs}ms userEditedNodes=${draftTempoNodesUserEdited}`,
      );
    }
    return res;
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
    step,
    audioStartOffsetMs,
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

  const handleTempoNodesChange = useCallback(
    (nodes: TempoNode[]) => {
      setDraftTempoNodes(nodes);
      setDraftTempoNodesUserEdited(true);
    },
    [setDraftTempoNodes, setDraftTempoNodesUserEdited],
  );

  useEffect(() => {
    setDraftTempoNodes([]);
    setDraftTempoNodesUserEdited(false);
    setGridBpmDraft(null);
  }, [
    audioAnalysis,
    setDraftTempoNodes,
    setDraftTempoNodesUserEdited,
    setGridBpmDraft,
  ]);

  const error =
    applyError ??
    (usText.trim() && usPreview && !usPreview.ok ? usPreview.message : null) ??
    (ugText.trim() && ugPreview && !ugPreview.ok ? ugPreview.message : null) ??
    (bridged && !bridged.ok ? bridged.message : null);

  const bridgeOk = bridged?.ok === true ? bridged : null;
  const weakAlign =
    bridgeOk != null && bridgeOk.alignScore < TEXT_ANCHOR_WEAK_ALIGN;
  const hasAudio = smartTempoAudio != null && smartTempoAudio.durationMs > 0;

  useEffect(() => {
    if (audioStartOffsetUserEdited) return;
    if (bridgeOk?.smartTempoAudio?.audioStartOffsetMs == null) return;
    const aligned = bridgeOk.smartTempoAudio.audioStartOffsetMs;
    if (aligned === audioStartOffsetMs) return;
    setAudioStartOffsetMs(aligned);
    setSmartTempoAudio((prev) =>
      prev ? { ...prev, audioStartOffsetMs: aligned } : prev,
    );
  }, [
    bridgeOk,
    audioStartOffsetMs,
    audioStartOffsetUserEdited,
    setAudioStartOffsetMs,
    setSmartTempoAudio,
  ]);

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
    setAudioStartOffsetMs,
    setSmartTempoAudio,
  ]);

  const handleAudioStartOffsetChange = useCallback(
    (ms: number) => {
      setAudioStartOffsetUserEdited(true);
      setAudioStartOffsetMs(ms);
      setSmartTempoAudio((prev) =>
        prev ? { ...prev, audioStartOffsetMs: ms } : prev,
      );
    },
    [setAudioStartOffsetUserEdited, setAudioStartOffsetMs, setSmartTempoAudio],
  );

  return {
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
  };
}
