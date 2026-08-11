import type { Router } from "express";
import {
  buildMdnsJoinUrl,
  buildNetworkInfo,
  withMdnsJoinUrl,
} from "../../network-info.js";
import { writeManagedSettings } from "../../env-settings.js";
import {
  isOperatorPinRequired,
  verifyOperatorPin,
} from "../../operator-pin.js";
import { promoteToMaster, safetyNetStatus } from "../../safety-net.js";
import type { SystemRouterDeps } from "./types.js";

type HostMountContext = {
  logBuffer: SystemRouterDeps["logBuffer"];
  port: number;
  version: string;
  dataDir: string | null;
  transport: SystemRouterDeps["transport"];
};

/** Operator auth, safety-net, promote, logs, network. */
export function mountHostRoutes(router: Router, ctx: HostMountContext): void {
  const { logBuffer, port, version, dataDir } = ctx;

  router.get("/operator-auth", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ required: isOperatorPinRequired() });
  });

  router.post("/operator-auth", (req, res) => {
    const pin = typeof req.body?.pin === "string" ? req.body.pin : "";
    if (!isOperatorPinRequired()) {
      res.json({ ok: true, required: false });
      return;
    }
    if (!verifyOperatorPin(pin)) {
      res.status(403).json({
        ok: false,
        error: "Nieprawidłowy PIN operatora.",
      });
      return;
    }
    res.json({ ok: true, required: true });
  });

  router.get("/safety-net", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(safetyNetStatus());
  });

  /** Manual promote Spare → Master (no auto-election). */
  router.post("/promote", (_req, res) => {
    promoteToMaster();
    let transportPaused = false;
    const transport = ctx.transport;
    if (transport?.getState().playing) {
      transport.pause();
      transportPaused = true;
    }
    try {
      writeManagedSettings({ STAGESYNC_SAFETY_ROLE: "master" });
    } catch {
      /* env write optional — runtime role already flipped */
    }
    res.json({ ok: true, ...safetyNetStatus(), transportPaused });
  });

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
    const mdnsDisabled =
      process.env.STAGESYNC_DISABLE_MDNS === "1" ||
      process.env.STAGESYNC_DISABLE_MDNS === "true";
    // Android Console local host: Node bonjour off, platform NSD advertises.
    const mdnsPlatform =
      process.env.STAGESYNC_MDNS_PLATFORM === "1" ||
      process.env.STAGESYNC_MDNS_PLATFORM === "true";
    const mdnsEnabled = !mdnsDisabled || mdnsPlatform;
    const info = buildNetworkInfo(port);
    const urls = mdnsEnabled
      ? withMdnsJoinUrl(info.urls, buildMdnsJoinUrl(info.hostname, port))
      : info.urls;
    res.json({
      ...info,
      urls,
      version,
      ...(dataDir ? { dataDir } : {}),
      mdnsEnabled,
      bindHost:
        (process.env.STAGESYNC_BIND_HOST ?? "0.0.0.0").trim() || "0.0.0.0",
      updateChannel: process.env.STAGESYNC_UPDATE_CHANNEL ?? "stable",
      autoUpdateDisabled:
        process.env.STAGESYNC_DISABLE_AUTO_UPDATE === "1" ||
        process.env.STAGESYNC_DISABLE_AUTO_UPDATE === "true",
    });
  });
}
