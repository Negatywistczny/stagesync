import { createReadStream, existsSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import { defaultSeedDir, REPO_ROOT } from "./storage/paths.js";

export const APK_DOWNLOAD_FILES = {
  performer: "stagesync-performer.apk",
  console: "stagesync-console.apk",
} as const;

export type ApkKind = keyof typeof APK_DOWNLOAD_FILES;

/**
 * Directory that holds release APKs for GET /downloads/*.
 * Priority: STAGESYNC_DOWNLOADS_DIR → `<dataDir>/downloads`.
 *
 * Prefer {@link resolveApkFilePath} for serving — it also falls back to the
 * product bundle next to seed (`data/downloads` / sidecar `downloads`).
 */
export function resolveDownloadsDir(dataDir: string): string {
  const fromEnv = process.env.STAGESYNC_DOWNLOADS_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
  }
  return join(dataDir, "downloads");
}

/**
 * Read-only product APK root (bundled / monorepo), separate from user dataDir.
 *
 * - `STAGESYNC_APK_BUNDLE_DIR` when set
 * - else sibling of seed: `data/library` → `data/downloads`, sidecar `seed` → `downloads`
 */
export function defaultApkBundleDir(): string {
  const fromEnv = process.env.STAGESYNC_APK_BUNDLE_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
  }
  return join(dirname(defaultSeedDir()), "downloads");
}

export function resolveApkPath(downloadsDir: string, kind: ApkKind): string {
  return join(downloadsDir, APK_DOWNLOAD_FILES[kind]);
}

/** True when path exists and has non-zero size (empty stub ≠ available). */
export function isUsableApkFile(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  try {
    return statSync(filePath).size > 0;
  } catch {
    return false;
  }
}

/**
 * Resolve on-disk APK for serving.
 *
 * Candidates (first usable wins):
 * 1. `STAGESYNC_DOWNLOADS_DIR/<file>` when set
 * 2. `<dataDir>/downloads/<file>` (user / seeded)
 * 3. product bundle (`defaultApkBundleDir()` — repo `data/downloads` or sidecar)
 *
 * When nothing usable exists, returns the primary writable path (for 404 text).
 */
export function resolveApkFilePath(dataDir: string, kind: ApkKind): string {
  const filename = APK_DOWNLOAD_FILES[kind];
  const candidates: string[] = [];

  const fromEnv = process.env.STAGESYNC_DOWNLOADS_DIR?.trim();
  if (fromEnv) {
    const dir = isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
    candidates.push(join(dir, filename));
  }
  candidates.push(join(dataDir, "downloads", filename));
  candidates.push(join(defaultApkBundleDir(), filename));

  for (const path of candidates) {
    if (isUsableApkFile(path)) return path;
  }

  return fromEnv
    ? join(
        isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv),
        filename,
      )
    : join(dataDir, "downloads", filename);
}

function sendMissingApk(res: Response, filename: string): void {
  res
    .status(404)
    .type("text/plain; charset=utf-8")
    .send(
      `StageSync: brak pliku ${filename} na hoście.\n` +
        `Artefakt nie leży w bundlu produktu ani w data/downloads. ` +
        `Pobierz z GitHub Releases albo zbuduj APK lokalnie (patrz docs/guides/MOBILE.md).\n`,
    );
}

function serveApkFile(
  req: Request,
  res: Response,
  filePath: string,
  filename: string,
): void {
  if (!isUsableApkFile(filePath)) {
    sendMissingApk(res, filename);
    return;
  }
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    sendMissingApk(res, filename);
    return;
  }

  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", String(size));
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendMissingApk(res, filename);
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

/** Mount GET|HEAD /downloads/stagesync-performer.apk and …-console.apk. */
export function mountApkDownloads(app: Express, dataDir: string): void {
  for (const kind of Object.keys(APK_DOWNLOAD_FILES) as ApkKind[]) {
    const filename = APK_DOWNLOAD_FILES[kind];
    const path = `/downloads/${filename}`;
    const handler = (req: Request, res: Response) => {
      serveApkFile(req, res, resolveApkFilePath(dataDir, kind), filename);
    };
    app.get(path, handler);
    app.head(path, handler);
  }
}
