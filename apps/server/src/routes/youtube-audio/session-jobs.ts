/**
 * Session YouTube downloads (no project yet) + route mounts.
 */

import { randomUUID } from "node:crypto";
import { Router } from "express";
import { YOUTUBE_VIDEO_ID_RE } from "@stagesync/shared";
import { defaultDataDir } from "../../storage/paths.js";
import { handleRouteError, sendError } from "../errors.js";
import { downloadYoutubeMp3Bytes } from "./download.js";
import type { SessionYoutubeJob } from "./types.js";
import { resolveYtDlpCommand } from "./ytdlp-resolve.js";

export type { SessionYoutubeJob } from "./types.js";

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
