#!/usr/bin/env node
/**
 * Build GitHub Release notes: download table + Highlights (not full CHANGELOG).
 *
 * Pattern (matches v5.0.0):
 *   download table → Highlights — {Hero} ({version}) → short intro →
 *   aggregated domain bullets → link to CHANGELOG.md
 *
 * Usage:
 *   node launch/scripts/build-release-notes.mjs <version> [changelogPath]
 *
 * Prints markdown to stdout.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const version = process.argv[2];
const changelogPath = resolve(process.argv[3] ?? "CHANGELOG.md");

if (!version) {
  console.error("Usage: build-release-notes.mjs <version> [changelogPath]");
  process.exit(1);
}

const text = readFileSync(changelogPath, "utf8");
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headerRe = new RegExp(
  `^## \\[${escaped}\\](?:\\([^)]*\\))?[^\\n]*$`,
  "m",
);
const headerMatch = headerRe.exec(text);
if (!headerMatch) {
  console.error(`No CHANGELOG section for version ${version} in ${changelogPath}`);
  process.exit(1);
}

const headerLine = headerMatch[0];
const afterHeader = text.slice(headerMatch.index + headerLine.length);
const nextHeader = /^## \[/m.exec(afterHeader);
const section = (
  nextHeader ? afterHeader.slice(0, nextHeader.index) : afterHeader
)
  .replace(/^\n+/, "")
  .replace(/\n+$/, "\n");

if (!section.trim()) {
  console.error(`CHANGELOG section for ${version} is empty`);
  process.exit(1);
}

const heroMatch = headerLine.match(/—\s*(.+?)\s*$/);
const hero = heroMatch?.[1]?.trim() ?? null;

const dateMatch = headerLine.match(/\b(\d{4}-\d{2}-\d{2})\b/);
const date = dateMatch?.[1] ?? null;

const quoteMatch = section.match(/^>\s*(.+)$/m);
let intro = quoteMatch?.[1]?.trim() ?? null;
if (intro) {
  // Strip leading **Hero:** (colon may be inside or outside the bold markers).
  intro = intro
    .replace(/^\*\*[^*]+?:\*\*\s*/, "")
    .replace(/^\*\*[^*]+\*\*:\s*/, "")
    .trim();
}

const domainBullets = aggregateHighlights(section);
const highlightsTitle = hero
  ? `### 🚀 Highlights — ${hero} (${version})`
  : `### 🚀 Highlights — ${version}`;

const introBlock = intro
  ? `${intro}\n`
  : hero
    ? `Wydanie ${hero} (${version}).\n`
    : `Wydanie ${version}.\n`;

const bulletsBlock =
  domainBullets.length > 0
    ? `\n${domainBullets.map((b) => `- ${b}`).join("\n")}\n`
    : "\n";

const repo = process.env.GITHUB_REPOSITORY ?? "Negatywistyczny/stagesync";
const tag = `v${version}`;
const base = `https://github.com/${repo}/releases/download/${tag}`;
const dmgUrl = `${base}/StageSync_${version}_aarch64.dmg`;
const msiUrl = `${base}/StageSync_${version}_x64.msi`;
const changelogUrl = changelogPermalink(repo, tag, version, date, hero);

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

${highlightsTitle}

${introBlock}${bulletsBlock}
Pełna historia zmian: [CHANGELOG.md](${changelogUrl})
`);

/**
 * Aggregate Keep a Changelog #### domains into short Highlights bullets.
 * Prefer ### Dodano titles; append Zmieniono / Naprawiono titles only when fresh.
 */
function aggregateHighlights(sectionBody) {
  /** @type {Map<string, { added: string[], other: string[] }>} */
  const byDomain = new Map();
  let currentH3 = null;
  let currentDomain = null;

  for (const line of sectionBody.split("\n")) {
    const h3 = line.match(/^###\s+(.+)\s*$/);
    if (h3) {
      currentH3 = h3[1].trim();
      currentDomain = null;
      continue;
    }
    const h4 = line.match(/^####\s+(.+)\s*$/);
    if (h4) {
      currentDomain = domainLabel(h4[1].trim());
      if (!byDomain.has(currentDomain)) {
        byDomain.set(currentDomain, { added: [], other: [] });
      }
      continue;
    }
    if (!currentDomain || !currentH3) continue;
    const title = bulletTitle(line);
    if (!title) continue;
    const bucket = byDomain.get(currentDomain);
    if (currentH3 === "Dodano") {
      bucket.added.push(title);
    } else if (currentH3 === "Zmieniono" || currentH3 === "Naprawiono") {
      bucket.other.push(title);
    }
  }

  const bullets = [];
  for (const [domain, { added, other }] of byDomain) {
    const seen = new Set(added.map(normalizeTitle));
    const extras = other.filter((t) => !seen.has(normalizeTitle(t)));
    const titles = [...added, ...extras].slice(0, 6);
    if (titles.length === 0) continue;
    bullets.push(`**${domain}** — ${titles.join("; ")}.`);
  }
  return bullets;
}

function domainLabel(raw) {
  const withoutEmoji = raw
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, "")
    .trim();
  if (/^Packaging & Desktop/i.test(withoutEmoji)) return "Desktop";
  if (/^Dokumentacja/i.test(withoutEmoji)) return "Dokumentacja";
  if (/^Timeline/i.test(withoutEmoji)) return "Timeline / DAW";
  if (/^Audio/i.test(withoutEmoji)) return "Audio / MIDI / Transport";
  if (/^App Shell/i.test(withoutEmoji)) return "App Shell & UI";
  if (/^Serwer/i.test(withoutEmoji)) return "Serwer & API";
  if (/^Infrastruktura/i.test(withoutEmoji)) return "Infrastruktura";
  return withoutEmoji.replace(/\s*\(.*?\)\s*$/, "").trim() || withoutEmoji;
}

function bulletTitle(line) {
  const m = line.match(/^- \*\*([^*]+)\*\*/);
  if (!m) return null;
  return m[1].replace(/\s*[:—–-]\s*$/, "").trim();
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function changelogPermalink(repository, gitTag, ver, releaseDate, heroName) {
  const baseUrl = `https://github.com/${repository}/blob/${gitTag}/CHANGELOG.md`;
  const anchor = githubHeadingAnchor(
    `${ver} - ${releaseDate ?? ""}${heroName ? ` — ${heroName}` : ""}`.trim(),
  );
  return anchor ? `${baseUrl}#${anchor}` : baseUrl;
}

/** Approximate GitHub heading slug (good enough for CHANGELOG H2 anchors). */
function githubHeadingAnchor(headingText) {
  // Drop punctuation (incl. em dash / &); each leftover space → one "-" (GFM-like).
  return headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .replace(/ /g, "-");
}
