#!/usr/bin/env node
/**
 * Dev-only: refresh bundled local-host server JS after monorepo changes.
 * Full sidecar (Node runtime, web dist, deploy) → build-desktop-sidecar.mjs.
 */
import { existsSync } from "node:fs";
import { cp as cpAsync, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
const sidecarServerDir = join(srcTauriDir, "resources/sidecar/server");
const serverDist = join(repoRoot, "apps/server/dist");
const sharedDist = join(repoRoot, "packages/shared/dist");

function run(cmd, args) {
  const res = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

async function copyTree(from, to) {
  await mkdir(dirname(to), { recursive: true });
  await cpAsync(from, to, { recursive: true, force: true });
}

async function syncInto(sidecarDir) {
  const distDest = join(sidecarDir, "dist");
  const sharedDest = join(sidecarDir, "node_modules/@stagesync/shared/dist");
  if (!existsSync(join(sidecarDir, "node_modules"))) {
    console.warn(
      `[sync-sidecar-server] skip ${sidecarDir} — brak node_modules (uruchom build-desktop-sidecar.mjs)`,
    );
    return false;
  }
  await copyTree(serverDist, distDest);
  if (existsSync(sharedDest)) {
    await copyTree(sharedDist, sharedDest);
  }
  return true;
}

async function main() {
  if (!existsSync(sidecarServerDir)) {
    console.warn(
      "[sync-sidecar-server] brak apps/desktop/src-tauri/resources/sidecar — uruchom:\n" +
        "  node launch/scripts/build-desktop-sidecar.mjs --target aarch64-apple-darwin",
    );
    process.exit(0);
  }

  console.log("[sync-sidecar-server] building @stagesync/shared + @stagesync/server");
  run("pnpm", ["--filter", "@stagesync/shared", "build"]);
  run("pnpm", ["--filter", "@stagesync/server", "build"]);

  let synced = 0;
  if (await syncInto(sidecarServerDir)) synced += 1;

  const debugSidecar = join(srcTauriDir, "target/debug/resources/sidecar/server");
  if (existsSync(debugSidecar) && debugSidecar !== sidecarServerDir) {
    if (await syncInto(debugSidecar)) synced += 1;
  }

  if (synced === 0) {
    console.warn("[sync-sidecar-server] nic nie zsynchronizowano");
    process.exit(1);
  }
  console.log(`[sync-sidecar-server] zsynchronizowano dist (+ shared) w ${synced} lokalizacji`);
}

await main();
