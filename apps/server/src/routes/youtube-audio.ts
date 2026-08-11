/**
 * Async YouTube audio ingest via `yt-dlp` (PATH or auto-downloaded fallback).
 *
 * Thin barrel: public API re-exports. Implementation lives in `./youtube-audio/`.
 */

export type {
  YoutubeAudioJobStatus,
  YoutubeAudioJob,
  SessionYoutubeJob,
} from "./youtube-audio/types.js";

export {
  resolveYtDlpCommand,
  ytDlpResolver,
  checkYtDlpAvailable,
  resetYtDlpAvailabilityCacheForTests,
} from "./youtube-audio/ytdlp-resolve.js";

export { downloadYoutubeMp3Bytes } from "./youtube-audio/download.js";

export {
  sessionYoutubeJobsForTests,
  mountSessionYoutubeRoutes,
} from "./youtube-audio/session-jobs.js";

export {
  youtubeAudioJobsForTests,
  createYoutubeAudioRouter,
} from "./youtube-audio/project-router.js";
