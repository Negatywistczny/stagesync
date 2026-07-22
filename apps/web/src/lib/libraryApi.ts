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
  if (res.status === 409) {
    return `Konflikt zapisu (409): projekt zmieniony na serwerze — odśwież i zapisz ponownie. (${message})`;
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
export async function createProject(
  rawName: string,
  opts?: { fromTemplateId?: string; isTemplate?: boolean },
): Promise<Project> {
  const body = CreateProjectBodySchema.parse({
    name: rawName.trim(),
    fromTemplateId: opts?.fromTemplateId,
    isTemplate: opts?.isTemplate,
  });
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

export async function batchMidiProgramIds(
  assignments: { id: string; midiProgramId: number }[],
): Promise<Library> {
  const res = await fetch("/api/library/batch-midi-pc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignments }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return LibrarySchema.parse(await res.json());
}

export async function exportLibraryPack(
  projectIds?: string[],
): Promise<Blob> {
  const res = await fetch("/api/library/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectIds }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return res.blob();
}

export type ImportLibraryResult = {
  library: Library;
  created: string[];
  format?: string;
  warnings: string[];
};

export async function importLibraryPack(
  pack: unknown,
): Promise<ImportLibraryResult> {
  const res = await fetch("/api/library/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pack),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as {
    library: unknown;
    created?: unknown;
    format?: unknown;
    warnings?: unknown;
  };
  return {
    library: LibrarySchema.parse(body.library),
    created: Array.isArray(body.created)
      ? body.created.filter((id): id is string => typeof id === "string")
      : [],
    format: typeof body.format === "string" ? body.format : undefined,
    warnings: Array.isArray(body.warnings)
      ? body.warnings.filter((w): w is string => typeof w === "string")
      : [],
  };
}

function toPutBody(project: Project): PutProjectBody {
  const { id, ...body } = project;
  void id;
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
