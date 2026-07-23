#!/usr/bin/env node
/**
 * Extract one Keep a Changelog section from CHANGELOG.md for GitHub Release body.
 *
 * Usage:
 *   node launch/scripts/extract-changelog-section.mjs <version> [changelogPath]
 *
 * Prints the section body (everything under `## [version]…` until the next `## [`)
 * without the H2 heading itself. Exit 1 if the section is missing.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const version = process.argv[2];
const changelogPath = resolve(
  process.argv[3] ?? "CHANGELOG.md",
);

if (!version) {
  console.error("Usage: extract-changelog-section.mjs <version> [changelogPath]");
  process.exit(1);
}

const text = readFileSync(changelogPath, "utf8");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headerRe = new RegExp(
  `^## \\[${escaped}\\](?:\\([^)]*\\))?[^\\n]*$`,
  "m",
);
const match = headerRe.exec(text);
if (!match) {
  console.error(`No CHANGELOG section for version ${version} in ${changelogPath}`);
  process.exit(1);
}

const afterHeader = text.slice(match.index + match[0].length);
const nextHeader = /^## \[/m.exec(afterHeader);
const body = (
  nextHeader ? afterHeader.slice(0, nextHeader.index) : afterHeader
)
  .replace(/^\n+/, "")
  .replace(/\n+$/, "\n");

if (!body.trim()) {
  console.error(`CHANGELOG section for ${version} is empty`);
  process.exit(1);
}

process.stdout.write(body);
