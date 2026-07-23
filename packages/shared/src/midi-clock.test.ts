import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "./time.js";
import {
  MIDI_CLOCK_PPQN,
  elapsedMsToMidiClocks,
  midiClockIndexToTicks,
  midiClockIntervalMs,
  ticksPerMidiClock,
  ticksToMidiClockIndex,
  ticksToSpp,
  sppToTicks,
} from "./midi-clock.js";

describe("midi-clock", () => {
  it("maps PPQ 960 → 40 ticks per MIDI clock", () => {
    expect(ticksPerMidiClock(DEFAULT_PPQ)).toBe(DEFAULT_PPQ / MIDI_CLOCK_PPQN);
    expect(ticksPerMidiClock(960)).toBe(40);
  });

  it("rejects non-multiple PPQ", () => {
    expect(() => ticksPerMidiClock(961)).toThrow(/multiple/);
  });

  it("round-trips clock index ↔ ticks", () => {
    expect(ticksToMidiClockIndex(0)).toBe(0);
    expect(ticksToMidiClockIndex(39)).toBe(0);
    expect(ticksToMidiClockIndex(40)).toBe(1);
    expect(midiClockIndexToTicks(2)).toBe(80);
  });

  it("maps ticks ↔ SPP (16th notes)", () => {
    expect(ticksToSpp(0)).toBe(0);
    expect(ticksToSpp(-100)).toBe(0);
    expect(ticksToSpp(960)).toBe(4);
    expect(ticksToSpp(240)).toBe(1);
    expect(sppToTicks(4)).toBe(960);
    expect(sppToTicks(1)).toBe(240);
    expect(sppToTicks(16_383)).toBeGreaterThan(0);
    expect(() => sppToTicks(16_384)).toThrow(/0…16383/);
  });

  it("computes clock interval from BPM", () => {
    expect(midiClockIntervalMs(120)).toBeCloseTo(60_000 / (120 * 24), 5);
    expect(elapsedMsToMidiClocks(1000, 120)).toBeCloseTo(48, 5);
  });

  it.each([
    { label: "non-positive ppq", fn: () => ticksPerMidiClock(0), re: /multiple/ },
    { label: "negative ppq", fn: () => ticksPerMidiClock(-24), re: /multiple/ },
    { label: "non-integer ppq", fn: () => ticksPerMidiClock(24.5), re: /multiple/ },
  ] as const)("ticksPerMidiClock rejects $label", ({ fn, re }) => {
    expect(fn).toThrow(re);
  });

  it.each([
    { ticks: Number.NaN },
    { ticks: Number.POSITIVE_INFINITY },
    { ticks: Number.NEGATIVE_INFINITY },
  ] as const)("ticksToMidiClockIndex rejects non-finite ticks ($ticks)", ({ ticks }) => {
    expect(() => ticksToMidiClockIndex(ticks)).toThrow(/ticks must be finite/);
  });

  it.each([
    { clockIndex: 1.5 },
    { clockIndex: Number.NaN },
    { clockIndex: Number.POSITIVE_INFINITY },
  ] as const)(
    "midiClockIndexToTicks rejects non-integer clockIndex ($clockIndex)",
    ({ clockIndex }) => {
      expect(() => midiClockIndexToTicks(clockIndex)).toThrow(/integer/);
    },
  );

  it.each([
    { ticks: Number.NaN, ppq: DEFAULT_PPQ, re: /ticks must be finite/ },
    {
      ticks: Number.POSITIVE_INFINITY,
      ppq: DEFAULT_PPQ,
      re: /ticks must be finite/,
    },
    { ticks: 100, ppq: 0, re: /ppq must be a positive integer/ },
    { ticks: 100, ppq: -960, re: /ppq must be a positive integer/ },
    { ticks: 100, ppq: 960.5, re: /ppq must be a positive integer/ },
  ] as const)("ticksToSpp rejects $re", ({ ticks, ppq, re }) => {
    expect(() => ticksToSpp(ticks, ppq)).toThrow(re);
  });

  it.each([
    { spp: -1, ppq: DEFAULT_PPQ, re: /0…16383/ },
    { spp: 1.5, ppq: DEFAULT_PPQ, re: /0…16383/ },
    { spp: 4, ppq: 0, re: /ppq must be a positive integer/ },
    { spp: 4, ppq: 960.5, re: /ppq must be a positive integer/ },
  ] as const)("sppToTicks rejects invalid spp/ppq", ({ spp, ppq, re }) => {
    expect(() => sppToTicks(spp, ppq)).toThrow(re);
  });

  it.each([
    { bpm: 0 },
    { bpm: -120 },
    { bpm: Number.NaN },
    { bpm: Number.POSITIVE_INFINITY },
  ] as const)("midiClockIntervalMs rejects bpm=$bpm", ({ bpm }) => {
    expect(() => midiClockIntervalMs(bpm)).toThrow(/bpm must be a finite number > 0/);
  });

  it.each([
    {
      elapsedMs: Number.NaN,
      bpm: 120,
      re: /elapsedMs must be finite/,
    },
    {
      elapsedMs: Number.POSITIVE_INFINITY,
      bpm: 120,
      re: /elapsedMs must be finite/,
    },
    { elapsedMs: 1000, bpm: 0, re: /bpm must be a finite number > 0/ },
    { elapsedMs: 1000, bpm: Number.NaN, re: /bpm must be a finite number > 0/ },
  ] as const)(
    "elapsedMsToMidiClocks rejects invalid elapsed/bpm",
    ({ elapsedMs, bpm, re }) => {
      expect(() => elapsedMsToMidiClocks(elapsedMs, bpm)).toThrow(re);
    },
  );
});
