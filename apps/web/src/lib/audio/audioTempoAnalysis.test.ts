import { describe, expect, it, vi, afterEach } from "vitest";
import { medianBpmFromBeatMs } from "@stagesync/shared";
import {
  analyzeAudioTempo,
  analyzeAudioTempoAsync,
  buildBeatGrid,
  buildImportTempoAnalysisOptions,
  DEFAULT_ANALYSIS_TIMEOUT_MS,
  estimateBpmFromOnsetPeriodHistogram,
  estimateBpmFromOnsetStrength,
  foldHistogramBpmToMusicalOctave,
  pickBestAcfBpm,
  reconcileEstimatedBpm,
} from "./audioTempoAnalysis.js";

function makeClickTrack(
  bpm: number,
  barCount: number,
  sampleRate = 44_100,
): AudioBuffer {
  const beatsPerBar = 4;
  const beatSec = 60 / bpm;
  const durationSec = barCount * beatsPerBar * beatSec;
  const length = Math.ceil(durationSec * sampleRate);
  const data = new Float32Array(length);
  for (let bar = 0; bar < barCount; bar++) {
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const t = (bar * beatsPerBar + beat) * beatSec;
      const idx = Math.floor(t * sampleRate);
      for (let k = 0; k < 64 && idx + k < length; k++) {
        data[idx + k] = Math.max(data[idx + k] ?? 0, 1 - k / 64);
      }
    }
  }
  return {
    length,
    duration: length / sampleRate,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as AudioBuffer;
}

function makeLongSilentBuffer(
  durationSec: number,
  sampleRate = 44_100,
): AudioBuffer {
  const length = Math.ceil(durationSec * sampleRate);
  const data = new Float32Array(length);
  return {
    length,
    duration: length / sampleRate,
    sampleRate,
    numberOfChannels: 1,
    getChannelData: () => data,
  } as AudioBuffer;
}

describe("analyzeAudioTempo", () => {
  it("detects onsets and estimates BPM on synthetic click track (sync)", () => {
    const buffer = makeClickTrack(120, 4);
    const result = analyzeAudioTempo(buffer);
    expect(result.beatMs.length).toBeGreaterThan(2);
    expect(result.estimatedBpm).toBeGreaterThanOrEqual(60);
    expect(result.estimatedBpm).toBeLessThanOrEqual(200);
  });

  it("returns safe defaults for empty buffer", () => {
    const buffer = {
      length: 0,
      duration: 0,
      sampleRate: 44_100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(0),
    } as AudioBuffer;
    const result = analyzeAudioTempo(buffer);
    expect(result.onsetsMs).toEqual([]);
    expect(result.beatMs).toEqual([]);
    expect(result.estimatedBpm).toBe(120);
  });

  it("completes async analysis on click track", async () => {
    const buffer = makeClickTrack(120, 4);
    const { result, warning } = await analyzeAudioTempoAsync(buffer, {
      skipOnsets: false,
    });
    expect(warning).toBeUndefined();
    expect(result.beatMs.length).toBeGreaterThan(2);
    expect(result.estimatedBpm).toBeGreaterThanOrEqual(60);
  });

  it("analyzes long buffers without scanning every sample", async () => {
    const buffer = makeLongSilentBuffer(600);
    const { result } = await analyzeAudioTempoAsync(buffer, {
      maxAnalysisSec: 90,
      downsample: 8,
    });
    expect(result.estimatedBpm).toBe(120);
    expect(result.beatMs.length).toBeGreaterThan(0);
  });

  it("caps beat grid for multi-hour files (no full-track O(n²) scan)", async () => {
    const buffer = makeLongSilentBuffer(3 * 3600);
    const started = performance.now();
    const { result } = await analyzeAudioTempoAsync(buffer, {
      maxAnalysisSec: 30,
      downsample: 8,
      timeoutMs: 2_500,
      skipOnsets: true,
      fullTrackGrid: false,
    });
    const elapsedMs = performance.now() - started;
    expect(elapsedMs).toBeLessThan(2_000);
    expect(result.beatMs.length).toBeLessThanOrEqual(128);
    expect(result.beatMs.length).toBeGreaterThan(0);
  });

  it("buildImportTempoAnalysisOptions covers full song when duration known", () => {
    const opts = buildImportTempoAnalysisOptions({
      gapMs: 33_000,
      seedBpm: 120,
      durationMs: 297_000,
    });
    expect(opts.maxAnalysisSec).toBeGreaterThanOrEqual(290);
    expect(opts.maxAnalysisSec).toBeLessThanOrEqual(480);
    expect(opts.fullTrackGrid).toBe(true);
    expect(opts.skipOnsets).toBe(false);
  });

  it("buildImportTempoAnalysisOptions covers UltraStar GAP before first vocal", () => {
    const opts = buildImportTempoAnalysisOptions({
      gapMs: 33_000,
      seedBpm: 84.84,
    });
    expect(opts.maxAnalysisSec).toBeGreaterThanOrEqual(120);
    expect(opts.fullTrackGrid).toBe(true);
    expect(opts.skipOnsets).toBe(false);
    expect(opts.seedBpm).toBeCloseTo(84.84, 1);
  });

  it("reconcileEstimatedBpm prefers file metro when autocorrelation is weak", () => {
    expect(reconcileEstimatedBpm(120, 84.84, 0)).toBeCloseTo(84.84, 1);
    expect(reconcileEstimatedBpm(0, 84.84, 0)).toBeCloseTo(84.84, 1);
    expect(reconcileEstimatedBpm(85, 84.84, 12)).toBeCloseTo(85, 0);
  });

  it("reconcileEstimatedBpm folds half-time toward octave hint (not 2× peak)", () => {
    // 64×2=128 would feel fast vs Logic ~123 — use pipe-like hint as octave center.
    expect(reconcileEstimatedBpm(64, 120, 40)).toBeCloseTo(120, 0);
    expect(reconcileEstimatedBpm(64.03, 120, 40)).toBeCloseTo(120, 0);
    // Same-octave audio peak is kept (not overwritten by hint).
    expect(reconcileEstimatedBpm(123, 120, 40)).toBeCloseTo(123, 0);
  });

  it("reconcileEstimatedBpm keeps audio peak (octave fold only, no editorial overwrite)", () => {
    // Near seed → keep audio, do not replace with pipe/GAP formula
    expect(reconcileEstimatedBpm(117, 120, 40)).toBeCloseTo(117, 0);
    expect(reconcileEstimatedBpm(123, 120, 40)).toBeCloseTo(123, 0);
    expect(reconcileEstimatedBpm(112.69, 120, 40)).toBeCloseTo(112.69, 1);
    expect(reconcileEstimatedBpm(105, 120, 40)).toBeCloseTo(105, 0);
  });

  it("reconcileEstimatedBpm keeps confident audio peak over distant metro", () => {
    // UltraStar header/4 ≈ 85 must not collapse a clear ~122 musical tempo.
    expect(reconcileEstimatedBpm(123, 84.84, 40)).toBeCloseTo(123, 0);
    expect(reconcileEstimatedBpm(122, 120, 40)).toBeCloseTo(122, 0);
  });

  it("reconcileEstimatedBpm preserves fast tempos (>160 BPM) without halving", () => {
    expect(reconcileEstimatedBpm(175.5, undefined, 40)).toBeCloseTo(175.5, 1);
    expect(reconcileEstimatedBpm(180.0, undefined, 40)).toBeCloseTo(180.0, 1);
  });

  it("reconcileEstimatedBpm prefers competing peak nearer seed when ACF diverges >6%", () => {
    // Same octave, ACF far from seed, but a competing real peak nearer seed.
    expect(
      reconcileEstimatedBpm(128.45, 120, 40, [123.1, 96]),
    ).toBeCloseTo(123.1, 1);
    // Without a nearer competitor, keep the audio peak (no song-specific snap).
    expect(reconcileEstimatedBpm(128.45, 120, 40)).toBeCloseTo(128.45, 1);
  });

  it("reconcileEstimatedBpm rejects weak near-seed ghost (~112.5) vs ACF ~128", () => {
    // Regression: coarse-hop ACF ghost + half-time hist must not invent a
    // seed/ACF "compromise" periodHint (112.5 → Viterbi collapse toward ~91).
    const out = reconcileEstimatedBpm(128.45, 120, 40, [63.92, 112.5, 64.28, 81.46]);
    expect(out).toBeGreaterThan(120);
    expect(out).toBeLessThan(132);
    expect(Math.abs(out - 112.5)).toBeGreaterThan(5);
  });

  it("foldHistogramBpmToMusicalOctave lifts half-time hist toward ACF/seed", () => {
    expect(foldHistogramBpmToMusicalOctave(63.92, 128.45, 120)).toBeCloseTo(
      127.84,
      1,
    );
    expect(foldHistogramBpmToMusicalOctave(63.92, 0, 120)).toBeCloseTo(120, 0);
    expect(foldHistogramBpmToMusicalOctave(129.2, 128.45, 120)).toBeCloseTo(
      129.2,
      1,
    );
  });

  it("pickBestAcfBpm prefers seed-near peak when scores are comparable", () => {
    const chosen = pickBestAcfBpm(
      [
        { bpm: 128.4, score: 0.82 },
        { bpm: 123.0, score: 0.79 },
        { bpm: 64.2, score: 0.7, octaveMate: false },
      ],
      120,
    );
    expect(chosen).toBeGreaterThanOrEqual(120);
    expect(chosen).toBeLessThanOrEqual(125);
  });

  it("pickBestAcfBpm does not invent octave mate without a real secondary peak", () => {
    // Only a strong half-time peak — ×2 mate must not win without lag evidence
    // (mate candidates are filtered before pick; here we only pass the real peak).
    const chosen = pickBestAcfBpm(
      [{ bpm: 64.0, score: 0.9 }],
      120,
    );
    expect(chosen).toBeCloseTo(64, 0);
  });

  it("estimateBpmFromOnsetStrength recovers click-track tempo via autocorrelation", () => {
    const sampleRate = 44_100;
    const hop = 512;
    const bpm = 120;
    const periodHops = Math.round(((60 / bpm) * sampleRate) / hop);
    const flux = new Float32Array(periodHops * 32);
    for (let i = 0; i < flux.length; i += periodHops) {
      flux[i] = 1;
      if (i + 1 < flux.length) flux[i + 1] = 0.4;
    }
    const estimated = estimateBpmFromOnsetStrength(flux, sampleRate, hop, 120);
    expect(estimated).toBeGreaterThanOrEqual(110);
    expect(estimated).toBeLessThanOrEqual(130);
  });

  it("estimateBpmFromOnsetStrength does not octave-fold a strong peak to a distant seed", () => {
    const sampleRate = 44_100;
    const hop = 512;
    const bpm = 122;
    const periodHops = Math.round(((60 / bpm) * sampleRate) / hop);
    const flux = new Float32Array(periodHops * 40);
    for (let i = 0; i < flux.length; i += periodHops) {
      flux[i] = 1;
      if (i + 1 < flux.length) flux[i + 1] = 0.35;
    }
    // Distant US-style metro seed (~header/4) must not win over ~122 peak.
    const estimated = estimateBpmFromOnsetStrength(flux, sampleRate, hop, 84.84);
    expect(estimated).toBeGreaterThanOrEqual(110);
    expect(estimated).toBeLessThanOrEqual(135);
  });

  it("buildBeatGrid phase-locks to onsets and stays near period", () => {
    const onsets = [100, 600, 1100, 1600, 2100];
    const beats = buildBeatGrid(onsets, 120, 2500, 16, 100);
    expect(beats[0]).toBe(100);
    expect(beats.length).toBeGreaterThan(3);
    for (let i = 1; i < Math.min(beats.length, onsets.length); i++) {
      expect(Math.abs(beats[i]! - onsets[i]!)).toBeLessThan(80);
    }
    const periods = beats.slice(1).map((b, i) => b - beats[i]!);
    const median = [...periods].sort((a, b) => a - b)[
      Math.floor(periods.length / 2)
    ]!;
    expect(median).toBeGreaterThan(450);
    expect(median).toBeLessThan(550);
  });

  it("buildBeatGrid keeps seed period stable (no IBI drift to slower BPM)", () => {
    // Onsets with mild noise around 500 ms; grid must not crawl toward ~117 BPM.
    const onsets: number[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      onsets.push(Math.round(t + (i % 3 === 0 ? 8 : 0)));
      t += 500;
    }
    const beats = buildBeatGrid(onsets, 120, onsets[onsets.length - 1]! + 500, 64, 0);
    expect(beats.length).toBeGreaterThan(16);
    const early = (beats[4]! - beats[0]!) / 4;
    const late = (beats[20]! - beats[16]!) / 4;
    expect(early).toBeGreaterThan(480);
    expect(early).toBeLessThan(520);
    expect(late).toBeGreaterThan(480);
    expect(late).toBeLessThan(520);
    // No half-time collapse
    expect(Math.min(...beats.slice(1).map((b, i) => b - beats[i]!))).toBeGreaterThan(400);
  });

  it("buildBeatGrid with ~112 or ~128 hint does not median-collapse to ~91 on ~490ms onsets", () => {
    // Regular mid-tempo quarters (~122 BPM). Wrong/soft hints must not let
    // bar-level IBIs redefine the beat period (regression: 112.5 → median ~91).
    const period = 490;
    const onsets: number[] = [];
    let t = 40;
    for (let i = 0; i < 64; i++) {
      onsets.push(Math.round(t + (i % 4 === 0 ? 5 : 0)));
      t += period;
    }
    for (const hint of [112.5, 128.45]) {
      const beats = buildBeatGrid(
        onsets,
        hint,
        onsets[onsets.length - 1]! + period,
        128,
        onsets[0],
      );
      expect(beats.length).toBeGreaterThan(24);
      const median = medianBpmFromBeatMs(beats);
      expect(median).toBeGreaterThan(105);
      expect(median).toBeLessThan(135);
      expect(Math.abs(median - 91)).toBeGreaterThan(10);
    }
  });

  it("buildBeatGrid follows local onset period (no cumulative fast drift from high hint)", () => {
    // Arbitrary mid-tempo true period vs a ~6% too-fast hint. Tracker must
    // follow onsets, not lock early bars to the wrong hint period.
    const trueBpm = 110;
    const period = 60_000 / trueBpm;
    const wrongHint = trueBpm * 1.06;
    const onsets: number[] = [];
    let t = 0;
    for (let i = 0; i < 80; i++) {
      onsets.push(Math.round(t + (i % 5 === 0 ? 6 : 0)));
      t += period;
    }
    const beats = buildBeatGrid(
      onsets,
      wrongHint,
      onsets[onsets.length - 1]! + period,
      128,
      0,
    );
    expect(beats.length).toBeGreaterThan(32);
    const early = (beats[8]! - beats[0]!) / 8;
    const late = (beats[40]! - beats[32]!) / 8;
    const earlyBpm = 60_000 / early;
    const lateBpm = 60_000 / late;
    expect(earlyBpm).toBeGreaterThan(trueBpm * 0.96);
    expect(earlyBpm).toBeLessThan(trueBpm * 1.04);
    expect(lateBpm).toBeGreaterThan(trueBpm * 0.96);
    expect(lateBpm).toBeLessThan(trueBpm * 1.04);
    // Must not stay locked to the wrong hint
    expect(Math.abs(lateBpm - wrongHint)).toBeGreaterThan(trueBpm * 0.02);
    expect(Math.abs(late - period)).toBeLessThan(12);
  });

  it("estimateBpmFromOnsetPeriodHistogram prefers pairwise period over subdivision IBI", () => {
    // Quarters at period P plus mid-beat subdivisions → consecutive median is
    // ~P/2; pairwise histogram should still recover ~P.
    const period = 500; // 120 BPM — arbitrary mid-tempo fixture
    const onsets: number[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      onsets.push(Math.round(t));
      onsets.push(Math.round(t + period / 2));
      t += period;
    }
    onsets.sort((a, b) => a - b);
    const hist = estimateBpmFromOnsetPeriodHistogram(onsets);
    expect(hist).toBeGreaterThan(110);
    expect(hist).toBeLessThan(130);
  });

  it("buildBeatGrid ignores dense 8th-note cluster around bar 5 (no double-time jump)", () => {
    // Stable ~123 BPM quarters + subdivision onsets on beats 16–20 (bar 5 in 4/4).
    // Local-period tracker must not snap to half-IBI or sustain +several % faster tempo.
    const bpm = 123;
    const period = 60_000 / bpm;
    const onsets: number[] = [];
    let t = 0;
    for (let i = 0; i < 64; i++) {
      onsets.push(Math.round(t));
      if (i >= 16 && i <= 20) {
        onsets.push(Math.round(t + period / 2));
        onsets.push(Math.round(t + period / 3));
        onsets.push(Math.round(t + (2 * period) / 3));
      }
      t += period;
    }
    onsets.sort((a, b) => a - b);
    const beats = buildBeatGrid(
      onsets,
      126,
      onsets[onsets.length - 1]! + period,
      128,
      0,
    );
    expect(beats.length).toBeGreaterThan(40);
    const periods = beats.slice(1).map((b, i) => b - beats[i]!);
    const bpms = periods.map((p) => 60_000 / p);
    // No half-beat IBIs anywhere
    expect(Math.min(...periods)).toBeGreaterThan(period * 0.78);
    // Around bar 5 (beats 16–24) stay near 123 — not ~double and not +several % sustained
    const aroundBar5 = bpms.slice(16, 24);
    const meanBar5 =
      aroundBar5.reduce((a, b) => a + b, 0) / aroundBar5.length;
    expect(meanBar5).toBeGreaterThan(bpm * 0.97);
    expect(meanBar5).toBeLessThan(bpm * 1.03);
    expect(Math.max(...aroundBar5)).toBeLessThan(bpm * 1.08);
    // Early stretch also stable (no fill-driven acceleration into bar 5)
    const early = bpms.slice(0, 16);
    const meanEarly = early.reduce((a, b) => a + b, 0) / early.length;
    expect(Math.abs(meanBar5 - meanEarly)).toBeLessThan(bpm * 0.04);
  });

  it("fullTrackGrid spans entire buffer at seed BPM", async () => {
    const buffer = makeClickTrack(85, 8, 44_100);
    const durationMs = Math.round(buffer.duration * 1000);
    const { result } = await analyzeAudioTempoAsync(buffer, {
      maxAnalysisSec: 30,
      downsample: 4,
      skipOnsets: true,
      fullTrackGrid: true,
      seedBpm: 85,
      timeoutMs: 4_000,
    });
    expect(result.estimatedBpm).toBeCloseTo(85, 0);
    const lastBeat = result.beatMs[result.beatMs.length - 1] ?? 0;
    expect(lastBeat).toBeGreaterThan(durationMs * 0.85);
    expect(result.beatMs.length).toBeGreaterThan(20);
  });

  it("reports onProgress during async analysis", async () => {
    const buffer = makeClickTrack(120, 8);
    const samples: number[] = [];
    const { result } = await analyzeAudioTempoAsync(buffer, {
      maxAnalysisSec: 30,
      downsample: 4,
      skipOnsets: false,
      fullTrackGrid: true,
      seedBpm: 120,
      timeoutMs: 8_000,
      onProgress: (ratio) => {
        samples.push(ratio);
      },
    });
    expect(result.beatMs.length).toBeGreaterThan(2);
    expect(samples.length).toBeGreaterThan(1);
    expect(samples[0]).toBeLessThanOrEqual(0.05);
    expect(samples[samples.length - 1]).toBe(1);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]!);
    }
  });
});

describe("analyzeAudioTempoAsync timeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("falls back to defaults when analysis exceeds timeout", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const buffer = makeLongSilentBuffer(60);
    const pending = analyzeAudioTempoAsync(buffer, {
      timeoutMs: 5,
      maxAnalysisSec: 60,
      downsample: 8,
      skipOnsets: false,
    });
    await vi.advanceTimersByTimeAsync(10);
    const outcome = await pending;

    expect(outcome.result.estimatedBpm).toBe(120);
    expect(outcome.warning).toMatch(/domyślnego tempa/i);
  }, 15_000);

  it("resolves within timeout on very long synthetic buffer", async () => {
    const buffer = makeLongSilentBuffer(10 * 3600);
    const started = performance.now();
    const outcome = await analyzeAudioTempoAsync(buffer, {
      timeoutMs: 2_000,
      maxAnalysisSec: 30,
      downsample: 8,
      skipOnsets: true,
      fullTrackGrid: false,
    });
    const elapsedMs = performance.now() - started;
    expect(elapsedMs).toBeLessThan(2_500);
    expect(outcome.result.estimatedBpm).toBe(120);
    expect(outcome.result.beatMs.length).toBeLessThanOrEqual(128);
  });

  it("uses a short default timeout constant", () => {
    expect(DEFAULT_ANALYSIS_TIMEOUT_MS).toBeLessThanOrEqual(4_000);
    expect(DEFAULT_ANALYSIS_TIMEOUT_MS).toBeGreaterThanOrEqual(1_000);
  });
});
