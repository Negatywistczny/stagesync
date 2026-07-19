import { describe, expect, it } from "vitest";
import {
  DEFAULT_PPQ,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
  TransportStateSchema,
  TransportTickMessageSchema,
  defaultTransportState,
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
});
