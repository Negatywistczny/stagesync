/**
 * Android Console local-host entry (nodejs-mobile).
 * Logs early boot breadcrumbs to stdout/stderr (redirected to filesDir) and
 * loads the production server. Prefer this over bare dist/index.js so module
 * load failures are visible in the launcher UI without adb.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function log(...args) {
  console.log("[stagesync-host]", ...args);
}

function logErr(...args) {
  console.error("[stagesync-host]", ...args);
}

process.on("uncaughtException", (err) => {
  logErr("uncaughtException", err?.stack || err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logErr("unhandledRejection", reason);
  process.exit(1);
});

log("boot", {
  pid: process.pid,
  cwd: process.cwd(),
  node: process.version,
  shell: process.env.STAGESYNC_SHELL || "",
  midi: process.env.STAGESYNC_MIDI_BACKEND || "",
  port: process.env.PORT || "",
  dataDir: process.env.STAGESYNC_DATA_DIR || "",
  nodePath: process.env.NODE_PATH || "",
});

const entry = join(here, "dist", "index.js");
log("import", entry);

try {
  await import(pathToFileURL(entry).href);
  log("server module loaded (listen should follow)");
} catch (err) {
  logErr("failed to import dist/index.js", err?.stack || err);
  process.exit(1);
}
