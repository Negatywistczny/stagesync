import type { Dispatch, SetStateAction } from "react";
import type {
  AudioAnalysisResult,
  Project,
  SmartTempoAudioRef,
  TempoNode,
  UgSearchHit,
  UltrastarSearchHit,
} from "@stagesync/shared";
import type { PipelineStage } from "./combinedImportHelpers.js";

export type UsPreviewForIngest =
  | {
      ok: true;
      gapMs: number;
      youtubeVideoId?: string | null;
    }
  | { ok: false }
  | null;

export type Beat1ResolveOpts = {
  pipeBarCount: number;
  layoutBpm: number;
};

export type ImportIngestSetters = {
  setApplyError: Dispatch<SetStateAction<string | null>>;
  setStepNotice: Dispatch<SetStateAction<string | null>>;
  setBusyNet: Dispatch<SetStateAction<boolean>>;
  setSelectedAssetId: Dispatch<SetStateAction<string | null>>;
  setPipelineStages: Dispatch<SetStateAction<PipelineStage[]>>;
  setIngestProgress: Dispatch<SetStateAction<number | null>>;
  setAudioStartOffsetUserEdited: Dispatch<SetStateAction<boolean>>;
  setAudioStartOffsetMs: Dispatch<SetStateAction<number>>;
  setAudioFile: Dispatch<SetStateAction<File | null>>;
  setLocalBuffer: Dispatch<SetStateAction<AudioBuffer | null>>;
  setAudioAnalysis: Dispatch<SetStateAction<AudioAnalysisResult | null>>;
  setGridBpmDraft: Dispatch<SetStateAction<string | null>>;
  setSmartTempoAudio: Dispatch<SetStateAction<SmartTempoAudioRef | null>>;
  setServerProjectSnapshot: Dispatch<SetStateAction<Project | null>>;
  setDraftTempoNodes: Dispatch<SetStateAction<TempoNode[]>>;
  setYtJobBusy: Dispatch<SetStateAction<boolean>>;
};

export type ImportFileIngestContext = ImportIngestSetters & {
  projectId?: string;
  projectAudioAssets: Project["assets"];
  usPreview: UsPreviewForIngest;
  beat1ResolveOpts: Beat1ResolveOpts;
};

export type ImportYoutubeIngestContext = ImportIngestSetters & {
  projectId?: string;
  usPreview: UsPreviewForIngest;
  beat1ResolveOpts: Beat1ResolveOpts;
  resolvedYoutubeId: string | null;
};

export type ImportSourceSearchSetters = {
  setBusyNet: Dispatch<SetStateAction<boolean>>;
  setStepNotice: Dispatch<SetStateAction<string | null>>;
  setApplyError: Dispatch<SetStateAction<string | null>>;
  setUsText: Dispatch<SetStateAction<string>>;
  setSelectedUsUrl: Dispatch<SetStateAction<string | null>>;
  setGridBpmDraft: Dispatch<SetStateAction<string | null>>;
  setUsTitle: Dispatch<SetStateAction<string>>;
  setUsArtist: Dispatch<SetStateAction<string>>;
  setShowUsdbAccount: Dispatch<SetStateAction<boolean>>;
  setUgText: Dispatch<SetStateAction<string>>;
  setSelectedUgUrl: Dispatch<SetStateAction<string | null>>;
  setUgTitle: Dispatch<SetStateAction<string>>;
  setUgArtist: Dispatch<SetStateAction<string>>;
  setUgHitScores: Dispatch<SetStateAction<Record<string, number>>>;
  setUsHits: Dispatch<SetStateAction<UltrastarSearchHit[]>>;
  setUgHits: Dispatch<SetStateAction<UgSearchHit[]>>;
  setUgHitScoresBusy: Dispatch<SetStateAction<boolean>>;
};

export type ImportSourceSearchContext = ImportSourceSearchSetters & {
  usTitle: string;
  usArtist: string;
  ugTitle: string;
  ugArtist: string;
  usText: string;
};
