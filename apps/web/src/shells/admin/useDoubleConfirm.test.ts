// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDoubleConfirm } from "./useDoubleConfirm.js";

describe("useDoubleConfirm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("arms confirmation on first click and executes action on second click", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDoubleConfirm(action, "Usuń utwór"));

    expect(result.current.pending).toBe(false);
    expect(result.current.label).toBe("Usuń utwór");

    act(() => {
      result.current.arm();
    });

    expect(result.current.pending).toBe(true);
    expect(result.current.label).toBe("Potwierdź Usuń utwór");
    expect(action).not.toHaveBeenCalled();

    await act(async () => {
      result.current.arm();
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  it("times out and cancels confirmation after 4 seconds", () => {
    const action = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useDoubleConfirm(action, "Wyczyść"));

    act(() => {
      result.current.arm();
    });

    expect(result.current.pending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.pending).toBe(false);
    expect(result.current.label).toBe("Wyczyść");
  });
});
