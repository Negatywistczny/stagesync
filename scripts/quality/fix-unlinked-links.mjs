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

/** Extensionless / ambiguous basenames that collide with ordinary prose. */
const AMBIGUOUS_BASENAMES = new Set(['dev', 'dev.cmd', 'dev.ps1']);

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
 * Unwrap accidental re-wrapping from older runs of this script:
 *   [[`x`](url)](url)  →  [`x`](url)
 */
function unwrapNestedBacktickLinks(text) {
  const re = /\[(\[`[^`\n]+`\]\([^)\n]+\))\]\([^)\n]+\)/g;
  let prev;
  let guard = 0;
  do {
    prev = text;
    text = text.replace(re, '$1');
    guard++;
  } while (text !== prev && guard < 20);
  return text;
}

function isAlreadyLinked(line, start) {
  return start > 0 && line[start - 1] === '[';
}

/**
 * Dynamic target map: *.md everywhere + root configs (same spirit as check-unlinked).
 * Does not register extensionless launchers like `dev` (prose false positives).
 */
function getTargetMap() {
  const targetMap = new Map();

  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);
    for (const file of files) {
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

      // *.md anywhere, or config files in repo root — never extensionless `dev`.
      if (ext !== '.md' && !isRootConfig) continue;
      if (AMBIGUOUS_BASENAMES.has(baseName)) continue;

      targetMap.set(relToRoot, fullPath);
      if (!targetMap.has(baseName)) {
        targetMap.set(baseName, fullPath);
      }
    }
  }

  scan(ROOT);
  return targetMap;
}

const targetMap = getTargetMap();

/**
 * Convert backtick file refs `target` → [`target`](rel).
 * Bare prose is intentionally NOT linked (previous linkBareProse caused
 * false positives like the word "dev" → root launcher).
 */
function linkBareBackticks(line, mdFile, mdDir, counters) {
  if (!line.includes('`')) return line;

  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') {
      out += line[i];
      i++;
      continue;
    }
    const close = line.indexOf('`', i + 1);
    if (close < 0) {
      out += line.slice(i);
      break;
    }
    const inner = line.slice(i + 1, close);
    const abs = targetMap.get(inner);
    const already = isAlreadyLinked(line, i);

    if (abs && !already && path.resolve(mdFile) !== path.resolve(abs)) {
      let relLink = path.relative(mdDir, abs).replace(/\\/g, '/');
      if (!relLink.startsWith('.') && !relLink.startsWith('/')) {
        relLink = './' + relLink;
      }
      out += `[\`${inner}\`](${relLink})`;
      counters.fixed++;
    } else {
      out += line.slice(i, close + 1);
    }
    i = close + 1;
  }
  return out;
}

function run() {
  const mdFiles = getAllMdFiles(ROOT);
  const counters = { fixed: 0 };
  let totalUnwrapped = 0;
  let filesUpdated = 0;

  for (const mdFile of mdFiles) {
    const original = fs.readFileSync(mdFile, 'utf8');
    const mdDir = path.dirname(mdFile);
    const relMdPath = path.relative(ROOT, mdFile).replace(/\\/g, '/');
    const newline = original.includes('\r\n') ? '\r\n' : '\n';

    let content = unwrapNestedBacktickLinks(original);
    if (content !== original) {
      const beforeCount = (original.match(/\[\[`/g) || []).length;
      const afterCount = (content.match(/\[\[`/g) || []).length;
      totalUnwrapped += Math.max(0, beforeCount - afterCount);
    }

    const lines = content.split(/\r?\n/);
    let inCodeBlock = false;

    const newLines = lines.map((line) => {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      if (inCodeBlock) return line;
      return linkBareBackticks(line, mdFile, mdDir, counters);
    });

    const next = newLines.join(newline);
    if (next !== original) {
      fs.writeFileSync(mdFile, next, 'utf8');
      filesUpdated++;
      console.log(`Updated: ${relMdPath}`);
    }
  }

  console.log(`\nFiles updated: ${filesUpdated}`);
  console.log(`Unwrapped nested markdown links (approx): ${totalUnwrapped}`);
  console.log(
    `Total inline file references converted to markdown links: ${counters.fixed}`,
  );
}

run();
