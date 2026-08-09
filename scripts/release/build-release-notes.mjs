#!/usr/bin/env node
/**
 * Build GitHub Release notes: download table + Highlights (not full CHANGELOG).
 *
 * Pattern (matches curated v5.0.0 / v5.1.0):
 *   download table (desktop + Android APK from 5.2.0) → Highlights — {Hero} ({version}) →
 *   short intro → one narrative bullet per domain (aggregated) → link to CHANGELOG.md
 *
 * Usage:
 *   node scripts/build-release-notes.mjs <version> [changelogPath]
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
  .replace(/\r\n/g, "\n")
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

const { bullets: domainBullets, domains } = aggregateHighlights(section);
const highlightsTitle = hero
  ? `### 🚀 Highlights — ${hero} (${version})`
  : `### 🚀 Highlights — ${version}`;

const introBlock = `${buildIntro(intro, hero, version, domains)}\n`;

const bulletsBlock =
  domainBullets.length > 0
    ? `\n${domainBullets.map((b) => `- ${b}`).join("\n")}\n`
    : "\n";

const repo = process.env.GITHUB_REPOSITORY ?? "Negatywistczny/stagesync";
const tag = `v${version}`;
const base = `https://github.com/${repo}/releases/download/${tag}`;
const dmgUrl = `${base}/StageSync_${version}_aarch64.dmg`;
/** Human Windows installer (splash). Updater uses StageSync_${version}_x64-setup.exe via latest.json. */
const exeUrl = `${base}/StageSync-Setup.exe`;
const performerApkUrl = `${base}/StageSync-Performer-v${version}.apk`;
const consoleApkUrl = `${base}/StageSync-Console-v${version}.apk`;
const changelogUrl = changelogPermalink(repo, tag, version, date, hero);
/** APKs ship from 5.2.0 (Pocket Stage); older cuts have no Android assets. */
const includeAndroid = compareSemver(version, "5.2.0") >= 0;

const androidRows = includeAndroid
  ? `| 🤖 **Android** (Performer) | [Performer (.apk)](${performerApkUrl}) |
| 🤖 **Android** (Console) | [Console (.apk)](${consoleApkUrl}) |
`
  : "";

process.stdout.write(`### 📦 Pobierz StageSync

| System operacyjny | Plik instalacyjny |
| :--- | :--- |
| 🍎 **macOS** (Apple Silicon) | [macOS (Apple Silicon)](${dmgUrl}) |
| 💻 **Windows** (64-bit) | [Windows (64-bit)](${exeUrl}) |
${androidRows}
---

${highlightsTitle}

${introBlock}${bulletsBlock}
Pełna historia zmian: [CHANGELOG.md](${changelogUrl})
`);

/**
 * Aggregate Keep a Changelog #### domains into Highlights bullets.
 * Prefer ### Dodano; merge Zmieniono / Naprawiono into the same domain (dedupe by key).
 * One bullet per domain: `**Domain** — Label: short; Label2: short.`
 */
function aggregateHighlights(sectionBody) {
  /** @type {Map<string, { added: { key: string, text: string }[], other: { key: string, text: string }[] }>} */
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
    const snippet = bulletSnippet(line);
    if (!snippet) continue;
    const bucket = byDomain.get(currentDomain);
    if (currentH3 === "Dodano") {
      bucket.added.push(snippet);
    } else if (currentH3 === "Zmieniono" || currentH3 === "Naprawiono") {
      bucket.other.push(snippet);
    }
  }

  const bullets = [];
  const domains = [];
  for (const [domain, { added, other }] of byDomain) {
    const seen = new Set(added.map((s) => s.key));
    const extras = other.filter((s) => !seen.has(s.key));
    // Keep every domain; cap clauses per bullet so Highlights stay readable.
    const items = [...added, ...extras].slice(0, 6);
    if (items.length === 0) continue;
    domains.push(domain);
    bullets.push(
      `**${domain}** — ${items.map((s) => s.text).join("; ")}.`,
    );
  }
  return { bullets, domains };
}

function buildIntro(quoteIntro, heroName, ver, domains) {
  if (quoteIntro) return quoteIntro;
  if (heroName) return `Wydanie ${heroName} (${ver}).`;
  if (domains.length === 1) return `Zmiany w obszarze ${domains[0]}.`;
  if (domains.length === 2) {
    return `Zmiany w ${domains[0]} oraz ${domains[1]}.`;
  }
  if (domains.length > 2) {
    const head = domains.slice(0, -1).join(", ");
    return `Zmiany w ${head} oraz ${domains.at(-1)}.`;
  }
  return `Wydanie ${ver}.`;
}

function domainLabel(raw) {
  const withoutEmoji = raw
    .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, "")
    .replace(/^[^\p{L}\p{N}*]+\s*/u, "")
    .trim();
  if (/^Packaging & Desktop/i.test(withoutEmoji)) return "Desktop / Android";
  if (/^Dokumentacja/i.test(withoutEmoji)) return "Dokumentacja";
  if (/^Timeline/i.test(withoutEmoji)) return "Timeline / DAW";
  if (/^Audio/i.test(withoutEmoji)) return "Audio / MIDI / Transport";
  if (/^App Shell/i.test(withoutEmoji)) return "App Shell & UI";
  if (/^Serwer/i.test(withoutEmoji)) return "Serwer & API";
  if (/^Infrastruktura/i.test(withoutEmoji)) return "Infrastruktura";
  return withoutEmoji.replace(/\s*\(.*?\)\s*$/, "").trim() || withoutEmoji;
}

/**
 * @returns {{ key: string, text: string } | null}
 */
function bulletSnippet(line) {
  const m = line.match(/^- \*\*([^*]+)\*\*\s*(?::\s*|[—–-]\s*|\s+)?(.*)$/);
  if (!m) return null;
  const label = m[1].replace(/\s*[:—–-]\s*$/, "").trim();
  if (!label) return null;
  const summary = summarizeBody(m[2] ?? "");
  // Labels stay plain (5.1.3 style) — only the domain is bold in the bullet.
  return {
    key: normalizeTitle(label),
    text: summary ? `${label}: ${summary}` : label,
  };
}

/** Strip issue/PR links and collapse whitespace for Highlights. */
function summarizeBody(raw) {
  let body = raw
    .replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\s*\((?:\s*#\d+\s*,?)+\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "";

  // Prefer short/medium summaries (~100–140 chars) for line-cut readability.
  if (body.length <= 140) {
    return body.replace(/[.!?;:,]+\s*$/, "").trim();
  }

  // Real sentence end: period after a 4+ letter word (skips np. / itd. / tj.).
  // codeql[js/redos] Bounded input length release notes summarizer
  // Bound body length to avoid catastrophic backtracking / polynomial re dos in CodeQL analysis
  const boundedBody = body.length > 500 ? body.slice(0, 500) : body;
  const sentenceRe = /(?<=\p{L}{4,})[.!?](?=\s|$)/u;
  const sentence = boundedBody.search(sentenceRe);
  if (sentence >= 24 && sentence <= 140) {
    return body.slice(0, sentence).replace(/[.!?;:,]+\s*$/, "").trim();
  }

  // CHANGELOG often uses "; " as clause separators — take whole clauses.
  const parts = body.split(/\s*;\s*/).filter(Boolean);
  let acc = parts[0] ?? "";
  for (let i = 1; i < parts.length; i++) {
    const next = `${acc}; ${parts[i]}`;
    if (next.length > 120) break;
    acc = next;
  }
  if (acc.length > 120) {
    acc = acc
      .slice(0, 120)
      .replace(/\s+\S*$/, "")
      .replace(/[,;:/\-–—]\s*$/, "");
  }
  return acc.replace(/[.!?;:,]+\s*$/, "").trim();
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Compare dotted numeric SemVer prefixes (ignores pre-release suffix). */
function compareSemver(a, b) {
  const pa = String(a)
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const pb = String(b)
    .split("-")[0]
    .split(".")
    .map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function changelogPermalink(repository, gitTag, ver, releaseDate, heroName) {
  const baseUrl = `https://github.com/${repository}/blob/${gitTag}/CHANGELOG.md`;
  const anchor = githubHeadingAnchor(
    `${ver} - ${releaseDate ?? ""}${heroName ? ` — ${heroName}` : ""}`.trim(),
  );
  return anchor ? `${baseUrl}#${anchor}` : baseUrl;
}

/** MSI/WiX requires numeric major.minor.patch[.build]; map SemVer pre-release to 4th field. */
function toWixVersion(semver) {
  // Nested beta docs cuts: 5.0.0-beta.1.1 → 5.0.0.10101 (room after shipped beta.1 = .10001).
  const nestedBeta = semver.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)\.(\d+)$/);
  if (nestedBeta) {
    const [, major, minor, patch, n, m] = nestedBeta;
    return `${major}.${minor}.${patch}.${10000 + Number(n) * 100 + Number(m)}`;
  }
  const match = semver.match(/^(\d+)\.(\d+)\.(\d+)(?:-([^.]+)\.(\d+))?$/);
  if (!match) return semver.replace(/-.*$/, "");
  const [, major, minor, patch, prereleaseTag, prereleaseNum] = match;
  if (!prereleaseTag) return `${major}.${minor}.${patch}`;
  const n = Number(prereleaseNum);
  if (prereleaseTag === "beta") {
    // beta.1 already shipped as .10001; beta.2+ use *100 spacing so nested .N.M fits underneath.
    if (n === 1) return `${major}.${minor}.${patch}.10001`;
    return `${major}.${minor}.${patch}.${10000 + n * 100}`;
  }
  return `${major}.${minor}.${patch}.${n}`;
}

/** Approximate GitHub heading slug (good enough for CHANGELOG H2 anchors). */
function githubHeadingAnchor(headingText) {
  // Drop punctuation (incl. em dash / &); each leftover space → one "-" (GFM-like).
  return headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{N} —-]/gu, "")
    .trim()
    .replace(/—/g, " ")
    .replace(/\s+/g, "-");
}
