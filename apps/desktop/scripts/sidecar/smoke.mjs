import { spawn } from "node:child_process";
import {
  cp,
  mkdir,
  rm,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureBundleSidecarSymlink } from "./prune.mjs";

/**
 * Paths passed to Node as argv/cwd/env must not be Win32 verbatim (`\\?\…`) or a bare drive.
 * Mirrors `path_for_node` / `assert_node_path_usable` in apps/desktop/src-tauri/src/lib.rs.
 * @param {string} p
 * @param {string} label
 */
export function assertNodeSpawnPathSafe(p, label) {
  if (typeof p !== "string" || p.length === 0) {
    throw new Error(`[sidecar] ${label}: empty path`);
  }
  if (p.startsWith("\\\\?\\")) {
    throw new Error(
      `[sidecar] ${label}: Win32 verbatim path is unsafe as Node main/cwd/env (EISDIR on 'C:'): ${p}`,
    );
  }
  const trimmed = p.replace(/[/\\]+$/, "");
  if (/^[A-Za-z]:$/.test(trimmed)) {
    throw new Error(`[sidecar] ${label}: bare drive path is unsafe for Node: ${p}`);
  }
}

/** Regression checks for Windows Node spawn path rules (runs on every sidecar build). */
export function selfTestNodeSpawnPathGuards() {
  const bad = [
    ["\\\\?\\C:\\Program Files\\StageSync\\server", "verbatim"],
    ["C:", "bare drive"],
    ["C:\\", "bare drive root"],
  ];
  for (const [p, kind] of bad) {
    let threw = false;
    try {
      assertNodeSpawnPathSafe(p, "self-test");
    } catch {
      threw = true;
    }
    if (!threw) {
      throw new Error(`[sidecar] self-test expected reject (${kind}): ${p}`);
    }
  }
  assertNodeSpawnPathSafe("C:\\Program Files\\StageSync\\resources\\sidecar\\server", "self-test ok");
  assertNodeSpawnPathSafe("/Applications/StageSync.app/Contents/Resources/resources/sidecar/server", "self-test ok");
  console.log("[sidecar] node spawn path guards self-test passed");
}

export async function readStream(stream) {
  if (!stream) return "";
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

export async function smokeTestSidecarServer(sidecarServerDir, seedDir) {
  const dataDir = join(tmpdir(), `stagesync-sidecar-smoke-${Date.now()}`);
  await mkdir(dataDir, { recursive: true });

  const port = 14000 + Math.floor(Math.random() * 1000);
  const entryRel = "dist/index.js";
  const entry = join(sidecarServerDir, entryRel);
  if (!existsSync(entry)) {
    throw new Error(`[sidecar] smoke: missing server entry ${entry}`);
  }
  assertNodeSpawnPathSafe(sidecarServerDir, "smoke cwd");
  assertNodeSpawnPathSafe(entry, "smoke entry");

  console.log(`[sidecar] smoke: starting server on :${port} (cwd=${sidecarServerDir} entry=${entryRel})`);
  const child = spawn(process.execPath, [entryRel], {
    cwd: sidecarServerDir,
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
        const stdout = await readStream(child.stdout);
        throw new Error(
          `[sidecar] smoke: server exited early: ${stderr || stdout || `(exit ${child.exitCode})`}`,
        );
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

/** Copy freshly built sidecar into an installed .app and refresh the compat symlink. */
export async function patchInstalledApp(appPath, repoRoot) {
  const resourcesDir = join(appPath, "Contents", "Resources");
  const destSidecar = join(resourcesDir, "resources", "sidecar");
  const srcSidecar = join(repoRoot, "apps/desktop/src-tauri/resources/sidecar");

  if (!existsSync(join(appPath, "Contents", "MacOS"))) {
    throw new Error(`[sidecar] not a macOS .app bundle: ${appPath}`);
  }
  if (!existsSync(join(srcSidecar, "web", "index.html"))) {
    throw new Error(
      `[sidecar] run build first — missing ${join(srcSidecar, "web", "index.html")}`,
    );
  }

  console.log(`[sidecar] patching installed app: ${appPath}`);
  for (const sub of ["web", "server"]) {
    await rm(join(destSidecar, sub), { recursive: true, force: true });
    await cp(join(srcSidecar, sub), join(destSidecar, sub), { recursive: true, force: true });
  }
  await ensureBundleSidecarSymlink(resourcesDir);
  await smokeTestSidecarServer(join(destSidecar, "server"), join(destSidecar, "seed"));
  console.log("[sidecar] patch complete");
}
