// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineTransportClock } from "./useTimelineTransportClock.js";
import {
  CLOCK_DISPLAY_CHANGED_EVENT,
  CLOCK_DISPLAY_STORAGE_KEY,
} from "@lib/client/clockDisplayPrefs.js";

const mockUseTransport = vi.fn();

vi.mock("../../../transport/useTransport.js", () => ({
  useTransport: () => mockUseTransport(),
}));

describe("useTimelineTransportClock", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseTransport.mockReturnValue({
      state: {
        bpm: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        ppq: 960,
        playing: false,
      },
      displayTicks: 3840,
      wsStatus: "connected",
      commandPending: false,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      setLoop: vi.fn(),
      setSoftClockTempoMaps: vi.fn(),
      setlistSnapshot: null,
    });
  });

  it("formats clock display correctly with default format (bbt)", () => {
    const { result } = renderHook(() => useTimelineTransportClock());

    expect(result.current.clockFormat).toBe("bbt");
    expect(result.current.clockLabel).toBe("2.1");
    expect(result.current.snapMode).toBe("bar");
  });

  it("updates clock format and label when setClockFormat is called", () => {
    const { result } = renderHook(() => useTimelineTransportClock());

    act(() => {
      result.current.setClockFormat("time");
    });

    expect(result.current.clockFormat).toBe("time");
    expect(result.current.clockLabel).toBe("00:02.000");
  });

  it("updates clock format when CLOCK_DISPLAY_CHANGED_EVENT is dispatched", () => {
    const { result } = renderHook(() => useTimelineTransportClock());

    localStorage.setItem(CLOCK_DISPLAY_STORAGE_KEY, "time");
    act(() => {
      window.dispatchEvent(new Event(CLOCK_DISPLAY_CHANGED_EVENT));
    });

    expect(result.current.clockFormat).toBe("time");
    expect(result.current.clockLabel).toBe("00:02.000");
  });

  it("updates and persists snapMode", () => {
    const { result } = renderHook(() => useTimelineTransportClock());

    act(() => {
      result.current.setSnapMode("beat");
    });

    expect(result.current.snapMode).toBe("beat");
    expect(localStorage.getItem("stagesync-timeline-snap-mode")).toBe("beat");
  });
});
