#!/usr/bin/env node
/**
 * Release title from CHANGELOG hero name when present.
 *
 * Usage:
 *   node launch/scripts/release-title.mjs <version> [changelogPath]
 *
 * Examples:
 *   5.1.0 + "— Launch & Mix" → "5.1.0 — Launch & Mix"
 *   5.0.1 (no hero) → "5.0.1"
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const version = process.argv[2];
const changelogPath = resolve(process.argv[3] ?? "CHANGELOG.md");

if (!version) {
  console.error("Usage: release-title.mjs <version> [changelogPath]");
  process.exit(1);
}

const text = readFileSync(changelogPath, "utf8");
const escaped = version.replace(/\./g, "\\.");
const re = new RegExp(
  `## \\[${escaped}\\][^\\n]*?—\\s*(.+?)\\s*$`,
  "m",
);
const match = text.match(re);
const hero = match?.[1]?.trim();
process.stdout.write(hero ? `${version} — ${hero}` : version);
