import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PPQ, elapsedToTicks } from "@stagesync/shared";
import { createTransportEngine } from "./engine.js";

describe("TransportEngine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("advances position from elapsed wall time, not timer call count", () => {
    let t = 1000;
    const engine = createTransportEngine({
      now: () => t,
      tickIntervalMs: 40,
    });

    engine.play();
    expect(engine.getState().positionTicks).toBe(0);

    // Simulate delayed/jittered callbacks: only 2 notifies, but 2000 ms elapsed
    t = 3000;
    const state = engine.getState();
    const expected = elapsedToTicks(2000, 120, {
      numerator: 4,
      denominator: 4,
    });
    expect(state.positionTicks).toBe(expected);
    expect(state.positionTicks).toBe(4 * DEFAULT_PPQ); // 4 beats @ 120 in 2s
    // If we had += on each 40ms tick, 2 calls ≠ 2000ms worth of ticks
    expect(state.positionTicks).not.toBe(2 * DEFAULT_PPQ);

    engine.dispose();
  });

  it("pause freezes position", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play();
    t = 500;
    const mid = engine.pause();
    expect(mid.playing).toBe(false);
    expect(mid.positionTicks).toBe(DEFAULT_PPQ);
    t = 5000;
    expect(engine.getState().positionTicks).toBe(DEFAULT_PPQ);
    engine.dispose();
  });

  it("seek sets ticks and re-anchors while playing", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play();
    t = 1000;
    engine.seek(100);
    expect(engine.getState().positionTicks).toBe(100);
    t = 1500;
    // 500 ms after re-anchor @ 120 → +DEFAULT_PPQ
    expect(engine.getState().positionTicks).toBe(100 + DEFAULT_PPQ);
    engine.dispose();
  });

  it("allows negative seek (pre-roll)", () => {
    const engine = createTransportEngine();
    engine.seek(-480);
    expect(engine.getState().positionTicks).toBe(-480);
    engine.dispose();
  });

  it("play accepts bpm override", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play({ bpm: 60 });
    t = 1000;
    // 60 BPM → 1 beat/sec → DEFAULT_PPQ ticks
    expect(engine.getState().positionTicks).toBe(DEFAULT_PPQ);
    engine.dispose();
  });
});
