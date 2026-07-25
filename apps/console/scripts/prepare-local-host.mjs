#!/usr/bin/env node
/**
 * Faza 4 scaffold — prepare nodejs-mobile libnode.so (+ optional server assets)
 * for StageSync Console local host.
 *
 * Usage:
 *   node apps/console/scripts/prepare-local-host.mjs
 *   node apps/console/scripts/prepare-local-host.mjs --with-server
 *
 * Does NOT claim a runnable host: JNI bridge (NDK) is still required.
 * libnode.so lands under android/app/src/main/jniLibs (gitignored).
 */
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readdir,
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
const consoleAndroid = join(repoRoot, "apps/console/android/app/src/main");
const jniLibs = join(consoleAndroid, "jniLibs");
const hostAssets = join(consoleAndroid, "assets/host");

const NODEJS_MOBILE_VERSION = "v18.20.4";
const ZIP_URL =
  `https://github.com/nodejs-mobile/nodejs-mobile/releases/download/${NODEJS_MOBILE_VERSION}/nodejs-mobile-${NODEJS_MOBILE_VERSION}-android.zip`;

const withServer = process.argv.includes("--with-server");

async function download(url, dest) {
  console.log(`[local-host] downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function run(cmd, args, cwd = repoRoot) {
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`command failed: ${cmd} ${args.join(" ")}`);
  }
}

async function extractLibnode(zipPath, extractRoot) {
  await mkdir(extractRoot, { recursive: true });
  run("unzip", ["-q", zipPath, "-d", extractRoot]);
  const binRoot = join(extractRoot, "bin");
  if (!existsSync(binRoot)) {
    // Some zips nest under a top-level folder.
    const entries = await readdir(extractRoot);
    const nested = entries
      .map((e) => join(extractRoot, e, "bin"))
      .find((p) => existsSync(p));
    if (!nested) {
      throw new Error(`could not find bin/ in ${extractRoot}`);
    }
    return nested;
  }
  return binRoot;
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
  console.log(`[local-host] wrote ${dest}`);
}

async function packServerAssets() {
  console.log("[local-host] building server package (subset of desktop sidecar)…");
  // Prefer existing desktop sidecar server tree when present; else build server dist only.
  const sidecarServer = join(
    repoRoot,
    "apps/desktop/src-tauri/resources/sidecar/server",
  );
  await mkdir(hostAssets, { recursive: true });
  await rm(join(hostAssets, "server"), { recursive: true, force: true });

  if (existsSync(join(sidecarServer, "dist"))) {
    await cp(sidecarServer, join(hostAssets, "server"), {
      recursive: true,
      force: true,
    });
  } else {
    run("pnpm", ["--filter", "@stagesync/server", "build"]);
    const serverDist = join(repoRoot, "apps/server/dist");
    if (!existsSync(serverDist)) {
      throw new Error("server dist missing after build");
    }
    await mkdir(join(hostAssets, "server"), { recursive: true });
    await cp(serverDist, join(hostAssets, "server", "dist"), {
      recursive: true,
      force: true,
    });
    console.warn(
      "[local-host] copied server/dist only — full node_modules prune still needs desktop sidecar build or dedicated packer",
    );
  }

  await writeFile(
    join(hostAssets, "READY"),
    `stagesync-console-host-assets\nnodejs-mobile=${NODEJS_MOBILE_VERSION}\n`,
  );
  console.log(`[local-host] host assets ready at ${hostAssets}`);
}

async function main() {
  const temp = await mkdtemp(join(tmpdir(), "stagesync-libnode-"));
  try {
    const zipPath = join(temp, "nodejs-mobile-android.zip");
    await download(ZIP_URL, zipPath);
    const binRoot = await extractLibnode(zipPath, join(temp, "extract"));
    await copyAbi(binRoot, "arm64-v8a");
    await copyAbi(binRoot, "armeabi-v7a");

    if (withServer) {
      await packServerAssets();
    } else {
      console.log(
        "[local-host] skipped server assets (pass --with-server to pack)",
      );
    }

    console.log(`
[local-host] prepare complete.
  jniLibs: ${jniLibs}
  Next eng: NDK cmake JNI bridge (node::Start) — see docs/MOBILE.md Faza 4.
  Without the bridge, Console launcher reports an honest failure (no fake success).
`);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error("[local-host]", err);
  process.exit(1);
});
