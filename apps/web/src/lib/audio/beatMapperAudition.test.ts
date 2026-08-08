import { describe, expect, it, vi } from "vitest";
import {
  auditionBeatIndex,
  beatPeriodMsFromBpm,
  parseAuditionBpm,
  stopBeatMapperAudition,
  type BeatMapperAuditionVoice,
} from "./beatMapperAudition.js";

describe("beatPeriodMsFromBpm", () => {
  it("returns 500 ms at 120 BPM", () => {
    expect(beatPeriodMsFromBpm(120)).toBe(500);
  });

  it("falls back when bpm invalid", () => {
    expect(beatPeriodMsFromBpm(0)).toBe(500);
  });
});

describe("auditionBeatIndex", () => {
  const period = 500;

  it("returns -1 before audio start offset", () => {
    expect(auditionBeatIndex(100, 200, period)).toBe(-1);
  });

  it("increments on each beat period after offset", () => {
    expect(auditionBeatIndex(200, 200, period)).toBe(0);
    expect(auditionBeatIndex(699, 200, period)).toBe(0);
    expect(auditionBeatIndex(700, 200, period)).toBe(1);
  });
});

describe("parseAuditionBpm", () => {
  it("parses comma decimal", () => {
    expect(parseAuditionBpm("92,5", 120)).toBe(92.5);
  });

  it("uses fallback when empty", () => {
    expect(parseAuditionBpm("", 96)).toBe(96);
  });
});

describe("stopBeatMapperAudition", () => {
  it("clears playing flag and stops source", () => {
    const playing = { current: true };
    const stop = vi.fn();
    const disconnect = vi.fn();
    const voice: BeatMapperAuditionVoice = {
      source: { stop, disconnect, onended: vi.fn() } as unknown as AudioBufferSourceNode,
      raf: 42,
      startCtx: 0,
      startMs: 0,
      beatIdx: 0,
      epoch: 1,
    };
    stopBeatMapperAudition(voice, playing);
    expect(playing.current).toBe(false);
    expect(voice.source.onended).toBeNull();
    expect(stop).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("is safe when voice is null", () => {
    const playing = { current: true };
    stopBeatMapperAudition(null, playing);
    expect(playing.current).toBe(false);
  });
});
