// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineShortcuts } from "./useTimelineShortcuts.js";

describe("useTimelineShortcuts", () => {
  it("triggers transport shortcuts (Space for play/pause, S for stop)", () => {
    const keyHandlers = {
      onSave: vi.fn().mockResolvedValue(undefined),
      onDiscard: vi.fn(),
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onClipCut: vi.fn(),
      onClipCopy: vi.fn(),
      onClipPaste: vi.fn(),
      onPlayOrPause: vi.fn(),
      onStop: vi.fn().mockResolvedValue(undefined),
      onMetronomeToggle: vi.fn().mockResolvedValue(undefined),
      onLoopToggle: vi.fn(),
      onTool: vi.fn(),
      applyWand: vi.fn(),
      nudgeLocator: vi.fn(),
      fitZoom: vi.fn(),
      zoomHorizontalBySteps: vi.fn(),
      applyAbsoluteZoomH: vi.fn(),
      zoomVerticalBySteps: vi.fn(),
      dirty: true,
      savePending: false,
      playing: false,
      tool: "pointer" as const,
      prevSetlistId: null,
      nextSetlistId: null,
    };

    const keyHandlersRef = { current: keyHandlers };
    const toolRef = { current: "pointer" as const };
    const wandMenuOpenRef = { current: false };

    renderHook(() =>
      useTimelineShortcuts({
        keyHandlersRef,
        songImportOpen: false,
        helpOpen: false,
        setHelpOpen: vi.fn(),
        toolRef,
        toolMenu: null,
        setToolMenu: vi.fn(),
        wandMenuOpenRef,
        setWandMenu: vi.fn(),
        setTool: vi.fn(),
        eyeMenuPos: null,
        setEyeMenuPos: vi.fn(),
        setEyeOpen: vi.fn(),
        toolsVisOpen: false,
        setToolsVisOpen: vi.fn(),
        closeContextMenu: vi.fn(),
        closeMobileInspector: vi.fn(),
        copyClipSelection: vi.fn(),
        cutClipSelection: vi.fn(),
        pasteClipClipboard: vi.fn(),
        duplicateClipSelection: vi.fn(),
        splitSelectionAtPlayhead: vi.fn(),
        joinSelectionAdjacent: vi.fn(),
        nudgeSelectedClip: vi.fn(),
        deleteSelectedFormaClip: vi.fn(),
        commitDraft: vi.fn(),
        draftRef: { current: null },
        locatorTicksRef: { current: 0 },
        locatorTicks: 0,
        undo: vi.fn(),
        redo: vi.fn(),
        canUndo: false,
        canRedo: false,
        navigate: vi.fn(),
        focusCanvas: vi.fn(),
        setSongScreenOpen: vi.fn(),
        songScreenOpen: false,
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    });
    expect(keyHandlers.onPlayOrPause).toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "s", ctrlKey: true }),
      );
    });
    expect(keyHandlers.onSave).toHaveBeenCalled();
  });
});
