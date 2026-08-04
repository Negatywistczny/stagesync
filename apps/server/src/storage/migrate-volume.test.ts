import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProjectV6Seed } from "@stagesync/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStores, type Stores } from "./index.js";
import { migrateVolumeOnBoot } from "./migrate-volume.js";

describe("migrateVolumeOnBoot", () => {
  let dataDir: string;

  afterEach(async () => {
    if (dataDir) await rm(dataDir, { recursive: true, force: true });
  });

  it("returns zeros when projectsDir is missing (ENOENT)", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-mig-enoent-"));
    const stores = {
      paths: { projectsDir: join(dataDir, "projects-missing") },
      getLibrary: vi.fn().mockResolvedValue({}),
      getSetlist: vi.fn().mockResolvedValue({}),
      migrateProjectOnDisk: vi.fn(),
    } as unknown as Stores;

    const result = await migrateVolumeOnBoot(stores);
    expect(result).toEqual({
      projectsScanned: 0,
      projectsRewritten: 0,
      backups: [],
    });
    expect(stores.migrateProjectOnDisk).not.toHaveBeenCalled();
  });

  it("skips dotfiles and non-uuid project folder names", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-mig-skip-"));
    const projectsDir = join(dataDir, "projects");
    await mkdir(join(projectsDir, ".hidden"), { recursive: true });
    await mkdir(join(projectsDir, "not-a-uuid"), { recursive: true });
    await writeFile(join(projectsDir, "readme.txt"), "x");

    const migrateProjectOnDisk = vi.fn().mockResolvedValue(false);
    const stores = {
      paths: { projectsDir },
      getLibrary: vi.fn().mockResolvedValue({}),
      getSetlist: vi.fn().mockResolvedValue({}),
      migrateProjectOnDisk,
    } as unknown as Stores;

    const result = await migrateVolumeOnBoot(stores);
    expect(result.projectsScanned).toBe(0);
    expect(result.projectsRewritten).toBe(0);
    expect(migrateProjectOnDisk).not.toHaveBeenCalled();
  });

  it("validates formatVersion 6 projects with melody without rewrite", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "ss-mig-v6-"));
    const id = "00000000-0000-4000-8000-000000000601";
    const updatedAt = "2026-08-03T00:00:00.000Z";
    const project = createProjectV6Seed(id, "Syllables", updatedAt, {
      midiProgramId: 0,
    });
    expect(project.formatVersion).toBe(6);
    expect(project.melody).toEqual({ clips: [] });

    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(
      join(dataDir, "library", "library.json"),
      JSON.stringify({
        version: 1,
        projects: [
          {
            id,
            name: project.name,
            updatedAt,
            midiProgramId: 0,
          },
        ],
      }),
    );
    await mkdir(join(dataDir, "projects", id), { recursive: true });
    await writeFile(
      join(dataDir, "projects", id, "project.json"),
      JSON.stringify(project),
    );

    const stores = createStores(dataDir);
    const result = await migrateVolumeOnBoot(stores);
    expect(result.projectsRewritten).toBe(0);
    expect(result.backups).toEqual([]);
    expect(result.projectsScanned).toBeGreaterThanOrEqual(1);
    const onDisk = await stores.getProject(id);
    expect(onDisk.formatVersion).toBe(6);
    expect(onDisk.melody).toEqual({ clips: [] });
  });
});
