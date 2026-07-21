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

/**
 * Sidecar desktop serves UI from http://127.0.0.1 — Tauri does not inject
 * `window.__TAURI__` on that origin. Server sets this marker via STAGESYNC_SHELL.
 */
function sidecarDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w["__STAGESYNC_SHELL__"] === "desktop") return true;
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="stagesync-shell"]');
    if (meta?.getAttribute("content") === "desktop") return true;
  }
  // Tauri WebView loads http://127.0.0.1:4000 without __TAURI__; cached index.html may omit the inject script.
  const loc = window.location;
  if (loc) {
    const localHost = loc.hostname === "127.0.0.1" || loc.hostname === "localhost";
    if (localHost && loc.port === "4000") return true;
  }
  return false;
}

/** Returns true when running inside the Tauri desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  if (sidecarDesktopShell()) return true;
  const w = window as unknown as Record<string, unknown>;
  if (w["isTauri"] === true) return true;
  if (tauriGlobal()?.core?.invoke) return true;
  return Boolean(tauriInternals()?.invoke);
}

/** Normalize Tauri / Promise rejection reasons into a readable message. */
export function formatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || "Unknown error";
  }
  if (typeof err === "string") {
    return err || "Unknown error";
  }
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}") return json;
  } catch {
    /* ignore */
  }
  const fallback = String(err);
  return fallback === "undefined" || fallback === "null" ? "Unknown error" : fallback;
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(formatUnknownError(err));
}

function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const fromGlobal = tauriGlobal()?.core?.invoke;
  const invoke = fromGlobal ?? tauriInternals()?.invoke;
  if (!invoke) {
    return Promise.reject(new Error("Tauri invoke not available"));
  }
  return (invoke(cmd, args) as Promise<T>).catch((err: unknown) => {
    throw asError(err);
  });
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

/** Sync Open Recent list to the native Plik menu (desktop only, Faza B). */
export function syncNavRecentProjects(
  projects: Array<{ id: string; name: string }>,
): Promise<void> {
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_nav_recent_projects", { projects });
}

/** Open a URL in the system browser (Tauri) or a new tab (web). */
export function openExternalUrl(url: string): Promise<void> {
  if (isDesktopShell()) {
    return tauriInvoke<void>("open_external_url", { url });
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return Promise.resolve();
}
