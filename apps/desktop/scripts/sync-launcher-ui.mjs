#!/usr/bin/env node
/**
 * Copy @stagesync/ui tokens + button CSS into the static Tauri launcher
 * (ADR 0014 — no React / no bundler for frontendDist).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const uiSrc = join(root, "packages/ui/src");
const vendor = join(root, "apps/desktop/launcher/vendor");

mkdirSync(vendor, { recursive: true });
copyFileSync(join(uiSrc, "tokens.css"), join(vendor, "tokens.css"));
copyFileSync(join(uiSrc, "button.css"), join(vendor, "button.css"));
console.log("sync-launcher-ui: wrote apps/desktop/launcher/vendor/{tokens,button}.css");
