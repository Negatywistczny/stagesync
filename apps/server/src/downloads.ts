import { createReadStream, existsSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import type { Express, Request, Response } from "express";
import { REPO_ROOT } from "./storage/paths.js";

export const APK_DOWNLOAD_FILES = {
  performer: "stagesync-performer.apk",
  console: "stagesync-console.apk",
} as const;

export type ApkKind = keyof typeof APK_DOWNLOAD_FILES;

/**
 * Directory that holds release APKs for GET /downloads/*.
 * Priority: STAGESYNC_DOWNLOADS_DIR → `<dataDir>/downloads`.
 */
export function resolveDownloadsDir(dataDir: string): string {
  const fromEnv = process.env.STAGESYNC_DOWNLOADS_DIR?.trim();
  if (fromEnv) {
    return isAbsolute(fromEnv) ? fromEnv : resolve(REPO_ROOT, fromEnv);
  }
  return join(dataDir, "downloads");
}

export function resolveApkPath(downloadsDir: string, kind: ApkKind): string {
  return join(downloadsDir, APK_DOWNLOAD_FILES[kind]);
}

function sendMissingApk(res: Response, filename: string): void {
  res
    .status(404)
    .type("text/plain; charset=utf-8")
    .send(
      `StageSync: brak pliku ${filename} na hoście.\n` +
        `Umieść artefakt w katalogu downloads hosta (STAGESYNC_DOWNLOADS_DIR ` +
        `lub <dataDir>/downloads/) albo pobierz z GitHub Releases.\n` +
        `Patrz docs/MOBILE.md.`,
    );
}

function serveApkFile(
  req: Request,
  res: Response,
  filePath: string,
  filename: string,
): void {
  if (!existsSync(filePath)) {
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
  if (size <= 0) {
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
  const downloadsDir = resolveDownloadsDir(dataDir);

  for (const kind of Object.keys(APK_DOWNLOAD_FILES) as ApkKind[]) {
    const filename = APK_DOWNLOAD_FILES[kind];
    const path = `/downloads/${filename}`;
    const handler = (req: Request, res: Response) => {
      serveApkFile(req, res, resolveApkPath(downloadsDir, kind), filename);
    };
    app.get(path, handler);
    app.head(path, handler);
  }
}
