/**
 * After role Vite builds: copy performer/console ui-bundle + hash/manifest into full `dist/`
 * so the host can serve role-specific Offline-First zips (#692) without separate static roots.
 *
 * Smoke-checks: Performer stays Client-only; Console = full SPA (Admin+Timeline+Client).
 */
import {
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fullDist = join(root, "dist");
const performerDist = join(root, "dist-performer");
const consoleDist = join(root, "dist-console");

function requireFile(path, label) {
  if (!existsSync(path)) {
    throw new Error(`aggregate-role-ui: missing ${label} at ${path}`);
  }
}

function readRoleJs(distDir) {
  const assets = join(distDir, "assets");
  requireFile(assets, `${distDir} assets/`);
  return readdirSync(assets)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(join(assets, f), "utf8"))
    .join("\n");
}

function assertPerformerIsolation() {
  requireFile(join(performerDist, "index.html"), "performer index.html");
  const js = readRoleJs(performerDist);
  if (!js.includes('"/client"')) {
    throw new Error("aggregate-role-ui: performer JS missing /client route");
  }
  if (js.includes("/timeline/:projectId") || js.includes('path:"/timeline')) {
    throw new Error(
      "aggregate-role-ui: performer JS includes Timeline routes — dual-entry leak",
    );
  }
  if (js.includes("TimelineShell") || js.includes("AdminShell")) {
    throw new Error(
      "aggregate-role-ui: performer JS includes TimelineShell/AdminShell symbol",
    );
  }
}

function assertConsoleFullSpa() {
  requireFile(join(consoleDist, "index.html"), "console index.html");
  const js = readRoleJs(consoleDist);
  if (!js.includes('"/admin"')) {
    throw new Error("aggregate-role-ui: console JS missing /admin route");
  }
  if (!js.includes('"/client"')) {
    throw new Error(
      "aggregate-role-ui: console JS missing /client route — full desktop parity required",
    );
  }
  if (!js.includes("/timeline/:projectId") && !js.includes('"/timeline/')) {
    throw new Error("aggregate-role-ui: console JS missing Timeline route");
  }
  // Client Score (OSMD) must ship in Console full SPA (minified symbols may rename).
  if (!/OpenSheetMusicDisplay|opensheetmusicdisplay/i.test(js)) {
    throw new Error(
      "aggregate-role-ui: console JS missing OSMD — Client Score expected in full SPA",
    );
  }
}

function copyRole(role, distDir) {
  requireFile(join(distDir, "index.html"), `${role} index.html`);
  requireFile(join(distDir, "ui-bundle.zip"), `${role} ui-bundle.zip`);
  requireFile(join(distDir, "ui-hash.json"), `${role} ui-hash.json`);
  requireFile(join(distDir, "ui-manifest.json"), `${role} ui-manifest.json`);

  copyFileSync(
    join(distDir, "ui-bundle.zip"),
    join(fullDist, `ui-bundle-${role}.zip`),
  );
  copyFileSync(
    join(distDir, "ui-hash.json"),
    join(fullDist, `ui-hash-${role}.json`),
  );
  copyFileSync(
    join(distDir, "ui-manifest.json"),
    join(fullDist, `ui-manifest-${role}.json`),
  );

  const hashFile = JSON.parse(
    readFileSync(join(distDir, "ui-hash.json"), "utf8"),
  );
  return hashFile.uiHash;
}

requireFile(join(fullDist, "index.html"), "full dist index.html");
assertPerformerIsolation();
assertConsoleFullSpa();

const uiHashPerformer = copyRole("performer", performerDist);
const uiHashConsole = copyRole("console", consoleDist);

const rolesMeta = {
  uiHashPerformer,
  uiHashConsole,
};
writeFileSync(
  join(fullDist, "ui-role-hashes.json"),
  `${JSON.stringify(rolesMeta, null, 2)}\n`,
);

console.log(
  `[aggregate-role-ui] performer=${uiHashPerformer.slice(0, 12)}… console=${uiHashConsole.slice(0, 12)}… → dist/`,
);
