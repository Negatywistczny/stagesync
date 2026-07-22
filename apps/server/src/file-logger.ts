/**
 * Rotating file sink under data/logs/ (ADR 0001) — #351.
 */

import {
  appendFileSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_FILE = "stagesync.log";

export type FileLogger = {
  logsDir: string;
  logFile: string;
  write: (level: string, msg: string, t?: number) => void;
  disposeConsoleMirror?: () => void;
};

export function createFileLogger(
  logsDir: string,
  options: { maxBytes?: number; fileName?: string } = {},
): FileLogger {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const fileName = options.fileName ?? DEFAULT_FILE;
  mkdirSync(logsDir, { recursive: true });
  const logFile = join(logsDir, fileName);

  function rotateIfNeeded(): void {
    try {
      const size = statSync(logFile).size;
      if (size < maxBytes) return;
      const bak = `${logFile}.1`;
      try {
        unlinkSync(bak);
      } catch {
        /* no previous */
      }
      renameSync(logFile, bak);
    } catch {
      /* missing file — first write creates it */
    }
  }

  function write(level: string, msg: string, t: number = Date.now()): void {
    try {
      rotateIfNeeded();
      const line = `${new Date(t).toISOString()} [${String(level).trim().slice(0, 16) || "info"}] ${String(msg).replace(/\r?\n/g, " ").slice(0, 4000)}\n`;
      appendFileSync(logFile, line, "utf8");
    } catch {
      /* never throw from logger */
    }
  }

  return { logsDir, logFile, write };
}

/** Mirror console.log/warn/error/info/debug into the file (not the RAM buffer). */
export function installConsoleFileMirror(fileLogger: FileLogger): () => void {
  const levels = ["log", "info", "warn", "error", "debug"] as const;
  const originals = new Map<(typeof levels)[number], (...args: unknown[]) => void>();

  for (const level of levels) {
    const orig = console[level].bind(console);
    originals.set(level, orig);
    console[level] = (...args: unknown[]) => {
      orig(...args);
      const msg = args
        .map((a) => {
          if (typeof a === "string") return a;
          if (a instanceof Error) return a.stack ?? a.message;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ")
        .slice(0, 4000);
      const fileLevel = level === "log" ? "info" : level;
      fileLogger.write(fileLevel, msg);
    };
  }

  return () => {
    for (const level of levels) {
      const orig = originals.get(level);
      if (orig) console[level] = orig as typeof console.log;
    }
  };
}
