#!/usr/bin/env node
/**
 * sync-version.mjs — propagate a single version string to all version-bearing files.
 *
 * Usage:
 *   node launch/scripts/sync-version.mjs [--version <semver>] [--dry-run]
 *
 * If --version is omitted, the version is read from root package.json.
 * In CI release workflow, pass the tag-derived version via --version.
 * In workflow_dispatch (test), pass --version without committing to main.
 *
 * Files updated:
 *   - apps/web/src/lib/appVersion.ts
 *   - apps/desktop/src-tauri/tauri.conf.json
 *   - apps/desktop/src-tauri/Cargo.toml
 *   (Dockerfile ARG and compose.yml default are handled via build --build-arg in CI)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function arg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

const dryRun = process.argv.includes("--dry-run");
const wixCompat = process.argv.includes("--wix-compat");
const root_pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const version = arg("--version") ?? root_pkg.version;

if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`sync-version: invalid version "${version}"`);
  process.exit(1);
}

console.log(`sync-version: ${version}${dryRun ? " (dry-run)" : ""}`);

/** MSI/WiX requires numeric major.minor.patch[.build]; map SemVer pre-release to 4th field. */
function toWixVersion(semver) {
  const match = semver.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^.]+)\.(\d+))?$/);
  if (!match) return semver.replace(/-.*$/, "");
  const [, major, minor, patch, prereleaseTag, prereleaseNum] = match;
  if (!prereleaseTag) return `${major}.${minor}.${patch}`;
  const n = Number(prereleaseNum);
  if (prereleaseTag === "beta") return `${major}.${minor}.${patch}.${10000 + n}`;
  return `${major}.${minor}.${patch}.${n}`;
}

const wixVersion = toWixVersion(version);
if (wixVersion !== version) {
  console.log(`  wix msi:   ${wixVersion}`);
}

const updates = [
  {
    path: "apps/web/src/lib/appVersion.ts",
    transform: (c) => c.replace(/export const APP_VERSION = "[^"]+";/, `export const APP_VERSION = "${version}";`),
  },
  {
    path: "apps/desktop/src-tauri/tauri.conf.json",
    transform: (c) => {
      const obj = JSON.parse(c);
      const desktopVersion = wixCompat && wixVersion !== version ? wixVersion : version;
      obj.version = desktopVersion;
      obj.bundle.windows ??= {};
      if (wixVersion !== version) {
        obj.bundle.windows.wix = { ...(obj.bundle.windows.wix ?? {}), version: wixVersion };
      } else if (obj.bundle.windows.wix?.version) {
        const { version: _drop, ...rest } = obj.bundle.windows.wix;
        if (Object.keys(rest).length === 0) delete obj.bundle.windows.wix;
        else obj.bundle.windows.wix = rest;
      }
      return JSON.stringify(obj, null, 2) + "\n";
    },
  },
  {
    path: "apps/desktop/src-tauri/Cargo.toml",
    transform: (c) => {
      const cargoVersion = wixCompat && wixVersion !== version ? wixVersion : version;
      return c.replace(/^version = "[^"]+"/m, `version = "${cargoVersion}"`);
    },
  },
];

for (const { path, transform } of updates) {
  const abs = resolve(ROOT, path);
  const original = readFileSync(abs, "utf8");
  const updated = transform(original);
  if (original === updated) {
    console.log(`  (unchanged) ${path}`);
    continue;
  }
  console.log(`  updated     ${path}`);
  if (!dryRun) writeFileSync(abs, updated, "utf8");
}

if (dryRun) console.log("dry-run — no files written");
