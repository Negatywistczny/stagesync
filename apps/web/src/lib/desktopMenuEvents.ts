/** CustomEvent bridge: Tauri OS menu → WebView (Faza B/C). */

export const DESKTOP_MENU_EVENT = "stagesync:desktop-menu";

export type DesktopMenuAction =
  | "save"
  | "transport-play"
  | "transport-stop"
  | "transport-prev"
  | "transport-next"
  | "host-qr"
  | "host-restart";

export type DesktopMenuDetail = {
  action: DesktopMenuAction | string;
};

export function isDesktopMenuAction(
  value: string,
): value is DesktopMenuAction {
  return (
    value === "save" ||
    value === "transport-play" ||
    value === "transport-stop" ||
    value === "transport-prev" ||
    value === "transport-next" ||
    value === "host-qr" ||
    value === "host-restart"
  );
}

export function parseDesktopMenuDetail(ev: Event): DesktopMenuDetail | null {
  if (!(ev instanceof CustomEvent)) return null;
  const detail = ev.detail;
  if (!detail || typeof detail !== "object") return null;
  const action = (detail as { action?: unknown }).action;
  if (typeof action !== "string" || !action) return null;
  return { action };
}
