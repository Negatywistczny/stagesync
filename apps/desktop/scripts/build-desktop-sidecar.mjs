#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  rm,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeTargetTriple,
  externalBinDestPath,
  prepareNodeRuntimeIntoTauriBundle,
} from "./sidecar/node-runtime.mjs";
import {
  copyDirContents,
  assertNoRepoDocsInSidecar,
  prepareProductionNodeModules,
  pruneRuntimeBundle,
  materializePnpmLayoutForTauriBundle,
  assertDeployHasRuntimeDeps,
} from "./sidecar/prune.mjs";
import {
  selfTestNodeSpawnPathGuards,
  smokeTestSidecarServer,
  patchInstalledApp,
} from "./sidecar/smoke.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "../../..");
if (!existsSync(join(repoRoot, "pnpm-workspace.yaml"))) {
  throw new Error(
    `[sidecar] repoRoot misresolved: expected pnpm-workspace.yaml under ${repoRoot}`,
  );
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function run(cmd, args, { cwd = repoRoot, env } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: env ? { ...process.env, ...env } : undefined,
  });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

/**
 * `pnpm deploy --prod` writes workspace state with production=true / dev=false.
 * Reset to prevent dropping build tooling on subsequent script runs.
 */
async function restoreWorkspaceInstall() {
  const statePath = join(repoRoot, "node_modules/.pnpm-workspace-state-v1.json");
  console.log("[sidecar] restoring full workspace install after deploy --prod");
  await rm(statePath, { force: true });
  run("pnpm", ["install", "--frozen-lockfile"], {
    env: { CI: process.env.CI || "true" },
  });
}

async function buildAndPrepareSidecarResources() {
  const target = normalizeTargetTriple(getArg("--target"));
  const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
  const sidecarDir = join(srcTauriDir, "resources/sidecar");
  const sidecarServerDir = join(sidecarDir, "server");
  const sidecarWebDir = join(sidecarDir, "web");
  const sidecarSeedDir = join(sidecarDir, "seed");
  const sidecarDownloadsDir = join(sidecarDir, "downloads");

  const serverPackageRoot = join(repoRoot, "apps/server");
  const serverDistDir = join(serverPackageRoot, "dist");
  const webPackageRoot = join(repoRoot, "apps/web");
  const webDistDir = join(webPackageRoot, "dist");

  const seedTemplate = join(repoRoot, "data/library/library.template.json");
  const seedProjects = join(repoRoot, "data/library/seed-projects");
  const repoDownloadsDir = join(repoRoot, "data/downloads");

  // Build JS outputs first (and shared, because server runtime imports it).
  console.log("[sidecar] building JS outputs (shared/server/web)");
  run("pnpm", ["--filter", "@stagesync/shared", "build"]);
  run("pnpm", ["--filter", "@stagesync/server", "build"]);
  run("pnpm", ["--filter", "@stagesync/web", "build"]);

  console.log("[sidecar] preparing resources");
  await rm(join(srcTauriDir, "resources"), { recursive: true, force: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await mkdir(sidecarSeedDir, { recursive: true });
  await mkdir(sidecarDownloadsDir, { recursive: true });

  // Seed (read-only)
  await cp(seedTemplate, join(sidecarSeedDir, "library.template.json"));
  await cp(seedProjects, join(sidecarSeedDir, "seed-projects"), { recursive: true });

  // Sideload APKs (optional — skip quietly when not built yet)
  const apkNames = ["stagesync-performer.apk", "stagesync-console.apk"];
  let apkCopied = 0;
  for (const name of apkNames) {
    const src = join(repoDownloadsDir, name);
    if (!existsSync(src)) continue;
    await cp(src, join(sidecarDownloadsDir, name));
    apkCopied += 1;
  }
  if (apkCopied > 0) {
    console.log(`[sidecar] bundled ${apkCopied} APK(s) into sidecar/downloads`);
  } else {
    console.log(
      "[sidecar] no APKs in data/downloads — Admin QR will empty-state until present",
    );
  }

  // Static web (read-only)
  await rm(sidecarWebDir, { recursive: true, force: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await copyDirContents(webDistDir, sidecarWebDir);

  console.log("[sidecar] preparing production node_modules (pnpm deploy --prod)");
  await prepareProductionNodeModules(sidecarServerDir, serverDistDir, repoRoot, run, restoreWorkspaceInstall);

  // Prepare Node runtime executable + support files.
  console.log("[sidecar] preparing Node runtime in tauri bundle (externalBin support)");
  await prepareNodeRuntimeIntoTauriBundle(target, repoRoot, run);

  await assertNoRepoDocsInSidecar(sidecarDir);

  await pruneRuntimeBundle(sidecarDir);

  if (process.argv.includes("--smoke")) {
    await smokeTestSidecarServer(sidecarServerDir, sidecarSeedDir);
  }

  console.log("[sidecar] done");
  console.log(
    [
      `- sidecar resources: ${sidecarDir}`,
      `- externalBin: ${externalBinDestPath(join(srcTauriDir, "bin"), target)}`,
    ].join("\n"),
  );
}

async function main() {
  const patchApp = getArg("--patch-app");
  const fixApp = getArg("--fix-app");
  const materializeNm = getArg("--materialize-node-modules");
  const target = getArg("--target");

  selfTestNodeSpawnPathGuards();
  if (process.argv.includes("--self-test")) {
    return;
  }

  if (materializeNm) {
    console.log(`[sidecar] materializing pnpm layout: ${materializeNm}`);
    await materializePnpmLayoutForTauriBundle(materializeNm);
    await assertDeployHasRuntimeDeps(dirname(materializeNm));
    console.log("[sidecar] materialize-node-modules complete");
    return;
  }

  if (fixApp) {
    const serverNm = join(
      fixApp,
      "Contents/Resources/resources/sidecar/server/node_modules",
    );
    if (!existsSync(serverNm)) {
      throw new Error(`[sidecar] missing node_modules in app: ${serverNm}`);
    }
    console.log(`[sidecar] materializing pnpm layout in installed app: ${fixApp}`);
    await materializePnpmLayoutForTauriBundle(serverNm);
    await assertDeployHasRuntimeDeps(
      join(fixApp, "Contents/Resources/resources/sidecar/server"),
    );
    const seedDir = join(
      fixApp,
      "Contents/Resources/resources/sidecar/seed",
    );
    await smokeTestSidecarServer(
      join(fixApp, "Contents/Resources/resources/sidecar/server"),
      seedDir,
    );
    console.log("[sidecar] fix-app complete");
    return;
  }

  if (patchApp) {
    if (!target) {
      console.error(
        "Usage: node apps/desktop/scripts/build-desktop-sidecar.mjs --target <triple> --patch-app </path/StageSync.app>",
      );
      process.exit(2);
    }
    await buildAndPrepareSidecarResources();
    await patchInstalledApp(patchApp, repoRoot);
    return;
  }

  if (!target) {
    console.error(
      "Usage: node apps/desktop/scripts/build-desktop-sidecar.mjs --target <tauri-target-triple>\n" +
      "       node apps/desktop/scripts/build-desktop-sidecar.mjs --fix-app </path/StageSync.app>\n" +
      "       node apps/desktop/scripts/build-desktop-sidecar.mjs --self-test",
    );
    process.exit(2);
  }
  await buildAndPrepareSidecarResources();
}

await main();
