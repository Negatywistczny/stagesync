import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Express } from "express";
import express from "express";

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
    res.sendFile(join(staticDir, "index.html"));
  });
}
