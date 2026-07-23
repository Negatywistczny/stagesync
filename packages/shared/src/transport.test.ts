import { describe, expect, it } from "vitest";
import {
  DEFAULT_PPQ,
  LiveDeskPatchBodySchema,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
  TransportStateSchema,
  TransportTickMessageSchema,
  TransportWsServerMessageSchema,
  createProjectV5Seed,
  defaultTransportState,
  parseTransportTickPayload,
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

  it("rejects non-finite positionTicks", () => {
    expect(() =>
      TransportSeekBodySchema.parse({ positionTicks: Number.NaN }),
    ).toThrow();
    expect(() =>
      TransportSeekBodySchema.parse({ positionTicks: Number.POSITIVE_INFINITY }),
    ).toThrow();
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

  it("rejects non-finite timestamps", () => {
    const base = {
      ...defaultTransportState(),
      type: "transport_tick" as const,
    };
    expect(() =>
      TransportTickMessageSchema.parse({
        ...base,
        serverTimeMs: Number.NaN,
      }),
    ).toThrow();
    expect(() =>
      TransportTickMessageSchema.parse({
        ...base,
        serverTimeMs: 1,
        sentAtMs: Number.POSITIVE_INFINITY,
      }),
    ).toThrow();
  });
});

describe("TransportWsServerMessageSchema", () => {
  it("parses transport_tick and stage_cue by type", () => {
    const tick = {
      ...defaultTransportState(),
      type: "transport_tick" as const,
      serverTimeMs: 1,
    };
    const cue = {
      type: "stage_cue" as const,
      text: "TERAZ",
      ttlMs: 6000,
      sentAtMs: 1_700_000_000_000,
    };
    expect(TransportWsServerMessageSchema.parse(tick)).toEqual(tick);
    expect(TransportWsServerMessageSchema.parse(cue)).toEqual(cue);
  });

  it("does not treat stage_cue as a tick", () => {
    const cue = {
      type: "stage_cue" as const,
      text: "GO",
      ttlMs: 1000,
      sentAtMs: 1,
    };
    expect(TransportTickMessageSchema.safeParse(cue).success).toBe(false);
    expect(TransportWsServerMessageSchema.parse(cue).type).toBe("stage_cue");
  });

  it("parses stage_cue_dismiss by type", () => {
    const byId = {
      type: "stage_cue_dismiss" as const,
      id: "00000000-0000-4000-8000-000000000001",
      sentAtMs: 1_700_000_000_000,
    };
    const clearAll = {
      type: "stage_cue_dismiss" as const,
      clearAll: true,
      sentAtMs: 1_700_000_000_001,
    };
    expect(TransportWsServerMessageSchema.parse(byId)).toEqual(byId);
    expect(TransportWsServerMessageSchema.parse(clearAll)).toEqual(clearAll);
  });
});

describe("parseTransportTickPayload", () => {
  it("parses full ticks", () => {
    const msg = {
      ...defaultTransportState(),
      type: "transport_tick" as const,
      serverTimeMs: 42,
      sentAtMs: 99,
    };
    expect(parseTransportTickPayload(msg)).toEqual(msg);
  });

  it("coerces legacy bare TransportState (no type / serverTimeMs)", () => {
    const state = defaultTransportState();
    expect(parseTransportTickPayload(state)).toEqual({
      ...state,
      type: "transport_tick",
      serverTimeMs: 0,
    });
  });

  it("rejects unrelated payloads", () => {
    expect(() =>
      parseTransportTickPayload({ type: "stage_cue", text: "x" }),
    ).toThrow();
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

describe("LiveDeskPatchBodySchema", () => {
  it("requires at least one live-desk field", () => {
    expect(() => LiveDeskPatchBodySchema.parse({})).toThrow(
      /At least one live-desk field required/,
    );
    expect(
      LiveDeskPatchBodySchema.parse({ transpositionSemitones: 2 }),
    ).toEqual({ transpositionSemitones: 2 });
  });
});
