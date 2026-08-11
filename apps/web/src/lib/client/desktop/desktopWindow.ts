import { tauriGlobal, tauriInternals, tauriInvoke } from "./desktopTypes.js";
import {
  isDesktopShell,
  isMacDesktop,
  tauriInvokeAvailable,
} from "./desktopShell.js";

function tauriWindowLabel(): string {
  return tauriInternals()?.metadata?.currentWindow?.label ?? "main";
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

export async function minimizeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.minimize) {
    await win.minimize();
    return;
  }
  await invokeWindowPlugin("plugin:window|minimize");
}

export async function toggleMaximizeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.toggleMaximize) {
    await win.toggleMaximize();
    return;
  }
  await invokeWindowPlugin("plugin:window|toggle_maximize");
}

export async function closeAppWindow(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.close) {
    await win.close();
    return;
  }
  await invokeWindowPlugin("plugin:window|close");
}

export async function startWindowDragging(): Promise<void> {
  if (!tauriInvokeAvailable()) return;
  const win = currentTauriWindow();
  if (win?.startDragging) {
    await win.startDragging();
    return;
  }
  await invokeWindowPlugin("plugin:window|start_dragging");
}

export function quitDesktopApp(): Promise<void> {
  if (!tauriInvokeAvailable()) {
    return Promise.reject(new Error("Tauri invoke not available"));
  }
  return tauriInvoke<void>("quit_desktop_app", {});
}

async function toggleHtmlFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

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

  const isFs = await tauriInvoke<boolean>("plugin:window|is_fullscreen", {
    label,
  });
  await tauriInvoke<void>("plugin:window|set_fullscreen", {
    label,
    value: !isFs,
  });
}

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
