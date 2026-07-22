import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProjectV5Seed,
  DEFAULT_PPQ,
  elapsedToTicks,
} from "@stagesync/shared";
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
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-000000000001",
      "P",
      "2026-07-20T00:00:00.000Z",
      { midiProgramId: 1 },
    );
    project.defaultBpm = 90;
    project.tempoMap = [{ id: "t", startTicks: 0, bpm: 90 }];
    const engine = createTransportEngine();
    const state = engine.loadProject(project.id, project);
    expect(state.playing).toBe(false);
    expect(state.activeProjectId).toBe(project.id);
    expect(state.bpm).toBe(90);
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    expect(state.positionTicks).toBe(cd!.startTicks);
    engine.dispose();
  });

  it("mid-play tempo map change updates bpm without jumping (follow maps)", () => {
    let t = 0;
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-000000000003",
      "P",
      "2026-07-20T00:00:00.000Z",
      { midiProgramId: 1 },
    );
    project.defaultBpm = 120;
    project.tempoMap = [
      { id: "t0", startTicks: 0, bpm: 120 },
      { id: "t1", startTicks: 1920, bpm: 60 },
    ];
    const engine = createTransportEngine({ now: () => t });
    engine.loadProject(project.id, project);
    engine.seek(0, project);
    engine.play({}, project);

    t = 1000; // 2 beats @ 120 → 1920 ticks (tempo change)
    const atChange = engine.getState();
    expect(atChange.positionTicks).toBe(1920);
    expect(atChange.bpm).toBe(60);

    t = 2000; // +1 beat @ 60 → 960 ticks
    const after = engine.getState();
    expect(after.positionTicks).toBe(2880);
    expect(after.bpm).toBe(60);
    engine.dispose();
  });

  it("explicit play bpm override does not follow tempo map", () => {
    let t = 0;
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-000000000004",
      "P",
      "2026-07-20T00:00:00.000Z",
      { midiProgramId: 1 },
    );
    project.defaultBpm = 120;
    project.tempoMap = [
      { id: "t0", startTicks: 0, bpm: 120 },
      { id: "t1", startTicks: 1920, bpm: 60 },
    ];
    const engine = createTransportEngine({ now: () => t });
    engine.loadProject(project.id, project);
    engine.seek(0, project);
    engine.play({ bpm: 120 }, project);

    t = 2000; // frozen 120 → 4 beats = 3840
    const state = engine.getState();
    expect(state.bpm).toBe(120);
    expect(state.positionTicks).toBe(3840);
    engine.dispose();
  });

  it("stop without project seeks to 0 and pauses", () => {
    let t = 0;
    const engine = createTransportEngine({ now: () => t });
    engine.play();
    t = 1000;
    const stopped = engine.stop();
    expect(stopped.playing).toBe(false);
    expect(stopped.positionTicks).toBe(0);
    engine.dispose();
  });

  it("stop with project seeks to Countdown start (pre-roll), not tick 0", () => {
    let t = 0;
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-000000000002",
      "P",
      "2026-07-20T00:00:00.000Z",
      { midiProgramId: 1 },
    );
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    expect(cd?.startTicks).toBeLessThan(0);

    const engine = createTransportEngine({ now: () => t });
    engine.loadProject(project.id, project);
    engine.seek(0, project);
    engine.play({}, project);
    t = 1000;
    const stopped = engine.stop(project);
    expect(stopped.playing).toBe(false);
    expect(stopped.positionTicks).toBe(cd!.startTicks);
    engine.dispose();
  });
});
