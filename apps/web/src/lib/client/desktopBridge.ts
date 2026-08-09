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
      maximize?: () => Promise<void>;
      unmaximize?: () => Promise<void>;
      isMaximized?: () => Promise<boolean>;
      minimize?: () => Promise<void>;
      close?: () => Promise<void>;
      startDragging?: () => Promise<void>;
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
 * Sidecar desktop serves UI from http://127.0.0.1 — Tauri may omit
 * `window.__TAURI__` on that origin. Server sets this marker via STAGESYNC_SHELL.
 * Shell plugin also sets `__STAGESYNC_TAURI_SHELL__` on every WebView document.
 */
function sidecarDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  if (w["__STAGESYNC_TAURI_SHELL__"] === true) return true;
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

/**
 * Explicit shell markers only — not the bare `:4000` hostname heuristic
 * (that false-positives a plain browser opening the local host).
 */
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

/** Keep in sync with `apps/desktop/src-tauri/src/launcher.rs` (`RETURN_TO_LAUNCHER_HREF`). */
export const RETURN_TO_LAUNCHER_HREF = "stagesync://launcher/return";

import { getActiveDevSurface } from "../../dev/devSurfaceState.js";

/** Returns true when running inside the Tauri desktop shell. */
export function isDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  const devSurface = getActiveDevSurface();
  if (devSurface === "tauri") return true;
  if (devSurface === "console" || devSurface === "performer" || devSurface === "web") {
    return false;
  }
  if (sidecarDesktopShell()) return true;
  const w = window as unknown as Record<string, unknown>;
  if (w["isTauri"] === true) return true;
  if (tauriGlobal()?.core?.invoke) return true;
  return Boolean(tauriInternals()?.invoke);
}

/** Normalize Tauri / Promise rejection reasons into a readable message. */
export function formatUnknownError(err: unknown): string {
  let message: string;
  if (err instanceof Error) {
    message = err.message || err.name || "Unknown error";
  } else if (typeof err === "string") {
    message = err || "Unknown error";
  } else if (err && typeof err === "object" && "message" in err) {
    const raw = (err as { message: unknown }).message;
    if (typeof raw === "string" && raw.trim()) {
      message = raw;
    } else {
      message = "";
    }
  } else {
    message = "";
  }
  if (!message) {
    try {
      const json = JSON.stringify(err);
      if (json && json !== "{}") message = json;
    } catch {
      /* ignore */
    }
  }
  if (!message) {
    const fallback = String(err);
    message =
      fallback === "undefined" || fallback === "null"
        ? "Unknown error"
        : fallback;
  }
  return message.slice(0, 500);
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(formatUnknownError(err));
}

/** True when the page can actually call into Tauri (not just hostname heuristics). */
export function tauriInvokeAvailable(): boolean {
  if (getActiveDevSurface() === "tauri") return true;
  return Boolean(tauriGlobal()?.core?.invoke ?? tauriInternals()?.invoke);
}

/**
 * True when the desktop updater IPC is usable.
 * Hostname / shell markers alone are not enough — Android Console on
 * `127.0.0.1:4000` matches `isDesktopShell()` without Tauri.
 */
export function canUseDesktopUpdater(): boolean {
  return isDesktopShell() && tauriInvokeAvailable();
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

async function toggleHtmlFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

/** Check for a desktop update via tauri-plugin-updater. */
export function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  if (!canUseDesktopUpdater()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<DesktopUpdateInfo>("check_desktop_update");
}

/** Download and install a desktop update, then relaunch the shell. */
export function installDesktopUpdate(): Promise<void> {
  if (!canUseDesktopUpdater()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<void>("install_desktop_update");
}

function tauriWindowLabel(): string {
  return tauriInternals()?.metadata?.currentWindow?.label ?? "main";
}

/** True when UA looks like macOS / iOS (native menubar path). */
export function isMacDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.userAgent);
}

/**
 * Marker injected only by the Tauri WebView init script (`return_to_launcher_plugin`).
 * Unlike `__STAGESYNC_SHELL__` / meta `stagesync-shell`, this is NOT present when a
 * normal browser loads sidecar HTML that injects the desktop static marker.
 */
export function hasTauriWebViewMarker(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return w["__STAGESYNC_TAURI_SHELL__"] === true;
}

/**
 * Real Tauri WebView — not a plain browser loading sidecar HTML that injects
 * `__STAGESYNC_SHELL__=desktop` / meta `stagesync-shell`.
 */
export function isRealTauriWebView(): boolean {
  if (getActiveDevSurface() === "tauri") return true;
  if (tauriInvokeAvailable()) return true;
  if (hasTauriWebViewMarker()) return true;
  return false;
}

/**
 * Windows/Linux desktop: custom HTML title bar + menubar (#836).
 * macOS keeps the native system menu bar.
 *
 * Requires a real Tauri WebView (IPC or `__STAGESYNC_TAURI_SHELL__`).
 * Sidecar HTML injects `__STAGESYNC_SHELL__=desktop` for every client — that alone
 * must NOT show window chrome in a plain browser.
 */
export function usesHtmlDesktopTitleBar(): boolean {
  if (isMacDesktop()) return false;
  return isRealTauriWebView();
}

function currentTauriWindow() {
  return tauriGlobal()?.window?.getCurrentWindow?.();
}

async function invokeWindowPlugin(
  cmd: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  const label = tauriWindowLabel();
  await tauriInvoke<void>(cmd, { label, ...args });
}

/** Minimize the main window (custom title bar). */
export async function minimizeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.minimize) {
    await win.minimize();
    return;
  }
  await invokeWindowPlugin("plugin:window|minimize");
}

/** Toggle maximize / restore (custom title bar). */
export async function toggleMaximizeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.toggleMaximize) {
    await win.toggleMaximize();
    return;
  }
  await invokeWindowPlugin("plugin:window|toggle_maximize");
}

/** Close window (hide-to-tray on desktop). */
export async function closeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.close) {
    await win.close();
    return;
  }
  await invokeWindowPlugin("plugin:window|close");
}

/** Begin OS window drag from the custom title bar. */
export async function startWindowDragging(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.startDragging) {
    await win.startDragging();
    return;
  }
  await invokeWindowPlugin("plugin:window|start_dragging");
}

/** Full quit (Plik → Zakończ) — kills host sidecar then exits the shell. */
export function quitDesktopApp(): Promise<void> {
  if (!tauriInvokeAvailable()) {
    return Promise.reject(new Error("Tauri invoke not available"));
  }
  return tauriInvoke<void>("quit_desktop_app", {});
}

/** Native window expand via Tauri window plugin (remote localhost ACL). */
async function toggleNativeWindowViaPlugin(): Promise<void> {
  const label = tauriWindowLabel();
  const win = currentTauriWindow();

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
 *
 * Browser on :4000 can match `isDesktopShell()` via hostname heuristic without Tauri
 * inject — only take the native path when invoke is actually available, otherwise
 * HTML Fullscreen (preserves the click user-gesture).
 */
export async function toggleAppFullscreen(): Promise<void> {
  if (isDesktopShell() && tauriInvokeAvailable()) {
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

  await toggleHtmlFullscreen();
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

/** Sync Timeline draft undo/redo availability to native Edycja menu (Faza D). */
export const EDIT_HISTORY_EVENT = "stagesync:edit-history";

export type EditHistoryDetail = {
  canUndo: boolean;
  canRedo: boolean;
};

export function syncEditHistoryState(
  canUndo: boolean,
  canRedo: boolean,
): Promise<void> {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent(EDIT_HISTORY_EVENT, {
        detail: { canUndo, canRedo } satisfies EditHistoryDetail,
      }),
    );
  }
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_edit_history_state", { canUndo, canRedo });
}

/** Open a URL in the system browser (Tauri) or a new tab (web). */
export function openExternalUrl(url: string): Promise<void> {
  const raw = String(url ?? "").trim();
  if (!raw || raw.length > 2048) {
    return Promise.reject(new Error("Invalid external URL"));
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return Promise.reject(new Error("Invalid external URL"));
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Promise.reject(new Error("External URL must be http(s)"));
  }
  const safe = parsed.toString();
  if (isDesktopShell() && tauriInvokeAvailable()) {
    return tauriInvoke<void>("open_external_url", { url: safe });
  }
  window.open(safe, "_blank", "noopener,noreferrer");
  return Promise.resolve();
}

/** True when desktop can navigate back to the bundled Launcher (real Tauri only). */
export function canReturnToLauncher(): boolean {
  return isRealTauriWebView();
}

/** Desktop local host: mark intentional restart before POST /api/system/restart. */
export function prepareHostRestart(): Promise<void> {
  if (!tauriInvokeAvailable()) return Promise.resolve();
  return tauriInvoke<void>("prepare_host_restart", {}).catch(() => {});
}

export type DesktopNotificationPermission =
  | "granted"
  | "denied"
  | "default";

/**
 * Desktop toast permission via tauri-plugin-notification.
 * On Windows/macOS/Linux the plugin grants without a browser-style dialog
 * (WebView2 often reports sticky `denied` for the Web Notification API).
 */
export async function requestDesktopNotificationPermission(): Promise<DesktopNotificationPermission> {
  if (!tauriInvokeAvailable()) return "denied";
  try {
    const state = await tauriInvoke<string>(
      "plugin:notification|request_permission",
    );
    if (state === "granted" || state === "denied") return state;
    if (state === "prompt" || state === "prompt-with-rationale") return "default";
    return "granted";
  } catch {
    // Plugin missing / ACL — desktop consent is the StageSync toggle.
    return "granted";
  }
}

/** Show an OS toast from the Tauri shell (notify-rust / Windows toast). */
export async function showDesktopNotification(opts: {
  title: string;
  body: string;
}): Promise<boolean> {
  if (!tauriInvokeAvailable()) return false;
  try {
    await tauriInvoke<void>("plugin:notification|notify", {
      options: { title: opts.title, body: opts.body },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Kill local sidecar (if any) and return WebView to the host picker.
 * Prefers Tauri invoke; falls back to a navigation sentinel intercepted by the shell
 * when IPC is missing (remote LAN origin, or local :4000 without `__TAURI__` inject).
 * Plain browser + sidecar `__STAGESYNC_SHELL__` must not offer this path.
 */
export function returnToLauncher(): Promise<void> {
  if (tauriInvokeAvailable()) {
    return tauriInvoke<void>("return_to_launcher", {}).catch(() => {
      assignReturnToLauncherHref();
    });
  }
  if (hasTauriWebViewMarker() || getActiveDevSurface() === "tauri") {
    assignReturnToLauncherHref();
    return Promise.resolve();
  }
  return Promise.reject(new Error("Powrót do Launchera niedostępny w tej sesji"));
}

function assignReturnToLauncherHref(): void {
  window.location.assign(RETURN_TO_LAUNCHER_HREF);
}
