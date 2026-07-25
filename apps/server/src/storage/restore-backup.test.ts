import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildStoreZip } from "../diagnostics-zip.js";
import {
  resolveLivePathFromBak,
  restoreFromBackup,
  restoreBulkFromBackups,
  restoreFromZipArchive,
  resolveBackupsDir,
  stripSharedZipRoot,
  RESTORE_BULK_MAX,
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

describe("stripSharedZipRoot", () => {
  it("returns shared top folder when all entries share it", () => {
    expect(
      stripSharedZipRoot([
        "backup/library.json",
        "backup/projects/a/project.json",
      ]),
    ).toBe("backup");
  });

  it("returns null when mixed or flat", () => {
    expect(stripSharedZipRoot(["library.json"])).toBeNull();
    expect(
      stripSharedZipRoot(["a/library.json", "b/library.json"]),
    ).toBeNull();
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

describe("restoreBulkFromBackups", () => {
  afterEach(async () => {
    for (const dir of scratchDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("restores multiple .bak files", async () => {
    const root = await scratchUnderHome(".stagesync-restore-bulk-");
    const a = join(root, "a.json");
    const b = join(root, "b.json");
    await writeFile(a, "old-a", "utf8");
    await writeFile(b, "old-b", "utf8");
    await writeFile(`${a}.bak`, "new-a", "utf8");
    await writeFile(`${b}.bak`, "new-b", "utf8");

    const result = await restoreBulkFromBackups({
      bakPaths: [`${a}.bak`, `${b}.bak`],
      dataDir: root,
    });
    expect(result.restored).toHaveLength(2);
    expect(await readFile(a, "utf8")).toBe("new-a");
    expect(await readFile(b, "utf8")).toBe("new-b");
  });

  it("rejects empty and oversized lists", async () => {
    const root = await scratchUnderHome(".stagesync-restore-bulk-lim-");
    await expect(
      restoreBulkFromBackups({ bakPaths: [], dataDir: root }),
    ).rejects.toThrow(/Brak/);
    await expect(
      restoreBulkFromBackups({
        bakPaths: Array.from({ length: RESTORE_BULK_MAX + 1 }, (_, i) =>
          join(root, `f${i}.bak`),
        ),
        dataDir: root,
      }),
    ).rejects.toThrow(/Zbyt wiele/);
  });
});

describe("restoreFromZipArchive", () => {
  afterEach(async () => {
    for (const dir of scratchDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("restores live tree from ZIP with shared root stripped", async () => {
    const root = await scratchUnderHome(".stagesync-restore-zip-");
    const dataDir = join(root, "data");
    await mkdir(join(dataDir, "projects", "p1"), { recursive: true });
    const live = join(dataDir, "library.json");
    await writeFile(live, '{"v":1}', "utf8");
    const zipPath = join(root, "backup.zip");
    const zip = buildStoreZip([
      {
        name: "snap/library.json",
        data: Buffer.from('{"v":2}', "utf8"),
      },
      {
        name: "snap/projects/p1/project.json",
        data: Buffer.from('{"id":"p1"}', "utf8"),
      },
    ]);
    await writeFile(zipPath, zip);

    const result = await restoreFromZipArchive({ zipPath, dataDir });
    expect(result.restored).toHaveLength(2);
    expect(await readFile(live, "utf8")).toBe('{"v":2}');
    expect(
      await readFile(join(dataDir, "projects", "p1", "project.json"), "utf8"),
    ).toBe('{"id":"p1"}');
    expect(await readFile(`${live}.pre-restore.bak`, "utf8")).toBe('{"v":1}');
  });

  it("maps .bak entries inside ZIP to live names", async () => {
    const root = await scratchUnderHome(".stagesync-restore-zip-bak-");
    const dataDir = join(root, "data");
    await mkdir(dataDir, { recursive: true });
    const live = join(dataDir, "library.json");
    await writeFile(live, "old", "utf8");
    const zipPath = join(root, "baks.zip");
    await writeFile(
      zipPath,
      buildStoreZip([
        {
          name: "library.json.schema.bak",
          data: Buffer.from("from-zip-bak", "utf8"),
        },
      ]),
    );

    await restoreFromZipArchive({ zipPath, dataDir });
    expect(await readFile(live, "utf8")).toBe("from-zip-bak");
  });

  it("rejects path traversal in ZIP", async () => {
    const root = await scratchUnderHome(".stagesync-restore-zip-trav-");
    const dataDir = join(root, "data");
    await mkdir(dataDir, { recursive: true });
    const zipPath = join(root, "evil.zip");
    await writeFile(
      zipPath,
      buildStoreZip([
        { name: "../outside.json", data: Buffer.from("x", "utf8") },
      ]),
    );
    await expect(restoreFromZipArchive({ zipPath, dataDir })).rejects.toThrow(
      /Niedozwolona|ścieżka/i,
    );
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
