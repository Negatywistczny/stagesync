export interface DesktopUpdateInfo {
  available: boolean;
  version: string | null;
  current: string;
  notes: string | null;
}

export type TauriGlobal = {
  core?: {
    invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
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

export type TauriInternals = {
  invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  metadata?: { currentWindow?: { label?: string } };
};

export const RETURN_TO_LAUNCHER_HREF = "stagesync://launcher/return";
export const EDIT_HISTORY_EVENT = "stagesync:edit-history";

export type EditHistoryDetail = {
  canUndo: boolean;
  canRedo: boolean;
};

export type DesktopNotificationPermission = "granted" | "denied" | "default";

export function tauriGlobal(): TauriGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  const tauri = w["__TAURI__"];
  return tauri && typeof tauri === "object"
    ? (tauri as TauriGlobal)
    : undefined;
}

export function tauriInternals(): TauriInternals | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  const internals = w["__TAURI_INTERNALS__"];
  return internals && typeof internals === "object"
    ? (internals as TauriInternals)
    : undefined;
}

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

export function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(formatUnknownError(err));
}

export function tauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const fromGlobal = tauriGlobal()?.core?.invoke;
  const invoke = fromGlobal ?? tauriInternals()?.invoke;
  if (!invoke) {
    return Promise.reject(new Error("Tauri invoke not available"));
  }
  return (invoke(cmd, args) as Promise<T>).catch((err: unknown) => {
    throw asError(err);
  });
}
