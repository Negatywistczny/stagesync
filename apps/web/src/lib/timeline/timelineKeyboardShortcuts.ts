/**
 * Pure Timeline keyboard shortcut map (views / transport / clip edit).
 * DOM + draft side-effects stay in TimelineShell — this module only resolves
 * a KeyboardEvent-like payload to an action id.
 *
 * Tools use a Logic-style chord: first `T` opens the tools menu; the next
 * letter picks the tool and closes the menu. Bare letters never switch tools.
 *
 * Global (menu closed): W Wand, [ ] setlist, I Inspector, X Mixer, C Cycle,
 * K Metronome, U cycle-from-clip, Z Fit, T open tools menu, Space/Enter/Esc.
 * L is free (not Cycle). Tap = no hotkey (Tekst dock only).
 *
 * T-chord second key: T Pointer, P Pencil, E Eraser, I Scissors, J Join,
 * M Mute, S Solo, A Fade, G Gain, R Marquee, Y Zoom.
 */

export type TimelineToolLetterAction = {
  type: "tool-letter";
  letter: string;
};

export type TimelineShortcutAction =
  | "help-open"
  | "help-close"
  | "escape"
  | "save"
  | "undo"
  | "redo"
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "select-all"
  | "split-at-playhead"
  | "join-adjacent"
  | "zoom-h-out"
  | "zoom-h-in"
  | "zoom-v-in"
  | "zoom-v-out"
  | "fit-zoom"
  | "play-pause"
  | "play-from-selection"
  | "stop-home"
  | "cycle-toggle"
  | "metronome-toggle"
  | "cycle-from-clip"
  | "toggle-mixer"
  | "toggle-inspector"
  | "wand-tool"
  | "tool-menu-toggle"
  | "locator-left"
  | "locator-right"
  | "nudge-clip-left"
  | "nudge-clip-right"
  | "setlist-prev"
  | "setlist-next"
  | "delete-selection"
  | "tap-line-prev"
  | "tap-line-next"
  | "wand-tekst"
  | "wand-akordy"
  | "wand-both"
  | TimelineToolLetterAction;

export type TimelineShortcutInput = {
  key: string;
  code: string;
  mod: boolean;
  alt: boolean;
  shift: boolean;
  toolMenuOpen: boolean;
  wandMenuOpen: boolean;
  helpOpen: boolean;
  tapToolActive: boolean;
};

/**
 * Letters with a global binding when the tools menu is closed.
 * Not used as bare tool accelerators (tools are T-chord only).
 */
export const TIMELINE_RESERVED_TOOL_LETTERS = new Set([
  "x",
  "c",
  "k",
  "u",
  "z",
  "w",
  "i",
  "l",
  "t",
]);

/** Second key after T opens the tools menu → tool id. */
export const TIMELINE_TOOL_LETTER_IDS: Record<string, string> = {
  t: "pointer",
  p: "pencil",
  e: "eraser",
  i: "scissors",
  j: "join",
  m: "mute",
  s: "solo",
  a: "fade",
  g: "gain",
  r: "marquee",
  y: "zoom",
};

export function isReservedToolLetter(letter: string): boolean {
  return TIMELINE_RESERVED_TOOL_LETTERS.has(letter.toLowerCase());
}

/**
 * Resolve a keydown to a Timeline shortcut action.
 * Returns null when the event is not a Timeline shortcut (caller may ignore).
 */
export function resolveTimelineShortcut(
  e: TimelineShortcutInput,
): TimelineShortcutAction | null {
  const letter = e.key.length === 1 ? e.key.toLowerCase() : "";
  const space = e.key === " " || e.code === "Space";

  if (e.helpOpen && e.key === "Escape") return "help-close";

  if (!e.mod && !e.alt && (e.key === "?" || (e.shift && e.key === "/"))) {
    return "help-open";
  }

  if (e.key === "Escape") return "escape";

  // Modifier edit / zoom / clip ops (before bare letters).
  if (e.mod && !e.alt) {
    if (letter === "s") return "save";
    if (letter === "z") return e.shift ? "redo" : "undo";
    if (letter === "y") return "redo";
    if (letter === "c") return "copy";
    if (letter === "x") return "cut";
    if (letter === "v") return "paste";
    if (letter === "d") return "duplicate";
    if (letter === "a") return "select-all";
    if (letter === "t") return "split-at-playhead";
    if (letter === "j") return "join-adjacent";
    if (letter === "u") return "cycle-from-clip";
    if (e.key === "ArrowLeft") return "zoom-h-out";
    if (e.key === "ArrowRight") return "zoom-h-in";
    if (e.key === "ArrowUp") return "zoom-v-in";
    if (e.key === "ArrowDown") return "zoom-v-out";
  }

  // Transport space / shift+space
  if (!e.mod && !e.alt && space) {
    return e.shift ? "play-from-selection" : "play-pause";
  }

  // Stop + home
  if (
    !e.mod &&
    !e.alt &&
    (e.key === "Enter" || e.key === "Home" || e.code === "Home")
  ) {
    return "stop-home";
  }

  // Vocal tap tool arrows
  if (e.tapToolActive && !e.mod && !e.alt) {
    if (e.key === "ArrowUp") return "tap-line-prev";
    if (e.key === "ArrowDown") return "tap-line-next";
  }

  // Wand menu digits
  if (e.wandMenuOpen && !e.mod) {
    if (e.key === "1") return "wand-tekst";
    if (e.key === "2") return "wand-akordy";
    if (e.key === "3") return "wand-both";
  }

  // T-chord: menu open → second key picks tool (incl. T = Pointer, I = Scissors).
  if (
    e.toolMenuOpen &&
    !e.mod &&
    !e.alt &&
    !e.shift &&
    letter &&
    TIMELINE_TOOL_LETTER_IDS[letter]
  ) {
    return { type: "tool-letter", letter };
  }

  // Bare / global letters (views, transport) — never bare tool switch.
  if (!e.mod && !e.alt) {
    if (letter === "t" && !e.shift) return "tool-menu-toggle";
    if (letter === "w" && !e.shift && !e.toolMenuOpen) return "wand-tool";
    if (letter === "x" && !e.shift) return "toggle-mixer";
    if (letter === "i" && !e.shift) return "toggle-inspector";
    if (letter === "c" && !e.shift) return "cycle-toggle";
    if (letter === "k" && !e.shift) return "metronome-toggle";
    if (letter === "u") return "cycle-from-clip";
    if (letter === "z" && !e.shift) return "fit-zoom";
    if (e.key === "[" && !e.shift) return "setlist-prev";
    if (e.key === "]" && !e.shift) return "setlist-next";
  }

  // Locator vs clip nudge (⌥←/→ = nudge; bare ←/→ = locator)
  if (!e.mod && !e.shift && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
    if (e.alt) {
      return e.key === "ArrowLeft" ? "nudge-clip-left" : "nudge-clip-right";
    }
    return e.key === "ArrowLeft" ? "locator-left" : "locator-right";
  }

  if (e.key === "Delete" || e.key === "Backspace") return "delete-selection";

  return null;
}
