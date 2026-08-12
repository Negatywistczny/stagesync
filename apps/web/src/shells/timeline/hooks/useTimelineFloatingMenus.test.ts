// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineFloatingMenus } from "./useTimelineFloatingMenus.js";

describe("useTimelineFloatingMenus", () => {
  it("opens tool menu at clamped coordinates and selects tool", () => {
    const setTool = vi.fn();
    const lastPointerRef = { current: { x: 100, y: 100 } };
    const setTouchAlertOpen = vi.fn();

    const { result } = renderHook(() =>
      useTimelineFloatingMenus({
        setTool,
        lastPointerRef,
        isMobilePreview: false,
        setTouchAlertOpen,
      }),
    );

    act(() => {
      result.current.openToolMenuAt(200, 300);
    });

    expect(result.current.toolMenu).toEqual({
      left: 200,
      top: 300,
    });

    act(() => {
      result.current.onTool("scissors");
    });

    expect(setTool).toHaveBeenCalledWith("scissors");
    expect(result.current.toolMenu).toBeNull();
  });

  it("handles eye menu open toggle and positioning", () => {
    const setTool = vi.fn();
    const lastPointerRef = { current: { x: 100, y: 100 } };
    const setTouchAlertOpen = vi.fn();

    const { result } = renderHook(() =>
      useTimelineFloatingMenus({
        setTool,
        lastPointerRef,
        isMobilePreview: false,
        setTouchAlertOpen,
      }),
    );

    act(() => {
      result.current.setEyeOpen(true);
    });

    expect(result.current.eyeOpen).toBe(true);

    act(() => {
      result.current.setEyeOpen(false);
    });

    expect(result.current.eyeOpen).toBe(false);
    expect(result.current.eyeMenuPos).toBeNull();
  });
});
