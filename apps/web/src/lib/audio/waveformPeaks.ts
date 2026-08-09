/**
 * Static peak / RMS envelope from an AudioBuffer (no live FFT).
 */

import { suggestBeat1MsFromPipeAndGap } from "@stagesync/shared";

export type WaveformMeta = {
  peaks: number[];
  rms: number;
  durationMs: number;
};

export function computeWaveformFromAudioBuffer(
  buffer: AudioBuffer,
  binCount = 128,
): WaveformMeta {
  const bins = Math.max(8, Math.min(512, Math.floor(binCount)));
  const length = buffer.length;
  if (length <= 0) {
    return { peaks: [], rms: 0, durationMs: 0 };
  }
  const channels = Math.max(1, buffer.numberOfChannels);
  const peaks = new Array<number>(bins).fill(0);
  let sumSq = 0;
  let samples = 0;

  // Stride long files so peak extraction stays responsive on the main thread.
  const stride = length > 500_000 ? Math.ceil(length / 500_000) : 1;

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += stride) {
      const v = data[i] ?? 0;
      const abs = Math.abs(v);
      const bin = Math.min(bins - 1, Math.floor((i / length) * bins));
      if (abs > (peaks[bin] ?? 0)) peaks[bin] = abs;
      sumSq += v * v;
      samples += 1;
    }
  }

  let maxPeak = 0;
  for (const p of peaks) if (p > maxPeak) maxPeak = p;
  const norm = maxPeak > 0 ? maxPeak : 1;
  const normalized = peaks.map((p) => Math.min(1, p / norm));
  const rms = samples > 0 ? Math.min(1, Math.sqrt(sumSq / samples) / norm) : 0;

  return {
    peaks: normalized,
    rms,
    durationMs: Math.max(1, Math.round(buffer.duration * 1000)),
  };
}

/** ~−36 dB linear amplitude — first-transient noise floor. */
export const FIRST_TRANSIENT_THRESHOLD = 0.015;

/**
 * Scan channel 0 from the start for the first sample above the noise floor.
 * Returns offset in ms (0 if none found).
 */
/** Only scan the start of long files — full-buffer scan blocked the import wizard. */
export const FIRST_TRANSIENT_MAX_SCAN_SEC = 60;

export function detectFirstTransientMs(
  buffer: AudioBuffer,
  threshold = FIRST_TRANSIENT_THRESHOLD,
  maxScanSec = FIRST_TRANSIENT_MAX_SCAN_SEC,
): number {
  if (buffer.length <= 0 || buffer.sampleRate <= 0) return 0;
  const data = buffer.getChannelData(0);
  const thr = Math.max(0, threshold);
  const maxSamples = Math.min(
    data.length,
    Math.max(1, Math.ceil(maxScanSec * buffer.sampleRate)),
  );
  const stride = maxSamples > 500_000 ? Math.ceil(maxSamples / 500_000) : 1;
  for (let i = 0; i < maxSamples; i += stride) {
    if (Math.abs(data[i] ?? 0) > thr) {
      return Math.max(0, Math.round((i / buffer.sampleRate) * 1000));
    }
  }
  return 0;
}

/**
 * Default Audio Start Offset when loading audio into the US+UG wizard.
 * With a long pipe Intro + `#GAP`, prefer editorial Beat 1 so the vocal
 * pickup lands in the last Intro bar (PO layout). Otherwise: first transient
 * when music starts well before `#GAP`, or `#GAP` when quiet until the vocal.
 */
export function resolveInitialAudioStartOffsetMs(
  buffer: AudioBuffer,
  gapMs?: number | null,
  opts?: {
    pipeBarCount?: number | null;
    layoutBpm?: number | null;
  },
): number {
  const transient = detectFirstTransientMs(buffer);
  const gap =
    gapMs != null && Number.isFinite(gapMs) && gapMs > 0
      ? Math.round(gapMs)
      : 0;
  const pipeBars =
    opts?.pipeBarCount != null && Number.isFinite(opts.pipeBarCount)
      ? Math.trunc(opts.pipeBarCount)
      : 0;
  const layoutBpm =
    opts?.layoutBpm != null &&
    Number.isFinite(opts.layoutBpm) &&
    opts.layoutBpm > 0
      ? opts.layoutBpm
      : 120;

  if (gap > 0 && pipeBars >= 12) {
    return suggestBeat1MsFromPipeAndGap({
      gapMs: gap,
      pipeBarCount: pipeBars,
      layoutBpm,
      transientMs: transient,
    });
  }

  if (gap > 0) {
    if (transient <= 0 || transient >= gap * 0.85) {
      return gap;
    }
    return transient;
  }
  return transient;
}

export function peaksToPolylinePoints(
  peaks: number[],
  width: number,
  height: number,
): string {
  if (!peaks.length || width <= 0 || height <= 0) return "";
  const mid = height / 2;
  const parts: string[] = [];
  for (let i = 0; i < peaks.length; i++) {
    const x = (i / Math.max(1, peaks.length - 1)) * width;
    const amp = Math.max(0, Math.min(1, peaks[i] ?? 0));
    parts.push(`${x.toFixed(1)},${(mid - amp * mid).toFixed(1)}`);
  }
  for (let i = peaks.length - 1; i >= 0; i--) {
    const x = (i / Math.max(1, peaks.length - 1)) * width;
    const amp = Math.max(0, Math.min(1, peaks[i] ?? 0));
    parts.push(`${x.toFixed(1)},${(mid + amp * mid).toFixed(1)}`);
  }
  return parts.join(" ");
}

export type WaveformBar = {
  x: number;
  y1: number;
  y2: number;
};

/**
 * Thin vertical peak bars for Beat Mapper (not a filled polygon).
 * amplitude = peak * height * 0.8, centered on mid-line.
 */
export function peaksToWaveformBars(
  peaks: number[],
  width: number,
  height: number,
  ampScale = 0.8,
): WaveformBar[] {
  if (!peaks.length || width <= 0 || height <= 0) return [];
  let maxPeak = 0;
  for (const p of peaks) {
    const a = Math.abs(p);
    if (a > maxPeak) maxPeak = a;
  }
  const norm = maxPeak > 0 ? maxPeak : 1;
  const mid = height / 2;
  const scale = Math.max(0.05, Math.min(1, ampScale));
  const n = peaks.length;
  const bars: WaveformBar[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const amp = Math.max(0, Math.min(1, Math.abs(peaks[i] ?? 0) / norm));
    const half = amp * mid * scale;
    // Keep a tiny visible stub for near-silence so the timeline isn't empty.
    const h = Math.max(1.5, half);
    bars.push({ x, y1: mid - h, y2: mid + h });
  }
  return bars;
}

export type EnvelopeBin = { min: number; max: number };

/**
 * DAW-style min/max peak binning for a visible time window.
 * One bin per pixel column — avoids zebra aliasing from raw samples.
 */
export function computeEnvelopeBins(
  buffer: AudioBuffer,
  binCount: number,
  startMs = 0,
  endMs?: number,
): EnvelopeBin[] {
  const bins = Math.max(1, Math.floor(binCount));
  const length = buffer.length;
  if (length <= 0 || bins <= 0) {
    return Array.from({ length: bins }, () => ({ min: 0, max: 0 }));
  }
  const sr = buffer.sampleRate > 0 ? buffer.sampleRate : 48_000;
  const durationMs = Math.max(1, buffer.duration * 1000);
  const winStart = Math.max(0, startMs);
  const winEnd = Math.min(durationMs, endMs ?? durationMs);
  const startSample = Math.max(
    0,
    Math.min(length - 1, Math.floor((winStart / 1000) * sr)),
  );
  const endSample = Math.max(
    startSample + 1,
    Math.min(length, Math.ceil((winEnd / 1000) * sr)),
  );
  const span = endSample - startSample;
  const channels = Math.max(1, buffer.numberOfChannels);
  const out: EnvelopeBin[] = Array.from({ length: bins }, () => ({
    min: 0,
    max: 0,
  }));

  for (let b = 0; b < bins; b++) {
    const s0 = startSample + Math.floor((b / bins) * span);
    const s1 = startSample + Math.floor(((b + 1) / bins) * span);
    let min = 0;
    let max = 0;
    let any = false;
    for (let ch = 0; ch < channels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = s0; i < Math.max(s0 + 1, s1); i++) {
        const v = data[i] ?? 0;
        if (!any) {
          min = v;
          max = v;
          any = true;
        } else {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    out[b] = { min, max };
  }

  let peak = 0;
  for (const bin of out) {
    peak = Math.max(peak, Math.abs(bin.min), Math.abs(bin.max));
  }
  const norm = peak > 1e-8 ? peak : 1;
  return out.map((bin) => ({
    min: bin.min / norm,
    max: bin.max / norm,
  }));
}

/** SVG/canvas-friendly closed envelope path (symmetric fill). */
export function envelopeBinsToPath(
  bins: readonly EnvelopeBin[],
  width: number,
  height: number,
  gain = 0.85,
): string {
  if (!bins.length || width <= 0 || height <= 0) return "";
  const mid = height / 2;
  const g = Math.max(0.05, Math.min(1, gain));
  const n = bins.length;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1)) * width;
    const max = Math.max(-1, Math.min(1, bins[i]?.max ?? 0));
    const min = Math.max(-1, Math.min(1, bins[i]?.min ?? 0));
    top.push(`${x.toFixed(2)},${(mid - max * mid * g).toFixed(2)}`);
    bottom.push(`${x.toFixed(2)},${(mid - min * mid * g).toFixed(2)}`);
  }
  return `M ${top.join(" L ")} L ${bottom.reverse().join(" L ")} Z`;
}
