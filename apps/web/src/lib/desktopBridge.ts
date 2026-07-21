/**
 * desktopBridge.ts — thin wrapper around Tauri invoke API.
 *
 * Detects whether the app is running inside a Tauri shell and exposes
 * update-related commands. Falls back gracefully in the browser.
 *
 * Prefer `window.__TAURI__` (withGlobalTauri) with fallback to
 * __TAURI_INTERNALS__ — no hard build-time dependency on @tauri-apps/api.
 *
 * ACL: this module must NOT import from apps/server (ESLint ACL rule).
 */

export interface DesktopUpdateInfo {
  available: boolean;
  version: string | null;
  current: string;
  notes: string | null;
}

type TauriGlobal = {
  core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  window?: {
    getCurrentWindow?: () => {
      toggleMaximize?: () => Promise<void>;
      setFullscreen?: (fullscreen: boolean) => Promise<void>;
      isFullscreen?: () => Promise<boolean>;
    };
  };
};

type TauriInternals = {
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  metadata?: { currentWindow?: { label?: string } };
};

function tauriGlobal(): TauriGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  const tauri = w["__TAURI__"];
  return tauri && typeof tauri === "object" ? (tauri as TauriGlobal) : undefined;
}

function tauriInternals(): TauriInternals | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  const internals = w["__TAURI_INTERNALS__"];
  return internals && typeof internals === "object" ? (internals as TauriInternals) : undefined;
}

/** Returns true when running inside the Tauri desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w["isTauri"] === true) return true;
  if (tauriGlobal()?.core?.invoke) return true;
  return Boolean(tauriInternals()?.invoke);
}

function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const fromGlobal = tauriGlobal()?.core?.invoke;
  if (fromGlobal) {
    return fromGlobal(cmd, args) as Promise<T>;
  }
  const fromInternals = tauriInternals()?.invoke;
  if (fromInternals) {
    return fromInternals(cmd, args) as Promise<T>;
  }
  return Promise.reject(new Error("Tauri invoke not available"));
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

function tauriWindowLabel(): string {
  return tauriInternals()?.metadata?.currentWindow?.label ?? "main";
}

function isMacDesktop(): boolean {
  return /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

/** Native window expand via Tauri window plugin (remote localhost ACL). */
async function toggleNativeWindowViaPlugin(): Promise<void> {
  const label = tauriWindowLabel();
  const win = tauriGlobal()?.window?.getCurrentWindow?.();

  if (isMacDesktop()) {
    if (win?.toggleMaximize) {
      await win.toggleMaximize();
      return;
    }
    await tauriInvoke<void>("plugin:window|toggle_maximize", { label });
    return;
  }

  if (win?.isFullscreen && win.setFullscreen) {
    const isFs = await win.isFullscreen();
    await win.setFullscreen(!isFs);
    return;
  }

  const isFs = await tauriInvoke<boolean>("plugin:window|is_fullscreen", { label });
  await tauriInvoke<void>("plugin:window|set_fullscreen", { label, value: !isFs });
}

/**
 * Fullscreen: native Tauri window in desktop shell; HTML Fullscreen API in browser.
 * macOS desktop uses maximize (green-button UX); other platforms use true fullscreen.
 */
export async function toggleAppFullscreen(): Promise<void> {
  if (isDesktopShell()) {
    const errors: string[] = [];

    try {
      await toggleNativeWindowViaPlugin();
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    try {
      await tauriInvoke<void>("toggle_window_fullscreen");
      return;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    throw new Error(
      `Desktop fullscreen failed (${errors.join("; ") || "no native path available"})`,
    );
  }

  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

/** Sync last Timeline project id to the native menu (desktop only). */
export function syncNavTimelineProjectId(projectId: string | null): Promise<void> {
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_nav_timeline_project_id", {
    projectId,
  });
}

/** Open a URL in the system browser (Tauri) or a new tab (web). */
export function openExternalUrl(url: string): Promise<void> {
  if (isDesktopShell()) {
    return tauriInvoke<void>("open_external_url", { url });
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return Promise.resolve();
}
