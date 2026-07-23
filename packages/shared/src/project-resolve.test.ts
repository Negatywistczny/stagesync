import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "./project-seed.js";
import {
  formatKeySignature,
  resolveFormaClipAt,
  resolveKeyAt,
  resolveMeterAt,
  resolveTempoAt,
} from "./project-resolve.js";

describe("project resolvers", () => {
  const project = createProjectV5Seed(
    "id",
    "Demo",
    "2026-07-20T00:00:00.000Z",
  );

  const withMaps = {
    ...project,
    tempoMap: [
      { id: "t0", startTicks: 0, bpm: 120 },
      { id: "t1", startTicks: 7680, bpm: 90 },
    ],
    meterMap: [
      { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
      { id: "m1", startTicks: 7680, numerator: 3, denominator: 4 },
    ],
    forma: {
      clips: [
        ...project.forma.clips,
        {
          id: "forma-verse",
          name: "Verse",
          kind: "section" as const,
          startTicks: 7680,
          lengthTicks: 7680,
        },
      ],
    },
  };

  it("resolveTempoAt picks last event <= ticks", () => {
    expect(resolveTempoAt(withMaps, 0)).toBe(120);
    expect(resolveTempoAt(withMaps, 7679)).toBe(120);
    expect(resolveTempoAt(withMaps, 7680)).toBe(90);
  });

  it("resolveTempoAt falls back to defaultBpm", () => {
    expect(resolveTempoAt({ tempoMap: [], defaultBpm: 100 }, 0)).toBe(100);
  });

  it("resolveMeterAt picks last event <= ticks", () => {
    expect(resolveMeterAt(withMaps, 0)).toEqual({
      numerator: 4,
      denominator: 4,
    });
    expect(resolveMeterAt(withMaps, 7680)).toEqual({
      numerator: 3,
      denominator: 4,
    });
  });

  it("resolveMeterAt falls back to defaultMeter", () => {
    expect(
      resolveMeterAt(
        {
          meterMap: [],
          defaultMeter: { numerator: 6, denominator: 8 },
        },
        0,
      ),
    ).toEqual({ numerator: 6, denominator: 8 });
  });

  it("resolveKeyAt reads keyMap and formats signatures", () => {
    const withKeys = {
      ...project,
      keyMap: [
        {
          id: "k0",
          startTicks: 0,
          key: { tonic: "C" as const, mode: "major" as const },
        },
        {
          id: "k1",
          startTicks: 7680,
          key: { tonic: "A" as const, mode: "minor" as const },
        },
      ],
    };
    expect(resolveKeyAt(withKeys, 0)).toEqual({ tonic: "C", mode: "major" });
    expect(resolveKeyAt(withKeys, 7680)).toEqual({ tonic: "A", mode: "minor" });
    expect(formatKeySignature(resolveKeyAt(withKeys, 0))).toBe("C");
    expect(formatKeySignature(resolveKeyAt(withKeys, 7680))).toBe("Am");
    expect(formatKeySignature(null)).toBe("—");
  });

  it("resolveKeyAt returns null without keyMap events", () => {
    expect(resolveKeyAt({ ...project, keyMap: [] }, 0)).toBeNull();
    const noKey = { ...project };
    delete (noKey as { keyMap?: unknown }).keyMap;
    expect(resolveKeyAt(noKey as typeof project, 0)).toBeNull();
  });

  it("resolveFormaClipAt works in pre-roll and at tick 0", () => {
    expect(resolveFormaClipAt(withMaps, -7680)?.name).toBe("Countdown");
    expect(resolveFormaClipAt(withMaps, -1)?.name).toBe("Countdown");
    expect(resolveFormaClipAt(withMaps, 0)?.name).toBe("Intro");
    expect(resolveFormaClipAt(withMaps, 7680)?.name).toBe("Verse");
    expect(resolveFormaClipAt(withMaps, 999_999)).toBeNull();
  });
});
