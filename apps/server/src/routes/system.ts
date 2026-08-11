/**
 * System / host operator routes (settings, lifecycle, updates, diagnostics).
 *
 * Thin barrel: public API re-exports. Implementation lives in `./system/`.
 */

export type { SystemRouterDeps, LatestReleaseResult } from "./system/types.js";

export { assertLifecycleAllowed } from "./system/lifecycle-auth.js";

export {
  isSemverNewer,
  fetchLatestReleaseVersion,
} from "./system/semver-release.js";

export { createSystemRouter } from "./system/create-router.js";
