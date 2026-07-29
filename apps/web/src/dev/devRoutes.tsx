import type { RouteObject } from "react-router-dom";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";

export function isDevPreviewPath(pathname: string): boolean {
  return pathname === "/_dev/preview";
}

export function isDevOnlyPath(pathname: string): boolean {
  return pathname === "/_dev/layouts" || isDevPreviewPath(pathname);
}

export function buildDevRoutes(enabled: boolean): RouteObject[] {
  if (!enabled) return [];
  return [{ path: "/_dev/layouts", element: <DevLayoutMatrix /> }];
}
