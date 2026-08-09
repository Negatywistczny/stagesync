export type DevSurface = "web" | "tauri" | "console" | "performer";

export type DevRoute = "admin" | "timeline" | "client";

export type DevPreviewConfig = {
  surface: DevSurface;
  route: DevRoute;
  session: boolean;
};

export const DEFAULT_DEV_PREVIEW_CONFIG: DevPreviewConfig = {
  surface: "web",
  route: "admin",
  session: false,
};

const SURFACE_VALUES = new Set<DevSurface>([
  "web",
  "tauri",
  "console",
  "performer",
]);
const ROUTE_VALUES = new Set<DevRoute>(["admin", "timeline", "client"]);

function parseBooleanParam(raw: string | null): boolean {
  if (!raw) return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function parseDevPreviewConfig(search: string): DevPreviewConfig {
  const params = new URLSearchParams(search);
  const surfaceRaw = params.get("surface");
  const routeRaw = params.get("route");

  const surface = SURFACE_VALUES.has(surfaceRaw as DevSurface)
    ? (surfaceRaw as DevSurface)
    : DEFAULT_DEV_PREVIEW_CONFIG.surface;
  const route = ROUTE_VALUES.has(routeRaw as DevRoute)
    ? (routeRaw as DevRoute)
    : DEFAULT_DEV_PREVIEW_CONFIG.route;
  const session = parseBooleanParam(params.get("session"));

  return { surface, route, session };
}

export function buildDevPreviewSearch(config: DevPreviewConfig): string {
  const params = new URLSearchParams();
  params.set("surface", config.surface);
  params.set("route", config.route);
  if (config.session) {
    params.set("session", "1");
  }
  return `?${params.toString()}`;
}

export function buildDevPreviewUrl(config: DevPreviewConfig): string {
  return `/_dev/preview${buildDevPreviewSearch(config)}`;
}

export function devRoutePath(route: DevRoute): string {
  if (route === "timeline") return "/timeline/dev-preview";
  if (route === "client") return "/client";
  return "/admin";
}
