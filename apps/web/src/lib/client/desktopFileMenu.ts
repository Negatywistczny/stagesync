/**
 * File-menu helpers for Tauri OS menu (DesktopMenuBridge).
 * Pure-ish helpers + side-effecting import/export matching Admin SongsView.
 */

import {
  looksLikeZipBytes,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type Project,
} from "@stagesync/shared";
import {
  createProject,
  exportLibraryPack,
  fetchLibrary,
  fetchProject,
  importLibraryPack,
  putProject,
} from "@lib/shell-operator/libraryApi.js";
import { pushRecentTimelineProject } from "./lastTimelineProject.js";

export function currentTimelineProjectId(pathname: string): string | null {
  if (!pathname.startsWith("/timeline/")) return null;
  const id = pathname.split("/")[2]?.trim() ?? "";
  return id || null;
}

export async function createSongAndOpen(
  name: string,
  opts?: { fromTemplateId?: string; isTemplate?: boolean },
): Promise<{ id: string; name: string }> {
  const created = await createProject(name, opts);
  pushRecentTimelineProject(created.id, created.name);
  return { id: created.id, name: created.name };
}

/**
 * Create an empty library song, apply `build` (import merge), PUT with OCC
 * token from the shell, then mark recent. Used by Timeline „Wybierz utwór”
 * import buttons (new song — not overwrite draft).
 */
export async function createSongWithContent(
  name: string,
  build: (shell: Project) => Project,
): Promise<Project> {
  const trimmed = name.trim() || "Nowy utwór";
  const created = await createProject(trimmed);
  const next = build(created);
  const saved = await putProject(created.id, {
    ...next,
    id: created.id,
    // Keep shell MIDI PC + OCC token (same as saveProjectAs).
    updatedAt: created.updatedAt,
    midiProgramId: created.midiProgramId,
  });
  pushRecentTimelineProject(saved.id, saved.name);
  return saved;
}

export async function saveProjectAs(
  sourceId: string,
  newName: string,
): Promise<{ id: string; name: string }> {
  const source = await fetchProject(sourceId);
  const name = newName.trim();
  if (!name) throw new Error("Nazwa projektu jest wymagana");
  const created = await createProject(name, {
    isTemplate: source.isTemplate === true,
  });
  // putProject requires matching updatedAt (optimistic lock on the new shell).
  // Keep the new project's MIDI PC so we don't collide with the source song.
  const saved = await putProject(created.id, {
    ...source,
    name,
    isTemplate: source.isTemplate,
    updatedAt: created.updatedAt,
    midiProgramId: created.midiProgramId,
  });
  pushRecentTimelineProject(saved.id, saved.name);
  return { id: saved.id, name: saved.name };
}

export async function listTemplateIds(): Promise<
  { id: string; name: string }[]
> {
  const library = await fetchLibrary();
  return library.projects
    .filter((p) => p.isTemplate === true)
    .map((p) => ({ id: p.id, name: p.name }));
}

export async function importLibraryFile(file: File): Promise<{
  createdCount: number;
  format?: string;
}> {
  const buf = await file.arrayBuffer();
  if (buf.byteLength > 16 * 1024 * 1024) {
    throw new Error("Plik importu jest za duży (max 16 MB).");
  }
  if (looksLikeZipBytes(buf)) {
    throw new Error(ZIP_IMPORT_UNSUPPORTED_PL);
  }
  let pack: unknown;
  try {
    pack = JSON.parse(new TextDecoder().decode(buf)) as unknown;
  } catch {
    throw new Error(
      "Nie udało się odczytać JSON. Użyj pakietu v5 (.stagesync.json).",
    );
  }
  const result = await importLibraryPack(pack);
  return { createdCount: result.created.length, format: result.format };
}

export async function downloadLibraryExport(): Promise<void> {
  const blob = await exportLibraryPack();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = `stagesync-export-${Date.now()}.stagesync.json`;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
