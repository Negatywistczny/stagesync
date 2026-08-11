import {
  ACF_MAX_HOP_SIZE,
  ACF_MIN_LAGS_PER_BEAT,
  BASE_HOP_SIZE,
} from "./constants.js";

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Audio tempo analysis aborted", "AbortError");
  }
}

export function effectiveHopSize(monoLength: number): number {
  const hops = Math.ceil(monoLength / BASE_HOP_SIZE);
  if (hops <= 8_000) return BASE_HOP_SIZE;
  if (hops <= 16_000) return BASE_HOP_SIZE * 2;
  return BASE_HOP_SIZE * 4;
}

export function acfHopSize(onsetHop: number, sampleRate: number): number {
  const maxForResolution = Math.max(
    64,
    Math.floor(sampleRate / ACF_MIN_LAGS_PER_BEAT),
  );
  return Math.min(onsetHop, maxForResolution, ACF_MAX_HOP_SIZE);
}

export function mixToMonoCapped(
  buffer: AudioBuffer,
  maxSec: number,
  downsample: number,
): { mono: Float32Array; effectiveSampleRate: number } {
  const sampleRate = buffer.sampleRate;
  const maxSamples = Math.min(buffer.length, Math.ceil(maxSec * sampleRate));
  const step = Math.max(1, Math.floor(downsample));
  const outLen = Math.ceil(maxSamples / step);
  const mono = new Float32Array(outLen);
  const chs = buffer.numberOfChannels;
  for (let o = 0, i = 0; o < outLen && i < maxSamples; o++, i += step) {
    let sum = 0;
    for (let ch = 0; ch < chs; ch++) {
      sum += buffer.getChannelData(ch)[i] ?? 0;
    }
    mono[o] = sum / chs;
  }
  return { mono, effectiveSampleRate: sampleRate / step };
}

export function trimOnsets(onsetsMs: number[], maxCount: number): number[] {
  if (onsetsMs.length <= maxCount) return onsetsMs;
  const stride = Math.ceil(onsetsMs.length / maxCount);
  const trimmed: number[] = [];
  for (
    let i = 0;
    i < onsetsMs.length && trimmed.length < maxCount;
    i += stride
  ) {
    trimmed.push(onsetsMs[i]!);
  }
  return trimmed;
}

export function medianOfPositive(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

export function gridDurationMsForAnalysis(
  bufferDurationMs: number,
  maxAnalysisSec: number,
): number {
  return Math.min(
    bufferDurationMs,
    Math.max(1, Math.round(maxAnalysisSec * 1000)),
  );
}

export function makeProgressReporter(
  onProgress?: (ratio: number) => void,
): (ratio: number) => void {
  if (!onProgress) return () => {};
  let lastPct = -1;
  return (ratio: number) => {
    const clamped = Math.max(0, Math.min(1, ratio));
    const pct = Math.floor(clamped * 100);
    if (pct <= lastPct && clamped < 1) return;
    lastPct = pct;
    onProgress(clamped);
  };
}

export function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const live = signals.filter(Boolean);
  if (live.length === 0) return new AbortController().signal;
  if (live.length === 1) return live[0]!;
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(live);
  }
  const controller = new AbortController();
  for (const sig of live) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener("abort", () => controller.abort(sig.reason), {
      once: true,
    });
  }
  return controller.signal;
}

/** Yield one frame so React can paint progress labels. */
export function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
