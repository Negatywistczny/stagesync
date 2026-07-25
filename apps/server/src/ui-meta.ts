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

export type UiRole = "performer" | "console";

export type UiMeta = UiManifest & {
  uiHashPerformer?: string;
  uiHashConsole?: string;
  roleManifests: Partial<Record<UiRole, UiManifest>>;
};

const EMPTY_META: UiMeta = {
  protocolVersion: PROTOCOL_VERSION,
  uiHash: UI_UNAVAILABLE_HASH,
  assets: [],
  roleManifests: {},
};

function loadHashFile(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return UiHashFileSchema.parse(raw).uiHash;
  } catch (err) {
    console.warn(
      `[stagesync-server] invalid ${path}: ${err instanceof Error ? err.message : err}`,
    );
    return undefined;
  }
}

function loadManifestFile(path: string): UiManifest | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return UiManifestSchema.parse(raw);
  } catch (err) {
    console.warn(
      `[stagesync-server] invalid ${path}: ${err instanceof Error ? err.message : err}`,
    );
    return undefined;
  }
}

/**
 * Load UI content hash + asset manifest emitted by `apps/web` build
 * (`ui-manifest.json` / `ui-hash.json` in Vite dist), plus optional role
 * hashes from `ui-role-hashes.json` / `ui-hash-{role}.json`.
 */
export function loadUiMeta(staticDir: string | null | undefined): UiMeta {
  if (!staticDir) return { ...EMPTY_META, roleManifests: {} };

  let base: UiManifest = {
    protocolVersion: PROTOCOL_VERSION,
    uiHash: UI_UNAVAILABLE_HASH,
    assets: [],
  };

  const manifestPath = join(staticDir, "ui-manifest.json");
  const fromManifest = loadManifestFile(manifestPath);
  if (fromManifest) {
    base = fromManifest;
  } else {
    const hashPath = join(staticDir, "ui-hash.json");
    const uiHash = loadHashFile(hashPath);
    if (uiHash) {
      base = {
        protocolVersion: PROTOCOL_VERSION,
        uiHash,
        assets: [],
      };
    }
  }

  const roleManifests: Partial<Record<UiRole, UiManifest>> = {};
  for (const role of ["performer", "console"] as const) {
    const man = loadManifestFile(join(staticDir, `ui-manifest-${role}.json`));
    if (man) roleManifests[role] = man;
  }

  let uiHashPerformer =
    roleManifests.performer?.uiHash ??
    loadHashFile(join(staticDir, "ui-hash-performer.json"));
  let uiHashConsole =
    roleManifests.console?.uiHash ??
    loadHashFile(join(staticDir, "ui-hash-console.json"));

  const rolesPath = join(staticDir, "ui-role-hashes.json");
  if (existsSync(rolesPath)) {
    try {
      const raw = JSON.parse(readFileSync(rolesPath, "utf8")) as {
        uiHashPerformer?: unknown;
        uiHashConsole?: unknown;
      };
      if (typeof raw.uiHashPerformer === "string" && raw.uiHashPerformer.length > 0) {
        uiHashPerformer = raw.uiHashPerformer;
      }
      if (typeof raw.uiHashConsole === "string" && raw.uiHashConsole.length > 0) {
        uiHashConsole = raw.uiHashConsole;
      }
    } catch (err) {
      console.warn(
        `[stagesync-server] invalid ui-role-hashes.json: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  return {
    ...base,
    ...(uiHashPerformer ? { uiHashPerformer } : {}),
    ...(uiHashConsole ? { uiHashConsole } : {}),
    roleManifests,
  };
}

function sendMissingBundle(res: Response, filename: string): void {
  res
    .status(404)
    .type("text/plain; charset=utf-8")
    .send(
      `StageSync: brak ${filename} na hoście.\n` +
        "Zbuduj apps/web (emit-ui-meta + aggregate-role-ui) i ustaw STAGESYNC_STATIC_DIR na dist.\n" +
        "Patrz docs/MOBILE.md / docs/api/README.md.",
    );
}

function serveUiBundle(
  req: Request,
  res: Response,
  filePath: string,
  filename: string,
): void {
  if (!existsSync(filePath)) {
    sendMissingBundle(res, filename);
    return;
  }
  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    sendMissingBundle(res, filename);
    return;
  }
  if (size <= 0) {
    sendMissingBundle(res, filename);
    return;
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
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
      sendMissingBundle(res, filename);
    } else {
      res.destroy();
    }
  });
  stream.pipe(res);
}

function parseRole(raw: unknown): UiRole | null {
  if (raw === "performer" || raw === "console") return raw;
  return null;
}

/** Mount GET /api/ui-manifest and GET|HEAD /downloads/ui-bundle*.zip. */
export function mountUiMetaRoutes(
  app: Express,
  uiMeta: UiMeta,
  staticDir: string | null,
): void {
  app.get("/api/ui-manifest", (req, res) => {
    const role = parseRole(req.query.role);
    if (role) {
      const roleMan = uiMeta.roleManifests[role];
      if (roleMan) {
        res.json(roleMan);
        return;
      }
      res.status(404).json({
        ok: false,
        error: `Brak ui-manifest dla roli ${role}`,
      });
      return;
    }
    res.json({
      protocolVersion: uiMeta.protocolVersion,
      uiHash: uiMeta.uiHash,
      assets: uiMeta.assets,
    });
  });

  const mountZip = (route: string, filename: string) => {
    const bundlePath = staticDir ? join(staticDir, filename) : null;
    const handler = (req: Request, res: Response) => {
      if (!bundlePath) {
        sendMissingBundle(res, filename);
        return;
      }
      serveUiBundle(req, res, bundlePath, filename);
    };
    app.get(route, handler);
    app.head(route, handler);
  };

  mountZip("/downloads/ui-bundle.zip", "ui-bundle.zip");
  mountZip("/downloads/ui-bundle-performer.zip", "ui-bundle-performer.zip");
  mountZip("/downloads/ui-bundle-console.zip", "ui-bundle-console.zip");
}
