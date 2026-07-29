import {
  hasExplicitTauriShellMarker,
  isDesktopShell,
  tauriInvokeAvailable,
} from "./desktopBridge.js";
import { getActiveDevSurface } from "../dev/devSurfaceState.js";
import { getStageSyncNative } from "./nativeShell.js";

export function getUiTarget(): "full" | "performer" | "console" {
  if (typeof __STAGESYNC_UI_TARGET__ !== "undefined") {
    return __STAGESYNC_UI_TARGET__;
  }
  return "full";
}

function getEffectiveUiTarget(): "full" | "performer" | "console" {
  const devSurface = getActiveDevSurface();
  if (devSurface === "performer") return "performer";
  if (devSurface === "console") return "console";
  return getUiTarget();
}

function shellKind(): string | undefined {
  const devSurface = getActiveDevSurface();
  if (devSurface === "console") return "console";
  if (devSurface === "performer") return "performer";
  return getStageSyncNative()?.shellKind?.();
}

export function isPerformerShell(): boolean {
  if (getEffectiveUiTarget() === "performer") return true;
  return shellKind() === "performer";
}

export function isConsoleShell(): boolean {
  if (getEffectiveUiTarget() === "console") return true;
  return shellKind() === "console";
}

export function isOperatorSurfaceRoute(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return true;
  if (path === "/timeline" || path.startsWith("/timeline/")) return true;
  return false;
}

function isTauriDesktopWithOsMenu(): boolean {
  if (!isDesktopShell()) return false;
  const devSurface = getActiveDevSurface();
  if (devSurface === "tauri") return true;
  return tauriInvokeAvailable() || hasExplicitTauriShellMarker();
}

/**
 * OperatorNav visibility — Tauri desktop uses OS menu; Performer / musician Client hide it.
 */
export function shouldShowOperatorNav(pathname: string): boolean {
  if (isPerformerShell()) return false;
  if (pathname === "/client" || pathname.startsWith("/client/")) return false;
  if (!isOperatorSurfaceRoute(pathname)) return false;
  if (isTauriDesktopWithOsMenu()) return false;
  return true;
}
