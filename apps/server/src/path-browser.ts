/**
 * Safe directory browser for Admin path picker.
 */

import { existsSync, lstatSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { REPO_ROOT } from "./storage/paths.js";

export type BrowseEntry = {
  name: string;
  type: "dir" | "file";
  path: string;
  envPath: string;
  selectable: boolean;
};

export type BrowseResult = {
  path: string;
  envPath: string;
  parent: string | null;
  parentEnvPath: string | null;
  canSelectCurrent: boolean;
  entries: BrowseEntry[];
};

function getAllowedRoots(): string[] {
  return [REPO_ROOT, homedir()].map((r) => resolve(r));
}

export function isUnderAllowedRoot(absPath: string): boolean {
  const resolved = resolve(absPath);
  return getAllowedRoots().some((root) => {
    const rel = relative(root, resolved);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  });
}

export function toEnvPath(absPath: string): string {
  const resolved = resolve(absPath);
  const rel = relative(REPO_ROOT, resolved);
  if (rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))) {
    const normalized = rel.split(sep).join("/");
    if (normalized === "") return "./";
    return `./${normalized}`;
  }
  return resolved.split(sep).join("/");
}

function resolveToAbsolute(rawPath: string): string | null {
  const trimmed = String(rawPath || "").trim();
  if (!trimmed) return null;
  if (isAbsolute(trimmed)) return resolve(trimmed);
  return resolve(REPO_ROOT, trimmed.replace(/^\.\//, ""));
}

export function resolveBrowseStartPath(
  rawPath: string,
  { mode = "dir" }: { mode?: "dir" | "file" } = {},
): string {
  const candidate = resolveToAbsolute(rawPath);
  if (candidate && isUnderAllowedRoot(candidate)) {
    try {
      const stat = statSync(candidate);
      if (stat.isDirectory()) return candidate;
      if (stat.isFile()) return dirname(candidate);
    } catch {
      const parent = dirname(candidate);
      if (isUnderAllowedRoot(parent)) {
        try {
          if (statSync(parent).isDirectory()) return parent;
        } catch {
          /* fall through */
        }
      }
    }
  }
  if (mode === "file") {
    const dataDir = join(REPO_ROOT, "data");
    if (existsSync(dataDir) && statSync(dataDir).isDirectory()) {
      return dataDir;
    }
  }
  return REPO_ROOT;
}

function normalizeExt(ext: string | undefined): string | null {
  if (!ext) return null;
  const e = String(ext).trim().toLowerCase();
  if (!e) return null;
  return e.startsWith(".") ? e : `.${e}`;
}

export function listBrowseDirectory(
  rawPath: string,
  {
    mode = "dir",
    ext,
  }: { mode?: "dir" | "file"; ext?: string } = {},
): BrowseResult {
  const absPath = rawPath ? resolve(rawPath) : REPO_ROOT;
  if (!isUnderAllowedRoot(absPath)) {
    throw new Error("Ścieżka poza dozwolonym obszarem");
  }

  let stat;
  try {
    stat = statSync(absPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error("Katalog nie istnieje");
    throw new Error("Nie można odczytać katalogu");
  }
  if (!stat.isDirectory()) {
    throw new Error("Oczekiwano katalogu");
  }

  const extFilter = normalizeExt(ext);
  const entries: BrowseEntry[] = [];
  let names: string[];
  try {
    names = readdirSync(absPath);
  } catch {
    throw new Error("Brak dostępu do katalogu");
  }

  for (const name of names) {
    if (name.startsWith(".")) continue;
    const entryPath = join(absPath, name);
    let entryStat;
    try {
      entryStat = lstatSync(entryPath);
    } catch {
      continue;
    }
    if (entryStat.isSymbolicLink()) continue;

    if (entryStat.isDirectory()) {
      if (!isUnderAllowedRoot(entryPath)) continue;
      entries.push({
        name,
        type: "dir",
        path: entryPath,
        envPath: toEnvPath(entryPath),
        selectable: mode === "dir",
      });
      continue;
    }

    if (entryStat.isFile() && mode === "file") {
      if (extFilter && !name.toLowerCase().endsWith(extFilter)) continue;
      entries.push({
        name,
        type: "file",
        path: entryPath,
        envPath: toEnvPath(entryPath),
        selectable: true,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  const parent = dirname(absPath);
  const parentUnderRoot = isUnderAllowedRoot(parent) && parent !== absPath;

  return {
    path: absPath,
    envPath: toEnvPath(absPath),
    parent: parentUnderRoot ? parent : null,
    parentEnvPath: parentUnderRoot ? toEnvPath(parent) : null,
    canSelectCurrent: mode === "dir",
    entries,
  };
}
