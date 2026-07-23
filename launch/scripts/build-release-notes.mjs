#!/usr/bin/env node
/**
 * Build GitHub Release notes: download table + CHANGELOG section for a version.
 *
 * Usage:
 *   node launch/scripts/build-release-notes.mjs <version> [changelogPath]
 *
 * Prints markdown to stdout.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const version = process.argv[2];
const changelogPath = resolve(process.argv[3] ?? "CHANGELOG.md");

if (!version) {
  console.error("Usage: build-release-notes.mjs <version> [changelogPath]");
  process.exit(1);
}

const extract = join(dirname(fileURLToPath(import.meta.url)), "extract-changelog-section.mjs");
const result = spawnSync(process.execPath, [extract, version, changelogPath], {
  encoding: "utf8",
});
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "extract failed\n");
  process.exit(result.status ?? 1);
}

const section = result.stdout;
const repo = process.env.GITHUB_REPOSITORY ?? "Negatywistczny/stagesync";
const tag = `v${version}`;
const base = `https://github.com/${repo}/releases/download/${tag}`;
const dmgUrl = `${base}/StageSync_${version}_aarch64.dmg`;
const msiUrl = `${base}/StageSync_${version}_x64.msi`;

process.stdout.write(`### 📦 Pobierz StageSync

| System operacyjny | Plik instalacyjny |
| :--- | :--- |
| 🍎 **macOS** (Apple Silicon) | [macOS (Apple Silicon)](${dmgUrl}) |
| 🪟 **Windows** (64-bit) | [Windows (64-bit)](${msiUrl}) |

<details>
<summary>Pliki automatycznych aktualizacji i checksumy</summary>

Pliki \`.app.tar.gz\`, \`.sig\`, \`latest.json\` oraz \`SHA256SUMS.txt\` są wykorzystywane przez wbudowany aktualizator aplikacji i weryfikację spójności — nie musisz ich pobierać ręcznie.

</details>

---

### 🚀 Co nowego w tym wydaniu?

${section}`);
