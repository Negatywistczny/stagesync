/**
 * Static peak / RMS envelope from an AudioBuffer (no live FFT).
 */

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
  const channels = Math.max(1, buffer.numberOfChannels);
  const length = buffer.length;
  const peaks = new Array<number>(bins).fill(0);
  let sumSq = 0;
  let samples = 0;

  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
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
