// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineMarquee } from "./useTimelineMarquee.js";

describe("useTimelineMarquee", () => {
  it("begins marquee selection on pointer down and updates box on move", () => {
    const lanesCoordEl = document.createElement("div");
    lanesCoordEl.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
    });
    const scrollEl = document.createElement("div");
    scrollEl.scrollLeft = 0;
    scrollEl.scrollTop = 0;

    const toolRef = { current: "pointer" as const };
    const heldZoomRef = { current: false };
    const lanesCoordRef = { current: lanesCoordEl };
    const canvasScrollRef = { current: scrollEl };
    const zoomHBaseRef = { current: 1.0 };
    const setZoomH = vi.fn();
    const fitZoom = vi.fn();
    const clearClipSelection = vi.fn();
    const clearMapSelection = vi.fn();
    const setSelectedAnchorId = vi.fn();
    const setSongMetaOpen = vi.fn();
    const setSelectedSubsectionIdx = vi.fn();
    const setClipSelection = vi.fn();
    const setLocatorFromClientX = vi.fn();

    const { result } = renderHook(() =>
      useTimelineMarquee({
        toolRef,
        heldZoomRef,
        lanesCoordRef,
        canvasScrollRef,
        zoomHBaseRef,
        setZoomH,
        fitZoom,
        clearClipSelection,
        clearMapSelection,
        setSelectedAnchorId,
        setSongMetaOpen,
        setSelectedSubsectionIdx,
        setClipSelection,
        setLocatorFromClientX,
      }),
    );

    const downEv = {
      button: 0,
      pointerType: "mouse",
      pointerId: 1,
      clientX: 50,
      clientY: 50,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.PointerEvent<HTMLDivElement>;

    act(() => {
      result.current.beginMarquee(downEv);
    });

    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointermove", {
          pointerId: 1,
          clientX: 150,
          clientY: 150,
        }),
      );
    });

    expect(result.current.marqueeBox).not.toBeNull();
    expect(result.current.marqueeBox?.width).toBe(100);
    expect(result.current.marqueeBox?.height).toBe(100);

    act(() => {
      window.dispatchEvent(
        new PointerEvent("pointerup", {
          pointerId: 1,
          clientX: 150,
          clientY: 150,
        }),
      );
    });

    expect(result.current.marqueeBox).toBeNull();
  });
});
