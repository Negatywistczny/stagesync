import { describe, expect, it } from "vitest";
import {
  audioClipAbutGapTicks,
  audioClipBufferOffsetSec,
  audioClipBufferOffsetSecAlongMaps,
  audioClipPlayableMs,
  audioClipRemainingSec,
  audioClipRemainingSecAlongMaps,
  audioFadeGainAtMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  clampAudioFades,
  fadeInMsOf,
  fadeOutMsOf,
  findAbutNeighbor,
  gainDbToLinear,
  lengthTicksFromAssetWindow,
  maxAudioLengthTicks,
  resizeAudioClipEnd,
  resizeAudioClipStart,
  trimInMsOf,
  trimOutMsOf,
} from "./audio-clip.js";
import { createProjectV5Seed } from "./project-seed.js";
import { DEFAULT_PPQ, elapsedToTicks, ticksToMs } from "./time.js";
import type { AudioClip } from "./schema.js";

const TS_4_4 = { numerator: 4, denominator: 4 };
const CTX = { bpm: 120, meter: TS_4_4, ppq: DEFAULT_PPQ };

describe("gainDbToLinear", () => {
  it("maps 0 dB to 1 and halves at -6 dB approx", () => {
    expect(gainDbToLinear(0)).toBe(1);
    expect(gainDbToLinear(undefined)).toBe(1);
    expect(gainDbToLinear(-6)).toBeCloseTo(0.501, 2);
  });

  it("clamps extreme dB so WebAudio never sees Infinity", () => {
    expect(gainDbToLinear(9999)).toBe(gainDbToLinear(24));
    expect(gainDbToLinear(-9999)).toBe(gainDbToLinear(-60));
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

describe("trim / fade accessors", () => {
  it("coerces missing and negative values to 0", () => {
    expect(trimInMsOf({})).toBe(0);
    expect(trimOutMsOf({ trimOutMs: -3 })).toBe(0);
    expect(fadeInMsOf({ fadeInMs: -1 })).toBe(0);
    expect(fadeOutMsOf({})).toBe(0);
  });
});

describe("audioFadeGainAtMs / clampAudioFades edges", () => {
  it("returns 0 for non-positive playable window", () => {
    expect(audioFadeGainAtMs(10, 0, 100, 100)).toBe(0);
    expect(audioFadeGainAtMs(10, -5, 100, 100)).toBe(0);
  });

  it("leaves fades alone when sum fits or playable is 0", () => {
    expect(clampAudioFades({ fadeInMs: 10, fadeOutMs: 10 }, 100)).toEqual({
      fadeInMs: 10,
      fadeOutMs: 10,
    });
    expect(clampAudioFades({ fadeInMs: 50, fadeOutMs: 50 }, 0)).toEqual({
      fadeInMs: 50,
      fadeOutMs: 50,
    });
  });
});

describe("applyAbutCrossfade edges", () => {
  const left: AudioClip = {
    id: "a",
    trackId: "t",
    assetId: "x",
    startTicks: 0,
    lengthTicks: 1920,
  };
  const right: AudioClip = {
    id: "b",
    trackId: "t",
    assetId: "y",
    startTicks: 1920,
    lengthTicks: 1920,
  };

  it("returns null for non-positive crossfadeMs", () => {
    expect(applyAbutCrossfade(left, right, 0, 1000, 1000)).toBeNull();
    expect(applyAbutCrossfade(left, right, -10, 1000, 1000)).toBeNull();
  });

  it("keeps crossfade when playableMs is 0 (clamp does not scale)", () => {
    // max=0 skips the scale branch; shared stays at crossfadeMs
    const pair = applyAbutCrossfade(left, right, 80, 0, 0);
    expect(pair?.left.fadeOutMs).toBe(80);
    expect(pair?.right.fadeInMs).toBe(80);
  });
});

describe("findAbutNeighbor", () => {
  const a: AudioClip = {
    id: "a",
    trackId: "t",
    assetId: "x",
    startTicks: 0,
    lengthTicks: 1920,
  };
  const b: AudioClip = {
    id: "b",
    trackId: "t",
    assetId: "y",
    startTicks: 1920,
    lengthTicks: 1920,
  };
  const c: AudioClip = {
    id: "c",
    trackId: "t",
    assetId: "z",
    startTicks: 5000,
    lengthTicks: 1920,
  };

  it("returns null for unknown id or non-abutting clips", () => {
    expect(findAbutNeighbor([a, c], "missing")).toBeNull();
    expect(findAbutNeighbor([a, c], "a")).toBeNull();
  });

  it("finds next abutting neighbor from left clip", () => {
    expect(findAbutNeighbor([b, a], "a")).toEqual({ left: a, right: b });
  });

  it("finds previous abutting neighbor from right clip", () => {
    expect(findAbutNeighbor([a, b], "b")).toEqual({ left: a, right: b });
  });
});

describe("map-aware offset / remaining", () => {
  const project = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
  const clip = {
    startTicks: 0,
    lengthTicks: DEFAULT_PPQ * 2,
    trimInMs: 100,
    trimOutMs: 0,
  };
  const asset = { durationMs: 5000 };

  it("audioClipBufferOffsetSecAlongMaps mirrors constant-tempo offset", () => {
    expect(audioClipBufferOffsetSecAlongMaps(clip, -1, project)).toBeNull();
    expect(
      audioClipBufferOffsetSecAlongMaps(clip, clip.lengthTicks, project),
    ).toBeNull();
    expect(
      audioClipBufferOffsetSecAlongMaps(clip, DEFAULT_PPQ, project),
    ).toBeCloseTo(0.1 + ticksToMs(DEFAULT_PPQ, 120, TS_4_4) / 1000, 5);
  });

  it("audioClipRemainingSec is 0 outside clip and positive inside", () => {
    expect(audioClipRemainingSec(clip, asset, -1, CTX)).toBe(0);
    const rem = audioClipRemainingSec(clip, asset, 0, CTX);
    expect(rem).toBeGreaterThan(0);
    expect(rem).toBeLessThanOrEqual(asset.durationMs / 1000);
  });

  it("audioClipRemainingSecAlongMaps matches inside/outside", () => {
    expect(audioClipRemainingSecAlongMaps(clip, asset, -1, project, CTX)).toBe(
      0,
    );
    expect(
      audioClipRemainingSecAlongMaps(clip, asset, 0, project, CTX),
    ).toBeGreaterThan(0);
  });
});

describe("lengthTicksFromAssetWindow / maxAudioLengthTicks null paths", () => {
  it("returns null when duration unknown", () => {
    expect(lengthTicksFromAssetWindow({}, { durationMs: undefined }, CTX)).toBeNull();
    expect(lengthTicksFromAssetWindow({}, { durationMs: 0 }, CTX)).toBeNull();
    expect(maxAudioLengthTicks({}, null, CTX)).toBeNull();
    expect(maxAudioLengthTicks({}, { durationMs: 0 }, CTX)).toBeNull();
  });
});

describe("clampAudioClipToAsset trim overflow", () => {
  const base: AudioClip = {
    id: "c1",
    trackId: "t1",
    assetId: "a1",
    startTicks: 0,
    lengthTicks: 100,
    trimInMs: 0,
    trimOutMs: 0,
  };

  it("shrinks trimOut when trims eat the file", () => {
    const next = clampAudioClipToAsset(
      { ...base, trimInMs: 50, trimOutMs: 5000 },
      { durationMs: 100 },
      CTX,
    );
    expect((next.trimInMs ?? 0) + (next.trimOutMs ?? 0)).toBeLessThan(100);
  });

  it("resets when trimIn alone exceeds the file", () => {
    const next = clampAudioClipToAsset(
      { ...base, trimInMs: 5000, trimOutMs: 10 },
      { durationMs: 100 },
      CTX,
    );
    expect(next.trimInMs).toBe(99);
    expect(next.trimOutMs).toBeUndefined();
  });

  it("passes through when duration unknown", () => {
    const next = clampAudioClipToAsset(
      { ...base, lengthTicks: 50 },
      null,
      CTX,
    );
    expect(next.lengthTicks).toBe(50);
  });
});

describe("resize without asset duration", () => {
  const clip: AudioClip = {
    id: "c1",
    trackId: "t1",
    assetId: "a1",
    startTicks: 100,
    lengthTicks: 1000,
  };

  it("resizeAudioClipEnd only adjusts lengthTicks", () => {
    const next = resizeAudioClipEnd(clip, null, 600, CTX);
    expect(next.lengthTicks).toBe(500);
    expect(next.trimOutMs).toBeUndefined();
  });

  it("resizeAudioClipStart only adjusts start/length", () => {
    const next = resizeAudioClipStart(clip, undefined, 400, CTX);
    expect(next.startTicks).toBe(400);
    expect(next.startTicks + next.lengthTicks).toBe(1100);
  });

  it("resizeAudioClipStart clamps when newStart past end", () => {
    const next = resizeAudioClipStart(clip, null, 5000, CTX);
    expect(next.lengthTicks).toBe(1);
    expect(next.startTicks).toBe(1099);
  });
});
