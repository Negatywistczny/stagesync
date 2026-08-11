import {
  cp,
  mkdir,
  readdir,
  rm,
  chmod,
  writeFile,
  readFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export async function downloadFile(url, destPath) {
  // codeql[js/http-to-file-access] Fixed Node.js dist URL for desktop sidecar bootstrap
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // codeql[js/http-to-file-access] Fixed Node.js dist URL for desktop sidecar bootstrap
  await writeFile(destPath, buf);
}

export function resolveExtractedNodeBin(extractedRoot) {
  const winRoot = join(extractedRoot, "node.exe");
  if (existsSync(winRoot)) return winRoot;
  const unixBin = join(extractedRoot, "bin", "node");
  if (existsSync(unixBin)) return unixBin;
  throw new Error(`Could not locate node binary under ${extractedRoot}`);
}

export async function ensureTauriResourceGlobDir(srcTauriDir, sub) {
  const dir = join(srcTauriDir, sub);
  const hasRealContent = existsSync(dir) && (await readdir(dir)).length > 0;
  if (hasRealContent) return;

  // Tauri 2 fails when `lib/**/*` matches zero files (Windows Node zip has no lib/share).
  // Stub must sit under a subdirectory so `**/*` globs match.
  const stubFile = join(dir, ".stagesync-stub", "keep");
  await mkdir(dirname(stubFile), { recursive: true });
  await writeFile(stubFile, "");
}

export function externalBinDestPath(binDir, target) {
  const base = `stagesync-host-${target}`;
  if (target.endsWith("-pc-windows-msvc")) {
    return join(binDir, `${base}.exe`);
  }
  return join(binDir, base);
}

export function normalizeTargetTriple(target) {
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

export async function resolveNodeVersionFromNvmrc(repoRoot) {
  const nvmrcPath = join(repoRoot, ".nvmrc");
  const major = (await readFile(nvmrcPath, "utf8")).trim();
  if (!/^\d+$/.test(major)) {
    throw new Error(`Unexpected .nvmrc content: ${major}`);
  }

  const indexUrl = "https://nodejs.org/dist/index.json";
  const res = await fetch(indexUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch Node dist index: ${res.status} ${res.statusText}`);
  }
  const index = await res.json();
  const matched = index.find((v) => typeof v?.version === "string" && v.version.startsWith(`v${major}.`))?.version;
  if (!matched) {
    throw new Error(`No Node versions found for major ${major}`);
  }
  return matched;
}

export function nodeDistFromTarget(target) {
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

export function extractCommandForArchive(archivePath, destDir, kind) {
  if (kind === "tar.gz") {
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

export async function prepareNodeRuntimeIntoTauriBundle(target, repoRoot, run) {
  const srcTauriDir = join(repoRoot, "apps/desktop/src-tauri");
  const binDir = join(srcTauriDir, "bin");

  // Clean runtime dirs to avoid mixing targets.
  await rm(binDir, { recursive: true, force: true });
  await rm(join(srcTauriDir, "lib"), { recursive: true, force: true });
  await rm(join(srcTauriDir, "share"), { recursive: true, force: true });
  await mkdir(binDir, { recursive: true });

  const nodeVersion = await resolveNodeVersionFromNvmrc(repoRoot);
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
