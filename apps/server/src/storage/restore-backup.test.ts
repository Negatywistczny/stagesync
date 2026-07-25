import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveLivePathFromBak,
  restoreFromBackup,
  resolveBackupsDir,
} from "./restore-backup.js";

const scratchDirs: string[] = [];

async function scratchUnderHome(prefix: string): Promise<string> {
  const dir = await mkdtemp(join(homedir(), prefix));
  scratchDirs.push(dir);
  return dir;
}

describe("resolveLivePathFromBak", () => {
  it("strips labeled .schema.bak", () => {
    expect(resolveLivePathFromBak("/data/projects/p/project.json.schema.bak")).toBe(
      "/data/projects/p/project.json",
    );
  });

  it("strips plain .bak", () => {
    expect(resolveLivePathFromBak("/data/library.json.bak")).toBe(
      "/data/library.json",
    );
  });

  it("rejects non-bak", () => {
    expect(() => resolveLivePathFromBak("/data/project.json")).toThrow(/\.bak/);
  });
});

describe("restoreFromBackup", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    for (const dir of scratchDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("restores sibling bak over live file with pre-restore shadow", async () => {
    const root = await scratchUnderHome(".stagesync-restore-");
    const file = join(root, "library.json");
    await writeFile(file, '{"v":1}', "utf8");
    const bak = `${file}.schema.bak`;
    await writeFile(bak, '{"v":2}', "utf8");

    const result = await restoreFromBackup({ bakPath: bak, dataDir: root });
    expect(result.targetPath).toBe(file);
    expect(result.shadowed).toBe(`${file}.pre-restore.bak`);
    expect(await readFile(file, "utf8")).toBe('{"v":2}');
    expect(await readFile(`${file}.pre-restore.bak`, "utf8")).toBe('{"v":1}');
  });

  it("maps bak under backupsDir onto dataDir", async () => {
    const root = await scratchUnderHome(".stagesync-restore-map-");
    const dataDir = join(root, "data");
    const backupsDir = join(root, "backups");
    await mkdir(join(dataDir, "projects", "p1"), { recursive: true });
    await mkdir(join(backupsDir, "projects", "p1"), { recursive: true });
    const live = join(dataDir, "projects", "p1", "project.json");
    await writeFile(live, '{"live":true}', "utf8");
    const bak = join(
      backupsDir,
      "projects",
      "p1",
      "project.json.schema.bak",
    );
    await writeFile(bak, '{"fromBak":true}', "utf8");
    vi.stubEnv("STAGESYNC_BACKUPS_DIR", backupsDir);

    const result = await restoreFromBackup({ bakPath: bak, dataDir });
    expect(result.targetPath).toBe(live);
    expect(await readFile(live, "utf8")).toBe('{"fromBak":true}');
  });

  it("rejects bak outside allowed roots", async () => {
    const dataDir = await scratchUnderHome(".stagesync-restore-out-");
    await expect(
      restoreFromBackup({
        bakPath: "/etc/passwd.bak",
        dataDir,
      }),
    ).rejects.toThrow(/dozwolonym|nie istnieje|odczytu/);
  });
});

describe("resolveBackupsDir", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to {dataDir}/backups", () => {
    vi.stubEnv("STAGESYNC_BACKUPS_DIR", "");
    expect(resolveBackupsDir("/data")).toBe(join("/data", "backups"));
  });

  it("honors STAGESYNC_BACKUPS_DIR", () => {
    vi.stubEnv("STAGESYNC_BACKUPS_DIR", "/custom/backups");
    expect(resolveBackupsDir("/data")).toBe("/custom/backups");
  });
});
