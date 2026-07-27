import type { DevSurface } from "./devSurfaceTypes.js";
import { getDevPreviewConfig } from "./devPreviewConfig.js";

let devSurfaceOverride: DevSurface | null = null;

export function setDevSurfaceOverride(surface: DevSurface | null): void {
  devSurfaceOverride = surface;
}

export function getDevSurfaceOverride(): DevSurface | null {
  return devSurfaceOverride;
}

/** Active DEV surface from preview URL or matrix override. */
export function getActiveDevSurface(): DevSurface | null {
  if (!import.meta.env.DEV) return null;
  return getDevPreviewConfig()?.surface ?? devSurfaceOverride;
}
