import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import type { Router } from "express";
import { isRunningUnderPm2 } from "../../lifecycle.js";
import { buildStoreZip, type ZipEntry } from "../../diagnostics-zip.js";
import { assertLifecycleAllowed } from "./lifecycle-auth.js";
import type { SystemRouterDeps } from "./types.js";

type LifecycleMountContext = {
  logBuffer: SystemRouterDeps["logBuffer"];
  lifecycle: SystemRouterDeps["lifecycle"];
  version: string;
  dataDir: string | null;
};

/** Restart, shutdown, and diagnostics export. */
export function mountLifecycleRoutes(
  router: Router,
  ctx: LifecycleMountContext,
): void {
  const { logBuffer, lifecycle, version, dataDir } = ctx;

  router.post("/restart", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    if (!lifecycle) {
      res.status(501).json({
        ok: false,
        error: "Restart niedostępny w tym trybie (brak lifecycle).",
      });
      return;
    }
    if (lifecycle.isShuttingDown()) {
      res
        .status(409)
        .json({ ok: false, error: "Shutdown already in progress" });
      return;
    }
    res.json({ ok: true, action: "restart" });
    setImmediate(() => {
      lifecycle.scheduleProcessRestart();
      lifecycle.gracefulShutdown("admin_restart", { restart: true });
    });
  });

  router.post("/shutdown", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    if (!lifecycle) {
      res.status(501).json({
        ok: false,
        error: "Shutdown niedostępny w tym trybie (brak lifecycle).",
      });
      return;
    }
    if (lifecycle.isShuttingDown()) {
      res
        .status(409)
        .json({ ok: false, error: "Shutdown already in progress" });
      return;
    }
    const underPm2 = isRunningUnderPm2();
    res.json({ ok: true, action: "shutdown", pm2: underPm2 });
    setImmediate(() => {
      lifecycle.gracefulShutdown("admin_shutdown");
    });
  });

  /**
   * GET /api/system/diagnostics/export — support ZIP (logs + env meta + RAM buffer).
   * Loopback OK; LAN needs host token / ALLOW_REMOTE (same as restart).
   */
  router.get("/diagnostics/export", (req, res) => {
    if (!assertLifecycleAllowed(req, res)) return;
    if (!dataDir) {
      res.status(501).json({ ok: false, error: "dataDir unavailable" });
      return;
    }

    const logsDir = join(dataDir, "logs");
    const entries: ZipEntry[] = [];
    const logNames: string[] = [];
    try {
      for (const name of readdirSync(logsDir)) {
        if (!/^(stagesync\.log(?:\.1)?|sidecar\.log(?:\.1)?)$/.test(name)) {
          continue;
        }
        try {
          const data = readFileSync(join(logsDir, name));
          // Cap individual log files in the bundle (avoid huge downloads).
          const capped =
            data.length > 2 * 1024 * 1024
              ? data.subarray(data.length - 2 * 1024 * 1024)
              : data;
          entries.push({
            name: `logs/${basename(name)}`,
            data: Buffer.from(capped),
          });
          logNames.push(name);
        } catch {
          /* skip unreadable */
        }
      }
    } catch {
      /* empty logs dir */
    }

    const meta = {
      exportedAt: new Date().toISOString(),
      version,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSec: Math.round(process.uptime()),
      shell: process.env.STAGESYNC_SHELL ?? null,
      dataDir,
      logFiles: logNames,
      // Never include tokens / secrets.
    };
    entries.push({
      name: "meta.json",
      data: Buffer.from(`${JSON.stringify(meta, null, 2)}\n`, "utf8"),
    });
    entries.push({
      name: "ring-buffer.json",
      data: Buffer.from(
        `${JSON.stringify({ lines: logBuffer.getLines() }, null, 2)}\n`,
        "utf8",
      ),
    });

    const stamp = meta.exportedAt.replace(/[:.]/g, "-");
    const zip = buildStoreZip(entries);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="stagesync-diagnostics-${stamp}.zip"`,
    );
    res.setHeader("Cache-Control", "no-store");
    res.send(zip);
  });
}
