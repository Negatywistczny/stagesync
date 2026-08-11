import { describe, expect, it } from "vitest";
import {
  extendBeatGridToDuration,
  preferAudioTempoSeed,
  refineBeatGridWithOnsets,
  rescaleBeatGridToBpm,
  sanitizeBeatGridIbis,
  selfConsistentScaleBeatGrid,
  snapMsToNearestBeat,
} from "./smart-tempo.js";

describe("beat-grid coverage edges (#835)", () => {
  it("snapMsToNearestBeat clamps empty / outside range", () => {
    expect(snapMsToNearestBeat(50, [])).toBe(50);
    expect(snapMsToNearestBeat(-10, [100, 200])).toBe(100);
    expect(snapMsToNearestBeat(999, [100, 200])).toBe(200);
    expect(snapMsToNearestBeat(140, [100, 200])).toBe(100);
  });

  it("extendBeatGridToDuration returns copy when duration/bpm invalid", () => {
    expect(extendBeatGridToDuration([0, 500], 0, 120)).toEqual([0, 500]);
    expect(extendBeatGridToDuration([0, 500], 1000, 0)).toEqual([0, 500]);
    expect(extendBeatGridToDuration([], 1000, 0)).toEqual([]);
  });

  it("refineBeatGridWithOnsets snaps beats toward nearby onsets", () => {
    const beats = [0, 500, 1000, 1500];
    // Pull beat 2 slightly early via onset
    const onsets = [0, 480, 1000, 1520];
    const refined = refineBeatGridWithOnsets(beats, onsets, 120);
    expect(refined[0]).toBe(0);
    expect(refined.length).toBe(4);
    // Onset within drift window should move wall time toward 480
    expect(refined[1]).toBeLessThanOrEqual(500);
  });

  it("refineBeatGridWithOnsets keeps expected when onsets empty", () => {
    const beats = [0, 500, 1000];
    expect(refineBeatGridWithOnsets(beats, [], 120)).toEqual(beats);
    expect(refineBeatGridWithOnsets([], [100], 120)).toEqual([]);
  });

  it("sanitizeBeatGridIbis uses seed period when median is wildly off", () => {
    // Dense half-period grid (~250ms) with seed 120 → seed period 500
    const beats = [0, 250, 500, 750, 1000];
    const cleaned = sanitizeBeatGridIbis(beats, 120);
    expect(cleaned.length).toBe(beats.length);
    const lastIbi = cleaned[cleaned.length - 1]! - cleaned[cleaned.length - 2]!;
    expect(lastIbi).toBeGreaterThan(300);
  });

  it("rescaleBeatGridToBpm no-ops on short grids and invalid bpm", () => {
    expect(rescaleBeatGridToBpm([0], 120)).toEqual([0]);
    expect(rescaleBeatGridToBpm([], 120)).toEqual([]);
    expect(rescaleBeatGridToBpm([0, 500], 0)).toEqual([0, 500]);
  });

  it("selfConsistentScaleBeatGrid scales when last onset is within ±4%", () => {
    const beats = [0, 500, 1000, 1500, 2000];
    // Late anchor ~3% past last beat
    const onsets = [0, 500, 1000, 1500, 2060];
    const scaled = selfConsistentScaleBeatGrid(beats, onsets);
    expect(scaled[0]).toBe(0);
    expect(scaled[scaled.length - 1]!).toBeGreaterThan(2000);
  });

  it("selfConsistentScaleBeatGrid no-ops without usable span", () => {
    expect(selfConsistentScaleBeatGrid([0], [100])).toEqual([0]);
    expect(selfConsistentScaleBeatGrid([0, 500], [])).toEqual([0, 500]);
    // Far onset (>4%) → unchanged
    const beats = [0, 500, 1000];
    expect(selfConsistentScaleBeatGrid(beats, [0, 500, 2000])).toEqual([
      ...beats,
    ]);
  });

  it("preferAudioTempoSeed covers grid-only, median-only, and half-time fold", () => {
    expect(preferAudioTempoSeed(120, 0, 0)).toBe(120);
    expect(preferAudioTempoSeed(0, 0, 110)).toBe(110);
    expect(preferAudioTempoSeed(0, 118, 0)).toBe(118);
    // Half-time without fallback → double
    expect(preferAudioTempoSeed(60, 0, 60)).toBe(120);
    // Half-time with fallback near double
    expect(preferAudioTempoSeed(64, 128, 64)).toBe(128);
  });
});
