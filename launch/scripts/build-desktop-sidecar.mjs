#!/usr/bin/env node
import { spawnSync, spawn } from "node:child_process";
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
    // Windows runners resolve pnpm/tar via cmd when shell is enabled.
    shell: process.platform === "win32",
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



function resolveExtractedNodeBin(extractedRoot) {
  const winRoot = join(extractedRoot, "node.exe");
  if (existsSync(winRoot)) return winRoot;
  const unixBin = join(extractedRoot, "bin", "node");
  if (existsSync(unixBin)) return unixBin;
  throw new Error(`Could not locate node binary under ${extractedRoot}`);
}


async function ensureTauriResourceGlobDir(srcTauriDir, sub) {
  const dir = join(srcTauriDir, sub);
  const hasRealContent = existsSync(dir) && (await readdir(dir)).length > 0;
  if (hasRealContent) return;

  // Tauri 2 fails when `lib/**/*` matches zero files (Windows Node zip has no lib/share).
  // Stub must sit under a subdirectory so `**/*` globs match.
  const stubFile = join(dir, ".stagesync-stub", "keep");
  await mkdir(dirname(stubFile), { recursive: true });
  await writeFile(stubFile, "");
}

function externalBinDestPath(binDir, target) {
  const base = `stagesync-host-${target}`;
  if (target.endsWith("-pc-windows-msvc")) {
    return join(binDir, `${base}.exe`);
  }
  return join(binDir, base);
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

  const extractedNodeBin = resolveExtractedNodeBin(extractedRoot);

  // Tauri externalBin expects per-target triple name under bundle /bin.
  const destStagesyncHost = externalBinDestPath(binDir, target);
  await cp(extractedNodeBin, destStagesyncHost);
  if (!destStagesyncHost.endsWith(".exe")) {
    await chmod(destStagesyncHost, 0o755);
  }

  // Unix Node builds ship lib/ + share/ beside bin/; Windows zip is node.exe-centric.
  for (const sub of ["lib", "share"]) {
    const src = join(extractedRoot, sub);
    if (existsSync(src)) {
      await cp(src, join(srcTauriDir, sub), { recursive: true, force: true });
    }
    await ensureTauriResourceGlobDir(srcTauriDir, sub);
  }
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

const SHARED_RUNTIME_STRIP = [
  "src",
  ".turbo",
  "eslint.config.js",
  "vitest.config.ts",
  "tsconfig.json",
  "README.md",
];

/** Remove dev-only files from workspace packages inside deployed node_modules. */
async function pruneWorkspacePackageSources(nodeModulesDir, scopedName) {
  const [scope, name] = scopedName.split("/");
  const targets = new Set();

  const direct = join(nodeModulesDir, scope, name);
  if (existsSync(direct)) targets.add(direct);

  const pnpmDir = join(nodeModulesDir, ".pnpm");
  if (existsSync(pnpmDir)) {
    const needle = `${scope.replace("@", "")}+${name}@`;
    const entries = await readdir(pnpmDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory() || !ent.name.includes(needle)) continue;
      const nested = join(pnpmDir, ent.name, "node_modules", scope, name);
      if (existsSync(nested)) targets.add(nested);
    }
  }

  for (const pkgDir of targets) {
    for (const rel of SHARED_RUNTIME_STRIP) {
      await rm(join(pkgDir, rel), { recursive: true, force: true });
    }
  }
}

/** Production-only node_modules via pnpm deploy (ADR 0013; PR2 bundle size). */
async function prepareProductionNodeModules(sidecarServerDir, serverDistDir) {
  const serverDevArtifacts = [
    "src",
    ".turbo",
    "eslint.config.js",
    "vitest.config.ts",
    "tsconfig.json",
    "package.json",
  ];

  console.log("[sidecar] pnpm deploy --prod @stagesync/server");
  await rm(sidecarServerDir, { recursive: true, force: true });
  await mkdir(sidecarServerDir, { recursive: true });

  run("pnpm", ["--filter", "@stagesync/server", "deploy", "--prod", sidecarServerDir]);

  // Use the compiled dist from the monorepo build (not deploy's copied sources).
  await rm(join(sidecarServerDir, "dist"), { recursive: true, force: true });
  await cp(serverDistDir, join(sidecarServerDir, "dist"), { recursive: true, force: true });

  for (const rel of serverDevArtifacts) {
    await rm(join(sidecarServerDir, rel), { recursive: true, force: true });
  }

  await pruneWorkspacePackageSources(
    join(sidecarServerDir, "node_modules"),
    "@stagesync/shared",
  );
}

async function smokeTestSidecarServer(sidecarServerDir, seedDir) {
  const dataDir = join(tmpdir(), `stagesync-sidecar-smoke-${Date.now()}`);
  await mkdir(dataDir, { recursive: true });

  const port = 14000 + Math.floor(Math.random() * 1000);
  const entry = join(sidecarServerDir, "dist/index.js");
  if (!existsSync(entry)) {
    throw new Error(`[sidecar] smoke: missing server entry ${entry}`);
  }

  console.log(`[sidecar] smoke: starting server on :${port}`);
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: String(port),
      STAGESYNC_DATA_DIR: dataDir,
      STAGESYNC_SEED_DIR: seedDir,
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const deadline = Date.now() + 15_000;
  let lastErr = "timeout";
  try {
    while (Date.now() < deadline) {
      if (child.exitCode != null) {
        const stderr = await readStream(child.stderr);
        throw new Error(`[sidecar] smoke: server exited early: ${stderr}`);
      }
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.ok) {
          const body = await res.json();
          if (body?.ok === true) {
            console.log("[sidecar] smoke: health OK");
            return;
          }
          lastErr = `unexpected body: ${JSON.stringify(body)}`;
        } else {
          lastErr = `HTTP ${res.status}`;
        }
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`[sidecar] smoke failed: ${lastErr}`);
  } finally {
    child.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 200));
    if (child.exitCode == null) child.kill("SIGKILL");
    await rm(dataDir, { recursive: true, force: true });
  }
}

async function readStream(stream) {
  if (!stream) return "";
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
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

  const seedTemplate = join(repoRoot, "data/library/library.template.json");

  // Build JS outputs first (and shared, because server runtime imports it).
  console.log("[sidecar] building JS outputs (shared/server/web)");
  run("pnpm", ["--filter", "@stagesync/shared", "build"]);
  run("pnpm", ["--filter", "@stagesync/server", "build"]);
  run("pnpm", ["--filter", "@stagesync/web", "build"]);

  console.log("[sidecar] preparing resources");
  await rm(join(srcTauriDir, "resources"), { recursive: true, force: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await mkdir(sidecarSeedDir, { recursive: true });

  // Seed (read-only)
  await cp(seedTemplate, join(sidecarSeedDir, "library.template.json"));

  // Static web (read-only)
  await rm(sidecarWebDir, { recursive: true, force: true });
  await mkdir(sidecarWebDir, { recursive: true });
  await copyDirContents(webDistDir, sidecarWebDir);

  console.log("[sidecar] preparing production node_modules (pnpm deploy --prod)");
  await prepareProductionNodeModules(sidecarServerDir, serverDistDir);

  // Finally, prepare Node runtime executable + support files.
  console.log("[sidecar] preparing Node runtime in tauri bundle (externalBin support)");
  await prepareNodeRuntimeIntoTauriBundle(target);

  await assertNoRepoDocsInSidecar(sidecarDir);

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
  const target = getArg("--target");
  if (!target) {
    console.error("Usage: node launch/scripts/build-desktop-sidecar.mjs --target <tauri-target-triple>");
    process.exit(2);
  }
  await buildAndPrepareSidecarResources();
}

await main();

