import {
  hasExplicitTauriShellMarker,
  isDesktopShell,
  tauriInvokeAvailable,
} from "@lib/client/desktopBridge.js";
import { getStageSyncNative } from "@lib/client/nativeShell.js";
import { getActiveDevSurface } from "../../dev/devSurfaceState.js";
import { hasOperatorSession } from "./operatorSession.js";

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

export function getEffectiveShellKind(): string | undefined {
  return shellKind();
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

/**
 * Real Tauri desktop (OS menu SSOT) — not `:4000` hostname heuristic alone,
 * and not Android Console / Performer.
 */
export function isOsMenuDesktopShell(): boolean {
  if (!isDesktopShell()) return false;
  const devSurface = getActiveDevSurface();
  if (devSurface === "tauri") return true;
  // Real Tauri (invoke / shell marker) wins over DEV hostname heuristics.
  if (tauriInvokeAvailable() || hasExplicitTauriShellMarker()) return true;
  // Browser `pnpm dev` with desktop hostname alone is not OS-menu Tauri.
  if (import.meta.env.DEV && devSurface === null) return false;
  return false;
}

/**
 * Phone compact chrome (≤640px OperatorNav / player-only Timeline / compact headers).
 * Viewport-gated via `useMqMobileCompact` / `detectTimelineTier` — same on Web, Console, and Tauri.
 */
export function shouldUseMobileCompactChrome(): boolean {
  return true;
}

function isClientRoute(pathname: string): boolean {
  return pathname === "/client" || pathname.startsWith("/client/");
}

/**
 * Web browser LAN operator — operator session in sessionStorage applies only here.
 * Desktop Tauri, Android Console, and Performer use fixed shell behavior.
 */
export function isWebBrowserSurface(): boolean {
  if (isPerformerShell()) return false;
  if (isConsoleShell()) return false;
  if (isOsMenuDesktopShell()) return false;
  return true;
}

/**
 * Fullscreen control (HTML Fullscreen API) — web browser only.
 * Hidden on Tauri (OS window / menu), Console, and Performer.
 */
export function shouldShowFullscreenControl(): boolean {
  return isWebBrowserSurface();
}

/**
 * OperatorNav visibility for operator routes (Admin / Timeline) and Client when allowed.
 * Shells show the compact bar only at ≤640px; at wider widths they keep desktop chrome
 * (Tauri OS menu still hides AppHeader via `isOsMenuDesktopShell`).
 * Performer / musician Client hide it. On /client, web shows nav only with an active
 * operator session; Console always shows it; Tauri Client has no web operator session.
 */
export function shouldShowOperatorNav(pathname: string): boolean {
  if (isPerformerShell()) return false;

  if (isClientRoute(pathname)) {
    if (isConsoleShell()) return true;
    if (isWebBrowserSurface()) return hasOperatorSession();
    return false;
  }

  if (!isOperatorSurfaceRoute(pathname)) return false;
  return true;
}

export { setDevSurfaceOverride, getDevSurfaceOverride } from "../../dev/devSurfaceState.js";
