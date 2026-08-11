/**
 * @stagesync/shared public API.
 *
 * Thin barrel: curated category modules under `./index/` hold explicit named
 * re-exports from source files (never `export *` from those sources).
 * Root re-exports those curated surfaces only — API surface is unchanged.
 */

export * from "./index/time-api.js";
export * from "./index/schema-api.js";
export * from "./index/project-api.js";
export * from "./index/tempo-api.js";
export * from "./index/transport-api.js";
export * from "./index/content-api.js";
export * from "./index/mixer-api.js";
export * from "./index/import-api.js";
export * from "./index/shell-api.js";
