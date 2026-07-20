/**
 * Graceful process lifecycle (restart / shutdown) — ported from legacy v4.
 * No Docker/PM2 special-case beyond detecting PM2 and exiting for autorestart.
 */

import { spawn } from "node:child_process";
import type { Server } from "node:http";

const SHUTDOWN_TIMEOUT_MS = 8_000;

export type Lifecycle = {
  isShuttingDown: () => boolean;
  gracefulShutdown: (
    signal: string,
    options?: { restart?: boolean },
  ) => void;
  scheduleProcessRestart: () => void;
};

export function isRunningUnderPm2(): boolean {
  return Boolean(process.env.pm_id || process.env.PM2_HOME);
}

function shouldDeferRestartToPm2(): boolean {
  return isRunningUnderPm2();
}

function spawnDetachedRestartProcess(): void {
  try {
    const child = spawn(process.execPath, process.argv.slice(1), {
      detached: true,
      stdio: "ignore",
      env: process.env,
      cwd: process.cwd(),
    });
    child.unref();
  } catch (err) {
    console.error("[stagesync-server] Failed to spawn restart process", err);
  }
}

export function createLifecycle(
  server: Server,
  opts?: { onBeforeClose?: () => void; log?: (msg: string) => void },
): Lifecycle {
  let shuttingDown = false;
  let wantsRestart = false;

  const log = opts?.log ?? ((msg: string) => console.log(`[stagesync-server] ${msg}`));

  function finishShutdown(): void {
    const restart = wantsRestart && !shouldDeferRestartToPm2();
    const exitNow = () => {
      if (restart) spawnDetachedRestartProcess();
      process.exit(0);
    };
    if (restart && process.platform === "win32") {
      setTimeout(exitNow, 300);
      return;
    }
    exitNow();
  }

  function gracefulShutdown(
    signal: string,
    options: { restart?: boolean } = {},
  ): void {
    if (shuttingDown) return;
    shuttingDown = true;
    if (options.restart) wantsRestart = true;
    log(
      `Graceful shutdown started (${signal}${options.restart ? ", restart" : ""})`,
    );

    try {
      opts?.onBeforeClose?.();
    } catch {
      /* ignore */
    }

    const forceExitTimer = setTimeout(() => {
      log("Shutdown timeout — forcing exit");
      finishShutdown();
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    server.close(() => {
      clearTimeout(forceExitTimer);
      log("HTTP server closed");
      finishShutdown();
    });
  }

  function scheduleProcessRestart(): void {
    if (shouldDeferRestartToPm2()) {
      log("Restart under PM2 — autorestart will bring server back");
    }
  }

  return {
    isShuttingDown: () => shuttingDown,
    gracefulShutdown,
    scheduleProcessRestart,
  };
}
