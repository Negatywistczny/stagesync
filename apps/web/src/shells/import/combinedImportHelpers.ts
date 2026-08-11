import {
  snapBeat1MsToOnset,
  type SmartTempoAudioRef,
  type TextAnchorBridgeOk,
  type TextAnchorBridgeOptions,
  type AudioAnalysisResult,
  type Project,
} from "@stagesync/shared";
import { estimateAudioBufferBytes } from "@lib/audio/audioPlayback.js";
import { noteMemoryCheckpoint } from "@lib/client/memoryPressure.js";
import {
  getMetronomeAudioContext,
  resumeMetronomeAudio,
} from "@lib/audio/metronome.js";

/** Editorial Beat 1, then snap to nearby onset so the attack sits on the barline. */
export function refineBeat1OffsetMs(
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

/** Continuous 0…100 bar across download → decode → prepare → analyze. */
export function pipelinePct(
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
  /** When false, skip the audio step (UG → Beat Mapper). Default true. */
  includeAudioStep?: boolean;
  onCancel: () => void;
  onApply: (payload: UsUgApplyPayload) => void | Promise<void>;
};

export type ImportWizardStep = "us" | "ug" | "audio" | "beatmap";

export function stepMeta(
  step: ImportWizardStep,
  steps: ImportWizardStep[],
): { title: string; subtitle: string } {
  const n = steps.indexOf(step) + 1;
  const total = steps.length;
  const prefix = `Krok ${n} z ${total}: `;
  switch (step) {
    case "us":
      return {
        title: `${prefix}Plik UltraStar (.txt)`,
        subtitle: "Wklej tekst UltraStar albo wyszukaj utwór w USDB.",
      };
    case "ug":
      return {
        title: `${prefix}Tabulatura Ultimate Guitar`,
        subtitle: "Wklej ChordPro / UG albo wyszukaj zakładkę online.",
      };
    case "audio":
      return {
        title: `${prefix}Ścieżka Audio`,
        subtitle: "Dodaj nagranie audio, aby zsynchronizować siatkę taktową.",
      };
    case "beatmap":
      return {
        title: `${prefix}Weryfikacja Siatki i Tempa`,
        subtitle: "Sprawdź Beat 1, tempo i sekcje przed importem.",
      };
  }
}

export function parseGridBpmInput(raw: string): number | undefined {
  const n = Number.parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
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

export type PipelineStageId = "download" | "analyze" | "build";

export type PipelineStage = {
  id: PipelineStageId;
  label: string;
  status: "pending" | "running" | "done" | "error";
  progress?: number | null;
};

export const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: "download", label: "Pobieranie audio z YouTube", status: "pending" },
  { id: "analyze", label: "Analiza Smart Tempo & Viterbi", status: "pending" },
  {
    id: "build",
    label: "Budowanie siatki taktowej i waveformu",
    status: "pending",
  },
];
