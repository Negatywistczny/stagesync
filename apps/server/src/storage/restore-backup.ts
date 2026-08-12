/**
 * Restore shadow `.bak` files, bulk multi-file, or a ZIP archive into dataDir.
 */

import { copyFile, access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
import { parseZipArchive } from "../system/diagnostics-zip.js";
import { isUnderAllowedRoot } from "../library/path-browser.js";
import { shadowBackup } from "./shadow-backup.js";

export type RestoreBackupResult = {
  bakPath: string;
  targetPath: string;
  shadowed: string | null;
};

export type RestoreItemResult = {
  source: string;
  targetPath: string;
  shadowed: string | null;
};

export type RestoreManyResult = {
  restored: RestoreItemResult[];
};

/** Max `.bak` paths in one bulk restore request. */
export const RESTORE_BULK_MAX = 64;

/**
 * Strip a known shadow label (`.schema.bak` / `.pre-migrate.bak` / `.pre-restore.bak`)
 * or a plain trailing `.bak` to recover the live basename.
 * `project.json.schema.bak` → `project.json`
 * `library.json.bak` → `library.json`
 */
export function resolveLiveNameFromBak(bakName: string): string {
  const name = basename(bakName);
  const labeled = /^(.*)(\.(?:schema|pre-migrate|pre-restore))\.bak$/i.exec(
    name,
  );
  if (labeled?.[1]) return labeled[1];
  if (name.toLowerCase().endsWith(".bak") && name.length > 4) {
    return name.slice(0, -4);
  }
  throw new Error("Oczekiwano pliku z sufiksem .bak");
}

/** Live path beside a `.bak` file (`…/project.json.schema.bak` → `…/project.json`). */
export function resolveLivePathFromBak(bakPath: string): string {
  return join(dirname(bakPath), resolveLiveNameFromBak(bakPath));
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

function assertTargetUnderDataDir(targetPath: string, dataDir: string): void {
  if (!isUnderAllowedRoot(targetPath)) {
    throw new Error("Ścieżka docelowa poza dozwolonym obszarem");
  }
  const relToData = relative(dataDir, targetPath);
  if (relToData === "" || relToData.startsWith("..") || isAbsolute(relToData)) {
    throw new Error("Przywracanie dozwolone tylko wewnątrz katalogu danych");
  }
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

  assertTargetUnderDataDir(targetPath, dataDir);

  await mkdir(dirname(targetPath), { recursive: true });
  const shadowed = await shadowBackup(targetPath, "pre-restore");
  await copyFile(bakPath, targetPath);
  return { bakPath, targetPath, shadowed };
}

async function writeLiveWithShadow(
  targetPath: string,
  dataDir: string,
  bytes: Buffer,
): Promise<string | null> {
  assertTargetUnderDataDir(targetPath, dataDir);
  await mkdir(dirname(targetPath), { recursive: true });
  const shadowed = await shadowBackup(targetPath, "pre-restore");
  await writeFile(targetPath, bytes);
  return shadowed;
}

/**
 * Restore many `.bak` files (fail-fast). Order preserved in `restored`.
 */
export async function restoreBulkFromBackups(opts: {
  bakPaths: string[];
  dataDir: string;
}): Promise<RestoreManyResult> {
  if (opts.bakPaths.length === 0) {
    throw new Error("Brak plików do przywrócenia");
  }
  if (opts.bakPaths.length > RESTORE_BULK_MAX) {
    throw new Error(`Zbyt wiele plików naraz (max ${RESTORE_BULK_MAX})`);
  }
  const restored: RestoreItemResult[] = [];
  for (const bakPath of opts.bakPaths) {
    const one = await restoreFromBackup({
      bakPath,
      dataDir: opts.dataDir,
    });
    restored.push({
      source: one.bakPath,
      targetPath: one.targetPath,
      shadowed: one.shadowed,
    });
  }
  return { restored };
}

/**
 * Strip a single shared top-level folder from ZIP entry names when every
 * entry shares the same first segment (e.g. `data-backup-…/library.json`).
 */
export function stripSharedZipRoot(names: string[]): string | null {
  if (names.length === 0) return null;
  const firstSegs = names.map((n) => {
    const i = n.indexOf("/");
    return i === -1 ? null : n.slice(0, i);
  });
  const root = firstSegs[0];
  if (!root || firstSegs.some((s) => s !== root)) return null;
  return root;
}

function zipEntryToTargetRel(
  entryName: string,
  sharedRoot: string | null,
): string {
  let rel = entryName;
  if (sharedRoot && rel.startsWith(`${sharedRoot}/`)) {
    rel = rel.slice(sharedRoot.length + 1);
  }
  if (!rel || rel.includes("..") || rel.startsWith("/")) {
    throw new Error(`Niedozwolona ścieżka w ZIP: ${entryName}`);
  }
  const base = basename(rel);
  if (base.toLowerCase().endsWith(".bak")) {
    const liveName = resolveLiveNameFromBak(base);
    const dir = dirname(rel);
    return dir === "." ? liveName : join(dir, liveName);
  }
  return rel;
}

/**
 * Restore a ZIP archive into `dataDir`.
 * Entries may be live files (`projects/…/project.json`) or `.bak` payloads
 * (live name derived like single-file restore). Optional single top-level
 * folder is stripped. STORE + DEFLATE only.
 */
export async function restoreFromZipArchive(opts: {
  zipPath: string;
  dataDir: string;
}): Promise<RestoreManyResult> {
  const dataDir = resolve(opts.dataDir);
  const zipPath = resolve(opts.zipPath);

  if (!isUnderAllowedRoot(zipPath)) {
    throw new Error("Ścieżka archiwum poza dozwolonym obszarem");
  }
  if (!zipPath.toLowerCase().endsWith(".zip")) {
    throw new Error("Oczekiwano pliku z sufiksem .zip");
  }

  let buf: Buffer;
  try {
    buf = await readFile(zipPath);
  } catch {
    throw new Error("Plik archiwum nie istnieje lub brak odczytu");
  }

  const entries = parseZipArchive(buf);
  if (entries.length === 0) {
    throw new Error("Archiwum ZIP nie zawiera plików do przywrócenia");
  }

  const sharedRoot = stripSharedZipRoot(entries.map((e) => e.name));
  const restored: RestoreItemResult[] = [];

  for (const entry of entries) {
    const rel = zipEntryToTargetRel(entry.name, sharedRoot);
    const targetPath = join(dataDir, rel);
    const shadowed = await writeLiveWithShadow(targetPath, dataDir, entry.data);
    restored.push({
      source: `${zipPath}#${entry.name}`,
      targetPath,
      shadowed,
    });
  }

  return { restored };
}
