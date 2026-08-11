/**
 * Project-scoped YouTube audio ingest routes.
 */

import { randomUUID } from "node:crypto";
import { Router } from "express";
import { YOUTUBE_VIDEO_ID_RE } from "@stagesync/shared";
import { defaultDataDir } from "../../storage/paths.js";
import type { Stores } from "../../storage/index.js";
import { handleRouteError, sendError } from "../errors.js";
import { downloadYoutubeMp3Bytes } from "./download.js";
import type { YoutubeAudioJob } from "./types.js";
import { ytDlpResolver } from "./ytdlp-resolve.js";

export type { YoutubeAudioJob, YoutubeAudioJobStatus } from "./types.js";

/** @internal — in-memory job store (single-process server). */
export const youtubeAudioJobsForTests = new Map<string, YoutubeAudioJob>();

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
