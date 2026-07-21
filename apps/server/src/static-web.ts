import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Express } from "express";
import express from "express";

const DESKTOP_SHELL_MARKER =
  '<meta name="stagesync-shell" content="desktop" />' +
  '<script>window.__STAGESYNC_SHELL__="desktop"</script>';

/** Inject client-visible desktop flag (Tauri sidecar serves UI from localhost). */
export function injectDesktopShellMarker(html: string): string {
  if (html.includes("__STAGESYNC_SHELL__")) return html;
  // First in <head> so the flag exists before deferred module scripts run.
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${DESKTOP_SHELL_MARKER}`);
  }
  if (html.includes("</head>")) {
    return html.replace("</head>", `${DESKTOP_SHELL_MARKER}</head>`);
  }
  return `${DESKTOP_SHELL_MARKER}${html}`;
}

/** Resolve static web root: env override, then common Docker / monorepo paths. */
export function resolveStaticDir(): string | null {
  const fromEnv = process.env.STAGESYNC_STATIC_DIR?.trim();
  if (fromEnv && existsSync(join(fromEnv, "index.html"))) {
    return fromEnv;
  }
  return null;
}

/**
 * Serve Vite build (`index.html` + assets) and SPA fallback for non-API routes.
 * No-op when `STAGESYNC_STATIC_DIR` is unset or missing `index.html`.
 */
export function mountStaticWeb(app: Express, staticDir: string): void {
  app.use(express.static(staticDir, { index: false, fallthrough: true }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api") || req.path.startsWith("/ws")) {
      next();
      return;
    }
    // Desktop sidecar (ADR 0010): operator window defaults to Admin, not Client.
    if (
      process.env.STAGESYNC_SHELL === "desktop" &&
      (req.path === "/" || req.path === "")
    ) {
      res.redirect(302, "/admin");
      return;
    }
    const indexPath = join(staticDir, "index.html");
    if (process.env.STAGESYNC_SHELL === "desktop") {
      void readFile(indexPath, "utf8")
        .then((html) => {
          res.setHeader("Cache-Control", "no-store");
          res.type("html").send(injectDesktopShellMarker(html));
        })
        .catch(next);
      return;
    }
    res.sendFile(indexPath);
  });
}
