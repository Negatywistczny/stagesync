import {
  createReadStream,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { Express, Request, Response } from "express";
import {
  PROTOCOL_VERSION,
  UiHashFileSchema,
  UiManifestSchema,
  type UiManifest,
} from "@stagesync/shared";

export const UI_UNAVAILABLE_HASH = "none";

export type UiMeta = UiManifest;

const EMPTY_META: UiMeta = {
  protocolVersion: PROTOCOL_VERSION,
  uiHash: UI_UNAVAILABLE_HASH,
  assets: [],
};

/**
 * Load UI content hash + asset manifest emitted by `apps/web` build
 * (`ui-manifest.json` / `ui-hash.json` in Vite dist).
 */
export function loadUiMeta(staticDir: string | null | undefined): UiMeta {
  if (!staticDir) return { ...EMPTY_META };

  const manifestPath = join(staticDir, "ui-manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const raw = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
      return UiManifestSchema.parse(raw);
    } catch (err) {
      console.warn(
        `[stagesync-server] invalid ui-manifest.json: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  const hashPath = join(staticDir, "ui-hash.json");
  if (existsSync(hashPath)) {
    try {
      const raw = JSON.parse(readFileSync(hashPath, "utf8")) as unknown;
      const hashFile = UiHashFileSchema.parse(raw);
      return {
        protocolVersion: hashFile.protocolVersion,
        uiHash: hashFile.uiHash,
        assets: [],
      };
    } catch (err) {
      console.warn(
        `[stagesync-server] invalid ui-hash.json: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return { ...EMPTY_META };
}

function sendMissingBundle(res: Response): void {
  res
    .status(404)
    .type("text/plain; charset=utf-8")
    .send(
      "StageSync: brak ui-bundle.zip na hoście.\n" +
        "Zbuduj apps/web (emit-ui-meta) i ustaw STAGESYNC_STATIC_DIR na dist.\n" +
        "Patrz docs/MOBILE.md / docs/api/README.md.",
    );
}

function serveUiBundle(
  req: Request,
  res: Response,
  filePath: string,
): void {
  if (!existsSync(filePath)) {
    sendMissingBundle(res);
    return;
  }
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    sendMissingBundle(res);
    return;
  }
  if (size <= 0) {
    sendMissingBundle(res);
    return;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="ui-bundle.zip"',
  );
  res.setHeader("Content-Length", String(size));
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendMissingBundle(res);
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

/** Mount GET /api/ui-manifest and GET|HEAD /downloads/ui-bundle.zip. */
export function mountUiMetaRoutes(
  app: Express,
  uiMeta: UiMeta,
  staticDir: string | null,
): void {
  app.get("/api/ui-manifest", (_req, res) => {
    res.json(uiMeta);
  });

  const bundlePath = staticDir ? join(staticDir, "ui-bundle.zip") : null;
  const handler = (req: Request, res: Response) => {
    if (!bundlePath) {
      sendMissingBundle(res);
      return;
    }
    serveUiBundle(req, res, bundlePath);
  };
  app.get("/downloads/ui-bundle.zip", handler);
  app.head("/downloads/ui-bundle.zip", handler);
}
