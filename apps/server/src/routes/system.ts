import { Router } from "express";
import type { LogBuffer } from "../log-buffer.js";
import type { Lifecycle } from "../lifecycle.js";
import { buildNetworkInfo } from "../network-info.js";
import { isRunningUnderPm2 } from "../lifecycle.js";
import { ApplyUpdateBodySchema } from "@stagesync/shared";

export type SystemRouterDeps = {
  logBuffer: LogBuffer;
  lifecycle?: Lifecycle;
  port?: number;
  version?: string;
};

const GITHUB_REPO = "Negatywistczny/stagesync";

/** Fetch latest release semver from GitHub Releases API. */
async function fetchLatestVersion(token?: string): Promise<string | null> {
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string };
    return data.tag_name?.replace(/^v/, "") ?? null;
  } catch {
    return null;
  }
}

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
    res.json({ ok: true });
    logBuffer.clear();
  });

  router.get("/network", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
      ...buildNetworkInfo(port),
      version,
    });
  });

  /** GET /api/system/update-status — compare current vs GitHub Releases latest. */
  router.get("/update-status", async (_req, res) => {
    const token = process.env.STAGESYNC_GITHUB_TOKEN;
    const latest = await fetchLatestVersion(token);
    res.set("Cache-Control", "no-store");
    res.json({
      current: version,
      latest,
      updateAvailable: latest !== null && latest !== version,
      error: latest === null ? "GitHub Releases API unreachable or token missing" : null,
    });
  });

  /** POST /api/system/apply-update — trigger Watchtower HTTP API (host only). */
  router.post("/apply-update", async (req, res) => {
    const body = ApplyUpdateBodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ ok: false, error: "Invalid body", details: body.error.issues });
      return;
    }

    const updaterUrl = process.env.STAGESYNC_UPDATER_URL;
    const updaterToken = process.env.STAGESYNC_UPDATER_TOKEN;

    if (!updaterUrl || !updaterToken) {
      res.status(501).json({
        ok: false,
        error: "Host update unavailable (STAGESYNC_UPDATER_URL / STAGESYNC_UPDATER_TOKEN not set). Use compose.prod.yml.",
      });
      return;
    }

    try {
      // Watchtower HTTP API: POST /v1/update?scope=stagesync
      const wtRes = await fetch(`${updaterUrl}/v1/update?scope=stagesync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${updaterToken}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!wtRes.ok) {
        const text = await wtRes.text().catch(() => "");
        res.status(502).json({ ok: false, error: `Watchtower error ${wtRes.status}: ${text}` });
        return;
      }
      // Respond before the container restarts (Watchtower may kill us).
      res.json({ ok: true, action: "host-update-triggered" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(502).json({ ok: false, error: `Watchtower unreachable: ${msg}` });
    }
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
