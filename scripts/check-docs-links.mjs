/**
 * Check relative markdown links in *.md / *.mdc.
 * Run: node scripts/check-docs-links.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "target",
  ".turbo",
  "coverage",
]);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(md|mdc)$/i.test(ent.name)) acc.push(p);
  }
  return acc;
}

const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
const broken = [];
let checked = 0;

for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  const dir = path.dirname(file);
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    let target = m[2].trim();
    if (
      !target ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#") ||
      target.startsWith("vscode:") ||
      target.includes("<") ||
      target.includes("`")
    ) {
      continue;
    }
    // strip title "..."
    const spaceIdx = target.search(/\s+"/);
    if (spaceIdx !== -1) target = target.slice(0, spaceIdx);
    const hash = target.indexOf("#");
    if (hash !== -1) target = target.slice(0, hash);
    if (!target) continue;
    // ignore pure anchors already handled; ignore empty after strip
    if (/^[a-z]+:/i.test(target)) continue;

    checked++;
    // Skip non-path targets (regex dumps, citation artifacts, bare UUIDs)
    if (
      /\\_span$/.test(target) ||
      /^\?:/.test(target) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        target,
      ) ||
      (target.includes("|") && !target.includes("/"))
    ) {
      continue;
    }
    const resolved = path.resolve(dir, decodeURIComponent(target));
    if (!fs.existsSync(resolved)) {
      broken.push({
        file: path.relative(root, file).replace(/\\/g, "/"),
        target: m[2].trim(),
        resolved: path.relative(root, resolved).replace(/\\/g, "/"),
      });
    }
  }
}

console.log(`checked=${checked} broken=${broken.length}`);
for (const b of broken.slice(0, 80)) {
  console.log(`- ${b.file} → ${b.target} (→ ${b.resolved})`);
}
if (broken.length > 80) console.log(`… and ${broken.length - 80} more`);
process.exit(broken.length ? 1 : 0);
