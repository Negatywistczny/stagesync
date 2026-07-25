#!/usr/bin/env node
/**
 * Gate: no ad-hoc HEX and no fractional rem in shell / launcher CSS.
 * Soft-px (1px / 2px) OK. DAW Timeline geometry excluded from frac-rem.
 * Exception lines: mark with the token ss-css-allow inside a CSS comment.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");

const SCAN_ROOTS = [
  join(root, "apps/web/src"),
  join(root, "apps/desktop/launcher"),
];

/** Frac-rem allowed — domain DAW canvas / dock geometry (plan Phase 5 exception). */
const FRAC_REM_ALLOW_FILES = new Set([
  "apps/web/src/shells/TimelineShell.module.css",
  "apps/web/src/shells/timeline/channelStrip/ChannelStripControls.module.css",
]);

const FRAC_REM_RE = /\d+\.\d+rem\b/;
const ALLOW_MARK = "ss-css-allow";

function isSkipped(filePath) {
  const rel = relative(root, filePath).replaceAll("\\", "/");
  return rel.includes("/launcher/vendor/");
}

function hasColorHex(code) {
  for (const m of code.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    if (/^\d+$/.test(m[1])) continue;
    return true;
  }
  return false;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "vendor") continue;
      walk(p, out);
    } else if (/\.(module\.css|css)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((d) => walk(d)).filter((f) => !isSkipped(f));
const violations = [];

for (const file of files) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const skipFrac = FRAC_REM_ALLOW_FILES.has(rel);
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(ALLOW_MARK)) continue;
    const code = line
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/, "");
    if (hasColorHex(code)) {
      violations.push({ rel, line: i + 1, kind: "hex", text: line.trim() });
    }
    if (!skipFrac && FRAC_REM_RE.test(code)) {
      violations.push({
        rel,
        line: i + 1,
        kind: "frac-rem",
        text: line.trim(),
      });
    }
  }
}

if (violations.length) {
  console.error(`lint-ss-css: ${violations.length} violation(s):\n`);
  for (const v of violations.slice(0, 100)) {
    console.error(`  [${v.kind}] ${v.rel}:${v.line}`);
    console.error(`    ${v.text}`);
  }
  if (violations.length > 100) {
    console.error(`  … and ${violations.length - 100} more`);
  }
  console.error(
    `\nUse --ss-* tokens, or mark a justified line with /* ${ALLOW_MARK} */.`,
  );
  process.exit(1);
}

console.log(`lint-ss-css: ok (${files.length} files)`);
