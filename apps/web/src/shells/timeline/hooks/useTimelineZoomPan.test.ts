// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineZoomPan } from "./useTimelineZoomPan.js";

describe("useTimelineZoomPan", () => {
  it("handles zoom horizontal and vertical step adjustments", () => {
    const scrollEl = document.createElement("div");
    scrollEl.scrollLeft = 0;
    scrollEl.scrollTop = 0;
    scrollEl.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 400,
    });

    const canvasScrollRef = { current: scrollEl };
    const viewSpanRef = { current: { start: 0, end: 3840 } };
    const barTicksRef = { current: 3840 };

    const { result } = renderHook(() =>
      useTimelineZoomPan({
        canvasScrollRef,
        viewSpanRef,
        barTicksRef,
        touchTier: "desktop",
      }),
    );

    const initialZoomH = result.current.zoomH;

    act(() => {
      result.current.zoomHorizontalBySteps(1);
    });

    expect(result.current.zoomH).toBeGreaterThan(initialZoomH);

    const initialZoomV = result.current.zoomV;

    act(() => {
      result.current.zoomVerticalBySteps(1);
    });

    expect(result.current.zoomV).toBeGreaterThan(initialZoomV);
  });

  it("handles lane height resizing and reset on double click", () => {
    const scrollEl = document.createElement("div");
    const canvasScrollRef = { current: scrollEl };
    const viewSpanRef = { current: { start: 0, end: 3840 } };
    const barTicksRef = { current: 3840 };

    const { result } = renderHook(() =>
      useTimelineZoomPan({
        canvasScrollRef,
        viewSpanRef,
        barTicksRef,
        touchTier: "desktop",
      }),
    );

    act(() => {
      result.current.onLaneResizeDblClick(
        {
          preventDefault: vi.fn(),
          stopPropagation: vi.fn(),
        } as unknown as React.MouseEvent<HTMLButtonElement>,
        "track-1",
      );
    });

    expect(result.current.laneHeights).toBeDefined();
  });
});
