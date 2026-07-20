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

  it("clamps negative elapsed on clock skew (M15)", () => {
    let t = 2000;
    const engine = createTransportEngine({ now: () => t });
    engine.play();
    t = 1000;
    const p1 = engine.getState().positionTicks;
    t = 2000;
    const p2 = engine.getState().positionTicks;
    expect(p2).toBeGreaterThanOrEqual(p1);
    engine.dispose();
  });

  it("mid-play bpm change does not jump position (H1)", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play({ bpm: 120 });
    t = 1000;
    const before = engine.getState().positionTicks;
    expect(before).toBe(2 * DEFAULT_PPQ);
    engine.play({ bpm: 60 });
    expect(engine.getState().positionTicks).toBe(before);
    engine.dispose();
  });

  it("invalid meter on play does not mutate bpm (H5)", () => {
    const engine = createTransportEngine();
    engine.play({ bpm: 100 });
    expect(() =>
      engine.play({
        bpm: 80,
        timeSignature: { numerator: 4, denominator: 0 },
      }),
    ).toThrow(RangeError);
    expect(engine.getState().bpm).toBe(100);
    engine.dispose();
  });

  it("loadProject sets activeProjectId without playing", () => {
    const project = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "P",
      formatVersion: 2 as const,
      updatedAt: "2026-07-20T00:00:00.000Z",
      ppq: DEFAULT_PPQ,
      defaultBpm: 90,
      defaultMeter: { numerator: 4, denominator: 4 },
      forma: {
        clips: [
          {
            id: "cd",
            name: "CD",
            kind: "countdown" as const,
            startTicks: -7680,
            lengthTicks: 7680,
          },
          {
            id: "i",
            name: "Intro",
            kind: "section" as const,
            startTicks: 0,
            lengthTicks: 7680,
          },
        ],
      },
      tempoMap: [{ id: "t", startTicks: 0, bpm: 90 }],
      meterMap: [
        { id: "m", startTicks: 0, numerator: 4, denominator: 4 },
      ],
    };
    const engine = createTransportEngine();
    const state = engine.loadProject(project.id, project);
    expect(state.playing).toBe(false);
    expect(state.activeProjectId).toBe(project.id);
    expect(state.bpm).toBe(90);
    engine.dispose();
  });
});
