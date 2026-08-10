import type { AudioAnalysisResult } from "@stagesync/shared";
import {
  noteMemoryCheckpoint,
  registerMemoryContributor,
} from "@lib/client/memoryPressure.js";
import { analyzeFromMono, analyzeFromMonoAsync } from "./analyze-mono.js";
import { buildBeatGrid } from "./build-beat-grid.js";
import {
  DEFAULT_ANALYSIS_TIMEOUT_MS,
  DEFAULT_DOWNSAMPLE,
  DEFAULT_MAX_ANALYSIS_SEC,
  DSP_DIAG,
  MAX_BEATS_FULL_TRACK,
  MAX_BEATS_WINDOW,
  TIMEOUT_WARNING,
} from "./constants.js";
import {
  gridDurationMsForAnalysis,
  mergeAbortSignals,
  mixToMonoCapped,
  throwIfAborted,
} from "./helpers.js";
import { computeFullSampleRateOnsets } from "./onset-envelope.js";
import {
  DEFAULT_RESULT,
  UI_TEMPO_ANALYSIS_OPTIONS,
  type AnalyzeAudioTempoOptions,
  type AnalyzeAudioTempoOutcome,
} from "./types.js";

/**
 * Analyze decoded audio → onset times, beat grid, and global BPM estimate.
 * Prefer {@link analyzeAudioTempoAsync} for UI paths (long files).
 */
export function analyzeAudioTempo(buffer: AudioBuffer): AudioAnalysisResult {
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  if (buffer.length <= 0 || buffer.sampleRate <= 0) {
    return { ...DEFAULT_RESULT };
  }
  const { mono, effectiveSampleRate } = mixToMonoCapped(
    buffer,
    DEFAULT_MAX_ANALYSIS_SEC,
    DEFAULT_DOWNSAMPLE,
  );
  return analyzeFromMono(
    mono,
    effectiveSampleRate,
    durationMs,
    DEFAULT_MAX_ANALYSIS_SEC,
    true,
    undefined,
    false,
  );
}

async function runAnalyzeAudioTempoAsync(
  buffer: AudioBuffer,
  options: AnalyzeAudioTempoOptions,
): Promise<AnalyzeAudioTempoOutcome> {
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  if (buffer.length <= 0 || buffer.sampleRate <= 0) {
    return { result: { ...DEFAULT_RESULT } };
  }
  const maxSec = options.maxAnalysisSec ?? DEFAULT_MAX_ANALYSIS_SEC;
  const downsample = options.downsample ?? DEFAULT_DOWNSAMPLE;
  const skipOnsets = options.skipOnsets ?? false;
  const seedBpm = options.seedBpm;
  const fullTrackGrid = options.fullTrackGrid ?? false;
  const signal = options.signal;
  throwIfAborted(signal);

  // 1. Full Sample-Rate 44.1 kHz High-Frequency (>1.5 kHz) ODF for sub-millisecond onset precision
  const fullRateOnsets = computeFullSampleRateOnsets(buffer, maxSec);

  const { mono, effectiveSampleRate } = mixToMonoCapped(
    buffer,
    maxSec,
    downsample,
  );
  const unregisterMono = registerMemoryContributor({
    id: "tempo-analysis-mono",
    label: "Analiza tempa (mono scratch)",
    approxBytes: () => mono.byteLength,
    detail: () =>
      `${mono.length} próbek @ ${Math.round(effectiveSampleRate)} Hz · okno ${maxSec}s · fullGrid=${fullTrackGrid}`,
  });
  noteMemoryCheckpoint("tempo-analysis-mono-ready", {
    durationMs,
    maxSec,
    fullTrackGrid,
    monoBytes: mono.byteLength,
    pcmBytes: buffer.length * Math.max(1, buffer.numberOfChannels) * 4,
  });
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    throwIfAborted(signal);
    const result = await analyzeFromMonoAsync(
      mono,
      effectiveSampleRate,
      durationMs,
      maxSec,
      skipOnsets,
      seedBpm,
      fullTrackGrid,
      signal,
      options.onProgress,
      fullRateOnsets,
      options.enableTrace,
    );
    return { result };
  } finally {
    unregisterMono();
  }
}

function fallbackBeatGrid(
  durationMs: number,
  maxAnalysisSec: number,
  bpm = 120,
  fullTrackGrid = false,
): AudioAnalysisResult {
  const gridDurationMs = fullTrackGrid
    ? durationMs
    : gridDurationMsForAnalysis(durationMs, maxAnalysisSec);
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const beatMs = buildBeatGrid([], bpm, gridDurationMs, maxBeats);
  return { onsetsMs: [], beatMs, estimatedBpm: bpm };
}

/**
 * Non-blocking tempo analysis with timeout and safe fallback (120 BPM).
 */
export async function analyzeAudioTempoAsync(
  buffer: AudioBuffer,
  options: AnalyzeAudioTempoOptions = UI_TEMPO_ANALYSIS_OPTIONS,
): Promise<AnalyzeAudioTempoOutcome> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_ANALYSIS_TIMEOUT_MS;
  const maxSec = options.maxAnalysisSec ?? DEFAULT_MAX_ANALYSIS_SEC;
  const fullTrackGrid = options.fullTrackGrid ?? false;
  const durationMs = Math.max(1, Math.round(buffer.duration * 1000));
  noteMemoryCheckpoint("tempo-analysis-start", {
    durationMs,
    maxSec,
    fullTrackGrid,
    channels: buffer.numberOfChannels,
    pcmBytes: buffer.length * Math.max(1, buffer.numberOfChannels) * 4,
    timeoutMs,
  });
  const controller = new AbortController();
  const signal = options.signal
    ? mergeAbortSignals([options.signal, controller.signal])
    : controller.signal;

  const fallbackBpm =
    options.seedBpm != null && options.seedBpm > 0 ? options.seedBpm : 120;
  const fallback: AnalyzeAudioTempoOutcome = {
    result: fallbackBeatGrid(durationMs, maxSec, fallbackBpm, fullTrackGrid),
    warning: TIMEOUT_WARNING,
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<AnalyzeAudioTempoOutcome>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(fallback);
    }, timeoutMs);
  });

  const workPromise = runAnalyzeAudioTempoAsync(buffer, {
    ...options,
    signal,
  })
    .then((outcome) => (signal.aborted ? null : outcome))
    .catch((err: unknown) => {
      if (
        signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return null;
      }
      throw err;
    });

  const winner = await Promise.race([workPromise, timeoutPromise]);
  if (timer != null) clearTimeout(timer);

  if (DSP_DIAG && winner?.result) {
    console.debug(
      "[tempo-analysis]",
      `${Math.round(durationMs / 1000)}s audio → ~${winner.result.estimatedBpm} BPM, ${winner.result.beatMs.length} beats`,
      winner.warning ?? "",
    );
  }

  return winner ?? fallback;
}
