import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Stores } from "./index.js";
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
});
