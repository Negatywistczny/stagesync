// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineKeyboardEvents } from "./useTimelineKeyboardEvents.js";
import { DESKTOP_MENU_EVENT } from "@lib/client/desktopMenuEvents.js";

describe("useTimelineKeyboardEvents", () => {
  it("handles modifier keys for held zoom", () => {
    const keyHandlersRef = {
      current: {
        onSave: vi.fn(),
        onDiscard: vi.fn(),
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onClipCut: vi.fn(),
        onClipCopy: vi.fn(),
        onClipPaste: vi.fn(),
        zoomHorizontalBySteps: vi.fn(),
        zoomVerticalBySteps: vi.fn(),
        fitZoom: vi.fn(),
        dirty: true,
      },
    };

    const deleteSelectedFormaClip = vi.fn();
    const openPreferences = vi.fn();
    const setHelpOpen = vi.fn();

    const { result } = renderHook(() =>
      useTimelineKeyboardEvents({
        keyHandlersRef,
        deleteSelectedFormaClip,
        openPreferences,
        setHelpOpen,
        projectId: "p1",
        draftProject: {},
      }),
    );

    expect(result.current.heldZoom).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Control",
          ctrlKey: true,
          altKey: true,
        }),
      );
    });

    expect(result.current.heldZoom).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "Control",
          ctrlKey: false,
          altKey: false,
        }),
      );
    });

    expect(result.current.heldZoom).toBe(false);
  });

  it("handles desktop menu events (undo, redo, zoom, delete, preferences)", () => {
    const keyHandlers = {
      onSave: vi.fn().mockResolvedValue(undefined),
      onDiscard: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onClipCut: vi.fn(),
      onClipCopy: vi.fn(),
      onClipPaste: vi.fn(),
      zoomHorizontalBySteps: vi.fn(),
      zoomVerticalBySteps: vi.fn(),
      fitZoom: vi.fn(),
      dirty: true,
    };
    const keyHandlersRef = { current: keyHandlers };
    const deleteSelectedFormaClip = vi.fn();
    const openPreferences = vi.fn();
    const setHelpOpen = vi.fn();

    renderHook(() =>
      useTimelineKeyboardEvents({
        keyHandlersRef,
        deleteSelectedFormaClip,
        openPreferences,
        setHelpOpen,
        projectId: "p1",
        draftProject: {},
      }),
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "save" },
        }),
      );
    });
    expect(keyHandlers.onSave).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "edit-undo" },
        }),
      );
    });
    expect(keyHandlers.onUndo).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "edit-delete" },
        }),
      );
    });
    expect(deleteSelectedFormaClip).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "help-shortcuts" },
        }),
      );
    });
    expect(setHelpOpen).toHaveBeenCalledWith(true);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(DESKTOP_MENU_EVENT, {
          detail: { action: "appearance" },
        }),
      );
    });
    expect(openPreferences).toHaveBeenCalledWith("general");
  });
});
