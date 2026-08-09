#!/usr/bin/env node
/**
 * Buduje stagesync-setup i kopiuje do src-tauri/bin/ jako externalBin Tauri.
 *
 * Usage:
 *   node ./scripts/prepare-stagesync-setup-bin.mjs
 *   node ./scripts/prepare-stagesync-setup-bin.mjs --release
 *   node ./scripts/prepare-stagesync-setup-bin.mjs --debug
 *
 * Profil: --release | --debug | TAURI_ENV_DEBUG=true → debug; domyślnie release.
 *
 * Uwaga: ten sam Cargo.toml ma tauri-build, który wymaga ścieżki externalBin
 * zanim skompiluje jakikolwiek bin — dlatego najpierw placeholder, potem build.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcTauri = join(desktopRoot, "src-tauri");
const binDir = join(srcTauri, "bin");

const explicitDebug = process.argv.includes("--debug");
const explicitRelease = process.argv.includes("--release");
const envDebug = process.env.TAURI_ENV_DEBUG === "true";
const debug = explicitDebug || (!explicitRelease && envDebug);
const profile = debug ? "debug" : "release";

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? srcTauri,
    stdio: "inherit",
    shell: process.platform === "win32" && (command === "cargo" || command.endsWith(".cmd")),
    ...opts,
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
  return result;
}

function hostTriple() {
  const result = spawnSync("rustc", ["-vV"], { encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    console.error("[prepare-setup] rustc -vV failed");
    process.exit(1);
  }
  const m = /host:\s+(\S+)/.exec(result.stdout ?? "");
  if (!m) {
    console.error("[prepare-setup] cannot parse rustc host triple");
    process.exit(1);
  }
  return m[1];
}

const triple = hostTriple();
mkdirSync(binDir, { recursive: true });
const destName =
  process.platform === "win32"
    ? `stagesync-setup-${triple}.exe`
    : `stagesync-setup-${triple}`;
const dest = join(binDir, destName);

// tauri-build waliduje externalBin przed kompilacją — placeholder odblokowuje cargo.
if (!existsSync(dest)) {
  const hostPlaceholder = join(
    binDir,
    process.platform === "win32"
      ? `stagesync-host-${triple}.exe`
      : `stagesync-host-${triple}`,
  );
  if (existsSync(hostPlaceholder)) {
    copyFileSync(hostPlaceholder, dest);
    console.log(`[prepare-setup] placeholder z stagesync-host → ${destName}`);
  } else {
    writeFileSync(dest, Buffer.alloc(0));
    console.log(`[prepare-setup] pusty placeholder → ${destName}`);
  }
}

const cargoArgs = ["build", "--bin", "stagesync-setup"];
if (!debug) cargoArgs.push("--release");

console.log(`[prepare-setup] cargo ${cargoArgs.join(" ")} (${triple})…`);
run("cargo", cargoArgs);

const builtName =
  process.platform === "win32" ? "stagesync-setup.exe" : "stagesync-setup";
const built = join(srcTauri, "target", profile, builtName);
if (!existsSync(built)) {
  console.error(`[prepare-setup] brak ${built}`);
  process.exit(1);
}

copyFileSync(built, dest);
console.log(`[prepare-setup] → ${dest}`);
