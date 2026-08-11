import { join } from "node:path";
import type { Router } from "express";
import { PutServerSettingsBodySchema } from "@stagesync/shared";
import {
  getSettingsSchemaForClient,
  listConfiguredSecrets,
  listRestartRequiredKeys,
  maskSecretSettingsValues,
  readManagedSettings,
  writeManagedSettings,
} from "../../env-settings.js";
import { refreshMdnsAdvertise } from "../../mdns-registry.js";
import {
  listBrowseDirectory,
  resolveBrowseStartPath,
} from "../../path-browser.js";
import { resolveBackupsDir } from "../../storage/restore-backup.js";
import { sendError, handleRouteError } from "../errors.js";
import { assertLifecycleAllowed } from "./lifecycle-auth.js";

type SettingsMountContext = {
  dataDir: string | null;
};

/** Settings GET/PUT and path browser. */
export function mountSettingsRoutes(
  router: Router,
  ctx: SettingsMountContext,
): void {
  const { dataDir } = ctx;

  router.get("/settings", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    try {
      const { values, envExists } = readManagedSettings();
      res.set("Cache-Control", "no-store");
      res.json({
        values: maskSecretSettingsValues(values),
        secretsConfigured: listConfiguredSecrets(values),
        envExists,
        schema: getSettingsSchemaForClient(),
        restartRequired: true,
        resolved: {
          dataDir: dataDir ?? null,
          backupsDir: dataDir ? resolveBackupsDir(dataDir) : null,
          assetsHint: dataDir
            ? join(dataDir, "projects", "<id>", "assets")
            : null,
        },
      });
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.put("/settings", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    try {
      const body = PutServerSettingsBodySchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({
          ok: false,
          error: "Invalid body",
          details: body.error.issues,
        });
        return;
      }
      const before = readManagedSettings().values;
      const { values, envExists } = writeManagedSettings(body.data.values);
      const restartKeys = listRestartRequiredKeys(before, values);
      if (
        before.STAGESYNC_HOST_DISPLAY_NAME !==
        values.STAGESYNC_HOST_DISPLAY_NAME
      ) {
        refreshMdnsAdvertise();
      }
      res.json({
        ok: true,
        values: maskSecretSettingsValues(values),
        secretsConfigured: listConfiguredSecrets(values),
        envExists,
        schema: getSettingsSchemaForClient(),
        restartRequired: restartKeys.length > 0,
        restartKeys,
        message:
          restartKeys.length > 0
            ? "Zapisano. Zrestartuj serwer, aby zastosować zmiany sieci / ścieżek / logów."
            : "Zapisano.",
      });
    } catch (err) {
      if (err instanceof Error) {
        sendError(res, 400, err.message);
        return;
      }
      handleRouteError(res, err);
    }
  });

  router.get("/browse", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    try {
      const mode = req.query.mode === "file" ? "file" : "dir";
      const ext =
        typeof req.query.ext === "string" && req.query.ext.trim()
          ? req.query.ext.trim()
          : undefined;
      const rawPath =
        typeof req.query.path === "string" ? req.query.path.trim() : "";
      const browsePath = resolveBrowseStartPath(rawPath, { mode });
      const result = listBrowseDirectory(browsePath, { mode, ext });
      res.set("Cache-Control", "no-store");
      res.json(result);
    } catch (err) {
      if (err instanceof Error) {
        sendError(res, 400, err.message);
        return;
      }
      handleRouteError(res, err);
    }
  });
}
