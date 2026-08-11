/**
 * Resolve yt-dlp: PATH, repo/data bundled binary, or GitHub auto-download.
 */

import { spawn } from "node:child_process";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { REPO_ROOT } from "../../storage/paths.js";

const YTDLP_REPO = "yt-dlp/yt-dlp";
/** macOS Gatekeeper can make first `yt-dlp --version` take ~10s. */
const YTDLP_VERSION_TIMEOUT_MS = 25_000;
const YTDLP_MIN_BYTES = 100_000;
let ytDlpCommandCache: string | null = null;
let ytDlpResolvePending: Promise<string | null> | null = null;

function ytdlpToolName(): string {
  return process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
}

function ytdlpBundledPath(dataDir: string): string {
  return join(dataDir, "tools", ytdlpToolName());
}

/** @internal — used by download fallbacks. */
export function ytdlpRepoBundledPath(): string {
  return join(REPO_ROOT, "apps/server/tools", ytdlpToolName());
}

/** @internal — used by download fallbacks. */
export async function looksLikeYtDlpBinary(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile() && info.size >= YTDLP_MIN_BYTES;
  } catch {
    return false;
  }
}

async function clearMacOsQuarantine(path: string): Promise<void> {
  if (process.platform !== "darwin") return;
  await new Promise<void>((resolve) => {
    const proc = spawn("xattr", ["-d", "com.apple.quarantine", path], {
      shell: false,
    });
    proc.on("error", () => resolve());
    proc.on("close", () => resolve());
  });
}

function ytdlpDownloadUrl(): string | null {
  if (process.platform === "darwin") {
    return `https://github.com/${YTDLP_REPO}/releases/latest/download/yt-dlp_macos`;
  }
  if (process.platform === "linux") {
    return `https://github.com/${YTDLP_REPO}/releases/latest/download/yt-dlp_linux`;
  }
  if (process.platform === "win32") {
    return `https://github.com/${YTDLP_REPO}/releases/latest/download/yt-dlp.exe`;
  }
  return null;
}

async function isYtDlpRunnable(
  command: string,
  timeoutMs = YTDLP_VERSION_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    let proc: ReturnType<typeof spawn> | null = null;
    try {
      proc = spawn(command, ["--version"], { shell: false });
    } catch {
      finish(false);
      return;
    }
    const timeout = setTimeout(() => {
      if (proc && !proc.killed) proc.kill("SIGKILL");
      finish(false);
    }, timeoutMs);
    proc.on("error", () => {
      clearTimeout(timeout);
      finish(false);
    });
    proc.on("close", (code) => {
      clearTimeout(timeout);
      finish(code === 0);
    });
  });
}

async function isCandidateRunnable(candidate: string): Promise<boolean> {
  if (candidate === "yt-dlp") {
    return isYtDlpRunnable(candidate);
  }
  return looksLikeYtDlpBinary(candidate);
}

/** @internal — used by download fallbacks. */
export async function ensureBundledYtDlp(
  dataDir: string,
): Promise<string | null> {
  const url = ytdlpDownloadUrl();
  if (!url) return null;
  const dest = ytdlpBundledPath(dataDir);
  await mkdir(join(dataDir, "tools"), { recursive: true });
  // codeql[js/http-to-file-access] Fixed GitHub release URL for yt-dlp bootstrap
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Nie udało się pobrać yt-dlp (${res.status}).`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  // codeql[js/http-to-file-access] Fixed GitHub release URL for yt-dlp bootstrap
  await writeFile(dest, bytes);
  if (process.platform !== "win32") {
    await chmod(dest, 0o755);
  }
  await clearMacOsQuarantine(dest);
  return dest;
}

export async function resolveYtDlpCommand(
  dataDir: string,
  opts?: { allowDownload?: boolean },
): Promise<string | null> {
  const allowDownload = opts?.allowDownload !== false;
  if (ytDlpCommandCache) return ytDlpCommandCache;
  if (ytDlpResolvePending) return ytDlpResolvePending;
  ytDlpResolvePending = (async () => {
    const candidates = [
      "yt-dlp",
      ytdlpRepoBundledPath(),
      ytdlpBundledPath(dataDir),
    ];
    for (const candidate of candidates) {
      if (await isCandidateRunnable(candidate)) {
        ytDlpCommandCache = candidate;
        return ytDlpCommandCache;
      }
    }
    if (allowDownload) {
      try {
        const downloaded = await ensureBundledYtDlp(dataDir);
        if (downloaded && (await looksLikeYtDlpBinary(downloaded))) {
          ytDlpCommandCache = downloaded;
          return ytDlpCommandCache;
        }
      } catch {
        // Keep null fallback; route will return 503 with clear guidance.
      }
    }
    return null;
  })();
  try {
    return await ytDlpResolvePending;
  } finally {
    ytDlpResolvePending = null;
  }
}

/** @internal test seam — router uses this ref so tests can stub resolution. */
export const ytDlpResolver = {
  resolve: resolveYtDlpCommand,
};

export async function checkYtDlpAvailable(dataDir: string): Promise<boolean> {
  const command = await ytDlpResolver.resolve(dataDir, {
    allowDownload: false,
  });
  return Boolean(command);
}

/** @internal reset cache between tests */
export function resetYtDlpAvailabilityCacheForTests(): void {
  ytDlpCommandCache = null;
  ytDlpResolvePending = null;
}
