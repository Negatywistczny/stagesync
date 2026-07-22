import { ProjectSchema, type Project } from "@stagesync/shared";

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
): Promise<Project> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets`,
    { method: "POST", body: form },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}

/** Alias — server accepts MusicXML via same multipart endpoint. */
export const uploadProjectMusicXml = uploadProjectAudio;

export async function deleteProjectAsset(
  projectId: string,
  assetId: string,
): Promise<Project> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}
