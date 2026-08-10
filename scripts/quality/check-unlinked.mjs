import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  'dist',
  'build',
  'coverage',
]);

/**
 * Same denylist as fix-unlinked-links.mjs — short names that collide with prose
 * or duplicate across the repo. Full paths in backticks are still checked.
 */
const AMBIGUOUS_BASENAMES = new Set([
  'dev',
  'dev.cmd',
  'dev.ps1',
  'README.md',
  'CHANGELOG.md',
  'LICENSE.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
]);

function getAllMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (IGNORE_DIRS.has(file)) continue;
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

/**
 * Dynamic targets (aligned with fix-unlinked-links.mjs):
 * - every *.md (full relative path + safe basename alias)
 * - root configs: Dockerfile / *.json / *.yaml / *.yml
 */
function getTargetSet() {
  const targets = new Set();

  function scan(currentDir) {
    for (const file of fs.readdirSync(currentDir)) {
      if (IGNORE_DIRS.has(file)) continue;
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scan(fullPath);
        continue;
      }

      const ext = path.extname(file);
      const relToRoot = path.relative(ROOT, fullPath).replace(/\\/g, '/');
      const baseName = path.basename(file);
      const isRoot = currentDir === ROOT;
      const isRootConfig =
        isRoot &&
        (file === 'Dockerfile' ||
          file.endsWith('.json') ||
          file.endsWith('.yaml') ||
          file.endsWith('.yml'));

      if (ext !== '.md' && !isRootConfig) continue;

      targets.add(relToRoot);
      if (!AMBIGUOUS_BASENAMES.has(baseName)) {
        targets.add(baseName);
      }
    }
  }

  scan(ROOT);
  return targets;
}

const mdFiles = getAllMdFiles(ROOT);
const targets = getTargetSet();

let totalUnlinked = 0;
const unlinkedDetails = [];

/**
 * Report only what fix-unlinked-links can convert:
 * backtick spans `target` that are known files and not already [`target`](url).
 * Bare prose / headings (e.g. "### CHANGELOG.md", "Dockerfile slim gaps") are
 * intentionally ignored — linking those caused false positives.
 */
for (const mdFile of mdFiles) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const relMdPath = path.relative(ROOT, mdFile).replace(/\\/g, '/');
  const selfBasename = path.basename(mdFile);
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || !line.includes('`')) continue;

    let j = 0;
    while (j < line.length) {
      if (line[j] !== '`') {
        j++;
        continue;
      }
      const close = line.indexOf('`', j + 1);
      if (close < 0) break;

      const inner = line.slice(j + 1, close);
      const alreadyLinked = j > 0 && line[j - 1] === '[';
      const isSelf = inner === relMdPath || inner === selfBasename;

      if (
        targets.has(inner) &&
        !alreadyLinked &&
        !AMBIGUOUS_BASENAMES.has(inner) &&
        !isSelf
      ) {
        totalUnlinked++;
        unlinkedDetails.push(
          `${relMdPath}:${i + 1}: unlinked backtick \`${inner}\``,
        );
      }

      j = close + 1;
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
