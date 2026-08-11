import { getActiveDevSurface } from "../../../dev/devSurfaceState.js";
import { tauriGlobal, tauriInternals } from "./desktopTypes.js";

/**
 * Sidecar desktop serves UI from http://127.0.0.1 — Tauri may omit
 * `window.__TAURI__` on that origin. Server sets this marker via STAGESYNC_SHELL.
 * Shell plugin also sets `__STAGESYNC_TAURI_SHELL__` on every WebView document.
 */
export function sidecarDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w["__STAGESYNC_TAURI_SHELL__"] === true) return true;
  if (w["__STAGESYNC_SHELL__"] === "desktop") return true;
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="stagesync-shell"]');
    if (meta?.getAttribute("content") === "desktop") return true;
  }
  const loc = window.location;
  if (loc) {
    const localHost =
      loc.hostname === "127.0.0.1" || loc.hostname === "localhost";
    if (localHost && loc.port === "4000") return true;
  }
  return false;
}

/** Explicit shell markers only — not the bare `:4000` hostname heuristic. */
export function hasExplicitTauriShellMarker(): boolean {
  if (getActiveDevSurface() === "tauri") return true;
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w["__STAGESYNC_TAURI_SHELL__"] === true) return true;
  if (w["__STAGESYNC_SHELL__"] === "desktop") return true;
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="stagesync-shell"]');
    if (meta?.getAttribute("content") === "desktop") return true;
  }
  return false;
}

/** Returns true when running inside the Tauri desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const devSurface = getActiveDevSurface();
  if (devSurface === "tauri") return true;
  if (
    devSurface === "console" ||
    devSurface === "performer" ||
    devSurface === "web"
  ) {
    return false;
  }
  if (sidecarDesktopShell()) return true;
  const w = window as unknown as Record<string, unknown>;
  if (w["isTauri"] === true) return true;
  if (tauriGlobal()?.core?.invoke) return true;
  return Boolean(tauriInternals()?.invoke);
}

/** True when the page can actually call into Tauri (not just hostname heuristics). */
export function tauriInvokeAvailable(): boolean {
  if (getActiveDevSurface() === "tauri") return true;
  return Boolean(tauriGlobal()?.core?.invoke ?? tauriInternals()?.invoke);
}

/** True when the desktop updater IPC is usable. */
export function canUseDesktopUpdater(): boolean {
  return isDesktopShell() && tauriInvokeAvailable();
}

/** True when UA looks like macOS / iOS (native menubar path). */
export function isMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * Marker injected only by the Tauri WebView init script (`return_to_launcher_plugin`).
 */
export function hasTauriWebViewMarker(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return w["__STAGESYNC_TAURI_SHELL__"] === true;
}

/** Real Tauri WebView — not a plain browser loading sidecar HTML. */
export function isRealTauriWebView(): boolean {
  if (getActiveDevSurface() === "tauri") return true;
  if (tauriInvokeAvailable()) return true;
  if (hasTauriWebViewMarker()) return true;
  return false;
}

/** Windows/Linux desktop: custom HTML title bar + menubar. */
export function usesHtmlDesktopTitleBar(): boolean {
  if (isMacDesktop()) return false;
  return isRealTauriWebView();
}

/** True when desktop can navigate back to the bundled Launcher. */
export function canReturnToLauncher(): boolean {
  return isRealTauriWebView();
}
