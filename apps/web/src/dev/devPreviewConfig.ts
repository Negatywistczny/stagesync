import {
  DEV_PREVIEW_PROJECT_ID,
  type DevPreviewRoute,
  type DevSurface,
} from "./devSurfaceTypes.js";

export type DevPreviewConfig = {
  surface: DevSurface;
  path: DevPreviewRoute;
  session: boolean;
  projectId: string;
};

const SURFACES: DevSurface[] = ["tauri", "console", "performer", "web"];
const ROUTES: DevPreviewRoute[] = ["/admin", "/client", "/timeline"];

export const PERFORMER_DEV_PREVIEW_CONFIG: Pick<DevPreviewConfig, "path" | "session"> = {
  path: "/client",
  session: false,
};

/** Operator session preview toggle applies only to web (LAN browser). */
export function devPreviewShowsOperatorSession(surface: DevSurface): boolean {
  return surface === "web";
}

/** Performer = Client only; operator session is web-only. */
export function normalizeDevPreviewConfig(config: DevPreviewConfig): DevPreviewConfig {
  let normalized = config;
  if (config.surface === "performer") {
    normalized = { ...config, ...PERFORMER_DEV_PREVIEW_CONFIG };
  }
  if (!devPreviewShowsOperatorSession(normalized.surface)) {
    normalized = { ...normalized, session: false };
  }
  return normalized;
}

function parseSurface(raw: string | null): DevSurface {
  if (raw && SURFACES.includes(raw as DevSurface)) {
    return raw as DevSurface;
  }
  return "web";
}

function parseRoute(raw: string | null): DevPreviewRoute {
  if (raw === "/admin" || raw === "/client") return raw;
  if (raw === "/timeline" || raw?.startsWith("/timeline/")) return "/timeline";
  return "/admin";
}

export function parseDevPreviewSearch(
  search: string,
): DevPreviewConfig {
  const params = new URLSearchParams(search);
  return normalizeDevPreviewConfig({
    surface: parseSurface(params.get("surface")),
    path: parseRoute(params.get("path")),
    session: params.get("session") !== "0",
    projectId: params.get("projectId")?.trim() || DEV_PREVIEW_PROJECT_ID,
  });
}

export function getDevPreviewConfig(): DevPreviewConfig | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === "undefined") return null;
  const pathname = window.location?.pathname;
  if (!pathname?.startsWith("/_dev/preview")) return null;
  return parseDevPreviewSearch(window.location.search ?? "");
}

export function resolveDevPreviewPath(config: DevPreviewConfig): string {
  if (config.path === "/timeline") {
    return `/timeline/${encodeURIComponent(config.projectId)}`;
  }
  return config.path;
}

export function buildDevPreviewUrl(
  config: DevPreviewConfig,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const normalized = normalizeDevPreviewConfig(config);
  const params = new URLSearchParams({
    surface: normalized.surface,
    path: normalized.path,
    session: normalized.session ? "1" : "0",
    projectId: normalized.projectId,
  });
  return `${origin}/_dev/preview?${params.toString()}`;
}

export function isDevPreviewRoute(pathname: string | undefined): boolean {
  return Boolean(pathname?.startsWith("/_dev/"));
}

export { ROUTES as DEV_PREVIEW_ROUTES, SURFACES as DEV_SURFACES };
