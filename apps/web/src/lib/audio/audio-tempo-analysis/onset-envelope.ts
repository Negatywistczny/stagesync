import { FRAME_SIZE, MAX_ONSETS, ONSET_THRESHOLD } from "./constants.js";
import { trimOnsets } from "./helpers.js";

/**
 * Half-wave rectified energy flux (onset strength) per hop.
 * Pure — exported for unit tests.
 */
export function computeOnsetStrengthEnvelope(
  mono: Float32Array,
  hopSize: number,
  frameSize: number = FRAME_SIZE,
): Float32Array {
  const n =
    mono.length > frameSize
      ? Math.floor((mono.length - frameSize) / hopSize) + 1
      : 0;
  const flux = new Float32Array(Math.max(0, n));
  let prevEnergy = 0;
  for (let fi = 0, i = 0; fi < n; fi++, i += hopSize) {
    let energy = 0;
    for (let j = 0; j < frameSize; j++) {
      const v = mono[i + j] ?? 0;
      energy += v * v;
    }
    energy = Math.sqrt(energy / frameSize);
    flux[fi] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy * 0.85 + prevEnergy * 0.15;
  }
  return flux;
}

function adaptiveOnsetThreshold(flux: Float32Array): number {
  if (flux.length === 0) return ONSET_THRESHOLD;
  const sorted = Array.from(flux).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? median;
  const adaptive = median + (p90 - median) * 0.35;
  return Math.max(ONSET_THRESHOLD * 0.5, Math.min(0.12, adaptive));
}

export function pickOnsetsFromFlux(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  maxOnsets: number = MAX_ONSETS,
): number[] {
  if (flux.length === 0) return [];
  const thr = adaptiveOnsetThreshold(flux);
  const minGapHops = Math.max(2, Math.round((0.04 * sampleRate) / hopSize));
  const onsets: number[] = [];
  let lastHop = -minGapHops;
  for (let i = 1; i + 1 < flux.length; i++) {
    const cur = flux[i] ?? 0;
    const prev = flux[i - 1] ?? 0;
    const next = flux[i + 1] ?? 0;
    if (cur < thr || cur < prev || cur < next) continue;

    // Phase 2: Reject brief 1-hop isolated muted string scratches ("scratchy")
    const area = cur + (next ?? 0);
    if (cur < thr * 1.2 && area < thr * 1.4) continue;
    const alpha = prev;
    const beta = cur;
    const gamma = next;
    const denom = alpha - 2 * beta + gamma;
    let p = 0;
    if (Math.abs(denom) > 1e-6) {
      p = (0.5 * (alpha - gamma)) / denom;
      p = Math.max(-0.5, Math.min(0.5, p));
    }
    const trueHop = i + p;
    const trueMs =
      Math.round(
        ((trueHop * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000 * 10,
      ) / 10;

    if (i - lastHop < minGapHops) {
      if (cur > (flux[lastHop] ?? 0) && onsets.length > 0) {
        onsets[onsets.length - 1] = trueMs;
        lastHop = i;
      }
      continue;
    }
    if (onsets.length >= maxOnsets) break;
    onsets.push(trueMs);
    lastHop = i;
  }
  return trimOnsets(onsets, maxOnsets);
}

export function detectEnergySpikesMs(
  flux: Float32Array,
  sampleRate: number,
  hopSize: number,
  lowFluxArray?: Float32Array,
  wideFluxArray?: Float32Array,
): number[] {
  if (flux.length === 0) return [];
  const windowHops = Math.max(10, Math.round((3.0 * sampleRate) / hopSize));
  const spikes: number[] = [];
  let windowSum = 0;
  let windowCount = 0;

  for (let fi = 0; fi < flux.length; fi++) {
    const val = flux[fi] ?? 0;
    const lowVal = lowFluxArray ? (lowFluxArray[fi] ?? 0) : val;
    const wideVal = wideFluxArray ? (wideFluxArray[fi] ?? 0) : val;
    const tMs =
      Math.round(((fi * hopSize + FRAME_SIZE / 2) / sampleRate) * 1000 * 10) /
      10;
    const avg = windowCount > 10 ? windowSum / windowCount : 0.02;

    const isDualBandPeak = lowVal > 0.015 && wideVal > 0.015;

    if (val > 0.08 && val > 2.2 * avg && isDualBandPeak) {
      spikes.push(tMs);
    }

    windowSum += val;
    windowCount++;
    if (windowCount > windowHops) {
      windowSum -= flux[fi - windowHops] ?? 0;
      windowCount--;
    }
  }

  return spikes;
}

/**
 * Full Sample-Rate 44.1 kHz ODF combining sub-bass kick flux (< 250 Hz) and
 * high-frequency transient flux (> 1.5 kHz) prior to decimation for sub-millisecond precision.
 */
export function computeFullSampleRateOnsets(
  buffer: AudioBuffer,
  maxSec: number,
  maxOnsets = MAX_ONSETS,
): number[] {
  const sampleRate = buffer.sampleRate;
  if (!(sampleRate > 0) || buffer.length === 0) return [];
  const maxSamples = Math.min(buffer.length, Math.ceil(maxSec * sampleRate));
  const chs = buffer.numberOfChannels;
  const frameSize = 1024;
  const hopSize = 512;
  const nHops = Math.floor((maxSamples - frameSize) / hopSize) + 1;
  if (nHops <= 0) return [];

  // Low-pass filter for kick (< 250 Hz) and High-pass for snare/cymbals (> 1.5 kHz)
  const alphaLow =
    (2 * Math.PI * 250) / sampleRate / (1 + (2 * Math.PI * 250) / sampleRate);
  const fcHigh = 1500;
  const dt = 1 / sampleRate;
  const rc = 1 / (2 * Math.PI * fcHigh);
  const alphaHigh = rc / (rc + dt);

  const flux = new Float32Array(nHops);
  let prevLowE = 0;
  let prevHighE = 0;
  let lowState = 0;
  let hpState = 0;
  let prevSample = 0;

  for (let fi = 0, i = 0; fi < nHops; fi++, i += hopSize) {
    let lowE = 0;
    let highE = 0;
    for (let j = 0; j < frameSize; j++) {
      let sum = 0;
      for (let ch = 0; ch < chs; ch++) {
        sum += buffer.getChannelData(ch)[i + j] ?? 0;
      }
      const val = sum / chs;
      lowState += alphaLow * (val - lowState);
      lowE += lowState * lowState;

      hpState = alphaHigh * (hpState + val - prevSample);
      prevSample = val;
      highE += hpState * hpState;
    }
    lowE = Math.sqrt(lowE / frameSize);
    highE = Math.sqrt(highE / frameSize);

    const lowFlux = Math.max(0, lowE - prevLowE);
    const highFlux = Math.max(0, highE - prevHighE);

    flux[fi] = 3.0 * lowFlux + 1.0 * highFlux;

    prevLowE = lowE * 0.85 + prevLowE * 0.15;
    prevHighE = highE * 0.85 + prevHighE * 0.15;
  }

  return pickOnsetsFromFlux(flux, sampleRate, hopSize, maxOnsets);
}
