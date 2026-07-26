import { describe, expect, it, vi } from "vitest";
import {
  createOperatorPinIdleWatchdog,
  shouldClearOperatorPinOnHide,
} from "./operatorPinSession.js";

describe("operatorPinSession (ADR 0017 §8a)", () => {
  it("does not clear on hide while PLAYING", () => {
    expect(shouldClearOperatorPinOnHide(true)).toBe(false);
    expect(shouldClearOperatorPinOnHide(false)).toBe(true);
  });

  it("expires after idle when not playing", () => {
    vi.useFakeTimers();
    let t = 0;
    const onExpire = vi.fn();
    const w = createOperatorPinIdleWatchdog({
      getPlaying: () => false,
      onExpire,
      idleMs: 1000,
      now: () => t,
    });
    w.touch();
    t = 1000;
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    w.dispose();
    vi.useRealTimers();
  });

  it("does not expire while PLAYING", () => {
    vi.useFakeTimers();
    let playing = true;
    let t = 0;
    const onExpire = vi.fn();
    const w = createOperatorPinIdleWatchdog({
      getPlaying: () => playing,
      onExpire,
      idleMs: 1000,
      now: () => t,
    });
    w.touch();
    w.syncPlaying();
    t = 5000;
    vi.advanceTimersByTime(5000);
    expect(onExpire).not.toHaveBeenCalled();
    playing = false;
    t = 5000;
    w.touch();
    w.syncPlaying();
    t = 6000;
    vi.advanceTimersByTime(1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    w.dispose();
    vi.useRealTimers();
  });
});
