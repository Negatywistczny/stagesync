import { useEffect, type RefObject } from "react";
import type { NavigateFunction } from "react-router";
import type { Project } from "@stagesync/shared";
import { TOOL_BY_KEY, type ToolId } from "../timelineToolsData.js";
import { resolveTimelineShortcut } from "@lib/timeline/timelineKeyboardShortcuts.js";
import {
  hasNonCollapsedDomTextSelection,
  isEditableKeyboardTarget,
} from "@lib/client/isEditableKeyboardTarget.js";
import { applyVocalTap, vocalTapQueue } from "@lib/client/clientVocalTap.js";
import type { TimelineSurface } from "@lib/timeline/timelineSelection.js";

export type TimelineKeyHandlers = {
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClipCut: () => boolean;
  onClipCopy: () => boolean;
  onClipPaste: () => boolean;
  onPlayOrPause: () => void;
  onStop: () => Promise<void>;
  onMetronomeToggle: () => Promise<void>;
  onLoopToggle: () => void;
  onTool: (id: ToolId) => void;
  applyWand: (mode: "tekst" | "akordy" | "both") => void;
  nudgeLocator: (dir: -1 | 1) => void;
  fitZoom: () => void;
  zoomHorizontalBySteps: (steps: number, anchorViewportX?: number) => void;
  applyAbsoluteZoomH: (next: number, anchorViewportX?: number) => void;
  zoomVerticalBySteps: (steps: number) => void;
  dirty: boolean;
  savePending: boolean;
  playing: boolean;
  tool: ToolId;
  prevSetlistId: string | null;
  nextSetlistId: string | null;
};

export type UseTimelineShortcutsParams = {
  keyHandlersRef: RefObject<TimelineKeyHandlers>;
  songImportOpen: boolean;
  helpOpen: boolean;
  setHelpOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toolRef: RefObject<ToolId>;
  toolMenu: { left: number; top: number } | null;
  setToolMenu: (menu: { left: number; top: number } | null) => void;
  wandMenuOpenRef: RefObject<boolean>;
  setWandMenu: (menu: { left: number; top: number } | null) => void;
  setTool: (tool: ToolId | ((prev: ToolId) => ToolId)) => void;
  eyeMenuPos: { left: number; top: number } | null;
  setEyeMenuPos: (pos: { left: number; top: number } | null) => void;
  setEyeOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toolsVisOpen: boolean;
  setToolsVisOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  closeContextMenu: () => void;
  closeMobileInspector: () => void;
  copyClipSelection: () => void;
  cutClipSelection: () => void;
  pasteClipClipboard: (locatorTicks: number) => void;
  duplicateClipSelection: () => void;
  selectAllClips: () => void;
  splitSelectionAtPlayhead: () => void;
  joinSelectionAdjacent: () => void;
  deleteSelectedFormaClip: () => void;
  nudgeSelectedClip: (dir: -1 | 1) => void;
  setCycleFromSelectedAudioClip: () => void;
  playFromSelectionOrLocator: () => Promise<void> | void;
  toggleInspectorPanel: () => void;
  setTimelineSurface: (
    surface: TimelineSurface | ((prev: TimelineSurface) => TimelineSurface),
  ) => void;
  lastPointerRef: RefObject<{ x: number; y: number }>;
  openToolMenuAt: (x: number, y: number) => void;
  locatorTicks: number;
  effectiveLocatorTicksRef: RefObject<number>;
  tapLineIndexRef: RefObject<number>;
  setTapLineIndex: (idx: number | ((prev: number) => number)) => void;
  draftRef: RefObject<Project | null>;
  commitDraft: (next: Project) => void;
  navigate: NavigateFunction;
};

export function useTimelineShortcuts({
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
}: UseTimelineShortcutsParams) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      if (songImportOpen) {
        return;
      }
      const h = keyHandlersRef.current;
      if (!h) return;

      const action = resolveTimelineShortcut({
        key: e.key,
        code: e.code,
        mod: e.metaKey || e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        toolMenuOpen: Boolean(toolMenu),
        wandMenuOpen: Boolean(wandMenuOpenRef.current),
        helpOpen,
        tapToolActive: toolRef.current === "tap",
      });
      if (!action) return;

      if (typeof action === "object" && action.type === "tool-letter") {
        const pick = TOOL_BY_KEY[action.letter];
        if (pick) {
          e.preventDefault();
          h.onTool(pick.id);
        }
        return;
      }

      if (
        (action === "copy" || action === "cut") &&
        hasNonCollapsedDomTextSelection()
      ) {
        return;
      }

      e.preventDefault();

      switch (action) {
        case "help-open":
          setHelpOpen(true);
          return;
        case "help-close":
          setHelpOpen(false);
          return;
        case "escape": {
          if (toolMenu) {
            setToolMenu(null);
            return;
          }
          if (wandMenuOpenRef.current) {
            setWandMenu(null);
            setTool("pointer");
            return;
          }
          if (eyeMenuPos) {
            setEyeMenuPos(null);
            setEyeOpen(false);
            return;
          }
          if (toolsVisOpen) {
            setToolsVisOpen(false);
            return;
          }
          closeContextMenu();
          if (toolRef.current === "tap") {
            setTool("pointer");
            return;
          }
          if (toolRef.current !== "pointer") {
            setTool("pointer");
          }
          closeMobileInspector();
          return;
        }
        case "save":
          if (h.dirty && !h.savePending) void h.onSave();
          return;
        case "undo":
          h.onUndo();
          return;
        case "redo":
          h.onRedo();
          return;
        case "copy":
          copyClipSelection();
          return;
        case "cut":
          cutClipSelection();
          return;
        case "paste":
          pasteClipClipboard(locatorTicks);
          return;
        case "duplicate":
          duplicateClipSelection();
          return;
        case "select-all":
          selectAllClips();
          return;
        case "split-at-playhead":
          splitSelectionAtPlayhead();
          return;
        case "join-adjacent":
          joinSelectionAdjacent();
          return;
        case "zoom-h-out":
          h.zoomHorizontalBySteps(-1);
          return;
        case "zoom-h-in":
          h.zoomHorizontalBySteps(1);
          return;
        case "zoom-v-in":
          h.zoomVerticalBySteps(1);
          return;
        case "zoom-v-out":
          h.zoomVerticalBySteps(-1);
          return;
        case "fit-zoom":
          h.fitZoom();
          return;
        case "play-pause": {
          if (toolRef.current === "tap") {
            const draft = draftRef.current;
            if (!draft) return;
            const queue = vocalTapQueue(draft);
            const clip = queue[tapLineIndexRef.current];
            if (!clip) return;
            const next = applyVocalTap(
              draft,
              clip.id,
              effectiveLocatorTicksRef.current,
            );
            commitDraft(next);
            setTapLineIndex((i) =>
              Math.min(i + 1, Math.max(0, queue.length - 1)),
            );
            return;
          }
          h.onPlayOrPause();
          return;
        }
        case "play-from-selection":
          void playFromSelectionOrLocator();
          return;
        case "stop-home":
          void h.onStop();
          return;
        case "cycle-toggle":
          h.onLoopToggle();
          return;
        case "metronome-toggle":
          void h.onMetronomeToggle();
          return;
        case "cycle-from-clip":
          setCycleFromSelectedAudioClip();
          return;
        case "toggle-mixer":
          setTimelineSurface((s) => (s === "mixer" ? "timeline" : "mixer"));
          return;
        case "toggle-inspector":
          toggleInspectorPanel();
          return;
        case "wand-tool":
          h.onTool("wand");
          return;
        case "tool-menu-toggle": {
          if (toolMenu) {
            setToolMenu(null);
            return;
          }
          const pt = lastPointerRef.current;
          openToolMenuAt(
            pt.x || window.innerWidth / 2,
            pt.y || window.innerHeight / 2,
          );
          return;
        }
        case "locator-left":
          h.nudgeLocator(-1);
          return;
        case "locator-right":
          h.nudgeLocator(1);
          return;
        case "nudge-clip-left":
          nudgeSelectedClip(-1);
          return;
        case "nudge-clip-right":
          nudgeSelectedClip(1);
          return;
        case "setlist-prev": {
          const id = h.prevSetlistId;
          if (id) navigate(`/timeline/${id}`);
          return;
        }
        case "setlist-next": {
          const id = h.nextSetlistId;
          if (id) navigate(`/timeline/${id}`);
          return;
        }
        case "delete-selection":
          deleteSelectedFormaClip();
          return;
        case "tap-line-prev": {
          setTapLineIndex((i) => Math.max(0, i - 1));
          return;
        }
        case "tap-line-next": {
          const draft = draftRef.current;
          const queue = draft ? vocalTapQueue(draft) : [];
          const max = Math.max(0, queue.length - 1);
          setTapLineIndex((i) => Math.min(max, i + 1));
          return;
        }
        case "wand-tekst":
          h.applyWand("tekst");
          return;
        case "wand-akordy":
          h.applyWand("akordy");
          return;
        case "wand-both":
          h.applyWand("both");
          return;
        default:
          return;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
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
  ]);
}
