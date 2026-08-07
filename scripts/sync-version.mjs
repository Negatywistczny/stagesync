#!/usr/bin/env node
/**
 * sync-version.mjs — propagate a single version string to all version-bearing files.
 *
 * Usage:
 *   node scripts/sync-version.mjs [--version <semver>] [--dry-run]
 *
 * If --version is omitted, the version is read from root package.json.
 * In CI release workflow, pass the tag-derived version via --version.
 * In workflow_dispatch (test), pass --version without committing to main.
 *
 * Files updated:
 *   - apps/web/src/lib/client/appVersion.ts
 *   - apps/server/src/app.ts (VERSION fallback)
 *   - Dockerfile (APP_VERSION default)
 *   - compose.yml (STAGESYNC_VERSION default)
 *   - apps/desktop/src-tauri/tauri.conf.json
 *   - apps/desktop/src-tauri/Cargo.toml
 *   - apps/console/android/app/build.gradle.kts (versionName / versionCode)
 *   - apps/performer/android/app/build.gradle.kts (versionName / versionCode)
 *   (CI still passes --build-arg APP_VERSION / STAGESYNC_VERSION explicitly)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  // Nested beta docs cuts: 5.0.0-beta.1.1 → 5.0.0.10101 (room after shipped beta.1 = .10001).
  const nestedBeta = semver.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)\.(\d+)$/);
  if (nestedBeta) {
    const [, major, minor, patch, n, m] = nestedBeta;
    return `${major}.${minor}.${patch}.${10000 + Number(n) * 100 + Number(m)}`;
  }
  const match = semver.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^.]+)\.(\d+))?$/);
  if (!match) return semver.replace(/-.*$/, "");
  const [, major, minor, patch, prereleaseTag, prereleaseNum] = match;
  if (!prereleaseTag) return `${major}.${minor}.${patch}`;
  const n = Number(prereleaseNum);
  if (prereleaseTag === "beta") {
    // beta.1 already shipped as .10001; beta.2+ use *100 spacing so nested .N.M fits underneath.
    if (n === 1) return `${major}.${minor}.${patch}.10001`;
    return `${major}.${minor}.${patch}.${10000 + n * 100}`;
  }
  return `${major}.${minor}.${patch}.${n}`;
}

const wixVersion = toWixVersion(version);
if (wixVersion !== version) {
  console.log(`  wix msi:   ${wixVersion}`);
}

const updates = [
  {
    path: "apps/web/src/lib/client/appVersion.ts",
    transform: (c) => c.replace(/export const APP_VERSION = "[^"]+";/, `export const APP_VERSION = "${version}";`),
  },
  {
    path: "apps/server/src/app.ts",
    transform: (c) => {
      // Current: resolveServiceVersion() fallback string.
      const next = c.replace(
        /(function resolveServiceVersion\(\): string \{[\s\S]*?return ")[^"]+(";)/,
        `$1${version}$2`,
      );
      if (next !== c) return next;
      // Legacy: const VERSION = process.env.npm_package_version ?? "…";
      return c.replace(
        /const VERSION = process\.env\.npm_package_version \?\? "[^"]+";/,
        `const VERSION = process.env.npm_package_version ?? "${version}";`,
      );
    },
  },
  {
    path: "Dockerfile",
    transform: (c) =>
      c.replace(
        /ENV npm_package_version=\$\{APP_VERSION:-[^}]+\}/,
        `ENV npm_package_version=\${APP_VERSION:-${version}}`,
      ),
  },
  {
    path: "compose.yml",
    transform: (c) =>
      c.replace(
        /npm_package_version: \$\{STAGESYNC_VERSION:-[^}]+\}/,
        `npm_package_version: \${STAGESYNC_VERSION:-${version}}`,
      ),
  },
  {
    path: "apps/desktop/src-tauri/tauri.conf.json",
    transform: (c) => {
      const obj = JSON.parse(c);
      obj.version = version;
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
    transform: (c) => c.replace(/^version = "[^"]+"/m, `version = "${version}"`),
  },
  {
    path: "apps/console/android/app/build.gradle.kts",
    transform: (c) => applyAndroidVersion(c, version),
  },
  {
    path: "apps/performer/android/app/build.gradle.kts",
    transform: (c) => applyAndroidVersion(c, version),
  },
];

/**
 * Android versionCode must stay monotonic for sideload upgrades.
 * SemVer floor (MAJOR*10000+MINOR*100+PATCH) is a lower bound only —
 * never regress past an intentional diagnostic bump (e.g. Console 50213).
 * When versionName changes and the floor is not higher, bump existing +1.
 */
function nextAndroidVersionCode(content, nextVersion) {
  const [maj, min, pat] = nextVersion.split(".").map(Number);
  const floor = maj * 10000 + min * 100 + pat;
  const existingCode = Number(content.match(/versionCode\s*=\s*(\d+)/)?.[1] ?? 0);
  const existingName = content.match(/versionName\s*=\s*"([^"]+)"/)?.[1];
  let code = Math.max(floor, existingCode);
  if (existingName && existingName !== nextVersion && code <= existingCode) {
    code = existingCode + 1;
  }
  return code;
}

function applyAndroidVersion(content, nextVersion) {
  const code = nextAndroidVersionCode(content, nextVersion);
  return content
    .replace(/versionCode\s*=\s*\d+/, `versionCode = ${code}`)
    .replace(/versionName\s*=\s*"[^"]+"/, `versionName = "${nextVersion}"`);
}

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
