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

export {
  EDIT_HISTORY_EVENT,
  RETURN_TO_LAUNCHER_HREF,
  formatUnknownError,
  type DesktopNotificationPermission,
  type DesktopUpdateInfo,
  type EditHistoryDetail,
} from "./desktop/desktopTypes.js";

export {
  canReturnToLauncher,
  canUseDesktopUpdater,
  hasExplicitTauriShellMarker,
  hasTauriWebViewMarker,
  isDesktopShell,
  isMacDesktop,
  isRealTauriWebView,
  tauriInvokeAvailable,
  usesHtmlDesktopTitleBar,
} from "./desktop/desktopShell.js";

export {
  closeAppWindow,
  minimizeAppWindow,
  quitDesktopApp,
  startWindowDragging,
  toggleAppFullscreen,
  toggleMaximizeAppWindow,
} from "./desktop/desktopWindow.js";

export {
  checkDesktopUpdate,
  installDesktopUpdate,
  openExternalUrl,
  prepareHostRestart,
  requestDesktopNotificationPermission,
  returnToLauncher,
  showDesktopNotification,
  syncEditHistoryState,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
} from "./desktop/desktopActions.js";
