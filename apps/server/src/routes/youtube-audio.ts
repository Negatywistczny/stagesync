/**
 * Async YouTube audio ingest via `yt-dlp` (PATH or auto-downloaded fallback).
 */

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Router } from "express";
import { YOUTUBE_VIDEO_ID_RE } from "@stagesync/shared";
import { REPO_ROOT, defaultDataDir } from "../storage/paths.js";
import type { Stores } from "../storage/index.js";
import { handleRouteError, sendError } from "./errors.js";

export type YoutubeAudioJobStatus =
  "pending" | "downloading" | "done" | "error";

export type YoutubeAudioJob = {
  id: string;
  projectId: string;
  videoId: string;
  status: YoutubeAudioJobStatus;
  progress: number;
  message?: string;
  assetId?: string;
  error?: string;
};

/** @internal — in-memory job store (single-process server). */
export const youtubeAudioJobsForTests = new Map<string, YoutubeAudioJob>();

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

function ytdlpRepoBundledPath(): string {
  return join(REPO_ROOT, "apps/server/tools", ytdlpToolName());
}

async function looksLikeYtDlpBinary(path: string): Promise<boolean> {
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

async function ensureBundledYtDlp(dataDir: string): Promise<string | null> {
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

function parseProgressLine(line: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s*%/.exec(line);
  if (!m?.[1]) return null;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
}

function runYtDlpSpawn(
  command: string,
  args: string[],
  onProgress?: (pct: number) => void,
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stderrOutput = "";
    let proc: ReturnType<typeof spawn>;
    try {
      proc = spawn(command, args, { shell: false });
    } catch (err) {
      reject(err);
      return;
    }
    proc.stdout?.on("data", (chunk: Buffer) => {
      const lines = chunk.toString("utf8").split("\n");
      for (const line of lines) {
        const pct = parseProgressLine(line);
        if (pct != null) onProgress?.(pct);
      }
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderrOutput += text;
      const pct = parseProgressLine(text);
      if (pct != null) onProgress?.(pct);
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      resolve({ code, stderr: stderrOutput });
    });
  });
}

/** Download YouTube audio to MP3/M4A bytes via yt-dlp (shared by project + session jobs). */
export async function downloadYoutubeMp3Bytes(
  videoId: string,
  ytDlpCommand: string,
  onProgress?: (pct: number) => void,
  dataDir?: string,
): Promise<Buffer> {
  let tmpDir: string | null = null;
  try {
    tmpDir = await mkdtemp(join(tmpdir(), "stagesync-ytdlp-"));
    const outTemplate = join(tmpDir, `${videoId}.%(ext)s`);
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // 1. Primary attempt: MP3 post-processing
    let res = await runYtDlpSpawn(
      ytDlpCommand,
      [
        "-x",
        "--audio-format",
        "mp3",
        "--no-playlist",
        "--newline",
        "-o",
        outTemplate,
        url,
      ],
      onProgress,
    );

    // 2. Fallback: Direct audio stream download (if FFmpeg is missing for MP3 conversion)
    if (res.code !== 0) {
      res = await runYtDlpSpawn(
        ytDlpCommand,
        [
          "-f",
          "bestaudio/best",
          "--no-playlist",
          "--newline",
          "-o",
          outTemplate,
          url,
        ],
        onProgress,
      );
    }

    // 3. Fallback: Try repo-bundled binary if command was system yt-dlp
    const repoBundled = ytdlpRepoBundledPath();
    if (
      res.code !== 0 &&
      ytDlpCommand !== repoBundled &&
      (await looksLikeYtDlpBinary(repoBundled))
    ) {
      res = await runYtDlpSpawn(
        repoBundled,
        [
          "-f",
          "bestaudio/best",
          "--no-playlist",
          "--newline",
          "-o",
          outTemplate,
          url,
        ],
        onProgress,
      );
    }

    // 4. Fallback: Auto-download fresh binary from GitHub release if available
    if (res.code !== 0 && dataDir) {
      try {
        const freshBundled = await ensureBundledYtDlp(dataDir);
        if (freshBundled && (await looksLikeYtDlpBinary(freshBundled))) {
          res = await runYtDlpSpawn(
            freshBundled,
            [
              "-f",
              "bestaudio/best",
              "--no-playlist",
              "--newline",
              "-o",
              outTemplate,
              url,
            ],
            onProgress,
          );
        }
      } catch {
        // Ignore auto-download errors, throw detailed error below
      }
    }

    if (res.code !== 0) {
      const stderrTrimmed = res.stderr.trim();
      const detail = stderrTrimmed ? `: ${stderrTrimmed.slice(-300)}` : "";
      throw new Error(`yt-dlp zakończył się kodem ${res.code ?? "?"}${detail}`);
    }

    const files = await readdir(tmpDir);
    const audioFilename = files.find((f) => f.startsWith(videoId));
    if (!audioFilename) {
      throw new Error("Brak pliku audio po pobraniu przez yt-dlp.");
    }

    const audioPath = join(tmpDir, audioFilename);
    const bytes = await readFile(audioPath);
    if (bytes.length > 100 * 1024 * 1024) {
      throw new Error("Plik audio przekracza limit 100 MB.");
    }
    return bytes;
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function runYoutubeDownloadJob(
  stores: Stores,
  job: YoutubeAudioJob,
  ytDlpCommand: string,
): Promise<void> {
  const jobRef = youtubeAudioJobsForTests.get(job.id);
  if (!jobRef) return;
  jobRef.status = "downloading";
  jobRef.progress = 0;

  try {
    const bytes = await downloadYoutubeMp3Bytes(
      job.videoId,
      ytDlpCommand,
      (pct) => {
        jobRef.progress = pct;
      },
      defaultDataDir(),
    );
    const assetId = randomUUID();
    const project = await stores.addProjectAsset(
      job.projectId,
      {
        id: assetId,
        storageName: `${assetId}.mp3`,
        originalName: `${job.videoId}.mp3`,
        kind: "audio",
        mimeType: "audio/mpeg",
        sizeBytes: bytes.length,
      },
      bytes,
      { createAudioClip: false },
    );
    jobRef.status = "done";
    jobRef.progress = 100;
    jobRef.assetId = assetId;
    jobRef.message = project.assets.find((a) => a.id === assetId)?.originalName;
  } catch (err) {
    jobRef.status = "error";
    jobRef.error =
      err instanceof Error
        ? err.message
        : "Pobieranie YouTube nie powiodło się.";
  }
}

export type SessionYoutubeJob = {
  id: string;
  videoId: string;
  status: YoutubeAudioJobStatus;
  progress: number;
  bytes?: Buffer;
  error?: string;
  createdAt: number;
};

/** @internal — session YouTube downloads (no project yet). */
export const sessionYoutubeJobsForTests = new Map<string, SessionYoutubeJob>();

const SESSION_TTL_MS = 30 * 60 * 1000;

function pruneSessionJobs(now = Date.now()): void {
  for (const [id, job] of sessionYoutubeJobsForTests) {
    if (now - job.createdAt > SESSION_TTL_MS) {
      sessionYoutubeJobsForTests.delete(id);
    }
  }
}

async function runSessionYoutubeJob(
  job: SessionYoutubeJob,
  ytDlpCommand: string,
): Promise<void> {
  const jobRef = sessionYoutubeJobsForTests.get(job.id);
  if (!jobRef) return;
  jobRef.status = "downloading";
  jobRef.progress = 0;
  try {
    const bytes = await downloadYoutubeMp3Bytes(
      job.videoId,
      ytDlpCommand,
      (pct) => {
        jobRef.progress = pct;
      },
      defaultDataDir(),
    );
    jobRef.bytes = bytes;
    jobRef.status = "done";
    jobRef.progress = 100;
  } catch (err) {
    jobRef.status = "error";
    jobRef.error =
      err instanceof Error
        ? err.message
        : "Pobieranie YouTube nie powiodło się.";
  }
}

/** Mount session YouTube routes on an import router (no project required). */
export function mountSessionYoutubeRoutes(router: Router): void {
  router.post("/audio/youtube", async (req, res) => {
    try {
      pruneSessionJobs();
      const videoIdRaw = req.body?.videoId;
      const videoId = typeof videoIdRaw === "string" ? videoIdRaw.trim() : "";
      if (!YOUTUBE_VIDEO_ID_RE.test(videoId)) {
        sendError(res, 400, "Nieprawidłowy identyfikator YouTube (11 znaków).");
        return;
      }
      const ytDlpCommand = await resolveYtDlpCommand(defaultDataDir());
      if (!ytDlpCommand) {
        sendError(
          res,
          503,
          "Nie udało się przygotować yt-dlp. Wybierz plik MP3 z dysku.",
        );
        return;
      }
      const job: SessionYoutubeJob = {
        id: randomUUID(),
        videoId,
        status: "pending",
        progress: 0,
        createdAt: Date.now(),
      };
      sessionYoutubeJobsForTests.set(job.id, job);
      void runSessionYoutubeJob(job, ytDlpCommand);
      res.status(202).json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/audio/youtube/:jobId", async (req, res) => {
    try {
      pruneSessionJobs();
      const jobIdRaw = req.params["jobId"];
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (typeof jobId !== "string" || !jobId) {
        sendError(res, 400, "Brak jobId");
        return;
      }
      const job = sessionYoutubeJobsForTests.get(jobId);
      if (!job) {
        sendError(res, 404, "Nie znaleziono zadania pobierania.");
        return;
      }
      res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        error: job.error,
        ready: job.status === "done" && Boolean(job.bytes),
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/audio/youtube/:jobId/file", async (req, res) => {
    try {
      pruneSessionJobs();
      const jobIdRaw = req.params["jobId"];
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (typeof jobId !== "string" || !jobId) {
        sendError(res, 400, "Brak jobId");
        return;
      }
      const job = sessionYoutubeJobsForTests.get(jobId);
      if (!job?.bytes || job.status !== "done") {
        sendError(res, 404, "Plik audio jeszcze niedostępny.");
        return;
      }
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${job.videoId}.mp3"`,
      );
      res.send(job.bytes);
    } catch (err) {
      handleRouteError(res, err);
    }
  });
}

export function createYoutubeAudioRouter(stores: Stores): Router {
  const router = Router({ mergeParams: true });

  function projectIdFrom(req: { params: Record<string, unknown> }): string {
    const raw = req.params["id"];
    const id = Array.isArray(raw) ? raw[0] : raw;
    if (typeof id !== "string" || !id) throw new Error("Missing project id");
    return id;
  }

  router.post("/from-youtube", async (req, res) => {
    try {
      const projectId = projectIdFrom(req);
      await stores.getProject(projectId);
      const videoIdRaw = req.body?.videoId;
      const videoId = typeof videoIdRaw === "string" ? videoIdRaw.trim() : "";
      if (!YOUTUBE_VIDEO_ID_RE.test(videoId)) {
        sendError(res, 400, "Nieprawidłowy identyfikator YouTube (11 znaków).");
        return;
      }
      const ytDlpCommand = await ytDlpResolver.resolve(stores.paths.dataDir);
      if (!ytDlpCommand) {
        sendError(
          res,
          503,
          "Nie udało się przygotować yt-dlp (PATH ani auto-download). Pobierz MP3 lokalnie i użyj przeciągnij-upuść.",
        );
        return;
      }
      const job: YoutubeAudioJob = {
        id: randomUUID(),
        projectId,
        videoId,
        status: "pending",
        progress: 0,
      };
      youtubeAudioJobsForTests.set(job.id, job);
      void runYoutubeDownloadJob(stores, job, ytDlpCommand);
      res.status(202).json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.get("/from-youtube/:jobId", async (req, res) => {
    try {
      const jobIdRaw = req.params["jobId"];
      const jobId = Array.isArray(jobIdRaw) ? jobIdRaw[0] : jobIdRaw;
      if (typeof jobId !== "string" || !jobId) {
        sendError(res, 400, "Brak jobId");
        return;
      }
      const job = youtubeAudioJobsForTests.get(jobId);
      if (!job || job.projectId !== projectIdFrom(req)) {
        sendError(res, 404, "Nie znaleziono zadania pobierania.");
        return;
      }
      res.json({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        assetId: job.assetId,
        error: job.error,
        message: job.message,
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  return router;
}
