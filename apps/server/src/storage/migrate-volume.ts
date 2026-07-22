import { readdir } from "node:fs/promises";
import type { Stores } from "./index.js";

export type MigrateVolumeResult = {
  projectsScanned: number;
  projectsRewritten: number;
  backups: string[];
};

/**
 * On boot: ensure library/setlist exist; upgrade every on-disk project to v5
 * and write back when the raw file was older than v5 (shadow backup first).
 * Fail-fast on Zod / I/O — caller should abort listen.
 */
export async function migrateVolumeOnBoot(
  stores: Stores,
): Promise<MigrateVolumeResult> {
  const backups: string[] = [];
  await stores.getLibrary();
  await stores.getSetlist();

  const paths = stores.paths;
  let entries: string[] = [];
  try {
    entries = await readdir(paths.projectsDir);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return { projectsScanned: 0, projectsRewritten: 0, backups };
    }
    throw err;
  }

  let projectsRewritten = 0;
  let projectsScanned = 0;

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    projectsScanned += 1;
    const rewritten = await stores.migrateProjectOnDisk(name, {
      onBackup: (file) => {
        if (backups.length < 64) backups.push(file);
      },
    });
    if (rewritten) projectsRewritten += 1;
  }

  return { projectsScanned, projectsRewritten, backups };
}
