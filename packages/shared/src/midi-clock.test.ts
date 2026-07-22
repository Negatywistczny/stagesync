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
});
