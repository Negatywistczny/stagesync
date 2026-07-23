import { describe, expect, it } from "vitest";
import { defaultTransportState } from "@stagesync/shared";
import {
  dismissStageCues,
  formatTransportError,
  liveDeskFromPayload,
  noteLatencySample,
  shouldAcceptServerTick,
  stageCueFromWs,
  toTransportAnchor,
  transportWsUrl,
  upsertStageCue,
} from "./transportReducer.js";

describe("transportReducer", () => {
  it("formatTransportError slices long messages", () => {
    expect(formatTransportError(new Error("boom"), "fb")).toBe("boom");
    expect(formatTransportError("x", "fb")).toBe("fb");
    expect(formatTransportError(new Error("a".repeat(600)), "fb").length).toBe(
      500,
    );
  });

  it("toTransportAnchor picks tick / tempo fields", () => {
    const state = {
      ...defaultTransportState(),
      positionTicks: 1200,
      bpm: 90,
    };
    expect(toTransportAnchor(state)).toEqual({
      positionTicks: 1200,
      bpm: 90,
      timeSignature: state.timeSignature,
      ppq: state.ppq,
    });
  });

  it("noteLatencySample clamps and EMAs", () => {
    expect(noteLatencySample(0, 1_000, 1_000_060_000)).toBe(60_000);
    const next = noteLatencySample(50_000, 1_000, 1_010_000);
    expect(next).toBeLessThanOrEqual(60_000);
    expect(next).toBeGreaterThan(40_000);
  });

  it("shouldAcceptServerTick drops older timestamps", () => {
    expect(shouldAcceptServerTick(undefined, 10)).toBe(true);
    expect(shouldAcceptServerTick(10, 10)).toBe(true);
    expect(shouldAcceptServerTick(9, 10)).toBe(false);
  });

  it("transportWsUrl maps http(s) → ws(s)", () => {
    expect(
      transportWsUrl({ protocol: "http:", host: "localhost:3000" }),
    ).toBe("ws://localhost:3000/ws/transport");
    expect(
      transportWsUrl({ protocol: "https:", host: "stage.example" }),
    ).toBe("wss://stage.example/ws/transport");
  });

  it("upsertStageCue inserts or replaces by id", () => {
    const a = {
      id: "1",
      text: "A",
      ttlMs: 1,
      sentAtMs: 1,
    };
    const b = { ...a, text: "B" };
    expect(upsertStageCue([], a)).toEqual([a]);
    expect(upsertStageCue([a], b)).toEqual([b]);
    expect(
      upsertStageCue([a], { text: "C", ttlMs: 1, sentAtMs: 2 }),
    ).toHaveLength(2);
  });

  it("dismissStageCues clearAll / by id", () => {
    const cues = [
      { id: "1", text: "A", ttlMs: 1, sentAtMs: 1 },
      { id: "2", text: "B", ttlMs: 1, sentAtMs: 2 },
    ];
    expect(dismissStageCues(cues, { clearAll: true })).toEqual({
      cues: [],
      latest: null,
    });
    expect(dismissStageCues(cues, { id: "1" })).toEqual({
      cues: [cues[1]],
      latest: cues[1],
    });
    expect(dismissStageCues(cues, {})).toEqual({
      cues,
      latest: cues[1],
    });
  });

  it("stageCueFromWs truncates text to 200 chars", () => {
    const cue = stageCueFromWs({
      id: "x",
      text: "z".repeat(250),
      ttlMs: 10,
      sentAtMs: 1,
      priority: "alert",
    });
    expect(cue.text).toHaveLength(200);
    expect(cue.priority).toBe("alert");
  });

  it("liveDeskFromPayload copies fields", () => {
    expect(
      liveDeskFromPayload({
        transpositionSemitones: -1,
        syncLeadMs: 120,
        clientEditEnabled: false,
      }),
    ).toEqual({
      transpositionSemitones: -1,
      syncLeadMs: 120,
      clientEditEnabled: false,
    });
  });
});
