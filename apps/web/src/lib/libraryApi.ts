import {
  CreateProjectBodySchema,
  LibrarySchema,
  ProjectSchema,
  PutProjectBodySchema,
  type Library,
  type Project,
  type PutProjectBody,
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

export async function fetchProject(id: string): Promise<Project> {
  if (!id.trim()) {
    throw new Error("Missing project id");
  }
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return ProjectSchema.parse(await res.json());
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

function toPutBody(project: Project): PutProjectBody {
  const { id, updatedAt, ...body } = project;
  void id;
  void updatedAt;
  return PutProjectBodySchema.parse(body);
}

/** Full-document PUT (strict v3). */
export async function putProject(id: string, project: Project): Promise<Project> {
  if (!id.trim()) {
    throw new Error("Missing project id");
  }
  const body = toPutBody(project);
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

/** Rename via fetch + full PUT. */
export async function updateProject(
  id: string,
  raw: { name: string },
): Promise<Project> {
  const name = raw.name.trim();
  if (!name) {
    throw new Error("Name is required");
  }
  const current = await fetchProject(id);
  return putProject(id, { ...current, name });
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

export { toPutBody };
