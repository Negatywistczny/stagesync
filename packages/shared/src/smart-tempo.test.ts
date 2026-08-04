import { describe, expect, it } from "vitest";
import { createProjectSeed } from "./project-seed.js";
import {
  US_UG_BACKING_CLIP_ID,
  US_UG_BACKING_TRACK_ID,
  audioDurationOverflowWarning,
  closestBeatIndex,
  evaluateDriftGate,
  extendBeatGridToDuration,
  extractYoutubeVideoId,
  layoutFormaFromUgBarCounts,
  medianBpmFromBeatMs,
  msPerBarAtBpm,
  placeUsUgBackingAudioClip,
  preferAudioTempoSeed,
  preferEditorialTempoSeed,
  pruneTempoMapByBpmDelta,
  rescaleBeatGridToBpm,
  runAudioDrivenSmartTempo,
  sanitizeBeatGridIbis,
  snapMsToNearestBeat,
  sparsifyTempoNodesFromBeatGrid,
  alignBeat1ToChordSyllable,
  suggestBeat1MsFromPipeAndGap,
  snapBeat1MsToOnset,
  tempoMapFromTempoNodes,
  tempoNodesAtBarBoundaries,
  tempoNodesFromBeatGrid,
} from "./smart-tempo.js";
import { secondsToTicks } from "./tempo-map.js";
import { DEFAULT_PPQ, elapsedToTicks, ticksPerBar } from "./time.js";

const METER = { numerator: 4, denominator: 4 } as const;
const BAR = ticksPerBar(METER, DEFAULT_PPQ);

describe("extractYoutubeVideoId", () => {
  it("accepts bare 11-char id", () => {
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("parses watch URL", () => {
    expect(
      extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
  });

  it("parses UltraStar #VIDEO metadata form with v= prefix", () => {
    expect(
      extractYoutubeVideoId(
        "v=92cwKCU8Z5c,co=the-winner-takes-it-all-60382aa741643.jpg,bg=abba-504b76e0205c8.jpg",
      ),
    ).toBe("92cwKCU8Z5c");
  });

  it("parses UltraStar #VIDEO metadata form with a= audio id", () => {
    expect(
      extractYoutubeVideoId(
        "a=rDQHzGpwQNk,co=https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/2b/c7/b8/2bc7b8e3-2e3d-7845-be63-56e7e82214cc/cover.jpg/5000x5000bb.jpg,bg=wodecki-zbigniew-504add1b41807.jpg",
      ),
    ).toBe("rDQHzGpwQNk");
  });

  it("prefers a= over v= when both present", () => {
    expect(
      extractYoutubeVideoId("v=92cwKCU8Z5c,a=rDQHzGpwQNk,co=cover.jpg"),
    ).toBe("rDQHzGpwQNk");
  });

  it("rejects invalid id", () => {
    expect(extractYoutubeVideoId("short")).toBeNull();
    expect(extractYoutubeVideoId("")).toBeNull();
  });
});

describe("evaluateDriftGate", () => {
  it("ignores drift within 1 bar @ seed BPM", () => {
    const barMs = msPerBarAtBpm(120, METER, DEFAULT_PPQ);
    const r = evaluateDriftGate(1000 + barMs * 0.5, 1000, {
      seedBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(r.action).toBe("ignore");
  });

  it("inserts node when drift exceeds 1 bar", () => {
    const barMs = msPerBarAtBpm(120, METER, DEFAULT_PPQ);
    const r = evaluateDriftGate(1000 + barMs * 2, 1000, {
      seedBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(r.action).toBe("node");
  });

  it("suggests ramp for gradual drift", () => {
    const barMs = msPerBarAtBpm(120, METER, DEFAULT_PPQ);
    const r = evaluateDriftGate(1000 + barMs * 3, 1000, {
      seedBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
      gradual: true,
    });
    expect(r.action).toBe("ramp");
  });
});

describe("placeUsUgBackingAudioClip", () => {
  it("creates backing track and clips from Beat 1 (trim leading silence)", () => {
    const seed = createProjectSeed("p1", "x", "2026-08-03T12:00:00.000Z");
    const next = placeUsUgBackingAudioClip(seed, {
      assetId: "asset-1",
      durationMs: 60_000,
      waveformPeaks: [0.1, 0.5],
      audioStartOffsetMs: 500,
    });
    expect(next.audioTracks.some((t) => t.id === US_UG_BACKING_TRACK_ID)).toBe(
      true,
    );
    const clip = next.audioClips.find((c) => c.id === US_UG_BACKING_CLIP_ID);
    expect(clip?.assetId).toBe("asset-1");
    expect(clip?.startTicks).toBe(0);
    expect(clip?.trimInMs).toBe(500);
    expect(clip?.lengthTicks).toBe(
      elapsedToTicks(59_500, seed.defaultBpm, seed.defaultMeter, seed.ppq),
    );
    expect(next.assets.find((a) => a.id === "asset-1")?.durationMs).toBe(
      60_000,
    );
  });

  it("omits trimInMs when Beat 1 is at file start", () => {
    const seed = createProjectSeed("p1", "x", "2026-08-03T12:00:00.000Z");
    const next = placeUsUgBackingAudioClip(seed, {
      assetId: "asset-1",
      durationMs: 30_000,
      audioStartOffsetMs: 0,
    });
    const clip = next.audioClips.find((c) => c.id === US_UG_BACKING_CLIP_ID);
    expect(clip?.trimInMs).toBeUndefined();
    expect(clip?.lengthTicks).toBe(
      elapsedToTicks(30_000, seed.defaultBpm, seed.defaultMeter, seed.ppq),
    );
  });

  it("updates existing backing clip on re-import (no duplicate)", () => {
    const seed = createProjectSeed("p1", "x", "2026-08-03T12:00:00.000Z");
    const first = placeUsUgBackingAudioClip(seed, {
      assetId: "asset-1",
      durationMs: 30_000,
    });
    expect(first.audioClips).toHaveLength(1);
    const second = placeUsUgBackingAudioClip(first, {
      assetId: "asset-2",
      durationMs: 45_000,
    });
    expect(second.audioClips).toHaveLength(1);
    expect(second.audioClips[0]!.assetId).toBe("asset-2");
  });

  it("reuses pre-existing server-created Audio 1 track and clip without creating a second track", () => {
    const seed = createProjectSeed("p1", "x", "2026-08-03T12:00:00.000Z");
    const serverProject = {
      ...seed,
      audioTracks: [{ id: "tr-server-1", name: "Audio 1" }],
      audioClips: [
        {
          id: "clip-server-1",
          trackId: "tr-server-1",
          assetId: "asset-1",
          startTicks: 0,
          lengthTicks: 7680,
        },
      ],
    };
    const next = placeUsUgBackingAudioClip(serverProject, {
      assetId: "asset-1",
      durationMs: 180_000,
    });
    expect(next.audioTracks).toHaveLength(1);
    expect(next.audioTracks[0]!.id).toBe("tr-server-1");
    expect(next.audioClips).toHaveLength(1);
    expect(next.audioClips[0]!.trackId).toBe("tr-server-1");
    expect(next.audioClips[0]!.lengthTicks).toBeGreaterThan(7680);
  });

  it("lengthTicks follows variable TempoMap along playable duration", () => {
    const seed = createProjectSeed("p1", "x", "2026-08-03T12:00:00.000Z");
    const withMap = {
      ...seed,
      tempoMap: [
        { id: "t1", startTicks: 0, bpm: 120 },
        { id: "t2", startTicks: BAR * 4, bpm: 90 },
      ],
    };
    const flatLen = elapsedToTicks(60_000, 120, METER, DEFAULT_PPQ);
    const next = placeUsUgBackingAudioClip(withMap, {
      assetId: "asset-1",
      durationMs: 60_000,
    });
    const clip = next.audioClips.find((c) => c.id === US_UG_BACKING_CLIP_ID);
    expect(clip?.lengthTicks).not.toBe(flatLen);
    expect(clip?.lengthTicks).toBeLessThan(flatLen);
  });
});

describe("snapMsToNearestBeat", () => {
  it("snaps to closest beat", () => {
    const beats = [0, 500, 1000, 1500];
    expect(snapMsToNearestBeat(480, beats)).toBe(500);
    expect(snapMsToNearestBeat(20, beats)).toBe(0);
    expect(snapMsToNearestBeat(2000, beats)).toBe(1500);
  });
});

describe("runAudioDrivenSmartTempo", () => {
  it("builds sparse tempo map from beat grid (Logic-like density)", () => {
    const beatMs = [0, 500, 1000, 1500, 2000];
    const result = runAudioDrivenSmartTempo({
      analysis: { onsetsMs: beatMs, beatMs, estimatedBpm: 120 },
      durationMs: 2500,
      audioStartOffsetMs: 0,
      meter: METER,
      ppq: DEFAULT_PPQ,
      floorTicks: 0,
      idPrefix: "a",
      fallbackBpm: 88,
    });
    expect(result.seedBpm).toBe(120);
    expect(result.tempoMap.length).toBeGreaterThan(0);
    // Constant grid → few nodes (not one event per beat).
    expect(result.tempoMap.length).toBeLessThanOrEqual(beatMs.length);
    expect(result.tempoNodes.length).toBeGreaterThan(0);
    expect(result.beatMs.length).toBe(5);
  });

  it("seeds from median beat intervals when analysis estimate is present", () => {
    const beatMs = Array.from({ length: 9 }, (_, i) => i * 400);
    const result = runAudioDrivenSmartTempo({
      analysis: { onsetsMs: beatMs, beatMs, estimatedBpm: 150 },
      durationMs: 4000,
      fallbackBpm: 88,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.seedBpm).toBe(150);
  });

  it("Adapt seed follows audio analysis, not pipe/GAP fallbackBpm", () => {
    // Analysis + IBI at ~112.69; editorial fallback 120 must NOT overwrite Adapt.
    const period = 60_000 / 112.69;
    const beatMs = Array.from({ length: 160 }, (_, i) => Math.round(i * period));
    const result = runAudioDrivenSmartTempo({
      analysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 112.69,
      },
      durationMs: beatMs[beatMs.length - 1]! + 500,
      audioStartOffsetMs: 0,
      fallbackBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.seedBpm).toBeCloseTo(112.69, 0);
    expect(result.tempoMap[0]!.bpm).toBeCloseTo(112.69, 0);
  });

  it("keeps seed near analysis BPM and avoids huge adjacent jumps", () => {
    // Mild rubato around 122 BPM (period ~492 ms ± jitter) — not Winner BPMs.
    const base = 60_000 / 122;
    const beatMs: number[] = [];
    let t = 0;
    for (let i = 0; i < 80; i++) {
      beatMs.push(Math.round(t));
      const wobble = 1 + 0.02 * Math.sin(i / 5);
      t += base * wobble;
    }
    const result = runAudioDrivenSmartTempo({
      analysis: { onsetsMs: beatMs, beatMs, estimatedBpm: 122 },
      durationMs: beatMs[beatMs.length - 1]! + 500,
      audioStartOffsetMs: 0,
      fallbackBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.seedBpm).toBeGreaterThan(115);
    expect(result.seedBpm).toBeLessThan(130);
    // Sparse vs dense beat grid
    expect(result.tempoMap.length).toBeLessThan(beatMs.length / 2);
    const jumps = result.tempoMap
      .slice(1)
      .map((e, i) => Math.abs(e.bpm - result.tempoMap[i]!.bpm));
    expect(Math.max(0, ...jumps)).toBeLessThanOrEqual(8);
    expect(Math.min(...result.tempoMap.map((e) => e.bpm))).toBeGreaterThan(100);
    expect(Math.max(...result.tempoMap.map((e) => e.bpm))).toBeLessThan(145);
  });

  it("soft-diagnoses Winner-like sparse contour stays in Logic band", () => {
    // Synthetic contour inspired by Logic Pro Smart Tempo shape/range for a
    // ~122 BPM ballad — NOT a hardcoded Winner BPM lookup table.
    const logicish: { bar: number; bpm: number }[] = [
      { bar: 1, bpm: 121.8 },
      { bar: 3, bpm: 122.6 },
      { bar: 5, bpm: 124.2 },
      { bar: 7, bpm: 123.7 },
      { bar: 10, bpm: 124.4 },
      { bar: 12, bpm: 123.9 },
      { bar: 13, bpm: 125.3 },
      { bar: 14, bpm: 122.1 },
      { bar: 16, bpm: 123.1 },
      { bar: 17, bpm: 120.7 },
      { bar: 19, bpm: 120.5 },
      { bar: 21, bpm: 121.9 },
      { bar: 23, bpm: 119.8 },
      { bar: 24, bpm: 122.5 },
      { bar: 26, bpm: 120.3 },
      { bar: 28, bpm: 122.4 },
      { bar: 30, bpm: 123.4 },
      { bar: 31, bpm: 121 },
      { bar: 32, bpm: 122.6 },
      { bar: 33, bpm: 125.5 },
      { bar: 34, bpm: 123.2 },
      { bar: 35, bpm: 124.8 },
      { bar: 36, bpm: 123.6 },
      { bar: 37, bpm: 122.4 },
    ];
    const beatMs: number[] = [];
    let t = 0;
    let nodeIdx = 0;
    let curBpm = logicish[0]!.bpm;
    for (let bar = 1; bar <= 40; bar++) {
      if (nodeIdx + 1 < logicish.length && logicish[nodeIdx + 1]!.bar === bar) {
        nodeIdx += 1;
        curBpm = logicish[nodeIdx]!.bpm;
      }
      const period = 60_000 / curBpm;
      for (let b = 0; b < 4; b++) {
        beatMs.push(Math.round(t));
        t += period;
      }
    }
    const result = runAudioDrivenSmartTempo({
      analysis: {
        onsetsMs: beatMs,
        beatMs,
        estimatedBpm: 122,
      },
      durationMs: t + 100,
      audioStartOffsetMs: 0,
      fallbackBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.seedBpm).toBeGreaterThanOrEqual(118);
    expect(result.seedBpm).toBeLessThanOrEqual(128);
    // Sparse: far fewer events than beats; closer to Logic's ~20–40 nodes.
    expect(result.tempoMap.length).toBeLessThan(80);
    expect(result.tempoMap.length).toBeGreaterThan(1);
    const bpms = result.tempoMap.map((e) => e.bpm);
    expect(Math.min(...bpms)).toBeGreaterThanOrEqual(116);
    expect(Math.max(...bpms)).toBeLessThanOrEqual(130);
    // Soft MAE vs Logic reference at sampled bars (tolerance band, not exact).
    function bpmAtBar(bar: number): number {
      const tick = (bar - 1) * BAR;
      let cur = result.tempoMap[0]!.bpm;
      for (const e of result.tempoMap) {
        if (e.startTicks <= tick) cur = e.bpm;
        else break;
      }
      return cur;
    }
    let mae = 0;
    for (const { bar, bpm } of logicish) {
      mae += Math.abs(bpmAtBar(bar) - bpm);
    }
    mae /= logicish.length;
    expect(mae).toBeLessThan(1.5);
  });

  it("caps fallback beat grid for very long audio", () => {
    const result = runAudioDrivenSmartTempo({
      analysis: { onsetsMs: [], beatMs: [], estimatedBpm: 120 },
      durationMs: 3 * 3600 * 1000,
      audioStartOffsetMs: 0,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.beatMs.length).toBeLessThanOrEqual(2048);
    expect(result.tempoNodes.length).toBeLessThanOrEqual(256);
    const started = performance.now();
    runAudioDrivenSmartTempo({
      analysis: { onsetsMs: [], beatMs: [], estimatedBpm: 120 },
      durationMs: 3 * 3600 * 1000,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(performance.now() - started).toBeLessThan(200);
  });

  it("extends partial beat grid past #GAP offset and full song duration", () => {
    const partial = Array.from({ length: 61 }, (_, i) => i * 500);
    const durationMs = 180_000;
    const offsetMs = 33_000;
    const result = runAudioDrivenSmartTempo({
      analysis: { onsetsMs: partial, beatMs: partial, estimatedBpm: 120 },
      durationMs,
      audioStartOffsetMs: offsetMs,
      fallbackBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(result.beatMs.length).toBeGreaterThan(61);
    expect(result.beatMs[result.beatMs.length - 1]!).toBeGreaterThan(
      durationMs * 0.9,
    );
    const beatOneIdx = closestBeatIndex(result.beatMs, offsetMs);
    expect(result.beatMs[beatOneIdx]!).toBeCloseTo(offsetMs, -2);
    expect(result.seedBpm).toBeCloseTo(120, 0);
    // Content-epoch: Beat 1 (#GAP) → tick 0 on the continuous map
    expect(
      secondsToTicks(0, result.tempoMap, 120, METER, DEFAULT_PPQ),
    ).toBe(0);
    const gapNode = result.tempoNodes.find((n) => n.wallMs === offsetMs);
    expect(gapNode?.targetTick ?? result.tempoNodes[0]?.targetTick).toBe(0);
  });
});

describe("extendBeatGridToDuration", () => {
  it("continues constant spacing through full duration", () => {
    const partial = [0, 500, 1000];
    const extended = extendBeatGridToDuration(partial, 10_000, 120);
    expect(extended.length).toBeGreaterThan(3);
    expect(extended[extended.length - 1]!).toBeGreaterThan(9_000);
  });
});

describe("suggestBeat1MsFromPipeAndGap", () => {
  it("places GAP at pipe+½ bars for long intros (Winner-like)", () => {
    expect(
      suggestBeat1MsFromPipeAndGap({
        gapMs: 33_000,
        pipeBarCount: 16,
        layoutBpm: 120,
      }),
    ).toBe(0);
  });

  it("keeps a transient within ±½ bar of the ideal Beat 1", () => {
    expect(
      suggestBeat1MsFromPipeAndGap({
        gapMs: 33_000,
        pipeBarCount: 16,
        layoutBpm: 120,
        transientMs: 400,
      }),
    ).toBe(400);
  });

  it("ignores a late transient far from ideal (avoids −1 bar vocal drift)", () => {
    expect(
      suggestBeat1MsFromPipeAndGap({
        gapMs: 33_000,
        pipeBarCount: 16,
        layoutBpm: 120,
        transientMs: 2_000,
      }),
    ).toBe(0);
    expect(
      suggestBeat1MsFromPipeAndGap({
        gapMs: 33_000,
        pipeBarCount: 16,
        layoutBpm: 120,
        transientMs: 1_000,
      }),
    ).toBe(0);
  });

  it("falls back to GAP when quiet until vocal (short/no pipe)", () => {
    expect(
      suggestBeat1MsFromPipeAndGap({
        gapMs: 12_500,
        pipeBarCount: 0,
        layoutBpm: 120,
        transientMs: 12_000,
      }),
    ).toBe(12_500);
  });
});

describe("snapBeat1MsToOnset", () => {
  it("snaps to the nearest onset within ±¼ beat (prefers closer over farther-earlier)", () => {
    // 120 BPM → ¼ beat = 125 ms; 3010 is closer than 2900
    expect(snapBeat1MsToOnset(3000, [2900, 3010, 3200], 120)).toBe(3010);
  });

  it("pulls Beat 1 earlier when that onset is the nearest in-window hit", () => {
    expect(snapBeat1MsToOnset(3000, [2950, 3200], 120)).toBe(2950);
  });

  it("snaps later when the nearest onset is after editorial", () => {
    // Editorial past the attack → snap forward onto the onset (not leave MP3 early).
    expect(snapBeat1MsToOnset(3000, [3050, 3400], 120)).toBe(3050);
  });

  it("no-ops when onsets are far from editorial", () => {
    expect(snapBeat1MsToOnset(3000, [1000, 5000], 120)).toBe(3000);
  });
});

describe("alignBeat1ToChordSyllable", () => {
  it("nudges Beat 1 earlier when first chord syllable is ~1 bar early", () => {
    const BAR_MS = msPerBarAtBpm(120, METER, DEFAULT_PPQ);
    const verseStart = 17 * BAR;
    // Beat 1 @ 2000ms, GAP/chord @ 33000 → content = 15.5 bars (1 bar early vs pickup)
    const aligned = alignBeat1ToChordSyllable({
      audioStartOffsetMs: 2_000,
      chordSyllableMs: 33_000,
      formaSectionStartTicks: verseStart,
      pipeBarCount: 16,
      seedBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(aligned).toBe(0);
    expect(Math.abs(aligned - (33_000 - 16.5 * BAR_MS))).toBeLessThan(
      BAR_MS * 0.25,
    );
  });

  it("leaves GAP-as-Beat1 alone (intentional intro trim)", () => {
    expect(
      alignBeat1ToChordSyllable({
        audioStartOffsetMs: 33_000,
        chordSyllableMs: 33_000,
        formaSectionStartTicks: 17 * BAR,
        pipeBarCount: 16,
        seedBpm: 120,
      }),
    ).toBe(33_000);
  });

  it("no-ops when already aligned", () => {
    expect(
      alignBeat1ToChordSyllable({
        audioStartOffsetMs: 0,
        chordSyllableMs: 33_000,
        formaSectionStartTicks: 17 * BAR,
        pipeBarCount: 16,
        seedBpm: 120,
      }),
    ).toBe(0);
  });

  it("shifts a manual 3000ms Beat 1 by −1 bar @ 120 (would fight UI without override)", () => {
    const BAR_MS = msPerBarAtBpm(120, METER, DEFAULT_PPQ);
    expect(
      alignBeat1ToChordSyllable({
        audioStartOffsetMs: 3_000,
        chordSyllableMs: 33_000,
        formaSectionStartTicks: 17 * BAR,
        pipeBarCount: 16,
        seedBpm: 120,
      }),
    ).toBe(3_000 - BAR_MS);
  });
});

describe("layoutFormaFromUgBarCounts", () => {
  it("sizes sections from UG pipe / structural bars only", () => {
    const plans = layoutFormaFromUgBarCounts(
      [
        {
          name: "Intro",
          pipeBarCount: 4,
          chordCount: 0,
          structuralBars: 1,
          vocalAnchored: false,
        },
        {
          name: "Verse",
          pipeBarCount: 0,
          chordCount: 4,
          structuralBars: 6,
          vocalAnchored: true,
        },
      ],
      0,
      METER,
      DEFAULT_PPQ,
    );
    expect(plans[0]!.pristineBars).toBe(4);
    expect(plans[1]!.pristineBars).toBe(6);
    expect(plans[1]!.startTicks).toBe(4 * BAR);
  });
});

describe("medianBpmFromBeatMs / sparsifyTempoNodesFromBeatGrid", () => {
  it("estimates median BPM from intervals", () => {
    expect(medianBpmFromBeatMs([0, 500, 1000, 1500])).toBe(120);
    expect(medianBpmFromBeatMs([])).toBe(0);
  });

  it("preferAudioTempoSeed prefers median IBI over disagreeing analysis", () => {
    // Tight agreement → median refinement; pipe fallback ignored
    expect(preferAudioTempoSeed(112.69, 120, 112.5)).toBeCloseTo(112.5, 0);
    expect(preferAudioTempoSeed(122, 112.69, 122)).toBe(122);
    expect(preferAudioTempoSeed(0, 120, 0)).toBe(120);
    // Moderate disagreement → median wins (Adapt SSOT), analysis does not upscale
    expect(preferAudioTempoSeed(122, 120, 112)).toBe(112);
    expect(preferAudioTempoSeed(124, 120, 117)).toBe(117);
    // Half-time → use fallback octave center (pipe ~120), not 64×2=128.
    expect(preferAudioTempoSeed(64, 120, 64)).toBeCloseTo(120, 0);
  });

  it("preferEditorialTempoSeed is an alias of preferAudioTempoSeed", () => {
    expect(preferEditorialTempoSeed(112.69, 120, 112.5)).toBe(
      preferAudioTempoSeed(112.69, 120, 112.5),
    );
  });

  it("rescaleBeatGridToBpm lifts a systematically slow grid toward lock", () => {
    const slow = Array.from({ length: 40 }, (_, i) =>
      Math.round(i * (60_000 / 112.69)),
    );
    const scaled = rescaleBeatGridToBpm(slow, 120);
    const median = medianBpmFromBeatMs(scaled);
    expect(median).toBeGreaterThan(116);
    expect(median).toBeLessThan(126);
    expect(scaled[0]).toBe(slow[0]);
  });

  it("emits sparse nodes only when local tempo changes", () => {
    const period = 500;
    const beatMs = Array.from({ length: 33 }, (_, i) => i * period);
    // Speed up after bar 4 (beat 16): 450 ms ≈ 133 BPM
    for (let i = 16; i < beatMs.length; i++) {
      beatMs[i] = beatMs[15]! + (i - 15) * 450;
    }
    const dense = tempoNodesFromBeatGrid(beatMs, 0, 120, 0, METER, DEFAULT_PPQ);
    const sparse = sparsifyTempoNodesFromBeatGrid(dense, {
      seedBpm: 120,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    expect(sparse.length).toBeLessThan(dense.length / 2);
    expect(sparse.length).toBeGreaterThanOrEqual(2);
    expect(sparse[0]!.targetTick).toBe(0);
  });

  it("ZADANIE 2 & 3: sparsify enforces bar start alignment and clamps spikes on quiet refresh", () => {
    const bpm = 120;
    const period = 60_000 / bpm;
    const beatMs: number[] = [];
    let t = 0;
    // Generate 64 beats (16 bars @ 4/4) with various local tempo changes and a giant spike
    for (let i = 0; i < 64; i++) {
      beatMs.push(Math.round(t));
      if (i === 16) {
        t += period * 0.5; // Massive spike: delta BPM > maxStep (halving the period)
      } else {
        t += period;
      }
    }
    const dense = tempoNodesFromBeatGrid(beatMs, 0, bpm, 0, METER, DEFAULT_PPQ);
    const sparse = sparsifyTempoNodesFromBeatGrid(dense, {
      seedBpm: bpm,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });

    const barTicks = ticksPerBar(METER, DEFAULT_PPQ);
    for (const node of sparse.slice(0, -1)) {
      // ZADANIE 2: Verify every node is aligned on a bar boundary (Beat 1)
      expect(node.targetTick % barTicks).toBe(0);
    }
  });

  it("sparsify rejects a brief IBI blip around bar 5 (no sustained jump)", () => {
    // Stable ~123 BPM with one half-period glitch near beat 18 — must not
    // create a tempo node that accelerates Adapt by several BPM.
    const bpm = 123;
    const period = 60_000 / bpm;
    const beatMs: number[] = [];
    let t = 0;
    for (let i = 0; i < 48; i++) {
      beatMs.push(Math.round(t));
      // Single noisy short IBI into beat 18 (bar ~5)
      if (i === 17) {
        t += period * 0.52;
      } else {
        t += period;
      }
    }
    const cleaned = sanitizeBeatGridIbis(beatMs, bpm);
    const dense = tempoNodesFromBeatGrid(cleaned, 0, bpm, 0, METER, DEFAULT_PPQ);
    const sparse = sparsifyTempoNodesFromBeatGrid(dense, {
      seedBpm: bpm,
      meter: METER,
      ppq: DEFAULT_PPQ,
    });
    const map = tempoMapFromTempoNodes(
      sparse,
      bpm,
      0,
      METER,
      DEFAULT_PPQ,
      "blip",
    );
    const barTicks = ticksPerBar(METER, DEFAULT_PPQ);
    const aroundBar5 = map.filter((ev) => {
      const bar = ev.startTicks / barTicks + 1;
      return bar >= 1 && bar <= 8;
    });
    expect(aroundBar5.length).toBeGreaterThan(0);
    for (const ev of aroundBar5) {
      expect(ev.bpm).toBeGreaterThan(bpm * 0.97);
      expect(ev.bpm).toBeLessThan(bpm * 1.04);
    }
    // No node may jump more than max step from its predecessor in this window
    for (let i = 1; i < aroundBar5.length; i++) {
      expect(
        Math.abs(aroundBar5[i]!.bpm - aroundBar5[i - 1]!.bpm),
      ).toBeLessThanOrEqual(3.01);
    }
  });

  it("pruneTempoMapByBpmDelta drops near-identical consecutive BPM", () => {
    const pruned = pruneTempoMapByBpmDelta(
      [
        { id: "a", startTicks: 0, bpm: 120 },
        { id: "b", startTicks: 960, bpm: 120.2 },
        { id: "c", startTicks: 1920, bpm: 125 },
      ],
      120,
      0,
      "p",
    );
    expect(pruned).toHaveLength(2);
    expect(pruned[1]!.bpm).toBe(125);
  });
});

describe("tempoNodesAtBarBoundaries", () => {
  it("emits one node per bar with absolute wall ms", () => {
    const beatMs = Array.from({ length: 9 }, (_, i) => i * 500);
    const nodes = tempoNodesAtBarBoundaries(
      beatMs,
      0,
      120,
      0,
      METER,
      DEFAULT_PPQ,
    );
    expect(nodes.length).toBeGreaterThanOrEqual(2);
    expect(nodes[0]!.targetTick).toBe(0);
    expect(nodes[0]!.wallMs).toBe(0);
  });
});

describe("tempoNodesFromBeatGrid", () => {
  it("locks Beat 1 (GAP) to tick 0 — content-epoch, dynamic intervals", () => {
    const beatMs = Array.from({ length: 80 }, (_, i) => i * 500);
    const offsetMs = 20_000;
    const beatOneIdx = closestBeatIndex(beatMs, offsetMs);
    const nodes = tempoNodesFromBeatGrid(
      beatMs,
      offsetMs,
      120,
      0,
      METER,
      DEFAULT_PPQ,
    );
    const locked = nodes.find((n) => n.wallMs === beatMs[beatOneIdx]);
    expect(locked?.wallMs).toBe(20_000);
    expect(locked?.targetTick).toBe(0);
    expect(nodes[0]!.wallMs).toBe(offsetMs);
    expect(nodes[0]!.targetTick).toBe(0);
    // Next beat (~500 ms later) ≈ one quarter at ~120 BPM
    const next = nodes.find((n) => n.wallMs > offsetMs);
    expect(next?.targetTick).toBeGreaterThan(0);
    expect(next?.targetTick).toBeLessThanOrEqual(960);
  });
});

describe("tempoMapFromTempoNodes", () => {
  it("builds sparse map from nodes", () => {
    const map = tempoMapFromTempoNodes(
      [
        { wallMs: 0, targetTick: 0 },
        { wallMs: 4000, targetTick: 3840 },
      ],
      120,
      0,
      METER,
      DEFAULT_PPQ,
      "t",
    );
    expect(map.length).toBeGreaterThan(0);
    expect(map[0]!.startTicks).toBe(0);
  });

  it("clamps segment BPM and caps nodes at audio duration", () => {
    const BAR = ticksPerBar(METER, DEFAULT_PPQ);
    const map = tempoMapFromTempoNodes(
      [
        { wallMs: 0, targetTick: 0 },
        { wallMs: 4000, targetTick: BAR },
        { wallMs: 5000, targetTick: BAR * 40 },
      ],
      120,
      0,
      METER,
      DEFAULT_PPQ,
      "t",
      { audioDurationMs: 5000 },
    );
    // ±35% seed band (safety) — pathological BAR*40 segment is clipped.
    expect(map.every((ev) => ev.bpm >= 120 * 0.65)).toBe(true);
    expect(map.every((ev) => ev.bpm <= 120 * 1.45)).toBe(true);
  });

  it("preserves section tempo changes (rubato / accelerando) within ±35% of seed", () => {
    const BAR = ticksPerBar(METER, DEFAULT_PPQ);
    const map = tempoMapFromTempoNodes(
      [
        { wallMs: 0, targetTick: 0 },
        { wallMs: 2000, targetTick: BAR }, // ~120 BPM
        { wallMs: 3777, targetTick: BAR * 2 }, // ~135 BPM
      ],
      120,
      0,
      METER,
      DEFAULT_PPQ,
      "t",
      { audioDurationMs: 4000 },
    );
    expect(map.length).toBeGreaterThan(1);
    expect(map[1]!.bpm).toBeGreaterThan(125);
  });
});

describe("audioDurationOverflowWarning", () => {
  it("warns when map exceeds audio", () => {
    expect(audioDurationOverflowWarning(90_000, 60_000)).toMatch(/długości audio/);
    expect(audioDurationOverflowWarning(30_000, 60_000)).toBeNull();
  });
});
