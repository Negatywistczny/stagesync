import type { Router } from "express";
import { ApplyUpdateBodySchema } from "@stagesync/shared";
import {
  fetchLatestReleaseVersion,
  isSemverNewer,
} from "./semver-release.js";

type UpdateMountContext = {
  version: string;
};

/** Update status (GitHub Releases) and Watchtower apply-update. */
export function mountUpdateRoutes(
  router: Router,
  ctx: UpdateMountContext,
): void {
  const { version } = ctx;

  /** GET /api/system/update-status — compare current vs GitHub Releases latest. */
  router.get("/update-status", async (_req, res) => {
    res.set("Cache-Control", "no-store");

    const applyAvailable = Boolean(
      process.env.STAGESYNC_UPDATER_URL && process.env.STAGESYNC_UPDATER_TOKEN,
    );

    if (
      process.env.STAGESYNC_DISABLE_AUTO_UPDATE === "1" ||
      process.env.STAGESYNC_DISABLE_AUTO_UPDATE === "true"
    ) {
      res.json({
        current: version,
        latest: null,
        updateAvailable: false,
        applyAvailable: false,
        error:
          "Aktualizacje wyłączone w Ustawieniach (STAGESYNC_DISABLE_AUTO_UPDATE).",
        autoUpdateDisabled: true,
      });
      return;
    }

    // Desktop sidecar + Android Console embedded host: app/APK updates, not Watchtower.
    // Skip noisy GitHub Releases fetch and Docker soft-fail messaging.
    const shell = process.env.STAGESYNC_SHELL ?? "";
    if (shell === "desktop" || shell === "console") {
      res.json({
        current: version,
        latest: null,
        updateAvailable: false,
        applyAvailable: false,
        error: null,
        updateChannel: process.env.STAGESYNC_UPDATE_CHANNEL ?? "stable",
        updateMode: shell === "console" ? "apk" : "desktop",
      });
      return;
    }

    const token = process.env.STAGESYNC_GITHUB_TOKEN;
    const channel = process.env.STAGESYNC_UPDATE_CHANNEL ?? "stable";
    const { latest, error } = await fetchLatestReleaseVersion(
      token,
      fetch,
      channel,
    );
    const updateAvailable = latest !== null && isSemverNewer(latest, version);
    res.json({
      current: version,
      latest,
      updateAvailable,
      applyAvailable,
      error,
      updateChannel: channel,
      updateMode: applyAvailable ? "docker" : "manual",
    });
  });

  /** POST /api/system/apply-update — trigger Watchtower HTTP API (host only). */
  router.post("/apply-update", async (req, res) => {
    const body = ApplyUpdateBodySchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(400)
        .json({ ok: false, error: "Invalid body", details: body.error.issues });
      return;
    }

    const updaterUrl = process.env.STAGESYNC_UPDATER_URL;
    const updaterToken = process.env.STAGESYNC_UPDATER_TOKEN;

    if (!updaterUrl || !updaterToken) {
      const shell = process.env.STAGESYNC_SHELL ?? "";
      const error =
        shell === "console"
          ? "Aktualizacja hosta Docker nie dotyczy Console na Androidzie. Zainstaluj nowszy APK (Releases / QR z karty Połączenie & Sieć)."
          : shell === "desktop"
            ? "Aktualizacja kontenera Docker nie dotyczy aplikacji desktopowej — użyj Sprawdź aktualizacje w launcherze."
            : "Aktualizacja hosta niedostępna w tym trybie (brak Watchtower). W produkcji: compose.prod.yml.";
      res.status(501).json({
        ok: false,
        error,
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
        const text = (await wtRes.text().catch(() => "")).slice(0, 500);
        res.status(502).json({
          ok: false,
          error: `Watchtower error ${wtRes.status}: ${text}`,
        });
        return;
      }
      // Respond before the container restarts (Watchtower may kill us).
      res.json({ ok: true, action: "host-update-triggered" });
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).slice(
        0,
        500,
      );
      res
        .status(502)
        .json({ ok: false, error: `Watchtower unreachable: ${msg}` });
    }
  });
}
