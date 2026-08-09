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
  '.github',
  'data',
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
      // Only *.md — not *.mdc (Cursor rules often cite paths as prose/code).
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Unwrap accidental re-wrapping from older runs of this script:
 *   [[`x`](url)](url)  →  [`x`](url)
 *   [[[`x`](url)](url)](url)  →  … →  [`x`](url)
 * Only unwraps when the inner label is backtick-wrapped (what this tool produces).
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

/** True when `code` at [start,end) is already the label of a markdown link [`…`](…). */
function isAlreadyLinked(line, start) {
  return start > 0 && line[start - 1] === '[';
}

// Build target map of all files in repo (including extensionless root files like 'dev')
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
      } else {
        const ext = path.extname(file);
        const relToRoot = path.relative(ROOT, fullPath).replace(/\\/g, '/');

        if ((ext && ext !== '') || relToRoot === 'dev') {
          targetMap.set(relToRoot, fullPath);
          const baseName = path.basename(file);
          if (!targetMap.has(baseName)) {
            targetMap.set(baseName, fullPath);
          }
        }
      }
    }
  }

  scan(ROOT);
  return targetMap;
}

const targetMap = getTargetMap();

/**
 * Find backtick spans and link only those whose full content is a known target.
 * Avoids O(targets × line) regex thrash and never re-wraps [`x`](url).
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

    if (
      abs &&
      !already &&
      path.resolve(mdFile) !== path.resolve(abs)
    ) {
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

  console.log(`Files updated: ${filesUpdated}`);
  console.log(`Unwrapped nested markdown links (approx): ${totalUnwrapped}`);
  console.log(
    `Total inline file references converted to markdown links: ${counters.fixed}`,
  );
}

run();
