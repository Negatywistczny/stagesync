import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

function getAllMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.turbo' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllMdFiles(fullPath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

// Gather all existing files and directories in repo for reference matching
function getAllRepoPaths(dir, base = '', list = new Set()) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === '.turbo' || file === 'dist' || file === 'build') continue;
    const fullPath = path.join(dir, file);
    const relPath = path.join(base, file).replace(/\\/g, '/');
    list.add(relPath);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllRepoPaths(fullPath, relPath, list);
    }
  }
  return list;
}

const mdFiles = getAllMdFiles(ROOT);
const repoPaths = getAllRepoPaths(ROOT);

// Common files/folders to search for mentions
const targets = [
  'README.md', 'CHANGELOG.md', 'TODO.md', 'ROADMAP.md', 'ARCHITECTURE.md', 'STANDARDS.md', 'REPO_MAP.md',
  'INSTALL.md', 'DESKTOP.md', 'MOBILE.md', 'MIGRATION.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODE_OF_CONDUCT.md',
  'compose.yml', 'compose.prod.yml', 'Dockerfile', 'package.json', 'pnpm-workspace.yaml', 'turbo.json'
];

let totalUnlinked = 0;
const unlinkedDetails = [];

for (const mdFile of mdFiles) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const relMdPath = path.relative(ROOT, mdFile).replace(/\\/g, '/');

  // Find mentions of known files/paths
  for (const target of targets) {
    // Check if target is mentioned in text
    const regex = new RegExp(`\\b${target.replace('.', '\\.')}\\b`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const index = match.index;
      // Check if it's already part of a markdown link: [text](link) or [text][ref] or `code` or reference definition [ref]: url
      // Look backwards for '(' or '[' or '`'
      const preceding = content.substring(Math.max(0, index - 50), index);
      const following = content.substring(index + target.length, Math.min(content.length, index + target.length + 50));

      const isLinked = /\]\([^)]*$/i.test(preceding) || /\]\[[^\]]*$/i.test(preceding);
      const isCode = preceding.lastIndexOf('`') > preceding.lastIndexOf(' '); // simple heuristic or inside backticks
      // More robust: check if target is inside `...` or [ ... ](...)
      
      // Let's check if the exact occurrence is inside a markdown link URL or label that links to it
      // Actually, check-docs-links.mjs already checks all markdown links.
      // Here we want to find explicit text mentions like "see TODO.md" or "zobacz CHANGELOG.md" or "README.md" without a markdown link around it.
      
      // Let's check if there is an opening [ before target without a closing ] before target, or if preceding ends with ](
      if (isLinked) continue;

      // Check if it's inside backticks like `TODO.md` which might be code reference rather than prose reference requiring a link,
      // but the prompt says "odwołań do plików nie ma linków" (references to files that don't have links).
      // Let's check if it's inside backticks:
      const lastBacktick = preceding.lastIndexOf('`');
      const lastClosingBacktick = preceding.lastIndexOf('`');
      // If inside backticks, is it a link?
      // Let's inspect all unlinked mentions in prose.
      
      // Check if preceded by `[` and followed by `](...)`
      // A safer check: does the substring around `target` contain `[` ... `](...` or similar?
      const sub = content.substring(Math.max(0, index - 30), Math.min(content.length, index + target.length + 30));
      if (sub.includes(`[${target}]`) || sub.includes(`(${target})`) || sub.includes(`](${target})`)) {
        continue;
      }

      totalUnlinked++;
      unlinkedDetails.push(`${relMdPath}: mentions "${target}" at index ${index}`);
    }
  }
}

console.log(`TOTAL UNLINKED REFERENCES FOUND: ${totalUnlinked}`);
for (const detail of unlinkedDetails.slice(0, 30)) {
  console.log(` - ${detail}`);
}
if (unlinkedDetails.length > 30) {
  console.log(` ... and ${unlinkedDetails.length - 30} more.`);
}
