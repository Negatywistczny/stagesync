import {
  cp,
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export async function copyDirContents(srcDir, destDir) {
  await mkdir(destDir, { recursive: true });
  const entries = await readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    await cp(join(srcDir, ent.name), join(destDir, ent.name), { recursive: true, force: true });
  }
}

/**
 * Tauri bundle layout: `Contents/Resources/resources/sidecar/…`
 * Legacy patch paths used `Contents/Resources/sidecar/…` — keep a symlink for tools / manual patches.
 */
export async function ensureBundleSidecarSymlink(resourcesDir) {
  const canonical = join(resourcesDir, "resources", "sidecar");
  const linkPath = join(resourcesDir, "sidecar");
  const indexHtml = join(canonical, "web", "index.html");
  if (!existsSync(indexHtml)) {
    throw new Error(`[sidecar] missing bundled web root: ${indexHtml}`);
  }

  try {
    const st = await lstat(linkPath);
    if (st.isSymbolicLink()) {
      await rm(linkPath);
    } else if (st.isDirectory()) {
      await rm(linkPath, { recursive: true, force: true });
    } else {
      await rm(linkPath, { force: true });
    }
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== "ENOENT") throw err;
  }

  await symlink("resources/sidecar", linkPath);
  console.log(`[sidecar] compat symlink: ${linkPath} → resources/sidecar`);
}

/** Fail build if repo docs or stray .md leak into runtime bundles (ADR 0013). */
export async function assertNoRepoDocsInSidecar(sidecarDir) {
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
  if (existsSync(join(sidecarDir, "downloads"))) {
    await walkNoMd(join(sidecarDir, "downloads"));
  }
  console.log(
    "[sidecar] docs hygiene check passed (web/dist, server/dist, seed, downloads)",
  );
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
]);

const NODE_MODULES_PRUNE_FILE_RE =
  /\.(md|cts|mts|map|markdown|yml|yaml)$/i;

/** Drop TypeScript sources where compiled JS exists alongside (e.g. zod/src). */
export async function pruneTypescriptSourceTrees(nodeModulesDir) {
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

/** Shrink sidecar node_modules for MSI/WiX (Windows path limits). */
export async function pruneDeployedNodeModules(nodeModulesDir) {
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

export async function pruneServerDistTypes(distDir) {
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

export async function pruneRuntimeBundle(sidecarDir) {
  await pruneServerDistTypes(join(sidecarDir, "server", "dist"));
  await pruneDeployedNodeModules(join(sidecarDir, "server", "node_modules"));
  await pruneTypescriptSourceTrees(join(sidecarDir, "server", "node_modules"));
  console.log("[sidecar] runtime bundle pruned (dist types + node_modules dev paths)");
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
export async function pruneWorkspacePackageSources(nodeModulesDir, scopedName) {
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

/**
 * Collect package dirs from a node_modules-like folder into `out` (name → path).
 * @param {string} dir
 * @param {Map<string, string>} out
 */
export async function collectPackageDirs(dir, out) {
  if (!existsSync(dir)) return;
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.startsWith("@")) {
      const scopeDir = join(dir, ent.name);
      for (const scoped of await readdir(scopeDir, { withFileTypes: true })) {
        if (!scoped.isDirectory() && !scoped.isSymbolicLink()) continue;
        const name = `${ent.name}/${scoped.name}`;
        const p = join(scopeDir, scoped.name);
        if (existsSync(join(p, "package.json")) || (await lstat(p)).isSymbolicLink()) {
          out.set(name, p);
        }
      }
      continue;
    }
    const p = join(dir, ent.name);
    if (existsSync(join(p, "package.json")) || (await lstat(p)).isSymbolicLink()) {
      out.set(ent.name, p);
    }
  }
}

/**
 * Convert pnpm symlink→.pnpm layout into a flat real node_modules (npm-hoist
 * style). Survives Tauri dereference and keeps WiX paths under MAX_PATH.
 */
export async function materializePnpmLayoutForTauriBundle(nodeModulesDir) {
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
    // Already flattened or Tauri-dereferenced without a usable store — keep as-is.
    await collectPackageDirs(nodeModulesDir, packages);
    let anySymlink = false;
    for (const p of packages.values()) {
      if ((await lstat(p)).isSymbolicLink()) {
        anySymlink = true;
        break;
      }
    }
    if (!anySymlink) {
      console.log("[sidecar] node_modules already materialized (no .pnpm / no symlinks)");
      return;
    }
  }

  if (packages.size === 0) {
    throw new Error(`[sidecar] materialize found no packages under ${nodeModulesDir}`);
  }

  // Staging must live outside node_modules — we wipe that directory next.
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

  console.log(
    `[sidecar] materialized ${packages.size} flat packages for Tauri (no pnpm symlinks)`,
  );
}

export async function assertDeployHasRuntimeDeps(sidecarServerDir) {
  const nodeModules = join(sidecarServerDir, "node_modules");
  // Flat layout: zod is hoisted next to @stagesync/shared (not nested under it).
  const required = ["express", "@stagesync/shared", "zod"];
  for (const pkg of required) {
    const pkgJson = join(nodeModules, ...pkg.split("/"), "package.json");
    if (!existsSync(pkgJson)) {
      throw new Error(
        `[sidecar] deploy missing runtime dep ${pkg} (expected ${pkgJson}); pnpm deploy output is incomplete`,
      );
    }
  }

  if (existsSync(join(nodeModules, ".pnpm"))) {
    throw new Error("[sidecar] .pnpm store still present after materialize (Tauri/WiX-unsafe)");
  }

  // Fail closed if any top-level package is still a symlink (Tauri would break it).
  for (const ent of await readdir(nodeModules, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    if (ent.name.startsWith("@")) {
      const scopeDir = join(nodeModules, ent.name);
      for (const scoped of await readdir(scopeDir, { withFileTypes: true })) {
        const p = join(scopeDir, scoped.name);
        if ((await lstat(p)).isSymbolicLink()) {
          throw new Error(
            `[sidecar] top-level package still a symlink (Tauri-unsafe): ${ent.name}/${scoped.name}`,
          );
        }
      }
      continue;
    }
    const p = join(nodeModules, ent.name);
    if ((await lstat(p)).isSymbolicLink()) {
      throw new Error(`[sidecar] top-level package still a symlink (Tauri-unsafe): ${ent.name}`);
    }
  }
}

/** Production-only node_modules via pnpm deploy (ADR 0013; PR2 bundle size). */
export async function prepareProductionNodeModules(sidecarServerDir, serverDistDir, repoRoot, run, restoreWorkspaceInstall) {
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

  // Default isolated linker — hoisted deploy leaves an empty node_modules (no express).
  // pnpm 10+: --legacy (or workspace forceLegacyDeploy) for non-injected workspaces.
  run("pnpm", [
    "--filter",
    "@stagesync/server",
    "deploy",
    "--prod",
    "--legacy",
    sidecarServerDir,
  ]);

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

  await materializePnpmLayoutForTauriBundle(join(sidecarServerDir, "node_modules"));

  await assertDeployHasRuntimeDeps(sidecarServerDir);

  // Deploy poisons the monorepo install state; Tauri CLI must remain available.
  await restoreWorkspaceInstall();
}
