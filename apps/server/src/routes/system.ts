import { Router } from "express";
import type { LogBuffer } from "../log-buffer.js";
import type { Lifecycle } from "../lifecycle.js";
import { buildNetworkInfo } from "../network-info.js";
import { isRunningUnderPm2 } from "../lifecycle.js";

export type SystemRouterDeps = {
  logBuffer: LogBuffer;
  lifecycle?: Lifecycle;
  port?: number;
  version?: string;
};

export function createSystemRouter(deps: SystemRouterDeps): Router {
  const { logBuffer, lifecycle } = deps;
  const port = deps.port ?? Number(process.env.PORT ?? 4000);
  const version = deps.version ?? process.env.npm_package_version ?? "0.0.0";
  const router = Router();

  router.get("/logs", (_req, res) => {
    res.json({ lines: logBuffer.getLines() });
  });

  router.get("/logs/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const remove = logBuffer.addSseClient(res);
    req.on("close", remove);
  });

  router.post("/logs/clear", (_req, res) => {
    logBuffer.clear();
    res.json({ ok: true });
  });

  router.get("/network", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
      ...buildNetworkInfo(port),
      version,
    });
  });

  router.post("/restart", (_req, res) => {
    if (!lifecycle) {
      res.status(501).json({
        ok: false,
        error: "Restart niedostępny w tym trybie (brak lifecycle).",
      });
      return;
    }
    if (lifecycle.isShuttingDown()) {
      res.status(409).json({ ok: false, error: "Shutdown already in progress" });
      return;
    }
    res.json({ ok: true, action: "restart" });
    setImmediate(() => {
      lifecycle.scheduleProcessRestart();
      lifecycle.gracefulShutdown("admin_restart", { restart: true });
    });
  });

  router.post("/shutdown", (_req, res) => {
    if (!lifecycle) {
      res.status(501).json({
        ok: false,
        error: "Shutdown niedostępny w tym trybie (brak lifecycle).",
      });
      return;
    }
    if (lifecycle.isShuttingDown()) {
      res.status(409).json({ ok: false, error: "Shutdown already in progress" });
      return;
    }
    const underPm2 = isRunningUnderPm2();
    res.json({ ok: true, action: "shutdown", pm2: underPm2 });
    setImmediate(() => {
      lifecycle.gracefulShutdown("admin_shutdown");
    });
  });

  return router;
}
