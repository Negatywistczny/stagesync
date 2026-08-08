import { ProjectSchema, type Project } from "@stagesync/shared";
import { mergeApiHeaders } from "./operatorPin.js";

async function readApiError(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* ignore */
  }
  return message.slice(0, 500);
}

export async function uploadProjectAudio(
  projectId: string,
  file: File,
  opts?: { trackId?: string; startTicks?: number },
): Promise<Project> {
  const form = new FormData();
  form.append("file", file);
  if (opts?.trackId) {
    form.append("trackId", opts.trackId);
  }
  if (
    opts?.startTicks != null &&
    Number.isFinite(opts.startTicks) &&
    opts.startTicks >= 0
  ) {
    form.append("startTicks", String(Math.floor(opts.startTicks)));
  }
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets`,
    { method: "POST", body: form, headers: mergeApiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}

/** Alias — server accepts MusicXML via same multipart endpoint. */
export { uploadProjectAudio as uploadProjectMusicXml };

export async function deleteProjectAsset(
  projectId: string,
  assetId: string,
): Promise<Project> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE", headers: mergeApiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}

export type YoutubeAudioJobResponse = {
  jobId: string;
  status: "pending" | "downloading" | "done" | "error";
  progress: number;
  assetId?: string;
  error?: string;
  message?: string;
};

export async function startYoutubeAudioImport(
  projectId: string,
  videoId: string,
): Promise<YoutubeAudioJobResponse> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/from-youtube`,
    {
      method: "POST",
      headers: mergeApiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ videoId }),
    },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as YoutubeAudioJobResponse;
}

export async function pollYoutubeAudioJob(
  projectId: string,
  jobId: string,
): Promise<YoutubeAudioJobResponse> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/from-youtube/${encodeURIComponent(jobId)}`,
    { headers: mergeApiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as YoutubeAudioJobResponse;
}

/** Session YouTube download (no project yet — new song wizard). */
export async function startSessionYoutubeImport(
  videoId: string,
): Promise<YoutubeAudioJobResponse> {
  const res = await fetch(`/api/import/audio/youtube`, {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ videoId }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as YoutubeAudioJobResponse;
}

export async function pollSessionYoutubeJob(
  jobId: string,
): Promise<YoutubeAudioJobResponse & { ready?: boolean }> {
  const res = await fetch(
    `/api/import/audio/youtube/${encodeURIComponent(jobId)}`,
    { headers: mergeApiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as YoutubeAudioJobResponse & { ready?: boolean };
}

export async function fetchSessionYoutubeFile(jobId: string): Promise<File> {
  const res = await fetch(
    `/api/import/audio/youtube/${encodeURIComponent(jobId)}/file`,
    { headers: mergeApiHeaders() },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const blob = await res.blob();
  return new File([blob], "youtube-audio.mp3", {
    type: blob.type || "audio/mpeg",
  });
}
