import React, { useEffect, useCallback } from "react";
import type { NavigateFunction } from "react-router";
import type { Project, WandMode } from "@stagesync/shared";
import { resetDraftHistory } from "@lib/client/draftHistory.js";
import {
  SONG_IMPORT_EVENT,
  parseSongImportDetail,
} from "@lib/client/songImportEvents.js";
import {
  renameFormaClip,
  setCountdownBars,
} from "@lib/timeline-edit/formaInspector.js";
import { scrollCanvasToStart } from "@lib/timeline-edit/formaCanvas.js";
import {
  useTimelineShortcuts,
  type TimelineKeyHandlers,
} from "./useTimelineShortcuts.js";
import { useTimelineAudioEngineSync } from "./useTimelineAudioEngineSync.js";
import type { ToolId } from "../timelineToolsData.js";
import type { TrackVisibilityMap } from "@lib/timeline/timelineTracks.js";
import type { TimelineSurface } from "@lib/timeline/timelineSelection.js";

interface Params {
  keyHandlersRef: React.RefObject<TimelineKeyHandlers>;
  onSave: () => Promise<void>;
  savedProject: Project | null;
  projectId?: string;
  reloadProject: (id: string) => Promise<void>;
  setDraftProject: React.Dispatch<React.SetStateAction<Project | null>>;
  setDraftHistory: React.Dispatch<React.SetStateAction<any>>;
  clearClipSelection: () => void;
  onUndo: () => void;
  onRedo: () => void;
  cutClipSelection: () => boolean;
  copyClipSelection: () => boolean;
  pasteClipClipboard: (ticks: number) => boolean;
  locatorTicks: number;
  audioBuffering: boolean;
  playing: boolean;
  onPauseClick: () => void;
  onPlayClick: () => void;
  onStopClick: () => Promise<void>;
  onMetronomeToggle: () => Promise<void>;
  onLoopToggle: () => void;
  onTool: (tool: ToolId) => void;
  applyWand: (mode: WandMode) => void;
  nudgeLocator: (dir: -1 | 1) => void;
  fitZoom: () => void;
  zoomHorizontalBySteps: (steps: number, anchor?: number) => void;
  applyAbsoluteZoomH: (next: number, anchor?: number) => void;
  zoomVerticalBySteps: (steps: number) => void;
  dirty: boolean;
  savePending: boolean;
  tool: ToolId;
  prevSetlistId: string | null;
  nextSetlistId: string | null;
  songImportOpen: boolean;
  helpOpen: boolean;
  setHelpOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toolRef: React.RefObject<ToolId>;
  toolMenu: { left: number; top: number } | null;
  setToolMenu: React.Dispatch<
    React.SetStateAction<{ left: number; top: number } | null>
  >;
  wandMenuOpenRef: React.RefObject<boolean>;
  setWandMenu: React.Dispatch<
    React.SetStateAction<{ left: number; top: number } | null>
  >;
  setTool: React.Dispatch<React.SetStateAction<ToolId>>;
  eyeMenuPos: { left: number; top: number } | null;
  setEyeMenuPos: React.Dispatch<
    React.SetStateAction<{ left: number; top: number } | null>
  >;
  setEyeOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toolsVisOpen: boolean;
  setToolsVisOpen: React.Dispatch<React.SetStateAction<boolean>>;
  closeContextMenu: () => void;
  closeMobileInspector: () => void;
  duplicateClipSelection: () => void;
  selectAllClips: () => void;
  splitSelectionAtPlayhead: () => void;
  joinSelectionAdjacent: () => void;
  deleteSelectedFormaClip: () => void;
  nudgeSelectedClip: (dir: -1 | 1) => void;
  setCycleFromSelectedAudioClip: () => void;
  playFromSelectionOrLocator: () => void;
  toggleInspectorPanel: () => void;
  setTimelineSurface: React.Dispatch<React.SetStateAction<TimelineSurface>>;
  lastPointerRef: React.RefObject<{ x: number; y: number }>;
  openToolMenuAt: (x: number, y: number) => void;
  effectiveLocatorTicksRef: React.RefObject<number>;
  tapLineIndexRef: React.RefObject<number>;
  setTapLineIndex: React.Dispatch<React.SetStateAction<number>>;
  draftRef: React.RefObject<Project | null>;
  commitDraft: (p: Project) => void;
  navigate: NavigateFunction;
  draftProject: Project | null;
  setTrackVisibility: React.Dispatch<React.SetStateAction<TrackVisibilityMap>>;
  setFailedAudioAssetIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSoftClockTempoMaps: (body: any) => void;
  state: any;
  displayTicks: number;
  loopOn: boolean;
  soloAudioTrackIds: string[];
  soloBusIds: string[];
  latencyCompMs: number;
  openSongImportWizard: (asNew: boolean) => void;
  selectedClip: any;
}

export function useTimelineShortcutsAndSync({
  keyHandlersRef,
  onSave,
  savedProject,
  projectId,
  reloadProject,
  setDraftProject,
  setDraftHistory,
  clearClipSelection,
  onUndo,
  onRedo,
  cutClipSelection,
  copyClipSelection,
  pasteClipClipboard,
  locatorTicks,
  audioBuffering,
  playing,
  onPauseClick,
  onPlayClick,
  onStopClick,
  onMetronomeToggle,
  onLoopToggle,
  onTool,
  applyWand,
  nudgeLocator,
  fitZoom,
  zoomHorizontalBySteps,
  applyAbsoluteZoomH,
  zoomVerticalBySteps,
  dirty,
  savePending,
  tool,
  prevSetlistId,
  nextSetlistId,
  songImportOpen,
  helpOpen,
  setHelpOpen,
  toolRef,
  toolMenu,
  setToolMenu,
  wandMenuOpenRef,
  setWandMenu,
  setTool,
  eyeMenuPos,
  setEyeMenuPos,
  setEyeOpen,
  toolsVisOpen,
  setToolsVisOpen,
  closeContextMenu,
  closeMobileInspector,
  duplicateClipSelection,
  selectAllClips,
  splitSelectionAtPlayhead,
  joinSelectionAdjacent,
  deleteSelectedFormaClip,
  nudgeSelectedClip,
  setCycleFromSelectedAudioClip,
  playFromSelectionOrLocator,
  toggleInspectorPanel,
  setTimelineSurface,
  lastPointerRef,
  openToolMenuAt,
  effectiveLocatorTicksRef,
  tapLineIndexRef,
  setTapLineIndex,
  draftRef,
  commitDraft,
  navigate,
  draftProject,
  setTrackVisibility,
  setFailedAudioAssetIds,
  setSoftClockTempoMaps,
  state,
  displayTicks,
  loopOn,
  soloAudioTrackIds,
  soloBusIds,
  latencyCompMs,
  openSongImportWizard,
  selectedClip,
}: Params) {
  const onDiscard = useCallback(() => {
    if (!savedProject) {
      if (projectId) void reloadProject(projectId);
      return;
    }
    setDraftProject(savedProject);
    setDraftHistory(resetDraftHistory(savedProject));
    clearClipSelection();
  }, [
    clearClipSelection,
    projectId,
    reloadProject,
    savedProject,
    setDraftHistory,
    setDraftProject,
  ]);

  keyHandlersRef.current = {
    onSave,
    onDiscard,
    onUndo,
    onRedo,
    onClipCut: cutClipSelection,
    onClipCopy: copyClipSelection,
    onClipPaste: () => pasteClipClipboard(locatorTicks),
    onPlayOrPause: () => {
      if (audioBuffering) return;
      void (playing ? onPauseClick() : onPlayClick());
    },
    onStop: onStopClick,
    onMetronomeToggle,
    onLoopToggle,
    onTool,
    applyWand,
    nudgeLocator,
    fitZoom,
    zoomHorizontalBySteps,
    applyAbsoluteZoomH,
    zoomVerticalBySteps,
    dirty,
    savePending,
    playing,
    tool,
    prevSetlistId,
    nextSetlistId,
  };

  useTimelineShortcuts({
    keyHandlersRef,
    songImportOpen,
    helpOpen,
    setHelpOpen,
    toolRef,
    toolMenu,
    setToolMenu,
    wandMenuOpenRef,
    setWandMenu,
    setTool,
    eyeMenuPos,
    setEyeMenuPos,
    setEyeOpen,
    toolsVisOpen,
    setToolsVisOpen,
    closeContextMenu,
    closeMobileInspector,
    copyClipSelection,
    cutClipSelection,
    pasteClipClipboard,
    duplicateClipSelection,
    selectAllClips,
    splitSelectionAtPlayhead,
    joinSelectionAdjacent,
    deleteSelectedFormaClip,
    nudgeSelectedClip,
    setCycleFromSelectedAudioClip,
    playFromSelectionOrLocator,
    toggleInspectorPanel,
    setTimelineSurface,
    lastPointerRef,
    openToolMenuAt,
    locatorTicks,
    effectiveLocatorTicksRef,
    tapLineIndexRef,
    setTapLineIndex,
    draftRef,
    commitDraft,
    navigate,
  });

  useTimelineAudioEngineSync({
    projectId,
    draftProject,
    setDraftProject,
    setTrackVisibility,
    setFailedAudioAssetIds,
    setSoftClockTempoMaps,
    state,
    displayTicks,
    loopOn,
    soloAudioTrackIds,
    soloBusIds,
    latencyCompMs,
  });

  useEffect(() => {
    function onSongImport(ev: Event) {
      const detail = parseSongImportDetail(ev);
      if (detail?.asNew === true) {
        openSongImportWizard(true);
      } else if (detail?.asNew === false) {
        openSongImportWizard(false);
      } else {
        openSongImportWizard(!draftProject);
      }
    }
    window.addEventListener(SONG_IMPORT_EVENT, onSongImport);
    return () => window.removeEventListener(SONG_IMPORT_EVENT, onSongImport);
  }, [draftProject, openSongImportWizard]);

  const onClipRename = useCallback(
    (name: string) => {
      if (!draftProject || !selectedClip) return;
      commitDraft(renameFormaClip(draftProject, selectedClip.id, name));
    },
    [commitDraft, draftProject, selectedClip],
  );

  const onCountdownBarsChange = useCallback(
    (raw: string) => {
      if (!draftProject) return;
      const bars = Number.parseInt(raw, 10);
      if (!Number.isFinite(bars)) return;
      try {
        const next = setCountdownBars(draftProject, bars);
        if (next === draftProject) return;
        commitDraft(next);
        requestAnimationFrame(() => {
          scrollCanvasToStart(
            document.querySelector(
              "[data-canvas-scroll]",
            ) as HTMLElement | null,
          );
        });
      } catch {
        /* invalid bar count */
      }
    },
    [commitDraft, draftProject],
  );

  return {
    onDiscard,
    onClipRename,
    onCountdownBarsChange,
  };
}
