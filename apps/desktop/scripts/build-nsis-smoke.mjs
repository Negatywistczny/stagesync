#!/usr/bin/env node
/**
 * Single-file smoke installer (splash bootstrap + cichy NSIS):
 *  1) silent NSIS payload
 *  2) stagesync-setup bootstrap
 *  3) append payload into StageSync-Setup.exe (magic footer SSPAY001)
 *
 * Usage:
 *   pnpm --filter @stagesync/desktop tauri:build:nsis-smoke
 *
 * Run:
 *   apps/desktop/src-tauri/target/{debug|release}/nsis-smoke/StageSync-Setup.exe
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcTauri = join(desktopRoot, "src-tauri");
const smokeConfig = join(srcTauri, "tauri.nsis-smoke.conf.json");
const release = process.argv.includes("--release");
const profile = release ? "release" : "debug";

if (!existsSync(smokeConfig)) {
  console.error(`[nsis-smoke] missing overlay: ${smokeConfig}`);
  process.exit(1);
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? desktopRoot,
    stdio: "inherit",
    shell: process.platform === "win32" && (command === "pnpm" || command.endsWith(".cmd")),
    ...opts,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function clearNsisOutputs() {
  const nsisDir = join(srcTauri, "target", profile, "bundle", "nsis");
  if (!existsSync(nsisDir)) return;
  for (const name of readdirSync(nsisDir)) {
    if (!name.toLowerCase().endsWith(".exe")) continue;
    const full = join(nsisDir, name);
    try {
      unlinkSync(full);
      console.log(`[nsis-smoke] usunięto stary artefakt: ${name}`);
    } catch (err) {
      console.error(
        `[nsis-smoke] nie można usunąć ${full}\n` +
          `  Zamknij otwarty instalator i spróbuj ponownie.\n` +
          `  (${err instanceof Error ? err.message : err})`,
      );
      process.exit(1);
    }
  }
}

console.log(`[nsis-smoke] single-file splash+NSIS (${profile})…`);

run("node", [join(desktopRoot, "scripts/kill-zombies.mjs")]);
clearNsisOutputs();
run("node", [join(desktopRoot, "scripts/check-rust.mjs")]);
run("node", [join(desktopRoot, "scripts/sync-launcher-ui.mjs")]);
run("node", [
  join(desktopRoot, "scripts/prepare-stagesync-setup-bin.mjs"),
  release ? "--release" : "--debug",
]);

const tauriArgs = [
  "tauri",
  "build",
  "--bundles",
  "nsis",
  "--no-sign",
  "--config",
  smokeConfig,
];
if (!release) tauriArgs.splice(2, 0, "--debug");
run("pnpm", ["exec", ...tauriArgs]);

const nsisDir = join(srcTauri, "target", profile, "bundle", "nsis");
const setupBin = join(
  srcTauri,
  "target",
  profile,
  process.platform === "win32" ? "stagesync-setup.exe" : "stagesync-setup",
);
const outDir = join(srcTauri, "target", profile, "nsis-smoke");
mkdirSync(outDir, { recursive: true });

const nsisExes = existsSync(nsisDir)
  ? readdirSync(nsisDir).filter((n) => n.toLowerCase().endsWith("-setup.exe"))
  : [];
if (nsisExes.length === 0) {
  console.error(`[nsis-smoke] brak *-setup.exe w ${nsisDir}`);
  process.exit(1);
}
if (!existsSync(setupBin)) {
  console.error(`[nsis-smoke] brak ${setupBin}`);
  process.exit(1);
}

const payloadSrc = join(nsisDir, nsisExes[0]);
const userFacing = join(outDir, "StageSync-Setup.exe");

for (const stale of ["installer-payload.exe", "StageSync-Setup.exe"]) {
  const p = join(outDir, stale);
  if (existsSync(p)) {
    try {
      unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

run("node", [
  join(desktopRoot, "scripts/pack-stagesync-setup.mjs"),
  "--bootstrap",
  setupBin,
  "--payload",
  payloadSrc,
  "--out",
  userFacing,
]);

const setupSizeMb = (statSync(userFacing).size / (1024 * 1024)).toFixed(1);
writeFileSync(
  join(outDir, "README.txt"),
  [
    "StageSync smoke installer — JEDEN PLIK (splash + NSIS)",
    "",
    "Uruchom wyłącznie:",
    "  StageSync-Setup.exe",
    "",
    "W środku: bootstrap (splash) + osadzony cichy NSIS (stopka SSPAY001).",
    `Payload źródłowy: ${nsisExes[0]}`,
    `Rozmiar: ${setupSizeMb} MB`,
    "",
  ].join("\r\n"),
  "utf8",
);

console.log(
  `[nsis-smoke] gotowe (single-file ${setupSizeMb} MB) — uruchom:\n  ${userFacing}`,
);
