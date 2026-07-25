/**
 * Restore a shadow `.bak` (or copy under backupsDir) over the live file.
 */

import { copyFile, access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isUnderAllowedRoot } from "../path-browser.js";
import { shadowBackup } from "./shadow-backup.js";

export type RestoreBackupResult = {
  bakPath: string;
  targetPath: string;
  shadowed: string | null;
};

/**
 * Strip a known shadow label (`.schema.bak` / `.pre-migrate.bak` / `.pre-restore.bak`)
 * or a plain trailing `.bak` to recover the live filename.
 * `project.json.schema.bak` → `project.json`
 * `library.json.bak` → `library.json`
 */
export function resolveLivePathFromBak(bakPath: string): string {
  const name = basename(bakPath);
  const labeled =
    /^(.*)(\.(?:schema|pre-migrate|pre-restore))\.bak$/i.exec(name);
  if (labeled?.[1]) {
    return join(dirname(bakPath), labeled[1]);
  }
  if (name.toLowerCase().endsWith(".bak") && name.length > 4) {
    return join(dirname(bakPath), name.slice(0, -4));
  }
  throw new Error("Oczekiwano pliku z sufiksem .bak");
}

export function resolveBackupsDir(dataDir: string): string {
  const raw = process.env.STAGESYNC_BACKUPS_DIR?.trim();
  if (raw) return resolve(raw);
  return join(resolve(dataDir), "backups");
}

function remapFromBackupsDir(
  bakPath: string,
  liveSibling: string,
  dataDir: string,
  backupsDir: string,
): string {
  const bakAbs = resolve(bakPath);
  const backupsAbs = resolve(backupsDir);
  const dataAbs = resolve(dataDir);
  const relToBackups = relative(backupsAbs, bakAbs);
  if (
    relToBackups === "" ||
    relToBackups.startsWith("..") ||
    isAbsolute(relToBackups)
  ) {
    return liveSibling;
  }
  const liveName = basename(liveSibling);
  const relDir = dirname(relToBackups);
  return relDir === "."
    ? join(dataAbs, liveName)
    : join(dataAbs, relDir, liveName);
}

export type RestoreBackupOptions = {
  /** Absolute or env-style path to the `.bak` file. */
  bakPath: string;
  /** Live data root — restore target must stay under this tree. */
  dataDir: string;
};

/**
 * Copy `.bak` over the live file after a `pre-restore` shadow of the current live file.
 * When the bak lives under `STAGESYNC_BACKUPS_DIR` / `{dataDir}/backups`, map the
 * relative path onto `dataDir`. Otherwise restore as a sibling of the bak.
 */
export async function restoreFromBackup(
  opts: RestoreBackupOptions,
): Promise<RestoreBackupResult> {
  const dataDir = resolve(opts.dataDir);
  const bakPath = resolve(opts.bakPath);
  const backupsDir = resolveBackupsDir(dataDir);

  if (!isUnderAllowedRoot(bakPath)) {
    throw new Error("Ścieżka kopii poza dozwolonym obszarem");
  }

  try {
    await access(bakPath, constants.R_OK);
  } catch {
    throw new Error("Plik kopii nie istnieje lub brak odczytu");
  }

  if (!bakPath.toLowerCase().endsWith(".bak")) {
    throw new Error("Oczekiwano pliku z sufiksem .bak");
  }

  const liveSibling = resolveLivePathFromBak(bakPath);
  const targetPath = remapFromBackupsDir(
    bakPath,
    liveSibling,
    dataDir,
    backupsDir,
  );

  if (!isUnderAllowedRoot(targetPath)) {
    throw new Error("Ścieżka docelowa poza dozwolonym obszarem");
  }

  const relToData = relative(dataDir, targetPath);
  if (
    relToData === "" ||
    relToData.startsWith("..") ||
    isAbsolute(relToData)
  ) {
    throw new Error("Przywracanie dozwolone tylko wewnątrz katalogu danych");
  }

  await mkdir(dirname(targetPath), { recursive: true });
  const shadowed = await shadowBackup(targetPath, "pre-restore");
  await copyFile(bakPath, targetPath);
  return { bakPath, targetPath, shadowed };
}
