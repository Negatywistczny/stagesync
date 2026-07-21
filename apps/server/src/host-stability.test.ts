import { mkdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStores } from "./storage/index.js";
import { migrateVolumeOnBoot } from "./storage/migrate-volume.js";
import { shadowBackup } from "./storage/shadow-backup.js";

describe("host stability — volume migrate / shadow backup", () => {
  let dataDir: string;

  afterEach(async () => {
    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("shadowBackup copies existing file", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-bak-"));
    const file = join(dataDir, "project.json");
    await writeFile(file, '{"ok":true}\n');
    const bak = await shadowBackup(file, "schema");
    expect(bak).toBeTruthy();
    expect(await readFile(bak!, "utf8")).toContain('"ok":true');
  });

  it("migrateVolumeOnBoot rewrites v1 project with backup", async () => {
    dataDir = await mkdtemp(join(tmpdir(), "stagesync-mig-"));
    const id = "00000000-0000-4000-8000-000000000077";
    const projDir = join(dataDir, "projects", id);
    await mkdir(projDir, { recursive: true });
    await mkdir(join(dataDir, "library"), { recursive: true });
    await writeFile(
      join(projDir, "project.json"),
      JSON.stringify({
        id,
        name: "Legacy",
        formatVersion: 1,
        updatedAt: "2026-07-19T12:00:00.000Z",
      }),
    );
    await writeFile(
      join(dataDir, "library", "library.json"),
      JSON.stringify({
        version: 1,
        // Mark as template so ensureDefaultTemplate does not seed a second project.
        projects: [
          {
            id,
            name: "Legacy",
            updatedAt: "2026-07-19T12:00:00.000Z",
            isTemplate: true,
          },
        ],
      }),
    );

    const stores = createStores(dataDir);
    const result = await migrateVolumeOnBoot(stores);
    expect(result.projectsScanned).toBe(1);
    expect(result.projectsRewritten).toBe(1);
    expect(result.backups.length).toBe(1);

    const disk = JSON.parse(
      await readFile(join(projDir, "project.json"), "utf8"),
    ) as { formatVersion: number };
    expect(disk.formatVersion).toBe(5);
  });
});
