/**
 * desktopBridge.ts — thin wrapper around Tauri invoke API.
 *
 * Detects whether the app is running inside a Tauri shell and exposes
 * update-related commands. Falls back gracefully in the browser.
 *
 * Uses the raw Tauri global (__TAURI_INTERNALS__) to avoid a hard
 * build-time dependency on @tauri-apps/api in the web bundle.
 *
 * ACL: this module must NOT import from apps/server (ESLint ACL rule).
 */

export interface DesktopUpdateInfo {
  available: boolean;
  version: string | null;
  current: string;
  notes: string | null;
}

/** Returns true when running inside the Tauri desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return "__TAURI_INTERNALS__" in w && typeof w["__TAURI_INTERNALS__"] === "object";
}

function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const w = window as unknown as Record<string, unknown>;
  const internals = w["__TAURI_INTERNALS__"] as
    | { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<T> }
    | undefined;
  if (!internals?.invoke) {
    return Promise.reject(new Error("Tauri invoke not available"));
  }
  return internals.invoke(cmd, args);
}

/** Check for a desktop update via tauri-plugin-updater. */
export function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  if (!isDesktopShell()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<DesktopUpdateInfo>("check_desktop_update");
}

/** Download and install a desktop update, then relaunch the shell. */
export function installDesktopUpdate(): Promise<void> {
  if (!isDesktopShell()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<void>("install_desktop_update");
}
