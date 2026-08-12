// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimelineShortcutsAndSync } from "./useTimelineShortcutsAndSync.js";
import type { TimelineKeyHandlers } from "./useTimelineShortcuts.js";
import { SONG_IMPORT_EVENT } from "@lib/client/songImportEvents.js";
import type { Project } from "@stagesync/shared";

function createTestProject(): Project {
  return {
    id: "p1",
    name: "Test Song",
    formatVersion: 6 as const,
    updatedAt: new Date().toISOString(),
    ppq: 960,
    defaultBpm: 120,
    defaultMeter: { numerator: 4, denominator: 4 },
    forma: {
      clips: [
        {
          id: "cd1",
          name: "Countdown",
          kind: "countdown",
          startTicks: -3840,
          lengthTicks: 3840,
        },
        {
          id: "c1",
          name: "Verse 1",
          kind: "section",
          startTicks: 0,
          lengthTicks: 3840,
        },
      ],
    },
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

describe("useTimelineShortcutsAndSync", () => {
  let project: Project;
  let keyHandlersRef: React.RefObject<TimelineKeyHandlers>;
  let commitDraft: (next: Project) => void;
  let reloadProject: (id: string) => Promise<void>;
  let setDraftProject: React.Dispatch<React.SetStateAction<Project | null>>;
  let setDraftHistory: React.Dispatch<any>;
  let clearClipSelection: () => void;
  let openSongImportWizard: (asNew: boolean) => void;

  const mockCommitDraft = vi.fn();
  const mockReloadProject = vi.fn();
  const mockSetDraftProject = vi.fn();
  const mockSetDraftHistory = vi.fn();
  const mockClearClipSelection = vi.fn();
  const mockOpenSongImportWizard = vi.fn();

  beforeEach(() => {
    project = createTestProject();
    keyHandlersRef = { current: {} as TimelineKeyHandlers };
    vi.clearAllMocks();

    commitDraft = mockCommitDraft;
    reloadProject = mockReloadProject;
    setDraftProject = mockSetDraftProject;
    setDraftHistory = mockSetDraftHistory;
    clearClipSelection = mockClearClipSelection;
    openSongImportWizard = mockOpenSongImportWizard;
  });

  function createParams(
    overrides: Partial<Parameters<typeof useTimelineShortcutsAndSync>[0]> = {},
  ) {
    return {
      keyHandlersRef,
      onSave: vi.fn(async () => undefined),
      savedProject: null,
      projectId: "p1",
      reloadProject,
      setDraftProject,
      setDraftHistory,
      clearClipSelection,
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      cutClipSelection: vi.fn(() => false),
      copyClipSelection: vi.fn(() => false),
      pasteClipClipboard: vi.fn(() => false),
      locatorTicks: 0,
      audioBuffering: false,
      playing: false,
      onPauseClick: vi.fn(),
      onPlayClick: vi.fn(),
      onStopClick: vi.fn(async () => undefined),
      onMetronomeToggle: vi.fn(async () => undefined),
      onLoopToggle: vi.fn(),
      onTool: vi.fn(),
      applyWand: vi.fn(),
      nudgeLocator: vi.fn(),
      fitZoom: vi.fn(),
      zoomHorizontalBySteps: vi.fn(),
      applyAbsoluteZoomH: vi.fn(),
      zoomVerticalBySteps: vi.fn(),
      dirty: false,
      savePending: false,
      tool: "pointer" as const,
      prevSetlistId: null,
      nextSetlistId: null,
      songImportOpen: false,
      helpOpen: false,
      setHelpOpen: vi.fn(),
      toolRef: { current: "pointer" as const },
      toolMenu: null,
      setToolMenu: vi.fn(),
      wandMenuOpenRef: { current: false },
      setWandMenu: vi.fn(),
      setTool: vi.fn(),
      eyeMenuPos: null,
      setEyeMenuPos: vi.fn(),
      setEyeOpen: vi.fn(),
      toolsVisOpen: false,
      setToolsVisOpen: vi.fn(),
      closeContextMenu: vi.fn(),
      closeMobileInspector: vi.fn(),
      duplicateClipSelection: vi.fn(),
      selectAllClips: vi.fn(),
      splitSelectionAtPlayhead: vi.fn(),
      joinSelectionAdjacent: vi.fn(),
      deleteSelectedFormaClip: vi.fn(),
      nudgeSelectedClip: vi.fn(),
      setCycleFromSelectedAudioClip: vi.fn(),
      playFromSelectionOrLocator: vi.fn(),
      toggleInspectorPanel: vi.fn(),
      setTimelineSurface: vi.fn(),
      lastPointerRef: { current: { x: 0, y: 0 } },
      openToolMenuAt: vi.fn(),
      effectiveLocatorTicksRef: { current: 0 },
      tapLineIndexRef: { current: 0 },
      setTapLineIndex: vi.fn(),
      draftRef: { current: project },
      commitDraft,
      navigate: vi.fn(),
      draftProject: project,
      setTrackVisibility: vi.fn(),
      setFailedAudioAssetIds: vi.fn(),
      setSoftClockTempoMaps: vi.fn(),
      state: { playing: false },
      displayTicks: 0,
      loopOn: false,
      soloAudioTrackIds: [],
      soloBusIds: [],
      latencyCompMs: 0,
      openSongImportWizard,
      selectedClip: project.forma.clips[0],
      ...overrides,
    };
  }

  it("updates keyHandlersRef and handles onDiscard with savedProject", () => {
    const saved = createTestProject();
    const { result } = renderHook(() =>
      useTimelineShortcutsAndSync(createParams({ savedProject: saved })),
    );

    act(() => {
      result.current.onDiscard();
    });

    expect(mockSetDraftProject).toHaveBeenCalledWith(saved);
    expect(mockClearClipSelection).toHaveBeenCalled();
  });

  it("handles onClipRename and onCountdownBarsChange", () => {
    const { result } = renderHook(() =>
      useTimelineShortcutsAndSync(createParams()),
    );

    act(() => {
      result.current.onClipRename("Chorus 1");
    });
    expect(mockCommitDraft).toHaveBeenCalled();

    act(() => {
      result.current.onCountdownBarsChange("2");
    });
    expect(mockCommitDraft).toHaveBeenCalledTimes(2);
  });

  it("handles SONG_IMPORT_EVENT", () => {
    renderHook(() => useTimelineShortcutsAndSync(createParams()));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SONG_IMPORT_EVENT, { detail: { asNew: true } }),
      );
    });

    expect(mockOpenSongImportWizard).toHaveBeenCalledWith(true);
  });
});
