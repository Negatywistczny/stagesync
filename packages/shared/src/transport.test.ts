import { describe, expect, it } from "vitest";
import {
  DEFAULT_PPQ,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
  TransportStateSchema,
  TransportTickMessageSchema,
  createProjectV5Seed,
  defaultTransportState,
  transportHomeTicks,
} from "./index.js";

describe("TransportStateSchema", () => {
  it("parses default transport state", () => {
    const state = defaultTransportState();
    expect(TransportStateSchema.parse(state)).toEqual(state);
    expect(state.ppq).toBe(DEFAULT_PPQ);
  });

  it("rejects non-integer positionTicks", () => {
    expect(() =>
      TransportStateSchema.parse({
        ...defaultTransportState(),
        positionTicks: 1.5,
      }),
    ).toThrow();
  });
});

describe("TransportSeekBodySchema", () => {
  it("accepts integer ticks including negative", () => {
    expect(TransportSeekBodySchema.parse({ positionTicks: -100 })).toEqual({
      positionTicks: -100,
    });
  });
});

describe("TransportPlayBodySchema", () => {
  it("allows empty body", () => {
    expect(TransportPlayBodySchema.parse({})).toEqual({});
  });

  it("accepts bpm and timeSignature", () => {
    expect(
      TransportPlayBodySchema.parse({
        bpm: 90,
        timeSignature: { numerator: 5, denominator: 8 },
      }),
    ).toEqual({
      bpm: 90,
      timeSignature: { numerator: 5, denominator: 8 },
    });
  });
});

describe("TransportTickMessageSchema", () => {
  it("requires type and serverTimeMs", () => {
    const msg = {
      ...defaultTransportState(),
      type: "transport_tick" as const,
      serverTimeMs: 12.5,
    };
    expect(TransportTickMessageSchema.parse(msg)).toEqual(msg);
  });

  it("accepts optional sentAtMs for latency", () => {
    const msg = {
      ...defaultTransportState(),
      type: "transport_tick" as const,
      serverTimeMs: 12.5,
      sentAtMs: 1_700_000_000_000,
    };
    expect(TransportTickMessageSchema.parse(msg)).toEqual(msg);
  });
});

describe("transportHomeTicks", () => {
  it("returns Countdown startTicks when present", () => {
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-000000000001",
      "P",
      "2026-07-21T00:00:00.000Z",
    );
    const cd = project.forma.clips.find((c) => c.kind === "countdown")!;
    expect(transportHomeTicks(project)).toBe(cd.startTicks);
    expect(transportHomeTicks(project)).toBeLessThan(0);
  });

  it("returns 0 without Countdown or project", () => {
    expect(transportHomeTicks(undefined)).toBe(0);
    expect(transportHomeTicks(null)).toBe(0);
    expect(
      transportHomeTicks({
        forma: {
          clips: [
            {
              kind: "section",
              startTicks: 0,
            },
          ],
        },
      }),
    ).toBe(0);
  });
});
