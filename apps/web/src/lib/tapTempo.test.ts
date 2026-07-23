import { describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  applyTapBpm,
  createTapTempoState,
  recordTap,
} from "./tapTempo.js";

describe("tapTempo", () => {
  it("needs two taps before emitting BPM", () => {
    let state = createTapTempoState();
    let bpm: number | null = null;
    ({ state, bpm } = recordTap(state, 1000));
    expect(bpm).toBeNull();
    ({ state, bpm } = recordTap(state, 1500));
    expect(bpm).toBe(120);
  });

  it("ignores non-finite now and clamps BPM range", () => {
    expect(recordTap(createTapTempoState(), Number.NaN).bpm).toBeNull();
    const slow = recordTap(
      recordTap(createTapTempoState(), 0).state,
      10_000,
    );
    expect(slow.bpm).toBe(20);
    const fast = recordTap(
      recordTap(createTapTempoState(), 0).state,
      50,
    );
    expect(fast.bpm).toBe(400);
  });

  it("applyTapBpm updates existing event or inserts sorted", () => {
    const project = createProjectV5Seed(
      "p",
      "S",
      "2026-07-23T00:00:00.000Z",
    );
    const updated = applyTapBpm(project, 0, 100);
    expect(updated.tempoMap).toHaveLength(1);
    expect(updated.tempoMap[0]!.bpm).toBe(100);

    vi.stubGlobal("crypto", {
      randomUUID: () => "tap-uuid",
    });
    const withExtra = applyTapBpm(updated, 3840, 90);
    expect(withExtra.tempoMap).toHaveLength(2);
    expect(withExtra.tempoMap[1]).toMatchObject({
      id: "tempo-tap-tap-uuid",
      startTicks: 3840,
      bpm: 90,
    });
  });

  it("updates sole tempo event near song start via abs-diff < 1", () => {
    const project = createProjectV5Seed("p", "S", "2026-07-23T00:00:00.000Z");
    // seed tempo at 0; tap at fractional near 0 with trunc? atTicks usually int
    // Force single event slightly off: mutate startTicks to 0, tap atTicks 0 already covered.
    // Use startTicks 0 and atTicks that is within <1 after Math — use 0.4 via as any path:
    const near = {
      ...project,
      tempoMap: [{ id: "t0", startTicks: 0, bpm: 120 }],
    };
    // Branch: events.length===1 && Math.abs(events[0].startTicks - atTicks) < 1
    const next = applyTapBpm(near, 0, 88);
    // first branch updates existing at exact start — already covered.
    // Create event at startTicks 0, call with atTicks that differs by 0 via float coerce:
    const slightlyOff = {
      ...project,
      tempoMap: [{ id: "t0", startTicks: 0, bpm: 120 }],
    };
    // Use Object to force startTicks that abs-diff < 1 with atTicks=0 when event at 0.5? 
    // applyTapBpm uses === for existing first; then abs < 1 branch.
    const fractional = {
      ...project,
      tempoMap: [{ id: "t0", startTicks: 0.4 as unknown as number, bpm: 120 }],
    };
    const updated = applyTapBpm(fractional, 0, 77);
    expect(updated.tempoMap).toHaveLength(1);
    expect(updated.tempoMap[0]!.bpm).toBe(77);
  });

});
