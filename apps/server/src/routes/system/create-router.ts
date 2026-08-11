import { Router } from "express";
import { mountHostRoutes } from "./mount-host.js";
import { mountLifecycleRoutes } from "./mount-lifecycle.js";
import { mountRestoreRoutes } from "./mount-restore.js";
import { mountSettingsRoutes } from "./mount-settings.js";
import { mountUpdateRoutes } from "./mount-update.js";
import type { SystemRouterDeps } from "./types.js";

export function createSystemRouter(deps: SystemRouterDeps): Router {
  const { logBuffer, lifecycle } = deps;
  const port = deps.port ?? Number(process.env.PORT ?? 4000);
  const version = deps.version ?? process.env.npm_package_version ?? "0.0.0";
  const dataDir = deps.dataDir ?? null;
  const router = Router();

  mountHostRoutes(router, {
    logBuffer,
    port,
    version,
    dataDir,
    transport: deps.transport,
  });
  mountSettingsRoutes(router, { dataDir });
  mountRestoreRoutes(router, { dataDir });
  mountUpdateRoutes(router, { version });
  mountLifecycleRoutes(router, { logBuffer, lifecycle, version, dataDir });

  return router;
}
