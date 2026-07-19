import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  UpdateProjectBodySchema,
  type Library,
  type Project,
} from "@stagesync/shared";

async function readApiError(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* ignore */
  }
  return message;
}

export async function fetchLibrary(): Promise<Library> {
  const res = await fetch("/api/library");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return LibrarySchema.parse(await res.json());
}

/** Validates body with CreateProjectBodySchema before POST. */
export async function createProject(rawName: string): Promise<Project> {
  const body = CreateProjectBodySchema.parse({ name: rawName.trim() });
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}

/** Validates body with UpdateProjectBodySchema before PUT. */
export async function updateProject(
  id: string,
  raw: { name: string },
): Promise<Project> {
  if (!id.trim()) {
    throw new Error("Missing project id");
  }
  const body = UpdateProjectBodySchema.parse({ name: raw.name.trim() });
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
}

export async function deleteProject(id: string): Promise<void> {
  if (!id.trim()) {
    throw new Error("Missing project id");
  }
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}
