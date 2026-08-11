import { useState, useRef, useEffect, type RefObject } from "react";
import type { PreferencesTab } from "@lib/client/preferencesEvents.js";
import {
  DESKTOP_MENU_EVENT,
  parseDesktopMenuDetail,
} from "@lib/client/desktopMenuEvents.js";
import {
  isEditableKeyboardTarget,
  hasNonCollapsedDomTextSelection,
} from "@lib/client/isEditableKeyboardTarget.js";

export type KeyHandlersRef = RefObject<{
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClipCut: () => boolean;
  onClipCopy: () => boolean;
  onClipPaste: () => boolean;
  zoomHorizontalBySteps: (steps: number, centerPx?: number) => void;
  zoomVerticalBySteps: (steps: number) => void;
  fitZoom: () => void;
  dirty?: boolean;
  savePending?: boolean;
  [key: string]: unknown;
}>;

export type UseTimelineKeyboardEventsOptions = {
  keyHandlersRef: KeyHandlersRef;
  deleteSelectedFormaClip: () => void;
  openPreferences: (tab?: PreferencesTab) => void;
  setHelpOpen: (v: boolean) => void;
  projectId: string | null | undefined;
  draftProject: unknown;
};

export function useTimelineKeyboardEvents({
  keyHandlersRef,
  deleteSelectedFormaClip,
  openPreferences,
  setHelpOpen,
  projectId,
  draftProject,
}: UseTimelineKeyboardEventsOptions) {
  const [heldZoom, setHeldZoom] = useState(false);
  const heldZoomRef = useRef(heldZoom);
  heldZoomRef.current = heldZoom;

  // Modifier keys listener (Ctrl + Alt held zoom tool)
  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      const nextHeld = e.ctrlKey && e.altKey;
      if (nextHeld !== heldZoomRef.current) {
        heldZoomRef.current = nextHeld;
        setHeldZoom(nextHeld);
      }
    }
    function onKeyChange(e: KeyboardEvent) {
      if (e.key !== "Control" && e.key !== "Alt" && e.key !== "Meta") return;
      const nextHeld = e.ctrlKey && e.altKey;
      if (nextHeld !== heldZoomRef.current) {
        heldZoomRef.current = nextHeld;
        setHeldZoom(nextHeld);
      }
    }
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("keydown", onKeyChange);
    window.addEventListener("keyup", onKeyChange);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyChange);
      window.removeEventListener("keyup", onKeyChange);
    };
  }, []);

  // Wheel zoom / scroll listener
  useEffect(() => {
    const scrollEl = document.querySelector(
      "[data-canvas-scroll]",
    ) as HTMLElement | null;
    if (!scrollEl) return;

    function onWheel(e: WheelEvent) {
      if (isEditableKeyboardTarget(document.activeElement)) {
        return;
      }
      const h = keyHandlersRef.current;
      if (!h) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const steps = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
        const rect = scrollEl!.getBoundingClientRect();
        h.zoomHorizontalBySteps(steps, e.clientX - rect.left);
        return;
      }
      if (e.altKey) {
        e.preventDefault();
        const useHorizontal =
          e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
        if (useHorizontal) {
          const delta =
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          const steps = delta < 0 ? 1 : delta > 0 ? -1 : 0;
          const rect = scrollEl!.getBoundingClientRect();
          h.zoomHorizontalBySteps(steps, e.clientX - rect.left);
        } else {
          const steps = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
          h.zoomVerticalBySteps(steps);
        }
        return;
      }
      if (
        e.shiftKey &&
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        e.deltaY !== 0
      ) {
        e.preventDefault();
        scrollEl!.scrollLeft += e.deltaY;
      }
    }

    scrollEl.addEventListener("wheel", onWheel, { passive: false });
    return () => scrollEl.removeEventListener("wheel", onWheel);
  }, [projectId, draftProject, keyHandlersRef]);

  // Desktop Menu Event listener
  useEffect(() => {
    function onMenu(ev: Event) {
      const detail = parseDesktopMenuDetail(ev);
      if (!detail) return;
      const h = keyHandlersRef.current;
      if (!h) return;
      switch (detail.action) {
        case "save":
        case "file-save":
          if (h.dirty && !h.savePending) void h.onSave();
          break;
        case "edit-undo":
          h.onUndo();
          break;
        case "edit-redo":
          h.onRedo();
          break;
        case "edit-cut":
          if (hasNonCollapsedDomTextSelection()) {
            try {
              document.execCommand("cut");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipCut();
          break;
        case "edit-copy":
          if (hasNonCollapsedDomTextSelection()) {
            try {
              document.execCommand("copy");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipCopy();
          break;
        case "edit-paste":
          if (isEditableKeyboardTarget(document.activeElement)) {
            try {
              document.execCommand("paste");
            } catch {
              /* best-effort native text */
            }
            break;
          }
          h.onClipPaste();
          break;
        case "edit-delete":
          deleteSelectedFormaClip();
          break;
        case "view-zoom-in":
          h.zoomHorizontalBySteps(1);
          break;
        case "view-zoom-out":
          h.zoomHorizontalBySteps(-1);
          break;
        case "view-zoom-reset":
          h.fitZoom();
          break;
        case "appearance":
          openPreferences("general");
          break;
        case "help-shortcuts":
          setHelpOpen(true);
          break;
        default:
          break;
      }
    }
    window.addEventListener(DESKTOP_MENU_EVENT, onMenu);
    return () => window.removeEventListener(DESKTOP_MENU_EVENT, onMenu);
  }, [deleteSelectedFormaClip, keyHandlersRef, openPreferences, setHelpOpen]);

  return {
    heldZoom,
    heldZoomRef,
    setHeldZoom,
  };
}
