#!/usr/bin/env node
/**
 * Dev: rebuild apps/web and copy into the desktop sidecar static root.
 * Without this, `tauri:dev` + local host serves a stale web bundle (no HTML title bar).
 */
import { existsSync } from "node:fs";
import { cp as cpAsync, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
const webDist = join(repoRoot, "apps/web/dist");
const sidecarWeb = join(srcTauriDir, "resources/sidecar/web");

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

async function syncInto(dest) {
  if (!existsSync(dirname(dest))) {
    console.warn(`[sync-sidecar-web] skip missing parent: ${dirname(dest)}`);
    return false;
  }
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cpAsync(webDist, dest, { recursive: true, force: true });
  return true;
}

async function main() {
  if (!existsSync(join(srcTauriDir, "resources/sidecar"))) {
    console.warn(
      "[sync-sidecar-web] brak resources/sidecar — najpierw build-desktop-sidecar.mjs",
    );
    process.exit(0);
  }

  console.log("[sync-sidecar-web] building @stagesync/web");
  run("pnpm", ["--filter", "@stagesync/web", "build"]);

  if (!existsSync(join(webDist, "index.html"))) {
    console.error("[sync-sidecar-web] brak apps/web/dist/index.html po build");
    process.exit(1);
  }

  let synced = 0;
  if (await syncInto(sidecarWeb)) synced += 1;

  const debugWeb = join(srcTauriDir, "target/debug/resources/sidecar/web");
  if (existsSync(dirname(debugWeb))) {
    if (await syncInto(debugWeb)) synced += 1;
  }

  console.log(`[sync-sidecar-web] zsynchronizowano web w ${synced} lokalizacji`);
}

await main();
