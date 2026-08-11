/**
 * Download YouTube audio to bytes via yt-dlp (project + session jobs).
 */

import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureBundledYtDlp,
  looksLikeYtDlpBinary,
  ytdlpRepoBundledPath,
} from "./ytdlp-resolve.js";

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
