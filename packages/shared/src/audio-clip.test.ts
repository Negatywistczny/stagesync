import { describe, expect, it } from "vitest";
import {
  audioClipAbutGapTicks,
  audioClipBufferOffsetSec,
  audioClipPlayableMs,
  audioFadeGainAtMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  clampAudioFades,
  gainDbToLinear,
  lengthTicksFromAssetWindow,
  maxAudioLengthTicks,
  resizeAudioClipEnd,
  resizeAudioClipStart,
} from "./audio-clip.js";
import { DEFAULT_PPQ, elapsedToTicks, ticksToMs } from "./time.js";

const TS_4_4 = { numerator: 4, denominator: 4 };
const CTX = { bpm: 120, meter: TS_4_4, ppq: DEFAULT_PPQ };

describe("gainDbToLinear", () => {
  it("maps 0 dB to 1 and halves at -6 dB approx", () => {
    expect(gainDbToLinear(0)).toBe(1);
    expect(gainDbToLinear(undefined)).toBe(1);
    expect(gainDbToLinear(-6)).toBeCloseTo(0.501, 2);
  });
});

describe("audioFadeGainAtMs", () => {
  it("ramps in and out linearly", () => {
    expect(audioFadeGainAtMs(0, 1000, 100, 200)).toBe(0);
    expect(audioFadeGainAtMs(50, 1000, 100, 200)).toBeCloseTo(0.5, 5);
    expect(audioFadeGainAtMs(500, 1000, 100, 200)).toBe(1);
    expect(audioFadeGainAtMs(900, 1000, 100, 200)).toBeCloseTo(0.5, 5);
    expect(audioFadeGainAtMs(1000, 1000, 100, 200)).toBe(0);
  });

  it("clampAudioFades scales when fades exceed playable", () => {
    const c = clampAudioFades({ fadeInMs: 800, fadeOutMs: 800 }, 1000);
    expect(c.fadeInMs + c.fadeOutMs).toBeCloseTo(1000, 5);
  });
});

describe("applyAbutCrossfade", () => {
  it("pairs fadeOut/fadeIn when clips abut", () => {
    const left = {
      id: "a",
      trackId: "t",
      assetId: "x",
      startTicks: 0,
      lengthTicks: 1920,
    };
    const right = {
      id: "b",
      trackId: "t",
      assetId: "y",
      startTicks: 1920,
      lengthTicks: 1920,
    };
    expect(audioClipAbutGapTicks(left, right)).toBe(0);
    const pair = applyAbutCrossfade(left, right, 80, 1000, 1000);
    expect(pair?.left.fadeOutMs).toBe(80);
    expect(pair?.right.fadeInMs).toBe(80);
  });

  it("returns null when gap is not zero", () => {
    const left = {
      id: "a",
      trackId: "t",
      assetId: "x",
      startTicks: 0,
      lengthTicks: 1920,
    };
    const right = {
      id: "b",
      trackId: "t",
      assetId: "y",
      startTicks: 2000,
      lengthTicks: 1920,
    };
    expect(applyAbutCrossfade(left, right, 80, 1000, 1000)).toBeNull();
  });
});

describe("audioClipPlayableMs / ticks mapping", () => {
  it("uses asset duration minus trims", () => {
    const clip = {
      lengthTicks: 9999,
      trimInMs: 500,
      trimOutMs: 500,
    };
    expect(audioClipPlayableMs(clip, { durationMs: 5000 }, CTX)).toBe(4000);
  });

  it("falls back to ticksToMs when duration unknown", () => {
    const lengthTicks = DEFAULT_PPQ;
    expect(audioClipPlayableMs({ lengthTicks }, null, CTX)).toBe(500);
    expect(ticksToMs(lengthTicks, 120, TS_4_4)).toBe(500);
  });

  it("lengthTicksFromAssetWindow is inverse of playable window", () => {
    const clip = { trimInMs: 0, trimOutMs: 0 };
    const ticks = lengthTicksFromAssetWindow(clip, { durationMs: 2000 }, CTX);
    expect(ticks).toBe(elapsedToTicks(2000, 120, TS_4_4));
  });
});

describe("clamp / resize — no stretch beyond file", () => {
  const base = {
    id: "c1",
    trackId: "t1",
    assetId: "a1",
    startTicks: 0,
    lengthTicks: elapsedToTicks(4000, 120, TS_4_4),
    trimInMs: 0,
    trimOutMs: 0,
  };
  const asset = { durationMs: 4000 };

  it("clamps lengthTicks to max playable", () => {
    const stretched = {
      ...base,
      lengthTicks: elapsedToTicks(9000, 120, TS_4_4),
    };
    const next = clampAudioClipToAsset(stretched, asset, CTX);
    expect(next.lengthTicks).toBe(maxAudioLengthTicks(base, asset, CTX));
  });

  it("resize end increases trimOut", () => {
    const half = base.startTicks + Math.floor(base.lengthTicks / 2);
    const next = resizeAudioClipEnd(base, asset, half, CTX);
    expect(next.lengthTicks).toBeLessThan(base.lengthTicks);
    expect((next.trimOutMs ?? 0) > 0).toBe(true);
  });

  it("resize start increases trimIn and keeps end", () => {
    const mid = base.startTicks + Math.floor(base.lengthTicks / 2);
    const end = base.startTicks + base.lengthTicks;
    const next = resizeAudioClipStart(base, asset, mid, CTX);
    expect((next.trimInMs ?? 0) > 0).toBe(true);
    expect(next.startTicks + next.lengthTicks).toBe(end);
  });
});

describe("audioClipBufferOffsetSec", () => {
  it("returns null outside clip; offset includes trimIn", () => {
    const clip = {
      startTicks: DEFAULT_PPQ,
      lengthTicks: DEFAULT_PPQ,
      trimInMs: 250,
      trimOutMs: 0,
    };
    expect(audioClipBufferOffsetSec(clip, 0, CTX)).toBeNull();
    expect(audioClipBufferOffsetSec(clip, DEFAULT_PPQ, CTX)).toBeCloseTo(
      0.25,
      5,
    );
  });
});
