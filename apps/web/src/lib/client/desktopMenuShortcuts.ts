/**
 * Keyboard accelerators for Windows/Linux HTML menubar (#836).
 * Parity with former Tauri MenuItem shortcuts (macOS keeps native accelerators).
 */

import { isEditableKeyboardTarget } from "./isEditableKeyboardTarget.js";
import { DESKTOP_MENU_EVENT } from "./desktopMenuEvents.js";

function dispatchMenuAction(action: string): void {
  window.dispatchEvent(
    new CustomEvent(DESKTOP_MENU_EVENT, { detail: { action } }),
  );
}

function isBlockingModalOpen(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[role="dialog"][aria-modal]'));
}

/**
 * Handle a keydown for desktop HTML menu shortcuts.
 * Returns true when the event was consumed.
 */
export function handleDesktopMenuShortcut(ev: KeyboardEvent): boolean {
  if (ev.defaultPrevented) return false;
  if (isEditableKeyboardTarget(ev.target)) return false;
  if (isBlockingModalOpen()) return false;

  const mod = ev.metaKey || ev.ctrlKey;
  const alt = ev.altKey;
  const shift = ev.shiftKey;

  // F11 fullscreen
  if (!mod && !alt && !shift && (ev.key === "F11" || ev.code === "F11")) {
    ev.preventDefault();
    dispatchMenuAction("view-fullscreen");
    return true;
  }

  // Alt+Arrow transport (history nav already prevented elsewhere)
  if (alt && !mod && !shift) {
    if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      dispatchMenuAction("transport-prev");
      return true;
    }
    if (ev.key === "ArrowRight") {
      ev.preventDefault();
      dispatchMenuAction("transport-next");
      return true;
    }
  }

  if (!mod || alt) return false;

  // Ctrl+/
  if (!shift && (ev.key === "/" || ev.code === "Slash")) {
    ev.preventDefault();
    dispatchMenuAction("help-shortcuts");
    return true;
  }

  // Ctrl+Q quit
  if (!shift && (ev.key === "q" || ev.key === "Q" || ev.code === "KeyQ")) {
    ev.preventDefault();
    dispatchMenuAction("app-quit");
    return true;
  }

  // Ctrl+N / O / S
  if (!shift && (ev.key === "n" || ev.key === "N" || ev.code === "KeyN")) {
    ev.preventDefault();
    dispatchMenuAction("file-new");
    return true;
  }
  if (!shift && (ev.key === "o" || ev.key === "O" || ev.code === "KeyO")) {
    ev.preventDefault();
    dispatchMenuAction("file-open");
    return true;
  }
  if (!shift && (ev.key === "s" || ev.key === "S" || ev.code === "KeyS")) {
    ev.preventDefault();
    dispatchMenuAction("file-save");
    return true;
  }
  if (shift && (ev.key === "s" || ev.key === "S" || ev.code === "KeyS")) {
    ev.preventDefault();
    dispatchMenuAction("file-save-as");
    return true;
  }

  // Undo / redo
  if (!shift && (ev.key === "z" || ev.key === "Z" || ev.code === "KeyZ")) {
    ev.preventDefault();
    dispatchMenuAction("edit-undo");
    return true;
  }
  if (
    (shift && (ev.key === "z" || ev.key === "Z" || ev.code === "KeyZ")) ||
    (!shift && (ev.key === "y" || ev.key === "Y" || ev.code === "KeyY"))
  ) {
    ev.preventDefault();
    dispatchMenuAction("edit-redo");
    return true;
  }

  // Clipboard — only when not editable (editable uses OS); Timeline handles via event
  if (!shift && (ev.key === "x" || ev.key === "X" || ev.code === "KeyX")) {
    ev.preventDefault();
    dispatchMenuAction("edit-cut");
    return true;
  }
  if (!shift && (ev.key === "c" || ev.key === "C" || ev.code === "KeyC")) {
    ev.preventDefault();
    dispatchMenuAction("edit-copy");
    return true;
  }
  if (!shift && (ev.key === "v" || ev.key === "V" || ev.code === "KeyV")) {
    ev.preventDefault();
    dispatchMenuAction("edit-paste");
    return true;
  }
  if (!shift && (ev.key === "a" || ev.key === "A" || ev.code === "KeyA")) {
    ev.preventDefault();
    dispatchMenuAction("edit-select-all");
    return true;
  }

  // Zoom
  if (!shift && (ev.key === "=" || ev.key === "+" || ev.code === "Equal")) {
    ev.preventDefault();
    dispatchMenuAction("view-zoom-in");
    return true;
  }
  if (!shift && (ev.key === "-" || ev.code === "Minus")) {
    ev.preventDefault();
    dispatchMenuAction("view-zoom-out");
    return true;
  }
  if (!shift && (ev.key === "0" || ev.code === "Digit0")) {
    ev.preventDefault();
    dispatchMenuAction("view-zoom-reset");
    return true;
  }

  return false;
}
