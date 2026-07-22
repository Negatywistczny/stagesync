/** CustomEvent bridge: Tauri OS menu → WebView (Faza B/C/D). */

export const DESKTOP_MENU_EVENT = "stagesync:desktop-menu";

export type DesktopMenuAction =
  | "save"
  | "transport-play"
  | "transport-stop"
  | "transport-prev"
  | "transport-next"
  | "host-qr"
  | "host-restart"
  | "edit-undo"
  | "edit-redo"
  | "edit-cut"
  | "edit-copy"
  | "edit-paste"
  | "edit-delete"
  | "view-zoom-in"
  | "view-zoom-out"
  | "view-zoom-reset"
  | "help-shortcuts"
  | "preferences";

export type DesktopMenuDetail = {
  action: DesktopMenuAction | string;
};

const KNOWN: ReadonlySet<string> = new Set([
  "save",
  "transport-play",
  "transport-stop",
  "transport-prev",
  "transport-next",
  "host-qr",
  "host-restart",
  "edit-undo",
  "edit-redo",
  "edit-cut",
  "edit-copy",
  "edit-paste",
  "edit-delete",
  "view-zoom-in",
  "view-zoom-out",
  "view-zoom-reset",
  "help-shortcuts",
  "preferences",
]);

export function isDesktopMenuAction(
  value: string,
): value is DesktopMenuAction {
  return KNOWN.has(value);
}

export function parseDesktopMenuDetail(ev: Event): DesktopMenuDetail | null {
  if (!(ev instanceof CustomEvent)) return null;
  const detail = ev.detail;
  if (!detail || typeof detail !== "object") return null;
  const action = (detail as { action?: unknown }).action;
  if (typeof action !== "string" || !action) return null;
  return { action };
}
