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
});
