#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, readdir, rm, chmod, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
// (no node:fs stream usage; download uses arrayBuffer -> writeFile)
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "../..");

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function run(cmd, args, { cwd = repoRoot } = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
  if (res.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  // Node's fetch uses web streams; keep it simple for the PoC.
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
}

function normalizeTargetTriple(target) {
  // Keep the CLI contract explicit; Tauri uses its own "target" strings.
  // We only implement the ones we currently test/build in CI.
  const supported = new Set([
    "aarch64-apple-darwin",
    "x86_64-apple-darwin",
    "x86_64-pc-windows-msvc",
  ]);
  if (!supported.has(target)) {
    throw new Error(`Unsupported --target ${target}. Supported: ${[...supported].join(", ")}`);
  }
  return target;
}

async function resolveNodeVersionFromNvmrc() {
  const nvmrcPath = join(repoRoot, ".nvmrc");
  const major = (await (await import("node:fs/promises")).readFile(nvmrcPath, "utf8")).trim();
  if (!/^\d+$/.test(major)) {
    throw new Error(`Unexpected .nvmrc content: ${major}`);
  }

  const indexUrl = "https://nodejs.org/dist/index.json";
  const res = await fetch(indexUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Node dist index: ${res.status} ${res.statusText}`);
  }
  const index = await res.json(); // Array of objects: { version, date, files, ... }
  const matched = index.find((v) => typeof v?.version === "string" && v.version.startsWith(`v${major}.`))?.version;
  if (!matched) {
    throw new Error(`No Node versions found for major ${major}`);
  }
  return matched; // e.g. "v20.18.0"
}

function nodeDistFromTarget(target) {
  // Node distributions naming.
  if (target === "aarch64-apple-darwin") {
    return { platform: "darwin", arch: "arm64", kind: "tar.gz" };
  }
  if (target === "x86_64-apple-darwin") {
    return { platform: "darwin", arch: "x64", kind: "tar.gz" };
  }
  if (target === "x86_64-pc-windows-msvc") {
    return { platform: "win", arch: "x64", kind: "zip" };
  }
  throw new Error(`Unhandled target: ${target}`);
}

function extractCommandForArchive(archivePath, destDir, kind) {
  if (kind === "tar.gz") {
    // tar is available on CI runners (macOS, linux).
    return { cmd: "tar", args: ["-xzf", archivePath, "-C", destDir] };
  }
  if (kind === "zip") {
    if (process.platform === "win32") {
      return {
        cmd: "powershell",
        args: [
          "-NoProfile",
          "-Command",
          `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
        ],
      };
    }
    return { cmd: "unzip", args: ["-q", archivePath, "-d", destDir] };
  }
  throw new Error(`Unknown archive kind: ${kind}`);
}

async function prepareNodeRuntimeIntoTauriBundle(target) {
  const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
  const binDir = join(srcTauriDir, "bin");

  // Clean runtime dirs to avoid mixing targets.
  await rm(binDir, { recursive: true, force: true });
  await rm(join(srcTauriDir, "lib"), { recursive: true, force: true });
  await rm(join(srcTauriDir, "share"), { recursive: true, force: true });
  await mkdir(binDir, { recursive: true });

  const nodeVersion = await resolveNodeVersionFromNvmrc(); // includes leading "v"
  const { platform, arch, kind } = nodeDistFromTarget(target);

  const archiveName =
    kind === "tar.gz"
      ? `node-${nodeVersion}-${platform}-${arch}.tar.gz`
      : `node-${nodeVersion}-${platform}-${arch}.zip`;

  const url = `https://nodejs.org/dist/${nodeVersion}/${archiveName}`;

  const tempDir = await (await import("node:fs/promises")).mkdtemp(
    join(tmpdir(), "stagesync-sidecar-"),
  );

  const archivePath = join(tempDir, archiveName);
  console.log(`[sidecar] downloading Node runtime: ${url}`);
  await downloadFile(url, archivePath);

  const extractDest = join(tempDir, "extract");
  await mkdir(extractDest, { recursive: true });

  const { cmd, args } = extractCommandForArchive(archivePath, extractDest, kind);
  console.log(`[sidecar] extracting: ${cmd} ${args.join(" ")}`);
  run(cmd, args, { cwd: repoRoot });

  const entries = await readdir(extractDest, { withFileTypes: true });
  const extractedDir = entries.find((e) => e.isDirectory() && e.name.startsWith("node-"));
  if (!extractedDir) {
    throw new Error(`Could not locate extracted node directory in ${extractDest}`);
  }
  const extractedRoot = join(extractDest, extractedDir.name);

  const extractedNodeBin = join(
    extractedRoot,
    "bin",
    process.platform === "win32" ? "node.exe" : "node",
  );

  // Tauri externalBin expects an executable in bundle's /bin.
  const destStagesyncHost = join(binDir, "stagesync-host");
  await cp(extractedNodeBin, destStagesyncHost);
  if (process.platform !== "win32") {
    await chmod(destStagesyncHost, 0o755);
  }

  // Node expects its runtime support files to live next to /bin/../lib and /bin/../share.
  await cp(join(extractedRoot, "lib"), join(srcTauriDir, "lib"), { recursive: true, force: true });
  await cp(join(extractedRoot, "share"), join(srcTauriDir, "share"), { recursive: true, force: true });
}

async function copyDirContents(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    await cp(join(srcDir, ent.name), join(destDir, ent.name), { recursive: true, force: true });
  }
}

/** Fail build if repo docs or stray .md leak into runtime bundles (ADR 0013). */
async function assertNoRepoDocsInSidecar(sidecarDir) {
  const forbiddenDirs = [
    join(sidecarDir, "docs"),
    join(sidecarDir, "web", "docs"),
    join(sidecarDir, "server", "docs"),
  ];
  for (const dir of forbiddenDirs) {
    if (existsSync(dir)) {
      throw new Error(`[sidecar] forbidden docs path in bundle: ${dir}`);
    }
  }

  async function walkNoMd(root) {
    if (!existsSync(root)) return;
    const entries = await readdir(root, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(root, ent.name);
      if (ent.isDirectory()) {
        await walkNoMd(full);
        continue;
      }
      if (ent.name.toLowerCase().endsWith(".md")) {
        throw new Error(`[sidecar] forbidden .md in runtime bundle: ${full}`);
      }
    }
  }

  await walkNoMd(join(sidecarDir, "web"));
  await walkNoMd(join(sidecarDir, "server", "dist"));
  await walkNoMd(join(sidecarDir, "seed"));
  console.log("[sidecar] docs hygiene check passed (web/dist, server/dist, seed)");
}

async function buildAndPrepareSidecarResources() {
  const target = normalizeTargetTriple(getArg("--target"));
  const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
  const sidecarDir = join(srcTauriDir, "resources/sidecar");
  const sidecarServerDir = join(sidecarDir, "server");
  const sidecarWebDir = join(sidecarDir, "web");
  const sidecarSeedDir = join(sidecarDir, "seed");

  const serverPackageRoot = join(repoRoot, "apps/server");
  const serverDistDir = join(serverPackageRoot, "dist");
  const webPackageRoot = join(repoRoot, "apps/web");
  const webDistDir = join(webPackageRoot, "dist");
  const sharedPackageRoot = join(repoRoot, "packages/shared");

  const serverNodeModules = join(repoRoot, "apps/server/node_modules");
  const seedTemplate = join(repoRoot, "data/library/library.template.json");

  // Build JS outputs first (and shared, because server runtime imports it).
  console.log("[sidecar] building JS outputs (shared/server/web)");
  run("pnpm", ["--filter", "@stagesync/shared", "build"]);
  run("pnpm", ["--filter", "@stagesync/server", "build"]);
  run("pnpm", ["--filter", "@stagesync/web", "build"]);

  console.log("[sidecar] preparing resources");
  await rm(join(srcTauriDir, "resources"), { recursive: true, force: true });
  await mkdir(sidecarServerDir, { recursive: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await mkdir(sidecarSeedDir, { recursive: true });

  // Server JS
  await rm(join(sidecarServerDir, "dist"), { recursive: true, force: true });
  await cp(serverDistDir, join(sidecarServerDir, "dist"), { recursive: true, force: true });

  // Seed (read-only)
  await cp(seedTemplate, join(sidecarSeedDir, "library.template.json"));

  // Static web (read-only)
  await rm(sidecarWebDir, { recursive: true, force: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await copyDirContents(webDistDir, sidecarWebDir);

  // Node dependencies:
  // For a PoC we copy the root node_modules and then overwrite the workspace package(s)
  // with a real copy (so we don't ship pnpm symlinks back to the repo).
  console.log("[sidecar] copying node_modules (PoC size/quality tradeoff)");
  await rm(join(sidecarServerDir, "node_modules"), { recursive: true, force: true });
  await cp(serverNodeModules, join(sidecarServerDir, "node_modules"), {
    recursive: true,
    force: true,
  });

  // Replace workspace symlink for @stagesync/shared with a real directory copy.
  const sharedTargetInNodeModules = join(
    sidecarServerDir,
    "node_modules/@stagesync/shared",
  );
  await rm(sharedTargetInNodeModules, { recursive: true, force: true });
  await cp(sharedPackageRoot, sharedTargetInNodeModules, { recursive: true, force: true });

  // Finally, prepare Node runtime executable + support files.
  console.log("[sidecar] preparing Node runtime in tauri bundle (externalBin support)");
  await prepareNodeRuntimeIntoTauriBundle(target);

  await assertNoRepoDocsInSidecar(sidecarDir);

  console.log("[sidecar] done");
  console.log(
    [
      `- sidecar resources: ${sidecarDir}`,
      `- externalBin: ${join(srcTauriDir, "bin/stagesync-host")}`,
    ].join("\n"),
  );
}

async function main() {
  const target = getArg("--target");
  if (!target) {
    console.error("Usage: node launch/scripts/build-desktop-sidecar.mjs --target <tauri-target-triple>");
    process.exit(2);
  }
  await buildAndPrepareSidecarResources();
}

await main();

