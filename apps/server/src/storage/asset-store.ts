import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import {
  ProjectSchema,
  type Library,
  type Project,
  type ProjectAsset,
} from "@stagesync/shared";
import {
  type DataPaths,
  assertSafeProjectId,
  assetFilePath,
  projectAssetsDir,
} from "./paths.js";
import { NotFoundError, StorageError, errCode } from "./errors.js";
import { libraryEntryFromProject } from "./project-migrations.js";
import { saveLibrary } from "./library-store.js";

export async function addProjectAsset(
  paths: DataPaths,
  projectId: string,
  asset: ProjectAsset,
  fileBytes: Buffer,
  opts:
    | {
        createAudioClip?: boolean;
        audioTrackId?: string;
        startTicks?: number;
      }
    | undefined,
  readProject: (id: string) => Promise<Project>,
  writeProject: (project: Project) => Promise<void>,
  ensureLibrary: () => Promise<Library>,
): Promise<Project> {
  const safeId = assertSafeProjectId(paths, projectId);
  const project = await readProject(safeId);
  const assetsDir = projectAssetsDir(paths, safeId);
  await mkdir(assetsDir, { recursive: true });
  const dest = assetFilePath(paths, safeId, asset.storageName);
  await writeFile(dest, fileBytes);

  const assets = [...project.assets, asset];
  let audioTracks = [...project.audioTracks];
  let audioClips = [...project.audioClips];

  if (opts?.createAudioClip !== false && asset.kind === "audio") {
    let track = opts?.audioTrackId
      ? audioTracks.find((t) => t.id === opts.audioTrackId)
      : undefined;
    if (!track && opts?.audioTrackId) {
      track = {
        id: opts.audioTrackId,
        name: `Audio ${audioTracks.length + 1}`,
      };
      audioTracks = [...audioTracks, track];
    } else if (!track) {
      track = audioTracks[0];
      if (!track) {
        track = { id: randomUUID(), name: "Audio 1" };
        audioTracks = [track];
      }
    }
    const explicitStart =
      opts?.startTicks != null &&
      Number.isFinite(opts.startTicks) &&
      opts.startTicks >= 0
        ? Math.floor(opts.startTicks)
        : null;
    // Default: append after clips on the target track so re-uploads do not stack.
    const startTicks =
      explicitStart ??
      audioClips
        .filter((c) => c.trackId === track.id)
        .reduce((max, c) => Math.max(max, c.startTicks + c.lengthTicks), 0);
    audioClips = [
      ...audioClips,
      {
        id: randomUUID(),
        trackId: track.id,
        assetId: asset.id,
        startTicks,
        lengthTicks: 7680,
      },
    ];
  }

  const next = ProjectSchema.parse({
    ...project,
    updatedAt: new Date().toISOString(),
    assets,
    audioTracks,
    audioClips,
  });
  await writeProject(next);
  const library = await ensureLibrary();
  const idx = library.projects.findIndex((p) => p.id === safeId);
  if (idx >= 0) {
    library.projects[idx] = libraryEntryFromProject(next);
    await saveLibrary(paths, library);
  }
  return next;
}

export async function deleteProjectAsset(
  paths: DataPaths,
  projectId: string,
  assetId: string,
  readProject: (id: string) => Promise<Project>,
  writeProject: (project: Project) => Promise<void>,
  ensureLibrary: () => Promise<Library>,
): Promise<Project> {
  const safeId = assertSafeProjectId(paths, projectId);
  const project = await readProject(safeId);
  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new NotFoundError(`Asset not found: ${assetId}`);
  }
  try {
    await unlink(assetFilePath(paths, safeId, asset.storageName));
  } catch (err) {
    if (errCode(err) !== "ENOENT") {
      throw new StorageError(`Failed to delete asset file ${assetId}`, err);
    }
  }
  const next = ProjectSchema.parse({
    ...project,
    updatedAt: new Date().toISOString(),
    assets: project.assets.filter((a) => a.id !== assetId),
    audioClips: project.audioClips.filter((c) => c.assetId !== assetId),
  });
  await writeProject(next);
  const library = await ensureLibrary();
  const idx = library.projects.findIndex((p) => p.id === safeId);
  if (idx >= 0) {
    library.projects[idx] = libraryEntryFromProject(next);
    await saveLibrary(paths, library);
  }
  return next;
}

export async function getAssetFilePath(
  paths: DataPaths,
  projectId: string,
  assetId: string,
  readProject: (id: string) => Promise<Project>,
): Promise<{ path: string; asset: ProjectAsset }> {
  const project = await readProject(projectId);
  const asset = project.assets.find((a) => a.id === assetId);
  if (!asset) {
    throw new NotFoundError(`Asset not found: ${assetId}`);
  }
  return {
    path: assetFilePath(paths, projectId, asset.storageName),
    asset,
  };
}
