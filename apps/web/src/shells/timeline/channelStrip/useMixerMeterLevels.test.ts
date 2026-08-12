// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMixerMeterLevels } from "./useMixerMeterLevels.js";

vi.mock("@lib/audio/audioPlayback.js", () => ({
  readTrackMeterDb: vi.fn().mockReturnValue({ liveDb: -6, liveDbR: -6 }),
  readGroupBusMeterDb: vi.fn().mockReturnValue({ liveDb: -12, liveDbR: -12 }),
  readHwOutMeterDb: vi.fn().mockReturnValue({ liveDb: -18, liveDbR: -18 }),
  readMasterMeterDb: vi.fn().mockReturnValue({ leftDb: -3, rightDb: -3 }),
}));

vi.mock("@lib/audio/metronome.js", () => ({
  readClickMeterDb: vi.fn().mockReturnValue(-10),
}));

describe("useMixerMeterLevels", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes master, click and tracks meter structures", () => {
    const { result } = renderHook(() =>
      useMixerMeterLevels(["track-1"], true, {
        playing: false,
        busIds: ["bus-1"],
        hwIds: ["hw-1"],
      }),
    );

    expect(result.current.master).toBeDefined();
    expect(result.current.click).toBeDefined();
    expect(result.current.clearMasterHold).toBeInstanceOf(Function);
  });

  it("allows clearing individual peak holds", () => {
    const { result } = renderHook(() =>
      useMixerMeterLevels(["track-1"], true, {
        playing: false,
        busIds: ["bus-1"],
        hwIds: ["hw-1"],
      }),
    );

    act(() => {
      result.current.clearMasterHold();
      result.current.clearClickHold();
      result.current.clearBusHold("bus-1");
      result.current.clearHwHold("hw-1");
      result.current.clearTrackHold("track-1");
    });

    expect(result.current.master.holdL.holdDb).toBe(-60);
    expect(result.current.master.holdL.clipped).toBe(false);
    expect(result.current.click.hold.holdDb).toBe(-60);
  });
});
