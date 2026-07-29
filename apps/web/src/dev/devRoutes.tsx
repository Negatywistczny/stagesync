import type { RouteObject } from "react-router-dom";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";
import { DevPreviewApp } from "./DevPreviewApp.js";

export function isDevOnlyPath(pathname: string): boolean {
  return pathname === "/_dev/layouts" || pathname === "/_dev/preview";
}

export function buildDevRoutes(enabled: boolean): RouteObject[] {
  if (!enabled) return [];
  return [
    { path: "/_dev/layouts", element: <DevLayoutMatrix /> },
    { path: "/_dev/preview", element: <DevPreviewApp /> },
  ];
}
