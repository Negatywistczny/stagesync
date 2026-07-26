#!/usr/bin/env node
/**
 * Prepare nodejs-mobile libnode + Console local-host assets.
 *
 * Usage:
 *   node apps/console/scripts/prepare-local-host.mjs
 *   node apps/console/scripts/prepare-local-host.mjs --skip-server   # libnode/headers only
 *
 * Default: download libnode.so (+ headers) and pack server/web/seed into assets/host
 * (same production deploy shape as desktop sidecar).
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import {
  chmod,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..", "..");
const consoleApp = join(repoRoot, "apps/console/android/app");
const consoleAndroidMain = join(consoleApp, "src/main");
const jniLibs = join(consoleAndroidMain, "jniLibs");
const hostAssets = join(consoleAndroidMain, "assets/host");
const libnodeRoot = join(consoleApp, "libnode");

const NODEJS_MOBILE_VERSION = "v18.20.4";
/**
 * Default: digidem rebuild of upstream v18.20.4 with PT_LOAD align 16 KB
 * (nodejs-mobile#154). Official nodejs-mobile/nodejs-mobile assets remain 4 KB
 * until a tagged +16kb-fix release ships — those abort on Android 15+ 16 KB
 * page devices. Override: NODEJS_MOBILE_ZIP_URL=…
 * Allow a 4 KB zip only with ALLOW_INCOMPATIBLE_LIBNODE=1 (CI must not).
 */
const DEFAULT_ZIP_URL =
  `https://github.com/digidem/nodejs-mobile/releases/download/${NODEJS_MOBILE_VERSION}/nodejs-mobile-${NODEJS_MOBILE_VERSION}-android.zip`;
const ZIP_URL = process.env.NODEJS_MOBILE_ZIP_URL?.trim() || DEFAULT_ZIP_URL;
const ALLOW_INCOMPATIBLE_LIBNODE =
  process.env.ALLOW_INCOMPATIBLE_LIBNODE === "1";
const MIN_LOAD_ALIGN = 16_384;

const skipServer = process.argv.includes("--skip-server");
const withServer =
  process.argv.includes("--with-server") || !skipServer;

function run(cmd, args, cwd = repoRoot) {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    throw new Error(`command failed: ${cmd} ${args.join(" ")}`);
  }
}

async function download(url, dest) {
  console.log(`[local-host] downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function extractZip(zipPath, extractRoot) {
  await mkdir(extractRoot, { recursive: true });
  run("unzip", ["-q", "-o", zipPath, "-d", extractRoot]);
}

async function resolveZipRoots(extractRoot) {
  const binRootCandidates = [
    join(extractRoot, "bin"),
    ...(await readdir(extractRoot)).map((e) => join(extractRoot, e, "bin")),
  ];
  const binRoot = binRootCandidates.find((p) => existsSync(p));
  if (!binRoot) {
    throw new Error(`could not find bin/ in ${extractRoot}`);
  }

  const includeCandidates = [
    join(extractRoot, "include"),
    join(dirname(binRoot), "include"),
    ...(await readdir(extractRoot)).map((e) => join(extractRoot, e, "include")),
  ];
  const includeRoot = includeCandidates.find(
    (p) => existsSync(p) && existsSync(join(p, "node", "node.h")),
  );
  if (!includeRoot) {
    throw new Error(`could not find include/node/node.h in ${extractRoot}`);
  }
  return { binRoot, includeRoot };
}

async function copyAbi(binRoot, abi) {
  const src = join(binRoot, abi, "libnode.so");
  if (!existsSync(src)) {
    throw new Error(`missing ${src}`);
  }
  const destDir = join(jniLibs, abi);
  await mkdir(destDir, { recursive: true });
  const dest = join(destDir, "libnode.so");
  await cp(src, dest);
  await chmod(dest, 0o755);
  const align = await maxLoadAlign(dest);
  if (align < MIN_LOAD_ALIGN) {
    const msg =
      `[local-host] ${abi} libnode.so max PT_LOAD align=${align} (<${MIN_LOAD_ALIGN}). ` +
      `On Android 15+ devices with 16 KB pages, dlopen aborts the :host process. ` +
      `Use the default digidem 16 KB zip, or NODEJS_MOBILE_ZIP_URL with PT_LOAD ≥ 16384.`;
    if (ALLOW_INCOMPATIBLE_LIBNODE) {
      console.warn(`${msg} (ALLOW_INCOMPATIBLE_LIBNODE=1 — continuing)`);
    } else {
      throw new Error(`${msg} Set ALLOW_INCOMPATIBLE_LIBNODE=1 to override.`);
    }
  } else {
    console.log(`[local-host] ${abi} libnode.so PT_LOAD align=${align} (16 KB OK)`);
  }
  console.log(`[local-host] wrote ${dest}`);
  return align;
}

/** Max p_align among PT_LOAD segments (ELF). */
async function maxLoadAlign(soPath) {
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(soPath);
  if (buf.length < 64 || buf[0] !== 0x7f || buf[1] !== 0x45) return 0;
  const eiClass = buf[4]; // 1=32, 2=64
  const little = buf[5] === 1;
  if (!little) return 0;
  const u16 = (o) => buf.readUInt16LE(o);
  const u32 = (o) => buf.readUInt32LE(o);
  const u64 = (o) => Number(buf.readBigUInt64LE(o));
  let ePhOff;
  let ePhEntSize;
  let ePhNum;
  if (eiClass === 2) {
    ePhOff = u64(32);
    ePhEntSize = u16(54);
    ePhNum = u16(56);
  } else if (eiClass === 1) {
    ePhOff = u32(28);
    ePhEntSize = u16(42);
    ePhNum = u16(44);
  } else {
    return 0;
  }
  let maxAlign = 0;
  for (let i = 0; i < ePhNum; i++) {
    const off = ePhOff + i * ePhEntSize;
    const pType = u32(off);
    if (pType !== 1) continue; // PT_LOAD
    const pAlign = eiClass === 2 ? u64(off + 48) : u32(off + 28);
    if (pAlign > maxAlign) maxAlign = pAlign;
  }
  return maxAlign;
}

async function copyHeaders(includeRoot) {
  await rm(libnodeRoot, { recursive: true, force: true });
  await mkdir(join(libnodeRoot, "include"), { recursive: true });
  await cp(includeRoot, join(libnodeRoot, "include"), {
    recursive: true,
    force: true,
  });
  const nodeH = join(libnodeRoot, "include", "node", "node.h");
  if (!existsSync(nodeH)) {
    throw new Error(`headers missing after copy: ${nodeH}`);
  }
  console.log(`[local-host] headers at ${join(libnodeRoot, "include/node")}`);
}

async function copyDirContents(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    await cp(join(srcDir, ent.name), join(destDir, ent.name), {
      recursive: true,
      force: true,
    });
  }
}

const NODE_MODULES_PRUNE_DIRS = new Set([
  "test",
  "tests",
  "__tests__",
  "docs",
  "doc",
  "example",
  "examples",
  "coverage",
  ".github",
  ".turbo",
  "prebuilds",
]);

const NODE_MODULES_PRUNE_FILE_RE =
  /\.(md|cts|mts|map|markdown|yml|yaml|node)$/i;

async function pruneDeployedNodeModules(nodeModulesDir) {
  if (!existsSync(nodeModulesDir)) return;
  const stack = [nodeModulesDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        if (NODE_MODULES_PRUNE_DIRS.has(ent.name)) {
          await rm(full, { recursive: true, force: true });
          continue;
        }
        stack.push(full);
        continue;
      }
      if (
        NODE_MODULES_PRUNE_FILE_RE.test(ent.name) ||
        ent.name === "LICENSE" ||
        ent.name.startsWith("LICENSE.") ||
        ent.name === "CHANGELOG" ||
        ent.name.startsWith("CHANGELOG.")
      ) {
        await rm(full, { force: true });
      }
    }
  }
}

async function pruneTypescriptSourceTrees(nodeModulesDir) {
  if (!existsSync(nodeModulesDir)) return;
  const stack = [nodeModulesDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const full = join(dir, ent.name);
      if (ent.name !== "src") {
        stack.push(full);
        continue;
      }
      const srcEntries = await readdir(full, { withFileTypes: true });
      const hasRuntimeJs = srcEntries.some(
        (e) => e.isFile() && /\.(js|cjs|mjs)$/i.test(e.name),
      );
      if (!hasRuntimeJs) {
        await rm(full, { recursive: true, force: true });
      }
    }
  }
}

async function pruneServerDistTypes(distDir) {
  if (!existsSync(distDir)) return;
  const stack = [distDir];
  while (stack.length) {
    const dir = stack.pop();
    const entries = await readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (ent.name.endsWith(".d.ts") || ent.name.endsWith(".d.ts.map")) {
        await rm(full, { force: true });
      }
    }
  }
}

async function collectPackageDirs(dir, out) {
  if (!existsSync(dir)) return;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.startsWith("@")) {
      const scopeDir = join(dir, ent.name);
      for (const scoped of await readdir(scopeDir, { withFileTypes: true })) {
        if (!scoped.isDirectory() && !scoped.isSymbolicLink()) continue;
        const name = `${ent.name}/${scoped.name}`;
        const p = join(scopeDir, scoped.name);
        if (
          existsSync(join(p, "package.json")) ||
          (await lstat(p)).isSymbolicLink()
        ) {
          out.set(name, p);
        }
      }
      continue;
    }
    const p = join(dir, ent.name);
    if (
      existsSync(join(p, "package.json")) ||
      (await lstat(p)).isSymbolicLink()
    ) {
      out.set(ent.name, p);
    }
  }
}

async function materializePnpmLayout(nodeModulesDir) {
  if (!existsSync(nodeModulesDir)) return;
  const pnpmDir = join(nodeModulesDir, ".pnpm");
  /** @type {Map<string, string>} */
  const packages = new Map();

  if (existsSync(pnpmDir)) {
    for (const ent of await readdir(pnpmDir, { withFileTypes: true })) {
      if (!ent.isDirectory() || ent.name === "node_modules") continue;
      await collectPackageDirs(join(pnpmDir, ent.name, "node_modules"), packages);
    }
  } else {
    await collectPackageDirs(nodeModulesDir, packages);
    let anySymlink = false;
    for (const p of packages.values()) {
      if ((await lstat(p)).isSymbolicLink()) {
        anySymlink = true;
        break;
      }
    }
    if (!anySymlink) {
      console.log("[local-host] node_modules already materialized");
      return;
    }
  }

  if (packages.size === 0) {
    throw new Error(`[local-host] materialize found no packages under ${nodeModulesDir}`);
  }

  const staging = join(dirname(nodeModulesDir), ".ss-materialize-staging");
  await rm(staging, { recursive: true, force: true });
  await mkdir(staging, { recursive: true });

  for (const [name, src] of packages) {
    const st = await lstat(src);
    const realSrc = st.isSymbolicLink() ? await realpath(src) : src;
    const dest = join(staging, ...name.split("/"));
    await mkdir(dirname(dest), { recursive: true });
    await cp(realSrc, dest, { recursive: true, dereference: true });
  }

  await rm(nodeModulesDir, { recursive: true, force: true });
  await mkdir(nodeModulesDir, { recursive: true });
  await copyDirContents(staging, nodeModulesDir);
  await rm(staging, { recursive: true, force: true });
  console.log(`[local-host] materialized ${packages.size} flat packages`);
}

async function assertDeployHasRuntimeDeps(serverDir) {
  const nodeModules = join(serverDir, "node_modules");
  for (const pkg of ["express", "@stagesync/shared", "zod"]) {
    const pkgJson = join(nodeModules, ...pkg.split("/"), "package.json");
    if (!existsSync(pkgJson)) {
      throw new Error(`[local-host] deploy missing runtime dep ${pkg}`);
    }
  }
  if (!existsSync(join(serverDir, "dist", "index.js"))) {
    throw new Error("[local-host] missing server/dist/index.js");
  }
  if (!existsSync(join(serverDir, "package.json"))) {
    throw new Error("[local-host] missing server/package.json (ESM type)");
  }
}

async function packServerTree(destServer) {
  const serverDistDir = join(repoRoot, "apps/server/dist");
  console.log("[local-host] building shared + server…");
  run("pnpm", ["--filter", "@stagesync/shared", "build"]);
  run("pnpm", ["--filter", "@stagesync/server", "build"]);
  if (!existsSync(join(serverDistDir, "index.js"))) {
    throw new Error("server dist missing after build");
  }

  console.log("[local-host] pnpm deploy --prod @stagesync/server");
  await rm(destServer, { recursive: true, force: true });
  await mkdir(destServer, { recursive: true });
  run("pnpm", ["--filter", "@stagesync/server", "deploy", "--prod", destServer]);

  await rm(join(destServer, "dist"), { recursive: true, force: true });
  await cp(serverDistDir, join(destServer, "dist"), {
    recursive: true,
    force: true,
  });

  for (const rel of [
    "src",
    ".turbo",
    "coverage",
    "eslint.config.js",
    "vitest.config.ts",
    "tsconfig.json",
  ]) {
    await rm(join(destServer, rel), { recursive: true, force: true });
  }

  // Keep package.json (type: module) — required for ESM on nodejs-mobile.
  await materializePnpmLayout(join(destServer, "node_modules"));
  await pruneServerDistTypes(join(destServer, "dist"));
  await pruneDeployedNodeModules(join(destServer, "node_modules"));
  await pruneTypescriptSourceTrees(join(destServer, "node_modules"));
  await assertDeployHasRuntimeDeps(destServer);
}

async function packWebAndSeed(hostRoot) {
  const webDistConsole = join(repoRoot, "apps/web/dist-console");
  const webDist = join(repoRoot, "apps/web/dist");
  if (!existsSync(join(webDistConsole, "index.html"))) {
    console.log("[local-host] building @stagesync/web for static host assets…");
    run("pnpm", ["--filter", "@stagesync/web", "build"]);
  }
  const webSrc = existsSync(join(webDistConsole, "index.html"))
    ? webDistConsole
    : webDist;
  if (!existsSync(join(webSrc, "index.html"))) {
    throw new Error("web dist missing (need apps/web/dist-console or dist)");
  }

  const webDest = join(hostRoot, "web");
  await rm(webDest, { recursive: true, force: true });
  await cp(webSrc, webDest, { recursive: true, force: true });
  // Keep APK smaller: drop source maps / vite junk if present.
  await rm(join(webDest, ".vite"), { recursive: true, force: true });

  const seedDest = join(hostRoot, "seed");
  await rm(seedDest, { recursive: true, force: true });
  await mkdir(seedDest, { recursive: true });
  const seedTemplate = join(repoRoot, "data/library/library.template.json");
  const seedProjects = join(repoRoot, "data/library/seed-projects");
  if (existsSync(seedTemplate)) {
    await cp(seedTemplate, join(seedDest, "library.template.json"));
  }
  if (existsSync(seedProjects)) {
    await cp(seedProjects, join(seedDest, "seed-projects"), {
      recursive: true,
      force: true,
    });
  }
}

async function packServerAssets() {
  console.log("[local-host] packing host assets (server + web + seed)…");
  await mkdir(hostAssets, { recursive: true });
  await rm(join(hostAssets, "server"), { recursive: true, force: true });
  await packServerTree(join(hostAssets, "server"));
  await packWebAndSeed(hostAssets);

  await writeFile(
    join(hostAssets, "READY"),
    `stagesync-console-host-assets\nnodejs-mobile=${NODEJS_MOBILE_VERSION}\npacked=${new Date().toISOString()}\n`,
  );
  console.log(`[local-host] host assets ready at ${hostAssets}`);
}

async function writeLibnodeMeta(alignByAbi) {
  const lines = [
    `nodejs-mobile=${NODEJS_MOBILE_VERSION}`,
    `zip_url=${ZIP_URL}`,
    `min_load_align=${MIN_LOAD_ALIGN}`,
    ...Object.entries(alignByAbi).map(
      ([abi, align]) => `pt_load_align.${abi}=${align}`,
    ),
    `packed=${new Date().toISOString()}`,
    "",
  ];
  const metaPath = join(consoleAndroidMain, "assets/host-libnode.properties");
  await mkdir(dirname(metaPath), { recursive: true });
  await writeFile(metaPath, lines.join("\n"));
  console.log(`[local-host] wrote ${metaPath}`);
}

async function main() {
  console.log(`[local-host] zip=${ZIP_URL}`);
  const temp = await mkdtemp(join(tmpdir(), "stagesync-libnode-"));
  try {
    const zipPath = join(temp, "nodejs-mobile-android.zip");
    await download(ZIP_URL, zipPath);
    const extractRoot = join(temp, "extract");
    await extractZip(zipPath, extractRoot);
    const { binRoot, includeRoot } = await resolveZipRoots(extractRoot);
    const alignArm64 = await copyAbi(binRoot, "arm64-v8a");
    const alignArm32 = await copyAbi(binRoot, "armeabi-v7a");
    await copyHeaders(includeRoot);
    await writeLibnodeMeta({
      "arm64-v8a": alignArm64,
      "armeabi-v7a": alignArm32,
    });

    if (withServer) {
      await packServerAssets();
    } else {
      console.log("[local-host] skipped server assets (--skip-server)");
    }

    console.log(`
[local-host] prepare complete.
  jniLibs:  ${jniLibs}
  headers:  ${join(libnodeRoot, "include/node")}
  assets:   ${withServer ? hostAssets : "(skipped)"}
`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("[local-host]", err);
  process.exit(1);
});
