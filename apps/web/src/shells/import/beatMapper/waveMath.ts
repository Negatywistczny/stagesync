import {
  BEAT_MAPPER_ZOOM_MAX,
  BEAT_MAPPER_ZOOM_MIN,
} from "@lib/audio/beatMapperView.js";
import type { EnvelopeBin } from "@lib/audio/waveformPeaks.js";

export const WAVE_H = 160;
export const RULER_H = 20;
export const ENVELOPE_GAIN = 0.85;
export const ZOOM_MIN = BEAT_MAPPER_ZOOM_MIN;
export const ZOOM_MAX = BEAT_MAPPER_ZOOM_MAX;

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function formatAxisMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Nice tick step in ms for visible window duration. */
export function timeTickStepMs(durationMs: number): number {
  const sec = durationMs / 1000;
  if (sec <= 5) return 500;
  if (sec <= 15) return 1_000;
  if (sec <= 30) return 5_000;
  if (sec <= 90) return 15_000;
  if (sec <= 180) return 30_000;
  if (sec <= 600) return 60_000;
  return 120_000;
}

export function buildTimeTicks(startMs: number, endMs: number): number[] {
  if (!(endMs > startMs)) return [startMs];
  const span = endMs - startMs;
  const step = timeTickStepMs(span);
  const first = Math.ceil(startMs / step) * step;
  const ticks: number[] = [];
  if (first > startMs + step * 0.05) ticks.push(startMs);
  for (let t = first; t < endMs - step * 0.05; t += step) {
    ticks.push(t);
  }
  ticks.push(endMs);
  return ticks;
}

/** Fallback envelope from sparse normalized peaks when buffer missing. */
export function peaksWindowBins(
  peaks: readonly number[],
  binCount: number,
  startMs: number,
  endMs: number,
  durationMs: number,
): EnvelopeBin[] {
  const bins = Math.max(1, Math.floor(binCount));
  if (!peaks.length || durationMs <= 0) {
    return Array.from({ length: bins }, () => ({ min: 0, max: 0 }));
  }
  const out: EnvelopeBin[] = [];
  for (let b = 0; b < bins; b++) {
    const t0 = startMs + (b / bins) * (endMs - startMs);
    const t1 = startMs + ((b + 1) / bins) * (endMs - startMs);
    const i0 = Math.floor((t0 / durationMs) * peaks.length);
    const i1 = Math.max(i0 + 1, Math.ceil((t1 / durationMs) * peaks.length));
    let peak = 0;
    for (let i = i0; i < Math.min(peaks.length, i1); i++) {
      peak = Math.max(peak, Math.abs(peaks[i] ?? 0));
    }
    out.push({ min: -peak, max: peak });
  }
  return out;
}

export function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  bins: readonly EnvelopeBin[],
  width: number,
  height: number,
  fillStyle: string,
  zeroStyle: string,
) {
  const mid = height / 2;
  const g = ENVELOPE_GAIN;
  const n = bins.length;
  if (n <= 0 || width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? 0 : (i / (n - 1)) * width;
    const max = Math.max(-1, Math.min(1, bins[i]?.max ?? 0));
    const y = mid - max * mid * g;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = n - 1; i >= 0; i--) {
    const x = n === 1 ? 0 : (i / (n - 1)) * width;
    const min = Math.max(-1, Math.min(1, bins[i]?.min ?? 0));
    ctx.lineTo(x, mid - min * mid * g);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(width, mid);
  ctx.strokeStyle = zeroStyle;
  ctx.lineWidth = 1;
  ctx.stroke();
}
