// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineAppHeader } from "./useTimelineAppHeader.js";
import * as desktopBridge from "@lib/client/desktopBridge.js";
import * as operatorSurface from "@lib/shell-operator/operatorSurface.js";
import {
  createDraftHistory,
  pushDraftHistory,
  type DraftHistory,
} from "@lib/client/draftHistory.js";
import { EMPTY_CLIP_SELECTION } from "@lib/timeline/timelineSelection.js";
import type { Project } from "@stagesync/shared";

function createTestProject(name: string): Project {
  return {
    id: "p1",
    name,
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: { clips: [] },
    tempoMap: [],
    meterMap: [],
    keyMap: [],
    akordy: { clips: [] },
    cue: { clips: [] },
    tekst: { clips: [] },
    melody: { clips: [] },
    scoreBarMap: { anchors: [] },
    audioTracks: [],
    audioClips: [],
    assets: [],
  };
}

describe("useTimelineAppHeader", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("constructs headerHistory for desktop view correctly", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onSave = vi.fn();
    const onDiscard = vi.fn();
    const setHelpOpen = vi.fn();

    const p0 = createTestProject("Initial");
    const p1 = createTestProject("Second");
    const historyAfterPush = pushDraftHistory(createDraftHistory(p0), p1);
    const mockHistory: DraftHistory = {
      ...historyAfterPush,
      future: [
        {
          project: createTestProject("Future"),
          clipSelection: EMPTY_CLIP_SELECTION,
        },
      ],
    };

    const { result } = renderHook(() =>
      useTimelineAppHeader({
        isMobilePreview: false,
        isCompactMobile: false,
        showOperatorNav: false,
        draftHistory: mockHistory,
        dirty: true,
        savePending: false,
        onUndo,
        onRedo,
        onSave,
        onDiscard,
        helpOpen: false,
        setHelpOpen,
      }),
    );

    expect(result.current.operatorNavCompact).toBe(false);
    expect(result.current.headerHistory).toBeDefined();
    expect(result.current.headerHistory?.canUndo).toBe(true);
    expect(result.current.headerHistory?.canRedo).toBe(true);
    expect(result.current.headerHistory?.dirty).toBe(true);

    act(() => {
      result.current.headerHistory?.onUndo();
      result.current.headerHistory?.onRedo();
      result.current.headerHistory?.onSave();
      result.current.headerHistory?.onDiscard();
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("omits headerHistory when isMobilePreview is true", () => {
    const { result } = renderHook(() =>
      useTimelineAppHeader({
        isMobilePreview: true,
        isCompactMobile: true,
        showOperatorNav: true,
        draftHistory: null,
        dirty: false,
        savePending: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onDiscard: vi.fn(),
        helpOpen: false,
        setHelpOpen: vi.fn(),
      }),
    );

    expect(result.current.headerHistory).toBeUndefined();
    expect(result.current.operatorNavCompact).toBe(true);
  });

  it("handles fullscreen toggle and error state", async () => {
    vi.spyOn(operatorSurface, "shouldShowFullscreenControl").mockReturnValue(
      true,
    );
    vi.spyOn(desktopBridge, "toggleAppFullscreen").mockRejectedValueOnce(
      new Error("Fullscreen failed"),
    );

    const { result } = renderHook(() =>
      useTimelineAppHeader({
        isMobilePreview: false,
        isCompactMobile: false,
        showOperatorNav: false,
        draftHistory: null,
        dirty: false,
        savePending: false,
        onUndo: vi.fn(),
        onRedo: vi.fn(),
        onSave: vi.fn(),
        onDiscard: vi.fn(),
        helpOpen: false,
        setHelpOpen: vi.fn(),
      }),
    );

    expect(result.current.headerOnFullscreen).toBeDefined();
    expect(result.current.fullscreenButton).toBeDefined();

    await act(async () => {
      result.current.headerOnFullscreen?.();
    });

    expect(result.current.fullscreenError).toBe("Fullscreen failed");
  });
});
